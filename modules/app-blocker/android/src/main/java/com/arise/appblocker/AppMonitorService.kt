package com.arise.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

class AppMonitorService : Service() {

    private val TAG = "ARISE_APP_MONITOR"
    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private val restrictedPackages = mutableSetOf<String>()
    private var lastWasUnlocked = false

    private fun updateNotification(unlocked: Boolean, targetEpoch: Long) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        if (unlocked && targetEpoch > System.currentTimeMillis()) {
            builder.setContentTitle("ARISE • Screen Time Unlocked")
            builder.setContentText("Focus shield temporarily unlocked")
            builder.setSmallIcon(android.R.drawable.ic_lock_idle_charging)
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(true)
            builder.setWhen(targetEpoch)
        } else {
            builder.setContentTitle("ARISE Protection Active")
            builder.setContentText("Focus and discipline enforcement enabled")
            builder.setSmallIcon(android.R.drawable.ic_lock_lock)
            builder.setUsesChronometer(false)
        }

        manager.notify(1001, builder.build())
    }

    private val monitorRunnable = object : Runnable {
        override fun run() {
            if (!isMonitoring) return

            val now = System.currentTimeMillis()
            val isUnlocked = now < unlockedUntilEpochMs

            if (isUnlocked != lastWasUnlocked) {
                lastWasUnlocked = isUnlocked
                updateNotification(isUnlocked, unlockedUntilEpochMs)
            }

            // If user has an active screen time pass, bypass blocking and dismiss overlay!
            if (isUnlocked) {
                try {
                    stopService(Intent(this@AppMonitorService, BlockOverlayService::class.java))
                } catch (_: Exception) {}
                handler.postDelayed(this, 1000)
                return
            }

            val fgPackage = UsageStatsHelper.getForegroundPackage(this@AppMonitorService)
            if (fgPackage != null && restrictedPackages.contains(fgPackage)) {
                // Screen time pass has expired. Enforce immediate lock on restricted distraction apps!
                val overlayIntent = Intent(this@AppMonitorService, BlockOverlayService::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startService(overlayIntent)
            }

            handler.postDelayed(this, 1000)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1001, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val packages = intent?.getStringArrayListExtra("RESTRICTED_PACKAGES")
        if (packages != null) {
            restrictedPackages.clear()
            restrictedPackages.addAll(packages)
        }

        val unlockUntil = intent?.getLongExtra("UNLOCKED_UNTIL_EPOCH", 0L) ?: 0L
        if (unlockUntil > 0L) {
            unlockedUntilEpochMs = Math.max(unlockedUntilEpochMs, unlockUntil)
            lastWasUnlocked = true
            updateNotification(true, unlockedUntilEpochMs)
            Log.d(TAG, "Screen time active until: $unlockedUntilEpochMs")
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
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ARISE Protection Active")
            .setContentText("Focus and discipline enforcement enabled")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        isMonitoring = false
        handler.removeCallbacks(monitorRunnable)
    }

    companion object {
        const val CHANNEL_ID = "arise_monitor_channel"
        @Volatile
        var unlockedUntilEpochMs: Long = 0L

        @Volatile
        var defaultBudgetMs: Long = 45 * 60 * 1000L // 45 minutes default daily budget

        val packageBudgetsMs = java.util.concurrent.ConcurrentHashMap<String, Long>()

        fun setUnlockUntil(epochMs: Long) {
            unlockedUntilEpochMs = Math.max(unlockedUntilEpochMs, epochMs)
        }

        fun setBudget(packageName: String?, budgetMinutes: Double) {
            val ms = (budgetMinutes * 60 * 1000).toLong()
            if (packageName != null && packageName.isNotEmpty()) {
                packageBudgetsMs[packageName] = ms
            } else {
                defaultBudgetMs = ms
            }
        }
    }
}
