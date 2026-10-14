package com.arise.appblocker

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import java.util.Locale

class LockScreenActivity : Activity() {

    private val TAG = "ARISE_LOCK_ACTIVITY"
    private var currentPackageName: String? = null

    companion object {
        @Volatile
        var isActivityShowing: Boolean = false

        @Volatile
        private var activeInstance: LockScreenActivity? = null

        fun isShowingFor(packageName: String): Boolean {
            val normalized = packageName.trim().lowercase(Locale.ROOT)
            return isActivityShowing && activeInstance?.currentPackageName == normalized
        }

        fun finishIfShowing() {
            val instance = activeInstance ?: return
            instance.runOnUiThread {
                if (!instance.isFinishing) {
                    instance.finish()
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        instance.overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, 0, 0)
                    } else {
                        @Suppress("DEPRECATION")
                        instance.overridePendingTransition(0, 0)
                    }
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Enforce instant, leak-proof zero animation window transition
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, 0, 0)
        } else {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }

        super.onCreate(savedInstanceState)

        // Make window fullscreen, opaque solid light background matching the neumorphic lock screen
        window.setBackgroundDrawable(ColorDrawable(Color.parseColor("#EEF1F6")))
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            try {
                onBackInvokedDispatcher.registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT
                ) {
                    exitToHomeScreen()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error registering onBackInvokedDispatcher", e)
            }
        }

        currentPackageName = normalizePackage(intent?.getStringExtra("PACKAGE_NAME"))
        if (currentPackageName == null) {
            finish()
            return
        }

        renderLockView()
        activeInstance = this
        isActivityShowing = true
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, 0, 0)
        } else {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }

        val nextPackage = normalizePackage(intent?.getStringExtra("PACKAGE_NAME"))
        if (nextPackage == null) {
            finish()
            return
        }

        if (nextPackage != currentPackageName) {
            currentPackageName = nextPackage
            renderLockView()
        }
        isActivityShowing = true
    }

    private fun renderLockView() {
        val lockView = LockScreenViewFactory.buildLockView(
            context = this,
            packageName = currentPackageName,
            isEmergencyAvailable = BlockPolicyController.isEmergencyAvailable(this),
            onExitHome = { exitToHomeScreen() },
            onLaunchPushups = { launchWorkoutUnlock() },
            onWatchAd = { claimAdPass() },
            onEmergencyPass = { claimEmergencyBailout() },
            onShop = { launchShopUnlock() }
        )
        setContentView(lockView)
    }

    override fun onResume() {
        super.onResume()
        isActivityShowing = true
        if (System.currentTimeMillis() < BlockPolicyController.getUnlockUntil(this)) {
            finishWithNoAnimation()
        }
    }

    override fun onStop() {
        super.onStop()
        isActivityShowing = false
    }

    override fun onDestroy() {
        super.onDestroy()
        isActivityShowing = false
        if (activeInstance === this) activeInstance = null
    }

    override fun onBackPressed() {
        exitToHomeScreen()
    }

    override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent?): Boolean {
        if (keyCode == android.view.KeyEvent.KEYCODE_BACK) {
            exitToHomeScreen()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun claimEmergencyBailout() {
        try {
            val success = BlockPolicyController.claimEmergencyBailout(this, currentPackageName)
            if (!success) {
                Toast.makeText(this, "Emergency pass already claimed today.", Toast.LENGTH_SHORT).show()
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
                Log.w(TAG, "Notice sending emergency unlock to monitor service", e)
            }

            Toast.makeText(this, "Emergency 5-Minute Pass Activated. Counted in budget.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error executing emergency bailout", e)
        }
        finishWithNoAnimation()
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
        finishWithNoAnimation()
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
        finishWithNoAnimation()
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
        finishWithNoAnimation()
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
            Log.e(TAG, "Error returning home", e)
        }
        try {
            stopService(Intent(this, BlockOverlayService::class.java))
        } catch (_: Exception) {}
        finishWithNoAnimation()
    }

    private fun finishWithNoAnimation() {
        finish()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, 0, 0)
        } else {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }
    }

    private fun normalizePackage(packageName: String?): String? {
        val normalized = packageName?.trim()?.lowercase(Locale.ROOT) ?: return null
        if (normalized.length > 256 || normalized == "null" || normalized.isEmpty()) return null
        // Ensure standard valid reverse-domain package name format (e.g. com.example.app)
        val isValid = normalized.matches(Regex("^[a-z][a-z0-9_]*(\\.[a-z0-9_]+)+$"))
        return if (isValid) normalized else null
    }
}
