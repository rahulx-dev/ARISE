package com.arise.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.Calendar

class AppMonitorService : Service() {

    private val TAG = "ARISE_APP_MONITOR"
    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private val restrictedPackages = mutableSetOf<String>()
    private var lastWasUnlocked = false

    private var currentDayOfYear = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
    private var lastRestrictedPackage: String? = null
    private var awayFromRestrictedSince: Long = 0L

    private fun getAppNotificationIcon(): Int {
        val resId = resources.getIdentifier("notification_icon", "drawable", packageName)
        if (resId != 0) return resId
        val appIcon = applicationInfo.icon
        if (appIcon != 0) return appIcon
        return android.R.drawable.ic_lock_lock
    }

    private fun getOpenArisePendingIntent(): PendingIntent {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
        launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getActivity(this, 0, launchIntent, flags)
    }

    private fun buildNotification(unlocked: Boolean, targetEpoch: Long): Notification {
        val icon = getAppNotificationIcon()
        val pendingIntent = getOpenArisePendingIntent()
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(Color.parseColor("#0A84FF"))
            .setContentIntent(pendingIntent)
            .setSmallIcon(icon)

        if (unlocked && targetEpoch > System.currentTimeMillis()) {
            builder.setContentTitle("[ SYSTEM: ACCESS GRANTED ]")
            builder.setContentText("[ NOTICE: Focus shield bypassed. Screen time active. ]")
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(true)
            builder.setWhen(targetEpoch)
        } else {
            val count = restrictedPackages.size
            builder.setContentTitle("[ SYSTEM: FOCUS SHIELD ACTIVE ]")
            builder.setContentText(if (count > 0) "[ NOTICE: $count target apps quarantined under System protocol ]" else "[ NOTICE: Discipline protocol engaged ]")
            builder.setUsesChronometer(false)
        }

        return builder.build()
    }

    private fun updateNotification(unlocked: Boolean, targetEpoch: Long) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        manager.notify(1001, buildNotification(unlocked, targetEpoch))
    }

    private fun isPackageRestricted(pkg: String): Boolean {
        if (restrictedPackages.isEmpty()) return false
        val clean = pkg.trim().lowercase()
        return restrictedPackages.any { it.trim().lowercase() == clean }
    }

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring) return

            val now = System.currentTimeMillis()

            // 1. Midnight Roll-Over Reset Check (00:00:00 Local Time)
            val todayDay = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
            if (todayDay != currentDayOfYear) {
                Log.i(TAG, "Midnight rollover detected (day $currentDayOfYear -> $todayDay). Resetting daily policy state.")
                currentDayOfYear = todayDay
                BlockPolicyController.resetDailyState()
            }

            // 2. Unlock Window Pass Check
            val unlockTarget = BlockPolicyController.getUnlockUntil(this@AppMonitorService)
            val isUnlocked = now < unlockTarget

            if (isUnlocked != lastWasUnlocked) {
                lastWasUnlocked = isUnlocked
                updateNotification(isUnlocked, unlockTarget)
                if (!isUnlocked) {
                    lastRestrictedPackage = null
                    BlockPolicyController.setUnlockUntil(this@AppMonitorService, 0L)
                }
            }

            // If user has an active screen time pass, dismiss overlay immediately
            if (isUnlocked) {
                lastRestrictedPackage = null
                awayFromRestrictedSince = 0L
                if (BlockOverlayService.isOverlayShowing) {
                    try {
                        stopService(Intent(this@AppMonitorService, BlockOverlayService::class.java))
                    } catch (_: Exception) {}
                }
                val remainingMs = unlockTarget - now
                val nextDelay = if (remainingMs in 1..500) remainingMs else 250L
                handler.postDelayed(this, nextDelay)
                return
            }

            // 3. Foreground Package Detection & Authoritative Enforcement
            val fgPackage = UsageStatsHelper.getForegroundPackage(this@AppMonitorService)

            if (fgPackage != null && isPackageRestricted(fgPackage)) {
                val policy = BlockPolicyController.evaluate(this@AppMonitorService, fgPackage, isForeground = true)

                if (policy.lockState == LockState.LOCKED) {
                    awayFromRestrictedSince = 0L
                    lastRestrictedPackage = fgPackage

                    if (!BlockOverlayService.isOverlayShowing) {
                        val overlayIntent = Intent(this@AppMonitorService, BlockOverlayService::class.java).apply {
                            putExtra("PACKAGE_NAME", fgPackage)
                            putExtra("BUDGET_MS", policy.dailyLimitMs)
                            putExtra("USED_MS", policy.usageTodayMs)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        try {
                            startService(overlayIntent)
                            BlockPolicyController.logEnforcement(
                                packageName = fgPackage,
                                locked = true,
                                presentationRestored = true,
                                reason = "LOCKED_APP_FOREGROUND"
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to start BlockOverlayService", e)
                        }
                    }
                } else {
                    // App is UNLOCKED
                    if (lastRestrictedPackage != null || BlockOverlayService.isOverlayShowing) {
                        lastRestrictedPackage = null
                        awayFromRestrictedSince = 0L
                        try {
                            stopService(Intent(this@AppMonitorService, BlockOverlayService::class.java))
                            BlockPolicyController.logEnforcement(
                                packageName = fgPackage,
                                locked = false,
                                presentationRestored = false,
                                reason = "BUDGET_NOT_EXHAUSTED"
                            )
                        } catch (_: Exception) {}
                    }
                }
            } else if (fgPackage != null) {
                if (fgPackage == packageName) {
                    // User opened ARISE app
                    lastRestrictedPackage = null
                    awayFromRestrictedSince = 0L
                    if (BlockOverlayService.isOverlayShowing) {
                        try {
                            stopService(Intent(this@AppMonitorService, BlockOverlayService::class.java))
                        } catch (_: Exception) {}
                    }
                } else if (lastRestrictedPackage != null && fgPackage != lastRestrictedPackage) {
                    // User switched to another non-restricted app (e.g. Phone, Settings)
                    if (awayFromRestrictedSince == 0L) {
                        awayFromRestrictedSince = now
                    } else if (now - awayFromRestrictedSince > 150L) {
                        if (BlockOverlayService.isOverlayShowing) {
                            try {
                                stopService(Intent(this@AppMonitorService, BlockOverlayService::class.java))
                            } catch (_: Exception) {}
                        }
                        lastRestrictedPackage = null
                        awayFromRestrictedSince = 0L
                    }
                }
            } else {
                // fgPackage is null (User on Home Screen / Launcher)
                if (lastRestrictedPackage != null) {
                    if (awayFromRestrictedSince == 0L) {
                        awayFromRestrictedSince = now
                    } else if (now - awayFromRestrictedSince > 150L) {
                        if (BlockOverlayService.isOverlayShowing) {
                            try {
                                stopService(Intent(this@AppMonitorService, BlockOverlayService::class.java))
                            } catch (_: Exception) {}
                        }
                        lastRestrictedPackage = null
                        awayFromRestrictedSince = 0L
                    }
                }
            }

            val pollIntervalMs = if (fgPackage != null && isPackageRestricted(fgPackage)) 100L else 250L
            handler.postDelayed(this, pollIntervalMs)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1001, createNotification())

        // Restore persisted state from SharedPreferences
        try {
            val prefs = getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
            val savedUnlock = prefs.getLong("unlocked_until_epoch", 0L)
            if (savedUnlock > System.currentTimeMillis()) {
                BlockPolicyController.unlockedUntilEpochMs = savedUnlock
            } else {
                prefs.edit().remove("unlocked_until_epoch").apply()
                BlockPolicyController.unlockedUntilEpochMs = 0L
            }
            val savedPackages = prefs.getStringSet("saved_restricted_packages", null)
            if (savedPackages != null && savedPackages.isNotEmpty()) {
                restrictedPackages.addAll(savedPackages)
            }
            val savedDefaultBudget = prefs.getLong("default_budget_ms", -1L)
            if (savedDefaultBudget >= 0L) {
                BlockPolicyController.defaultBudgetMs = savedDefaultBudget
            }
        } catch (_: Exception) {}
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val updatedBudget = intent?.getDoubleExtra("UPDATED_BUDGET_MINUTES", -1.0) ?: -1.0
        if (updatedBudget >= 0) {
            val updatedPkg = intent?.getStringExtra("UPDATED_PACKAGE_NAME")
            BlockPolicyController.updateBudget(this, updatedPkg, updatedBudget)
            Log.d(TAG, "Applied live budget update: $updatedPkg -> $updatedBudget min")
            handler.removeCallbacks(monitorRunnable)
            handler.post(monitorRunnable)
        }

        val packages = intent?.getStringArrayListExtra("RESTRICTED_PACKAGES")
        if (packages != null) {
            restrictedPackages.clear()
            restrictedPackages.addAll(packages)
            try {
                val prefs = getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                prefs.edit().putStringSet("saved_restricted_packages", HashSet(packages)).apply()
            } catch (_: Exception) {}
        } else if (restrictedPackages.isEmpty()) {
            try {
                val prefs = getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                val savedPackages = prefs.getStringSet("saved_restricted_packages", null)
                if (savedPackages != null && savedPackages.isNotEmpty()) {
                    restrictedPackages.addAll(savedPackages)
                }
            } catch (_: Exception) {}
        }

        val unlockUntil = intent?.getLongExtra("UNLOCKED_UNTIL_EPOCH", 0L) ?: 0L
        if (unlockUntil > 0L) {
            BlockPolicyController.setUnlockUntil(this, unlockUntil)
            lastWasUnlocked = true
            updateNotification(true, BlockPolicyController.unlockedUntilEpochMs)
            Log.d(TAG, "Screen time active until: ${BlockPolicyController.unlockedUntilEpochMs}")
            val delay = (unlockUntil - System.currentTimeMillis()).coerceAtLeast(0L)
            handler.postDelayed({
                if (isMonitoring) {
                    handler.removeCallbacks(monitorRunnable)
                    handler.post(monitorRunnable)
                }
            }, delay + 50)
        }

        if (!isMonitoring) {
            isMonitoring = true
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

    private fun createNotification(): Notification {
        return buildNotification(false, 0L)
    }

    override fun onDestroy() {
        super.onDestroy()
        isMonitoring = false
        handler.removeCallbacks(monitorRunnable)
    }

    companion object {
        const val CHANNEL_ID = "arise_monitor_channel"

        fun setBudget(context: Context?, packageName: String?, budgetMinutes: Double) {
            BlockPolicyController.updateBudget(context, packageName, budgetMinutes)
        }

        fun getBudgetForPackage(context: Context, packageName: String): Long {
            return BlockPolicyController.getBudgetForPackage(context, packageName)
        }

        fun setUnlockUntil(context: Context?, epochMs: Long) {
            BlockPolicyController.setUnlockUntil(context, epochMs)
        }

        fun getUnlockUntil(context: Context?): Long {
            return BlockPolicyController.getUnlockUntil(context)
        }
    }
}
