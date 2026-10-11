package com.arise.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.Locale

class AppMonitorService : Service() {

    private val tag = "ARISE_APP_MONITOR"
    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private val restrictedPackages = mutableSetOf<String>()
    private var lastWasUnlocked = false

    private var dailyResetTimestamp = BlockPolicyController.getTodayEndEpoch()
    private var screenOn = true
    private var screenReceiverRegistered = false

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            screenOn = intent.action != Intent.ACTION_SCREEN_OFF
            if (!screenOn) {
                // Pause live session stopwatch when screen turns off
                BlockPolicyController.onPackageBackground(this@AppMonitorService)
                UsageStatsHelper.clearForegroundCache()
                dismissPresentation()
            } else if (isMonitoring) {
                handler.removeCallbacks(monitorRunnable)
                handler.post(monitorRunnable)
            }
        }
    }

    private fun getAppNotificationIcon(): Int {
        val resId = resources.getIdentifier("notification_icon", "drawable", packageName)
        if (resId != 0) return resId
        val appIcon = applicationInfo.icon
        if (appIcon != 0) return appIcon
        return android.R.drawable.ic_lock_lock
    }

    private fun getOpenArisePendingIntent(): PendingIntent {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, javaClass)
        launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getActivity(this, 0, launchIntent, flags)
    }

    private fun getOpenSettingsPendingIntent(): PendingIntent {
        val launchIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://settings/apps")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getActivity(this, 1, launchIntent, flags)
    }

    private fun buildNotification(unlocked: Boolean, targetEpoch: Long): Notification {
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(Color.parseColor("#0A84FF"))
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(getOpenArisePendingIntent())
            .setSmallIcon(getAppNotificationIcon())
            .setSubText("MONARCH PROTOCOL")

        if (unlocked && targetEpoch > System.currentTimeMillis()) {
            val title = "Access Granted • Screen-Time Active"
            val summary = "Focus shield temporarily bypassed. Countdown is running."
            val bigDetails = "Temporary screen time active.\nShield re-engages automatically when countdown expires.\nExecute your tasks before the lockout."

            builder.setContentTitle(title)
                .setContentText(summary)
                .setStyle(NotificationCompat.BigTextStyle().bigText(bigDetails).setSummaryText("SCREEN PASS"))
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setWhen(targetEpoch)
        } else {
            val count = restrictedPackages.size
            val title = if (count > 0) "Focus Shield Active • $count Apps Locked" else "Focus Shield Active • Ready"
            val summary = if (count > 0) "$count restricted apps locked under Monarch Protocol" else "Discipline protocol engaged. Screen time managed."
            val bigDetails = if (count > 0) {
                "Hard Kiosk Shield Engaged\n$count apps protected. Time limits enforced.\nComplete push-ups or claim an emergency pass in ARISE to unlock."
            } else {
                "Monarch Shield Armed\nNo apps currently restricted. Configure locked apps in ARISE to enforce focus."
            }

            builder.setContentTitle(title)
                .setContentText(summary)
                .setStyle(NotificationCompat.BigTextStyle().bigText(bigDetails).setSummaryText(if (count > 0) "$count PROTECTED" else "ARMED"))
                .setUsesChronometer(false)
        }

        // Action Buttons
        builder.addAction(
            android.R.drawable.ic_menu_preferences,
            "Locked Apps",
            getOpenSettingsPendingIntent()
        )
        builder.addAction(
            android.R.drawable.ic_media_play,
            "Open ARISE",
            getOpenArisePendingIntent()
        )

        return builder.build()
    }

    private fun updateNotification(unlocked: Boolean, targetEpoch: Long) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        manager.notify(1001, buildNotification(unlocked, targetEpoch))
    }

    private fun normalizePackage(packageName: String?): String? {
        val normalized = packageName?.trim()?.lowercase(Locale.ROOT)
        return normalized?.takeIf { it.isNotEmpty() && it != "null" }
    }

    private fun normalizePackages(packages: Collection<String>): Set<String> {
        return packages.mapNotNull { normalizePackage(it) }
            .filter { it != packageName.lowercase(Locale.ROOT) }
            .toSet()
    }

    private fun isPackageRestricted(pkg: String): Boolean {
        val clean = normalizePackage(pkg) ?: return false
        return clean in restrictedPackages
    }

    /**
     * Rock-Solid Hybrid Real-Time Monitoring Loop:
     * Evaluates foreground state every 300ms using Digital Wellbeing baseline + live session stopwatch.
     * When budget is reached, locks the app instantly while running without requiring any app restart.
     */
    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring || !screenOn) return

            val now = System.currentTimeMillis()

            // 1. Midnight rollover check
            val nextReset = BlockPolicyController.getTodayEndEpoch(now)
            if (nextReset != dailyResetTimestamp) {
                Log.i(tag, "Daily rollover detected ($dailyResetTimestamp -> $nextReset). Resetting policy state.")
                dailyResetTimestamp = nextReset
                BlockPolicyController.resetDailyState(this@AppMonitorService)
                dismissPresentation()
            }

            // 2. Active screen-time pass check
            val unlockTarget = BlockPolicyController.getUnlockUntil(this@AppMonitorService)
            val isUnlocked = now < unlockTarget
            if (isUnlocked != lastWasUnlocked) {
                lastWasUnlocked = isUnlocked
                updateNotification(isUnlocked, unlockTarget)
                if (isUnlocked) {
                    dismissPresentation()
                }
            }

            if (isUnlocked) {
                dismissPresentation()
                val remainingMs = (unlockTarget - now).coerceAtLeast(0L)
                val nextDelay = if (remainingMs in 1L..1000L) remainingMs else 500L
                handler.postDelayed(this, nextDelay)
                return
            }

            // 3. Chronological Foreground Detection
            val fgPackage = UsageStatsHelper.getForegroundPackage(this@AppMonitorService)

            if (fgPackage != null && isPackageRestricted(fgPackage)) {
                // Signal active foreground session to live stopwatch engine
                BlockPolicyController.onPackageForeground(this@AppMonitorService, fgPackage)

                // Evaluate real-time usage (Digital Wellbeing baseline + active stopwatch duration)
                val policy = BlockPolicyController.evaluate(
                    this@AppMonitorService,
                    fgPackage,
                    isForeground = true
                )

                if (policy.lockState == LockState.LOCKED) {
                    // Time limit hit while running on screen: Lock immediately!
                    presentLockScreen(fgPackage, policy.dailyLimitMs, policy.usageTodayMs)
                } else {
                    // Still has remaining budget: Permit usage
                    dismissPresentation()
                }
            } else {
                // User navigated away from restricted app
                BlockPolicyController.onPackageBackground(this@AppMonitorService)

                if (fgPackage != null) {
                    val isOurApp = fgPackage == packageName
                    val isLauncher = UsageStatsHelper.isSystemLauncherOrUi(this@AppMonitorService, fgPackage)
                    val isUnrestricted = !isPackageRestricted(fgPackage) && !isOurApp

                    if (isOurApp) {
                        if (!LockScreenActivity.isActivityShowing) {
                            stopOverlayService()
                        }
                    } else if (isLauncher || isUnrestricted) {
                        dismissPresentation()
                    }
                }
            }

            // Schedule next real-time check (300ms)
            handler.postDelayed(this, 300L)
        }
    }

    private fun presentLockScreen(pkg: String, budgetMs: Long, usedMs: Long) {
        val normalizedPackage = normalizePackage(pkg)
        if (normalizedPackage == null || !isPackageRestricted(normalizedPackage)) {
            dismissPresentation()
            return
        }

        // 1. Launch LockScreenActivity (Hard Activity Kiosk with 100% Back button interception)
        if (!LockScreenActivity.isShowingFor(normalizedPackage)) {
            try {
                val lockIntent = Intent(this, LockScreenActivity::class.java).apply {
                    putExtra("PACKAGE_NAME", normalizedPackage)
                    putExtra("BUDGET_MS", budgetMs)
                    putExtra("USED_MS", usedMs)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                }
                startActivity(lockIntent)
                Log.d(tag, "LockScreenActivity launched for $normalizedPackage")
            } catch (e: Exception) {
                Log.e(tag, "Error starting LockScreenActivity", e)
            }
        }

        // 2. Also attach BlockOverlayService as backup shield if overlay permission is granted
        val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }

        if (hasOverlay && !BlockOverlayService.isShowingFor(normalizedPackage)) {
            val overlayIntent = Intent(this, BlockOverlayService::class.java).apply {
                putExtra("PACKAGE_NAME", normalizedPackage)
                putExtra("BUDGET_MS", budgetMs)
                putExtra("USED_MS", usedMs)
            }
            try {
                startService(overlayIntent)
            } catch (e: Exception) {
                Log.e(tag, "Error starting BlockOverlayService", e)
            }
        }
    }

    private fun stopOverlayService() {
        try {
            stopService(Intent(this, BlockOverlayService::class.java))
        } catch (_: Exception) {}
    }

    private fun dismissPresentation() {
        if (BlockOverlayService.isOverlayShowing) {
            stopOverlayService()
        }
        if (LockScreenActivity.isActivityShowing) {
            LockScreenActivity.finishIfShowing()
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (isMonitoring && screenOn) {
            try {
                val restartIntent = Intent(applicationContext, AppMonitorService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    applicationContext.startForegroundService(restartIntent)
                } else {
                    applicationContext.startService(restartIntent)
                }
            } catch (error: Exception) {
                Log.w(tag, "Unable to re-queue monitor after task removal", error)
            }
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        ContextCompat.registerReceiver(
            this,
            screenReceiver,
            IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_SCREEN_ON)
            },
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        screenReceiverRegistered = true

        BlockPolicyController.loadPersistedState(this)
        dailyResetTimestamp = BlockPolicyController.getTodayEndEpoch()

        try {
            val prefs = getSharedPreferences(BlockPolicyController.PREFS_NAME, Context.MODE_PRIVATE)
            val savedPackages = prefs.getStringSet("saved_restricted_packages", null)
            if (savedPackages != null) {
                restrictedPackages.addAll(normalizePackages(savedPackages))
            }
        } catch (e: Exception) {
            Log.w(tag, "Unable to restore restricted package list", e)
        }

        try {
            startForeground(1001, createNotification())
        } catch (startException: Exception) {
            Log.e(tag, "Foreground service could not be started", startException)
            stopSelf()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        var shouldReevaluate = false

        val hasBudgetUpdate = intent?.hasExtra("UPDATED_BUDGET_MINUTES") == true
        val updatedBudget = intent?.getDoubleExtra("UPDATED_BUDGET_MINUTES", -1.0) ?: -1.0
        if (hasBudgetUpdate && updatedBudget >= 0.0) {
            val updatedPkg = intent?.getStringExtra("UPDATED_PACKAGE_NAME")
            BlockPolicyController.updateBudget(this, updatedPkg, updatedBudget)
            BlockPolicyController.invalidate(updatedPkg)
            shouldReevaluate = true
            Log.d(tag, "Applied live budget update: $updatedPkg -> $updatedBudget min")
        }

        val packages = intent?.getStringArrayListExtra("RESTRICTED_PACKAGES")
        if (packages != null) {
            val normalizedPackages = normalizePackages(packages)
            restrictedPackages.clear()
            restrictedPackages.addAll(normalizedPackages)
            try {
                getSharedPreferences(BlockPolicyController.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putStringSet("saved_restricted_packages", HashSet(normalizedPackages))
                    .commit()
            } catch (e: Exception) {
                Log.w(tag, "Unable to persist restricted package list", e)
            }
            BlockPolicyController.invalidateAll()
            shouldReevaluate = true
            if (normalizedPackages.isEmpty()) {
                dismissPresentation()
            }
        } else if (restrictedPackages.isEmpty()) {
            try {
                val savedPackages = getSharedPreferences(BlockPolicyController.PREFS_NAME, Context.MODE_PRIVATE)
                    .getStringSet("saved_restricted_packages", null)
                if (savedPackages != null) restrictedPackages.addAll(normalizePackages(savedPackages))
            } catch (e: Exception) {
                Log.w(tag, "Unable to reload restricted package list", e)
            }
        }

        if (intent?.hasExtra("UNLOCKED_UNTIL_EPOCH") == true) {
            val requestedUnlockUntil = intent.getLongExtra("UNLOCKED_UNTIL_EPOCH", 0L)
            if (BlockPolicyController.setUnlockUntil(this, requestedUnlockUntil)) {
                lastWasUnlocked = requestedUnlockUntil > System.currentTimeMillis()
                updateNotification(lastWasUnlocked, requestedUnlockUntil)
                shouldReevaluate = true
                Log.d(tag, "Applied screen-time pass until: $requestedUnlockUntil")
            }
        }

        if (!isMonitoring) {
            isMonitoring = true
            shouldReevaluate = true
        }

        if (shouldReevaluate) {
            handler.removeCallbacks(monitorRunnable)
            handler.post(monitorRunnable)
        }

        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ARISE Protection Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors restricted applications and protects your focus"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification = buildNotification(false, 0L)

    override fun onDestroy() {
        isMonitoring = false
        handler.removeCallbacks(monitorRunnable)
        BlockPolicyController.onPackageBackground(this)
        if (screenReceiverRegistered) {
            try {
                unregisterReceiver(screenReceiver)
            } catch (e: IllegalArgumentException) {
                Log.w(tag, "Screen receiver was already unregistered", e)
            }
            screenReceiverRegistered = false
        }
        dismissPresentation()
        UsageStatsHelper.clearForegroundCache()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "arise_app_monitor"

        fun setBudget(context: Context?, packageName: String?, budgetMinutes: Double): Long {
            return BlockPolicyController.updateBudget(context, packageName, budgetMinutes)
        }

        fun getBudgetForPackage(context: Context, packageName: String): Long {
            return BlockPolicyController.getBudgetForPackage(context, packageName)
        }

        fun setUnlockUntil(context: Context?, epochMs: Long): Boolean {
            return BlockPolicyController.setUnlockUntil(context, epochMs)
        }

        fun getUnlockUntil(context: Context?): Long {
            return BlockPolicyController.getUnlockUntil(context)
        }
    }
}
