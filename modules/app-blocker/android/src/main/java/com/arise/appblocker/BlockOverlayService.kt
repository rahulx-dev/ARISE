package com.arise.appblocker

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import java.util.Locale

class BlockOverlayService : Service() {

    private val TAG = "ARISE_OVERLAY_SVC"
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var currentPackageName: String? = null

    companion object {
        @Volatile
        var isOverlayShowing: Boolean = false

        @Volatile
        var currentOverlayPackageName: String? = null

        fun isShowingFor(packageName: String): Boolean {
            val normalized = packageName.trim().lowercase(Locale.ROOT)
            return isOverlayShowing && currentOverlayPackageName == normalized
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as? WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val pkg = intent?.getStringExtra("PACKAGE_NAME")
            ?.trim()
            ?.lowercase(Locale.ROOT)
            ?.takeIf { it.isNotEmpty() && it != "null" }

        if (pkg == null) {
            removeExistingOverlay()
            stopSelf(startId)
            return START_NOT_STICKY
        }

        // If target package changed, tear down old overlay first
        if (currentPackageName != pkg) {
            removeExistingOverlay()
        }
        currentPackageName = pkg

        if (overlayView != null && overlayView?.isAttachedToWindow == true) {
            overlayView?.visibility = View.VISIBLE
            overlayView?.bringToFront()
        } else {
            removeExistingOverlay(clearPackage = false)
            showOverlay()
        }

        return START_NOT_STICKY
    }

    private fun claimEmergencyBailout() {
        try {
            val success = BlockPolicyController.claimEmergencyBailout(this, currentPackageName)
            if (!success) {
                Toast.makeText(this, "Emergency pass already claimed today.", Toast.LENGTH_SHORT).show()
                removeExistingOverlay()
                stopSelf()
                return
            }

            val unlockUntil = BlockPolicyController.getUnlockUntil(this)
            try {
                val serviceIntent = Intent(this, AppMonitorService::class.java).apply {
                    putExtra("UNLOCKED_UNTIL_EPOCH", unlockUntil)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Notice sending emergency pass to monitor service", e)
            }

            Toast.makeText(this, "Emergency 5-Minute Pass Activated. Counted in budget.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error claiming emergency bailout in overlay", e)
        }
        removeExistingOverlay()
        stopSelf()
    }

    private fun claimAdPass() {
        try {
            val adIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://watch-ad-unlock")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            startActivity(adIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        removeExistingOverlay()
        stopSelf()
    }

    private fun launchWorkoutUnlock() {
        try {
            val workoutIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://exercise/pushup?target=10&source=overlay")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            startActivity(workoutIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        removeExistingOverlay()
        stopSelf()
    }

    private fun launchShopUnlock() {
        try {
            val shopIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://shop")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            startActivity(shopIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        removeExistingOverlay()
        stopSelf()
    }

    private fun exitToHomeScreen() {
        try {
            val startMain = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
            }
            startActivity(startMain)
        } catch (e: Exception) {
            Log.e(TAG, "Error returning home from overlay", e)
        }
        removeExistingOverlay()
        stopSelf()
    }

    private fun showOverlay() {
        val scopedPackage = currentPackageName
            ?.trim()
            ?.lowercase(Locale.ROOT)
            ?.takeIf { it.isNotEmpty() && it != "null" }

        if (scopedPackage == null) {
            Log.w(TAG, "Refusing to show an unscoped lock overlay")
            removeExistingOverlay()
            stopSelf()
            return
        }
        currentPackageName = scopedPackage

        if (System.currentTimeMillis() < BlockPolicyController.getUnlockUntil(this)) {
            removeExistingOverlay()
            stopSelf()
            return
        }

        val layoutParamsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        // Strictly modal layout: NO FLAG_NOT_TOUCH_MODAL so touches CANNOT pass through to the blocked app!
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutParamsType,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_FULLSCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
                WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.FILL
            x = 0
            y = 0
            width = WindowManager.LayoutParams.MATCH_PARENT
            height = WindowManager.LayoutParams.MATCH_PARENT
            windowAnimations = 0
            screenOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }

        try {
            val view = LockScreenViewFactory.buildLockView(
                context = this,
                packageName = currentPackageName,
                isEmergencyAvailable = BlockPolicyController.isEmergencyAvailable(this),
                onExitHome = { exitToHomeScreen() },
                onLaunchPushups = { launchWorkoutUnlock() },
                onWatchAd = { claimAdPass() },
                onEmergencyPass = { claimEmergencyBailout() },
                onShop = { launchShopUnlock() }
            )

            // Intercept touches so nothing passes to background
            view.setOnTouchListener { _, _ -> true }

            // Intercept hardware and gesture Back presses so the user is returned to Home launcher
            view.isFocusable = true
            view.isFocusableInTouchMode = true
            view.requestFocus()
            view.setOnKeyListener { _, keyCode, event ->
                if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                    exitToHomeScreen()
                    true
                } else {
                    false
                }
            }

            windowManager?.addView(view, params)
            overlayView = view
            isOverlayShowing = true
            currentOverlayPackageName = currentPackageName
            Log.d(TAG, "Modal lock overlay successfully attached for $currentPackageName")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach WindowManager overlay, kicking to home", e)
            isOverlayShowing = false
            exitToHomeScreen()
        }
    }

    private fun removeExistingOverlay(clearPackage: Boolean = true) {
        overlayView?.let { view ->
            try {
                if (view.isAttachedToWindow) {
                    windowManager?.removeViewImmediate(view)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error removing overlayView", e)
            }
            overlayView = null
        }
        isOverlayShowing = false
        currentOverlayPackageName = null
        if (clearPackage) currentPackageName = null
    }

    override fun onDestroy() {
        super.onDestroy()
        removeExistingOverlay()
    }
}
