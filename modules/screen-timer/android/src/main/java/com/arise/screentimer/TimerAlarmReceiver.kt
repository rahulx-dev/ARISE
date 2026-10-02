package com.arise.screentimer

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

class TimerAlarmReceiver : BroadcastReceiver() {

    private val tag = "ARISE_TIMER_ALARM"

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = context.getSharedPreferences(ScreenTimerModule.PREFS_NAME, Context.MODE_PRIVATE)
        val activeTarget = prefs.getLong(ScreenTimerModule.KEY_TARGET_END, 0L)
        val expectedTarget = intent.getLongExtra("TARGET_END_EPOCH", 0L)
        val now = System.currentTimeMillis()

        // An old alarm must not clear a newer timer session.
        if (expectedTarget > 0L && expectedTarget != activeTarget) {
            Log.d(tag, "Ignoring stale alarm $expectedTarget; active target is $activeTarget")
            return
        }

        if (activeTarget > now) {
            // The alarm can arrive early on some devices.  Keep the session and
            // restore its service/notification rather than declaring expiry.
            reschedule(context, activeTarget, prefs.getString(ScreenTimerModule.KEY_LABEL, "Screen Time") ?: "Screen Time")
            return
        }

        val label = prefs.getString(ScreenTimerModule.KEY_LABEL, "Screen Time") ?: "Screen Time"
        context.stopService(Intent(context, TimerForegroundService::class.java))
        prefs.edit()
            .remove(ScreenTimerModule.KEY_TARGET_END)
            .remove(ScreenTimerModule.KEY_LABEL)
            .commit()

        if (activeTarget > 0L || expectedTarget > 0L) {
            showExpiryNotification(context, label)
        }
    }

    private fun reschedule(context: Context, targetEndEpoch: Long, label: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val alarmIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
            putExtra("TARGET_END_EPOCH", targetEndEpoch)
            putExtra("LABEL", label)
        }
        val pendingIntent = android.app.PendingIntent.getBroadcast(
            context,
            ScreenTimerModule.REQUEST_CODE,
            alarmIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )
        try {
            alarmManager.setAlarmClock(
                AlarmManager.AlarmClockInfo(targetEndEpoch, pendingIntent),
                pendingIntent
            )
            val serviceIntent = Intent(context, TimerForegroundService::class.java).apply {
                putExtra("TARGET_END_EPOCH", targetEndEpoch)
                putExtra("LABEL", label)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.w(tag, "Unable to reschedule early timer alarm", e)
        }
    }

    private fun showExpiryNotification(context: Context, label: String) {
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
