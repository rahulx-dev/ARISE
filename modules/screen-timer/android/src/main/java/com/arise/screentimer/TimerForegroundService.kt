package com.arise.screentimer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class TimerForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val targetEndEpoch = intent?.getLongExtra("TARGET_END_EPOCH", 0L) ?: 0L
        val label = intent?.getStringExtra("LABEL") ?: "Screen Time Active"

        createNotificationChannel()
        startForeground(2001, createChronometerNotification(targetEndEpoch, label))

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
