package com.arise.screentimer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScreenTimerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ScreenTimer")

        Function("startSessionTimer") { durationMs: Long, label: String ->
            val context = appContext.reactContext ?: return@Function
            val targetEndEpoch = System.currentTimeMillis() + durationMs

            // 1. Save timestamp to SharedPreferences for BootReceiver & state recovery
            val prefs = context.getSharedPreferences("arise_timer_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putLong("target_end_epoch", targetEndEpoch)
                .putString("label", label)
                .apply()

            // 2. Schedule exact alarm with AlarmManager
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

            // 3. Start live countdown Notification via ForegroundService
            val serviceIntent = Intent(context, TimerForegroundService::class.java).apply {
                putExtra("TARGET_END_EPOCH", targetEndEpoch)
                putExtra("LABEL", label)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }

        Function("cancelSessionTimer") {
            val context = appContext.reactContext ?: return@Function
            val prefs = context.getSharedPreferences("arise_timer_prefs", Context.MODE_PRIVATE)
            prefs.edit().remove("target_end_epoch").apply()

            // Cancel alarm
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val alarmIntent = Intent(context, TimerAlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                2002,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)

            // Stop service
            val serviceIntent = Intent(context, TimerForegroundService::class.java)
            context.stopService(serviceIntent)
        }

        Function("getRemainingMillis") {
            val context = appContext.reactContext ?: return@Function 0L
            val prefs = context.getSharedPreferences("arise_timer_prefs", Context.MODE_PRIVATE)
            val targetEndEpoch = prefs.getLong("target_end_epoch", 0L)
            val diff = targetEndEpoch - System.currentTimeMillis()
            if (diff > 0L) diff else 0L
        }
    }
}
