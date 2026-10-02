package com.arise.screentimer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScreenTimerModule : Module() {

    private val tag = "ARISE_SCREEN_TIMER"

    override fun definition() = ModuleDefinition {
        Name("ScreenTimer")

        Function("startSessionTimer") { durationMs: Long, label: String ->
            val context = appContext.reactContext?.applicationContext
            if (context == null || durationMs <= 0L) {
                Log.w(tag, "Ignoring invalid timer start (context=$context, duration=$durationMs)")
                return@Function Unit
            }

            val targetEndEpoch = System.currentTimeMillis() + durationMs
            val safeLabel = label.trim().takeIf { it.isNotEmpty() } ?: "Screen Time Active"
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // Persist the complete session before scheduling anything.  A service
            // restart can then recover the exact target and label instead of
            // inventing a fresh/default session.
            if (!prefs.edit()
                    .putLong(KEY_TARGET_END, targetEndEpoch)
                    .putString(KEY_LABEL, safeLabel)
                    .commit()
            ) {
                Log.e(tag, "Unable to persist screen timer session")
                return@Function Unit
            }

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager == null) {
                clearPersistedSession(prefs)
                return@Function Unit
            }

            val pendingIntent = createPendingIntent(context, targetEndEpoch, safeLabel)
            try {
                // Replace any previous alarm before scheduling the new target.
                alarmManager.cancel(pendingIntent)
                val alarmClockInfo = AlarmManager.AlarmClockInfo(targetEndEpoch, pendingIntent)
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            } catch (e: Exception) {
                Log.e(tag, "Unable to schedule screen timer alarm", e)
                clearPersistedSession(prefs)
                alarmManager.cancel(pendingIntent)
                return@Function Unit
            }

            val serviceIntent = Intent(context, TimerForegroundService::class.java).apply {
                putExtra("TARGET_END_EPOCH", targetEndEpoch)
                putExtra("LABEL", safeLabel)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } catch (e: Exception) {
                Log.e(tag, "Unable to start screen timer service", e)
                clearPersistedSession(prefs)
                alarmManager.cancel(pendingIntent)
            }
        }

        Function("cancelSessionTimer") {
            val context = appContext.reactContext?.applicationContext
            if (context != null) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val targetEndEpoch = prefs.getLong(KEY_TARGET_END, 0L)
                val label = prefs.getString(KEY_LABEL, "Screen Time") ?: "Screen Time"
                clearPersistedSession(prefs)

                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                if (alarmManager != null) {
                    alarmManager.cancel(createPendingIntent(context, targetEndEpoch, label))
                }

                context.stopService(Intent(context, TimerForegroundService::class.java))
            }
            Unit
        }

        Function("getRemainingMillis") {
            val context = appContext.reactContext?.applicationContext
            if (context != null) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val targetEndEpoch = prefs.getLong(KEY_TARGET_END, 0L)
                val diff = targetEndEpoch - System.currentTimeMillis()
                if (diff > 0L) diff else 0L
            } else {
                0L
            }
        }
    }

    private fun createPendingIntent(context: Context, targetEndEpoch: Long, label: String): PendingIntent {
        val alarmIntent = Intent(context, TimerAlarmReceiver::class.java).apply {
            putExtra("TARGET_END_EPOCH", targetEndEpoch)
            putExtra("LABEL", label)
        }
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            alarmIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun clearPersistedSession(prefs: android.content.SharedPreferences) {
        prefs.edit().remove(KEY_TARGET_END).remove(KEY_LABEL).commit()
    }

    companion object {
        const val PREFS_NAME = "arise_timer_prefs"
        const val KEY_TARGET_END = "target_end_epoch"
        const val KEY_LABEL = "label"
        const val REQUEST_CODE = 2002
    }
}
