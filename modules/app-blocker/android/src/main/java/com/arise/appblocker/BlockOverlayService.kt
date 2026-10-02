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
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BlockOverlayService : Service() {

    private val TAG = "ARISE_OVERLAY_SERVICE"
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
        // START_STICKY may restart a service with a null intent.  A lock overlay
        // without a fresh package scope is never safe to restore.
        val pkg = intent?.getStringExtra("PACKAGE_NAME")
            ?.trim()
            ?.lowercase(Locale.ROOT)
            ?.takeIf { it.isNotEmpty() && it != "null" }
        if (pkg == null) {
            removeExistingOverlay()
            stopSelf(startId)
            return START_NOT_STICKY
        }

        val packageChanged = currentPackageName != pkg
        if (packageChanged) {
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
        // The monitor service is responsible for re-presenting after a process
        // restart.  Do not let Android recreate an unscoped overlay on its own.
        return START_NOT_STICKY
    }

    private fun isEmergencyBailoutAvailable(): Boolean {
        return try {
            val prefs = getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val lastDate = prefs.getString("last_emergency_bailout_date", "")
            today != lastDate
        } catch (_: Exception) {
            true
        }
    }

    private fun claimEmergencyBailout() {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val unlockUntil = System.currentTimeMillis() + (5 * 60 * 1000L)
            if (!AppMonitorService.setUnlockUntil(this, unlockUntil)) {
                Toast.makeText(this, "Unable to activate the emergency pass.", Toast.LENGTH_LONG).show()
                return
            }

            try {
                val serviceIntent = Intent(this, AppMonitorService::class.java).apply {
                    putExtra("UNLOCKED_UNTIL_EPOCH", unlockUntil)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
                getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                    .edit()
                    .putString("last_emergency_bailout_date", today)
                    .commit()
            } catch (e: Exception) {
                AppMonitorService.setUnlockUntil(this, 0L)
                Log.e(TAG, "Unable to start monitor for emergency pass", e)
                Toast.makeText(this, "Unable to activate the emergency pass.", Toast.LENGTH_LONG).show()
                return
            }

            Toast.makeText(this, "Emergency 5-Minute Pass Activated! Stay disciplined.", Toast.LENGTH_LONG).show()
        } catch (_: Exception) {}
        removeExistingOverlay()
        stopSelf()
    }

    private fun claimAdPass() {
        try {
            val adIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://watch-ad-unlock")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(adIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        removeExistingOverlay()
        stopSelf()
    }

    private fun launchWorkoutUnlock() {
        try {
            val workoutIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://exercise/pushup?target=10&source=overlay")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(workoutIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        removeExistingOverlay()
        stopSelf()
    }

    private fun launchShopUnlock() {
        try {
            val shopIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://shop")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(shopIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
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
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            startActivity(startMain)
        } catch (_: Exception) {}
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

        if (System.currentTimeMillis() < AppMonitorService.getUnlockUntil(this)) {
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
            screenOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }

        try {
            val view = LockScreenViewFactory.buildLockView(
                context = this,
                packageName = currentPackageName,
                isEmergencyAvailable = isEmergencyBailoutAvailable(),
                onExitHome = { exitToHomeScreen() },
                onLaunchPushups = { launchWorkoutUnlock() },
                onWatchAd = { claimAdPass() },
                onEmergencyPass = { claimEmergencyBailout() },
                onShop = { launchShopUnlock() }
            )

            windowManager?.addView(view, params)
            overlayView = view
            isOverlayShowing = true
            currentOverlayPackageName = currentPackageName
            Log.d(TAG, "Overlay successfully attached for $currentPackageName")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach WindowManager overlay, falling back to LockScreenActivity", e)
            isOverlayShowing = false
            // Direct activity fallback
            try {
                val actIntent = Intent(this, LockScreenActivity::class.java).apply {
                    putExtra("PACKAGE_NAME", currentPackageName)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                startActivity(actIntent)
            } catch (err: Exception) {
                Log.e(TAG, "Failed to launch fallback LockScreenActivity", err)
            }
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
