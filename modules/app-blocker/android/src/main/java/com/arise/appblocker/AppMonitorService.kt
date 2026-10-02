package com.arise.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat

class AppMonitorService : Service() {

    private val tag = "ARISE_APP_MONITOR"
    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private val restrictedPackages = mutableSetOf<String>()
    private var lastWasUnlocked = false

    // This is the next local midnight, not "start of day + 24h".  Its value changes
    // correctly on 23/25-hour DST days and when the device timezone changes.
    private var dailyResetTimestamp = BlockPolicyController.getTodayEndEpoch()
    private var lastRestrictedPackage: String? = null
    private var awayFromRestrictedSince: Long = 0L
    private var screenOn = true
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            screenOn = intent.action != Intent.ACTION_SCREEN_OFF
            if (screenOn && isMonitoring) {
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

    private fun buildNotification(unlocked: Boolean, targetEpoch: Long): Notification {
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(Color.parseColor("#E53935"))
            .setContentIntent(getOpenArisePendingIntent())
            .setSmallIcon(getAppNotificationIcon())

        if (unlocked && targetEpoch > System.currentTimeMillis()) {
            builder.setContentTitle("[ SYSTEM: ACCESS GRANTED ]")
            builder.setContentText("[ NOTICE: Focus shield bypassed. Screen time active. ]")
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(true)
            builder.setWhen(targetEpoch)
        } else {
            val count = restrictedPackages.size
            builder.setContentTitle("[ SYSTEM: FOCUS SHIELD ACTIVE ]")
            builder.setContentText(
                if (count > 0) {
                    "[ NOTICE: $count target apps quarantined under System protocol ]"
                } else {
                    "[ NOTICE: Discipline protocol engaged ]"
                }
            )
            builder.setUsesChronometer(false)
        }

        return builder.build()
    }

    private fun updateNotification(unlocked: Boolean, targetEpoch: Long) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        manager.notify(1001, buildNotification(unlocked, targetEpoch))
    }

    private fun normalizePackage(packageName: String?): String? {
        val normalized = packageName?.trim()?.lowercase(java.util.Locale.ROOT)
        return normalized?.takeIf { it.isNotEmpty() && it != "null" }
    }

    private fun normalizePackages(packages: Collection<String>): Set<String> {
        return packages.mapNotNull { normalizePackage(it) }
            .filter { it != packageName.lowercase(java.util.Locale.ROOT) }
            .toSet()
    }

    private fun isPackageRestricted(pkg: String): Boolean {
        val clean = normalizePackage(pkg) ?: return false
        return clean in restrictedPackages
    }

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring || !screenOn) return

            val now = System.currentTimeMillis()

            // Re-evaluate the calendar boundary every pass.  Comparing DAY_OF_YEAR
            // misses year boundaries and does not account for DST length changes.
            val nextReset = BlockPolicyController.getTodayEndEpoch(now)
            if (nextReset != dailyResetTimestamp) {
                Log.i(tag, "Daily rollover detected ($dailyResetTimestamp -> $nextReset). Resetting policy state.")
                dailyResetTimestamp = nextReset
                BlockPolicyController.resetDailyState(this@AppMonitorService)
                lastRestrictedPackage = null
                awayFromRestrictedSince = 0L
                dismissPresentation()
            }

            // The persisted unlock window is checked before any presentation.  A
            // stale in-memory value can never grant access after service recreation.
            val unlockTarget = BlockPolicyController.getUnlockUntil(this@AppMonitorService)
            val isUnlocked = now < unlockTarget
            if (isUnlocked != lastWasUnlocked) {
                lastWasUnlocked = isUnlocked
                updateNotification(isUnlocked, unlockTarget)
                if (!isUnlocked) {
                    lastRestrictedPackage = null
                    awayFromRestrictedSince = 0L
                    dismissPresentation()
                }
            }

            if (isUnlocked) {
                lastRestrictedPackage = null
                awayFromRestrictedSince = 0L
                dismissPresentation()
                val remainingMs = unlockTarget - now
                val nextDelay = if (remainingMs in 1..500) remainingMs else 250L
                handler.postDelayed(this, nextDelay)
                return
            }

            // UsageStats is the foreground source; policy evaluation itself always
            // reads the persisted package budget and current usage.
            val fgPackage = UsageStatsHelper.getForegroundPackage(this@AppMonitorService)
            if (fgPackage != null && isPackageRestricted(fgPackage)) {
                val policy = BlockPolicyController.evaluate(
                    this@AppMonitorService,
                    fgPackage,
                    isForeground = true
                )

                if (policy.lockState == LockState.LOCKED) {
                    awayFromRestrictedSince = 0L
                    lastRestrictedPackage = fgPackage
                    presentLockScreen(fgPackage, policy.dailyLimitMs, policy.usageTodayMs)
                } else {
                    // A limit increase must remove an already-visible presentation on
                    // the very next pass rather than waiting for a service restart.
                    lastRestrictedPackage = null
                    awayFromRestrictedSince = 0L
                    dismissPresentation()
                }
            } else if (fgPackage != null) {
                if (fgPackage.equals(packageName, ignoreCase = true)) {
                    lastRestrictedPackage = null
                    awayFromRestrictedSince = 0L
                    dismissPresentation()
                } else if (lastRestrictedPackage != null && fgPackage != lastRestrictedPackage) {
                    // Give UsageStats a short settling window during an app switch.
                    if (awayFromRestrictedSince == 0L) {
                        awayFromRestrictedSince = now
                    } else if (now - awayFromRestrictedSince > 150L) {
                        dismissPresentation()
                        lastRestrictedPackage = null
                        awayFromRestrictedSince = 0L
                    }
                }
            } else if (lastRestrictedPackage != null) {
                // Home/launcher can be reported as null during a transition.
                if (awayFromRestrictedSince == 0L) {
                    awayFromRestrictedSince = now
                } else if (now - awayFromRestrictedSince > 150L) {
                    dismissPresentation()
                    lastRestrictedPackage = null
                    awayFromRestrictedSince = 0L
                }
            }

            handler.postDelayed(this, 800L)
        }
    }

    private fun presentLockScreen(pkg: String, budgetMs: Long, usedMs: Long) {
        val normalizedPackage = normalizePackage(pkg)
        if (normalizedPackage == null || !isPackageRestricted(normalizedPackage)) {
            // Never create an overlay without an explicitly scoped, currently
            // restricted package.
            dismissPresentation()
            return
        }

        val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }

        if (hasOverlay) {
            // Only one presentation mechanism may be visible at a time.
            if (LockScreenActivity.isShowingFor(normalizedPackage)) return
            LockScreenActivity.finishIfShowing()
            if (!BlockOverlayService.isShowingFor(normalizedPackage)) {
                val overlayIntent = Intent(this, BlockOverlayService::class.java).apply {
                    putExtra("PACKAGE_NAME", normalizedPackage)
                    putExtra("BUDGET_MS", budgetMs)
                    putExtra("USED_MS", usedMs)
                }
                try {
                    // Sending the package on every scope change lets the service
                    // rebuild the title/icon instead of retaining the old app.
                    startService(overlayIntent)
                } catch (e: Exception) {
                    Log.e(tag, "Error starting BlockOverlayService, falling back to activity", e)
                    launchLockActivity(normalizedPackage)
                }
            }
        } else {
            stopOverlayService()
            launchLockActivity(normalizedPackage)
        }
    }

    private fun launchLockActivity(pkg: String) {
        val normalizedPackage = normalizePackage(pkg) ?: return
        if (LockScreenActivity.isShowingFor(normalizedPackage)) return

        val actIntent = Intent(this, LockScreenActivity::class.java).apply {
            putExtra("PACKAGE_NAME", normalizedPackage)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        try {
            startActivity(actIntent)
        } catch (e: Exception) {
            Log.e(tag, "Failed to start LockScreenActivity", e)
        }
    }

    private fun stopOverlayService() {
        try {
            stopService(Intent(this, BlockOverlayService::class.java))
        } catch (_: Exception) {}
    }

    private fun dismissPresentation() {
        stopOverlayService()
        LockScreenActivity.finishIfShowing()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        registerReceiver(screenReceiver, IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        })

        // Load all persisted policy inputs before the first monitor pass.  This
        // prevents a restart from briefly using the zero/default budget.
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
        } catch (securityException: SecurityException) {
            Log.e(tag, "Foreground notification permission is unavailable", securityException)
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
                lastRestrictedPackage = null
                dismissPresentation()
            }
        } else if (restrictedPackages.isEmpty()) {
            // A sticky restart can deliver a null intent.  Restore the scope before
            // beginning enforcement instead of running an unscoped monitor.
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
            } else {
                Log.e(tag, "Rejected unlock update because it could not be persisted")
            }
        }

        if (!isMonitoring) {
            isMonitoring = true
            shouldReevaluate = true
        }

        if (shouldReevaluate) {
            handler.removeCallbacks(monitorRunnable)
            unregisterReceiver(screenReceiver)
            handler.post(monitorRunnable)
        }

        // Sticky is safe here because on a null restart intent the persisted scope
        // and budget are loaded before monitoring begins.
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
        // A killed/replaced monitor must not leave a presentation behind that could
        // be mistaken for an active policy or block a newly scoped package.
        dismissPresentation()
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
