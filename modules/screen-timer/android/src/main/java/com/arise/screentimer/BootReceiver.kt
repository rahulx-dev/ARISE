package com.arise.screentimer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {

            val prefs = context.getSharedPreferences("arise_timer_prefs", Context.MODE_PRIVATE)
            val targetEndEpoch = prefs.getLong("target_end_epoch", 0L)
            val label = prefs.getString("label", "Screen Time") ?: "Screen Time"
            val now = System.currentTimeMillis()

            if (targetEndEpoch > now) {
                // Timer is still active! Reschedule exact alarm and ongoing notification
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val alarmIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
                    putExtra("LABEL", label)
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    2002,
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val alarmClockInfo = AlarmManager.AlarmClockInfo(targetEndEpoch, pendingIntent)
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)

                // Restart the Foreground Chronometer
                val serviceIntent = Intent(context, TimerForegroundService::class.java).apply {
                    putExtra("TARGET_END_EPOCH", targetEndEpoch)
                    putExtra("LABEL", label)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } else if (targetEndEpoch > 0L) {
                // Expired while device was off! Fire expiry cleanup immediately
                val expireIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
                    putExtra("LABEL", label)
                }
                context.sendBroadcast(expireIntent)
            }
        }
    }
}
