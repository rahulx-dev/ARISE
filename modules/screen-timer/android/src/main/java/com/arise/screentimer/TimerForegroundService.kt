package com.arise.screentimer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class TimerForegroundService : Service() {

    private val tag = "ARISE_TIMER_SERVICE"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences(ScreenTimerModule.PREFS_NAME, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val persistedTarget = prefs.getLong(ScreenTimerModule.KEY_TARGET_END, 0L)
        val requestedTarget = intent?.getLongExtra("TARGET_END_EPOCH", 0L) ?: 0L
        // SharedPreferences is the authoritative session record.  A delayed
        // service intent must not overwrite a newer target that was persisted by
        // a later start call.
        val targetEndEpoch = if (persistedTarget > 0L) persistedTarget else requestedTarget
        val requestedLabel = intent?.getStringExtra("LABEL")
        val persistedLabel = prefs.getString(ScreenTimerModule.KEY_LABEL, null)
        val label = (persistedLabel ?: requestedLabel)
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: "Screen Time Active"

        if (targetEndEpoch <= now) {
            // A sticky restart with no active target must not create a misleading
            // ongoing notification.  The alarm receiver owns expiry cleanup.
            if (persistedTarget > 0L) {
                prefs.edit()
                    .remove(ScreenTimerModule.KEY_TARGET_END)
                    .remove(ScreenTimerModule.KEY_LABEL)
                    .commit()
            }
            stopSelfResult(startId)
            return START_NOT_STICKY
        }

        // Keep the recovered values authoritative for a subsequent null-intent
        // restart, including the latest label rather than a stale default.
        prefs.edit()
            .putLong(ScreenTimerModule.KEY_TARGET_END, targetEndEpoch)
            .putString(ScreenTimerModule.KEY_LABEL, label)
            .commit()

        createNotificationChannel()
        try {
            startForeground(2001, createChronometerNotification(targetEndEpoch, label))
            Log.d(tag, "Screen timer active until $targetEndEpoch ($label)")
        } catch (e: Exception) {
            Log.e(tag, "Foreground service start failed", e)
        }

        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Screen Time Countdown",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Displays active unlocked screen time progress"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createChronometerNotification(targetEndEpoch: Long, label: String): Notification {
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ARISE Unlocked Session")
            .setContentText(label)
            .setSmallIcon(android.R.drawable.ic_lock_idle_charging)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        if (targetEndEpoch > System.currentTimeMillis()) {
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(true)
            builder.setWhen(targetEndEpoch)
        }

        return builder.build()
    }

    companion object {
        const val CHANNEL_ID = "arise_screen_timer_ongoing"
    }
}
