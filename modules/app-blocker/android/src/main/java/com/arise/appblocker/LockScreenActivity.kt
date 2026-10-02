package com.arise.appblocker

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LockScreenActivity : Activity() {

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
                if (!instance.isFinishing) instance.finish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make window fullscreen & cover status/navigation bars
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )

        currentPackageName = normalizePackage(intent?.getStringExtra("PACKAGE_NAME"))
        if (currentPackageName == null) {
            // A sticky/recreated activity without an explicit package is never a
            // valid lock presentation.  Do not render an unscoped lock screen.
            finish()
            return
        }

        val lockView = LockScreenViewFactory.buildLockView(
            context = this,
            packageName = currentPackageName,
            isEmergencyAvailable = isEmergencyBailoutAvailable(),
            onExitHome = { exitToHomeScreen() },
            onLaunchPushups = { launchWorkoutUnlock() },
            onWatchAd = { claimAdPass() },
            onEmergencyPass = { claimEmergencyBailout() },
            onShop = { launchShopUnlock() }
        )

        setContentView(lockView)
        activeInstance = this
        isActivityShowing = true
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)

        val nextPackage = normalizePackage(intent?.getStringExtra("PACKAGE_NAME"))
        if (nextPackage == null) {
            finish()
            return
        }

        if (nextPackage != currentPackageName) {
            currentPackageName = nextPackage
            val lockView = LockScreenViewFactory.buildLockView(
                context = this,
                packageName = currentPackageName,
                isEmergencyAvailable = isEmergencyBailoutAvailable(),
                onExitHome = { exitToHomeScreen() },
                onLaunchPushups = { launchWorkoutUnlock() },
                onWatchAd = { claimAdPass() },
                onEmergencyPass = { claimEmergencyBailout() },
                onShop = { launchShopUnlock() }
            )
            setContentView(lockView)
        }
        isActivityShowing = true
    }

    override fun onResume() {
        super.onResume()
        isActivityShowing = true
        if (System.currentTimeMillis() < AppMonitorService.getUnlockUntil(this)) {
            finish()
        }
    }

    override fun onPause() {
        super.onPause()
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
            val persisted = AppMonitorService.setUnlockUntil(this, unlockUntil)
            if (!persisted) {
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
            } catch (_: Exception) {
                AppMonitorService.setUnlockUntil(this, 0L)
                Toast.makeText(this, "Unable to activate the emergency pass.", Toast.LENGTH_LONG).show()
                return
            }

            Toast.makeText(this, "Emergency 5-Minute Pass Activated! Stay disciplined.", Toast.LENGTH_LONG).show()
        } catch (_: Exception) {}
        finish()
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
        finish()
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
        finish()
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
        finish()
    }

    private fun exitToHomeScreen() {
        try {
            val startMain = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            startActivity(startMain)
        } catch (_: Exception) {}
        finish()
    }

    private fun normalizePackage(packageName: String?): String? {
        val normalized = packageName?.trim()?.lowercase(Locale.ROOT)
        return normalized?.takeIf { it.isNotEmpty() && it != "null" }
    }
}
