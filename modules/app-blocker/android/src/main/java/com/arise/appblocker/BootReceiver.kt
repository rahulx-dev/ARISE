package com.arise.appblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Automatically restores app usage monitoring after phone reboot or application update
 * with zero user action required.
 */
class BootReceiver : BroadcastReceiver() {
    private val TAG = "ARISE_BOOT_RECEIVER"

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received broadcast action: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            try {
                // Ensure usage access permission is still granted
                if (!UsageStatsHelper.hasUsagePermission(context)) {
                    Log.w(TAG, "Cannot start AppMonitorService on boot: usage permission is not granted")
                    return
                }

                // Load persisted policy and restricted package set
                BlockPolicyController.loadPersistedState(context)
                val prefs = context.getSharedPreferences(BlockPolicyController.PREFS_NAME, Context.MODE_PRIVATE)
                val savedPackages = prefs.getStringSet("saved_restricted_packages", null)

                if (!savedPackages.isNullOrEmpty()) {
                    Log.d(TAG, "Restarting AppMonitorService with ${savedPackages.size} saved packages after boot")
                    val serviceIntent = Intent(context, AppMonitorService::class.java).apply {
                        putStringArrayListExtra("RESTRICTED_PACKAGES", ArrayList(savedPackages))
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                } else {
                    Log.d(TAG, "No restricted packages saved; AppMonitorService will remain idle")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed restarting AppMonitorService on boot", e)
            }
        }
    }
}
