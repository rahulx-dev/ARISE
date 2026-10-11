package com.arise.runningtracker

import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.os.Build
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RunningTrackerModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("RunningTracker")

        Events("onStatsUpdate", "onRunCompleted")

        OnCreate {
            RunningService.listener = { stats ->
                try {
                    this@RunningTrackerModule.sendEvent("onStatsUpdate", stats)
                } catch (e: Exception) {
                    Log.w(RunningService.TAG, "Error sending onStatsUpdate event: ${e.message}")
                }
            }
            RunningService.completionListener = {
                try {
                    this@RunningTrackerModule.sendEvent("onRunCompleted", emptyMap<String, Any>())
                } catch (e: Exception) {
                    Log.w(RunningService.TAG, "Error sending onRunCompleted event: ${e.message}")
                }
            }
        }

        OnDestroy {
            RunningService.listener = null
            RunningService.completionListener = null
        }

        AsyncFunction("startTracking") { targetKm: Double ->
            val context = appContext.reactContext ?: return@AsyncFunction false
            try {
                val intent = Intent(context, RunningService::class.java).apply {
                    action = RunningService.ACTION_START
                    putExtra(RunningService.EXTRA_TARGET_KM, targetKm)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                return@AsyncFunction true
            } catch (e: Exception) {
                Log.e(RunningService.TAG, "Error starting RunningService", e)
                return@AsyncFunction false
            }
        }

        Function("pauseTracking") {
            val context = appContext.reactContext ?: return@Function Unit
            val intent = Intent(context, RunningService::class.java).apply {
                action = RunningService.ACTION_PAUSE
            }
            context.startService(intent)
            return@Function Unit
        }

        Function("resumeTracking") {
            val context = appContext.reactContext ?: return@Function Unit
            val intent = Intent(context, RunningService::class.java).apply {
                action = RunningService.ACTION_RESUME
            }
            context.startService(intent)
            return@Function Unit
        }


        AsyncFunction("stopTracking") {
            val context = appContext.reactContext
            val finalStats = RunningService.getCurrentStatsMap()
            if (context != null) {
                val intent = Intent(context, RunningService::class.java).apply {
                    action = RunningService.ACTION_STOP
                }
                context.startService(intent)
            }
            return@AsyncFunction finalStats
        }

        Function("getStats") {
            return@Function RunningService.getCurrentStatsMap()
        }

        AsyncFunction("isLocationServiceEnabled") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val locMan = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            val gpsEnabled = locMan?.isProviderEnabled(LocationManager.GPS_PROVIDER) ?: false
            val netEnabled = locMan?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ?: false
            return@AsyncFunction (gpsEnabled || netEnabled)
        }
    }
}
