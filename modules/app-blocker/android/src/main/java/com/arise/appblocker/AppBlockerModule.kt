package com.arise.appblocker

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppBlockerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("AppBlocker")

        Function("hasUsagePermission") {
            val context = appContext.reactContext ?: return@Function false
            UsageStatsHelper.hasUsagePermission(context)
        }

        Function("hasOverlayPermission") {
            val context = appContext.reactContext ?: return@Function false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }
        }

        Function("requestUsagePermission") {
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                data = Uri.parse("package:${context.packageName}")
            }
            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                })
            }
        }

        Function("requestOverlayPermission") {
            val context = appContext.reactContext ?: return@Function
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
        }

        Function("startMonitoring") { restrictedPackages: List<String> ->
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(context, AppMonitorService::class.java).apply {
                putStringArrayListExtra("RESTRICTED_PACKAGES", ArrayList(restrictedPackages))
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        Function("stopMonitoring") {
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(context, AppMonitorService::class.java)
            context.stopService(intent)
        }

        Function("getInstalledApps") {
            val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
            val pm = context.packageManager
            val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolveInfos = pm.queryIntentActivities(launcherIntent, 0)
            val apps = mutableListOf<Map<String, Any>>()

            for (info in resolveInfos) {
                val pkgName = info.activityInfo.packageName
                if (pkgName != context.packageName) {
                    val appName = info.loadLabel(pm).toString()
                    val isSystem = (info.activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                    apps.add(
                        mapOf(
                            "packageName" to pkgName,
                            "appName" to appName,
                            "isSystemApp" to isSystem
                        )
                    )
                }
            }
            apps.distinctBy { it["packageName"] }.sortedBy { (it["appName"] as String).lowercase() }
        }
    }
}
