package com.arise.screentimer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    private val tag = "ARISE_TIMER_BOOT"

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return

        val prefs = context.getSharedPreferences(ScreenTimerModule.PREFS_NAME, Context.MODE_PRIVATE)
        val targetEndEpoch = prefs.getLong(ScreenTimerModule.KEY_TARGET_END, 0L)
        val label = prefs.getString(ScreenTimerModule.KEY_LABEL, "Screen Time")
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: "Screen Time"
        val now = System.currentTimeMillis()

        if (targetEndEpoch > now) {
            // Timer is still active: restore both the alarm and the notification
            // service from the persisted session, never from a default label.
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                if (alarmManager != null) {
                    val alarmIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
                        putExtra("TARGET_END_EPOCH", targetEndEpoch)
                        putExtra("LABEL", label)
                    }
                    val pendingIntent = PendingIntent.getBroadcast(
                        context,
                        ScreenTimerModule.REQUEST_CODE,
                        alarmIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    alarmManager.setAlarmClock(
                        AlarmManager.AlarmClockInfo(targetEndEpoch, pendingIntent),
                        pendingIntent
                    )
                }

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
                Log.e(tag, "Failed restoring active screen timer", e)
            }
        } else if (targetEndEpoch > 0L) {
            // Expired while the device was off.  Use an explicit target so a stale
            // alarm cannot clear a newer session.
            val expireIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
                putExtra("TARGET_END_EPOCH", targetEndEpoch)
                putExtra("LABEL", label)
            }
            context.sendBroadcast(expireIntent)
        }
    }
}
