package com.arise.screentimer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

class TimerAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val label = intent.getStringExtra("LABEL") ?: "Screen Time"

        // Stop the foreground chronometer service
        val stopServiceIntent = Intent(context, TimerForegroundService::class.java)
        context.stopService(stopServiceIntent)

        // Clear active session timestamp from SharedPreferences
        val prefs = context.getSharedPreferences("arise_timer_prefs", Context.MODE_PRIVATE)
        prefs.edit().remove("target_end_epoch").apply()

        // Display High-Priority notification that screen time has expired
        showExpiryNotification(context, label)
    }

    private fun showExpiryNotification(context: Context, label: string) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "arise_timer_expired_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Screen Time Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifies you when unlocked screen time has finished"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(context, channelId)
            .setContentTitle("Screen Time Expired")
            .setContentText("$label session complete. App locks have been restored.")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        manager.notify(2002, notification)
    }
}
