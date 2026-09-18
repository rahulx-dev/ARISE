package com.arise.appblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    private val TAG = "ARISE_BOOT_RECEIVER"

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received broadcast action: ")

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            try {
                val prefs = context.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                val savedPackages = prefs.getStringSet("saved_restricted_packages", null)

                if (!savedPackages.isNullOrEmpty()) {
                    Log.d(TAG, "Starting AppMonitorService with  saved packages on boot")
                    val serviceIntent = Intent(context, AppMonitorService::class.java).apply {
                        putStringArrayListExtra("RESTRICTED_PACKAGES", ArrayList(savedPackages))
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed starting AppMonitorService on boot", e)
            }
        }
    }
}
