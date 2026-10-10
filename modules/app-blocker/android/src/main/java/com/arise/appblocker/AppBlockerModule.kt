package com.arise.appblocker

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

class AppBlockerModule : Module() {
    private val TAG = "ARISE_NATIVE_BLOCKER"

    override fun definition() = ModuleDefinition {
        Name("AppBlocker")

        Function("hasUsagePermission") {
            val context = appContext.reactContext ?: appContext.currentActivity
            val granted = if (context != null) {
                UsageStatsHelper.hasUsagePermission(context)
            } else {
                false
            }
            Log.d(TAG, "Usage Access Permission: $granted")
            granted
        }

        Function("hasOverlayPermission") { 
            val context = appContext.reactContext ?: appContext.currentActivity
            val granted = if (context != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Settings.canDrawOverlays(context)
                } else {
                    true
                }
            } else {
                false
            }
            Log.d(TAG, "Overlay Permission: $granted")
            granted
        }

        Function("requestUsagePermission") {
            val activity = appContext.currentActivity
            val context = appContext.reactContext
            val targetContext = activity ?: context
            if (targetContext != null) {
                Log.d(TAG, "Opening ACTION_USAGE_ACCESS_SETTINGS")
                val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                    if (activity == null) {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                }
                try {
                    targetContext.startActivity(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed opening usage access settings", e)
                }
            }
            Unit
        }

        Function("requestOverlayPermission") {
            val activity = appContext.currentActivity
            val context = appContext.reactContext
            val targetContext = activity ?: context
            val pkg = context?.packageName ?: activity?.packageName ?: "com.arise.app"

            if (targetContext != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Log.d(TAG, "Opening ACTION_MANAGE_OVERLAY_PERMISSION for $pkg")
                try {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:$pkg")
                    ).apply {
                        if (activity == null) {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                    }
                    targetContext.startActivity(intent)
                } catch (e: Exception) {
                    Log.w(TAG, "Fallback to general overlay permission settings", e)
                    try {
                        val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                            if (activity == null) {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                        }
                        targetContext.startActivity(fallbackIntent)
                    } catch (err: Exception) {
                        Log.e(TAG, "Failed to open overlay settings", err)
                    }
                }
            }
            Unit
        }

        Function("hasBatteryOptimizationExemption") {
            val context = appContext.reactContext ?: appContext.currentActivity
            val granted = if (context != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val pkg = context.packageName ?: appContext.currentActivity?.packageName ?: "com.arise.app"
                powerManager?.isIgnoringBatteryOptimizations(pkg) ?: false
            } else {
                true
            }
            Log.d(TAG, "Battery Optimization Exemption: $granted")
            granted
        }

        Function("requestBatteryOptimizationExemption") {
            val activity = appContext.currentActivity
            val context = appContext.reactContext
            val targetContext = activity ?: context
            val pkg = context?.packageName ?: activity?.packageName ?: "com.arise.app"

            if (targetContext != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Log.d(TAG, "Requesting ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS for $pkg")
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$pkg")
                        if (activity == null) {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                    }
                    targetContext.startActivity(intent)
                } catch (e: Exception) {
                    Log.w(TAG, "Fallback to general battery optimization settings", e)
                    try {
                        val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                            if (activity == null) {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                        }
                        targetContext.startActivity(fallbackIntent)
                    } catch (err: Exception) {
                        Log.e(TAG, "Failed to open battery optimization settings", err)
                    }
                }
            }
            Unit
        }

        Function("startMonitoring") { restrictedPackages: List<String> ->
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context != null) {
                Log.d(TAG, "startMonitoring called with ${restrictedPackages.size} packages")
                val intent = Intent(context, AppMonitorService::class.java).apply {
                    putStringArrayListExtra("RESTRICTED_PACKAGES", ArrayList(restrictedPackages))
                }
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error starting AppMonitorService", e)
                }
            }
            Unit
        }

        Function("stopMonitoring") {
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context != null) {
                Log.d(TAG, "stopMonitoring called")
                try {
                    context.getSharedPreferences(BlockPolicyController.PREFS_NAME, Context.MODE_PRIVATE)
                        .edit()
                        .remove("saved_restricted_packages")
                        .commit()
                } catch (e: Exception) {
                    Log.e(TAG, "Unable to clear persisted restricted packages", e)
                }
                val intent = Intent(context, AppMonitorService::class.java)
                try {
                    context.stopService(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "Error stopping AppMonitorService", e)
                }
            }
            Unit
        }

        Function("setRestrictedPackages") { restrictedPackages: List<String> ->
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context != null) {
                Log.d(TAG, "setRestrictedPackages called with ${restrictedPackages.size} packages")
                val intent = Intent(context, AppMonitorService::class.java).apply {
                    putStringArrayListExtra("RESTRICTED_PACKAGES", ArrayList(restrictedPackages))
                }
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error updating restricted packages", e)
                }
            }
            Unit
        }

        Function("setAppBudget") { packageName: String?, budgetMinutes: Double ->
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context == null) {
                Log.e(TAG, "setAppBudget rejected: native context unavailable")
                return@Function Unit
            }
            AppMonitorService.setBudget(context, packageName, budgetMinutes)
            val intent = Intent(context, AppMonitorService::class.java).apply {
                putExtra("UPDATED_BUDGET_MINUTES", budgetMinutes)
                if (packageName != null) putExtra("UPDATED_PACKAGE_NAME", packageName)
                // A budget update can restart a service that was previously
                // stopped. Carry the persisted restrictions so resetting the
                // allowance cannot leave enforcement running without targets.
                val savedPackages = context
                    .getSharedPreferences(BlockPolicyController.PREFS_NAME, Context.MODE_PRIVATE)
                    .getStringSet("saved_restricted_packages", null)
                if (savedPackages != null) {
                    putStringArrayListExtra(
                        "RESTRICTED_PACKAGES",
                        ArrayList(savedPackages)
                    )
                }
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending budget update to service", e)
            }
            Log.d(TAG, "setAppBudget: $packageName -> $budgetMinutes min")
            Unit
        }

        Function("temporaryUnlock") { durationMs: Double ->
            val maxUnlockMs = 20 * 60 * 1000L
            if (!durationMs.isFinite() || durationMs <= 0.0 || durationMs > maxUnlockMs) {
                Log.w(TAG, "temporaryUnlock rejected invalid duration: $durationMs")
                return@Function false
            }
            val epochTarget = System.currentTimeMillis() + durationMs.toLong()
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context == null || !AppMonitorService.setUnlockUntil(context, epochTarget)) {
                Log.e(TAG, "temporaryUnlock rejected: native context/persistence unavailable")
                return@Function false
            }
            val intent = Intent(context, AppMonitorService::class.java).apply {
                putExtra("UNLOCKED_UNTIL_EPOCH", epochTarget)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending unlock to service", e)
                AppMonitorService.setUnlockUntil(context, 0L)
                return@Function false
            }
            Log.d(TAG, "temporaryUnlock for $durationMs ms, target epoch: $epochTarget")
            true
        }

        Function("unlockUntil") { epochMs: Double ->
            if (!epochMs.isFinite()) {
                Log.w(TAG, "unlockUntil rejected invalid epoch: $epochMs")
                return@Function false
            }
            val epochTarget = epochMs.toLong()
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context == null || !AppMonitorService.setUnlockUntil(context, epochTarget)) {
                Log.e(TAG, "unlockUntil rejected: native context/persistence unavailable")
                return@Function false
            }
            val intent = Intent(context, AppMonitorService::class.java).apply {
                putExtra("UNLOCKED_UNTIL_EPOCH", epochTarget)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending unlock to service", e)
                AppMonitorService.setUnlockUntil(context, 0L)
                return@Function false
            }
            Log.d(TAG, "unlockUntil epoch: $epochTarget")
            true
        }

        Function("isCurrentlyUnlocked") {
            val context = appContext.reactContext ?: appContext.currentActivity
            val unlockedUntil = AppMonitorService.getUnlockUntil(context)
            val isUnlocked = System.currentTimeMillis() < unlockedUntil
            Log.d(TAG, "isCurrentlyUnlocked: $isUnlocked")
            isUnlocked
        }

        Function("showTestOverlay") { targetPackage: String? ->
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context == null) return@Function false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                Log.w(TAG, "showTestOverlay rejected: overlay permission unavailable")
                return@Function false
            }
            val packageName = targetPackage?.trim()?.takeIf { it.isNotEmpty() && it != "null" }
                ?: return@Function false
            val overlayIntent = Intent(context, BlockOverlayService::class.java).apply {
                putExtra("PACKAGE_NAME", packageName)
                putExtra("BUDGET_MS", 0L)
                putExtra("USED_MS", 35 * 60 * 1000L)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try {
                context.startService(overlayIntent)
                Log.d(TAG, "showTestOverlay launched for $packageName")
            } catch (e: Exception) {
                Log.e(TAG, "showTestOverlay failed", e)
                return@Function false
            }
            true
        }

        Function("getPackageTodayUsageMs") { packageName: String ->
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context != null) {
                UsageStatsHelper.getPackageTodayUsageMs(context, packageName).toDouble()
            } else {
                0.0
            }
        }

        Function("getTotalTodayUsageMs") {
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context != null) {
                UsageStatsHelper.getTotalTodayUsageMs(context).toDouble()
            } else {
                0.0
            }
        }

        Function("isAppInstalled") { packageName: String ->
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context == null) return@Function false
            try {
                context.packageManager.getPackageInfo(packageName, 0)
                true
            } catch (e: PackageManager.NameNotFoundException) {
                false
            } catch (e: Exception) {
                false
            }
        }

        AsyncFunction("getInstalledApps") {
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context == null) {
                return@AsyncFunction emptyList<Map<String, Any?>>()
            }
            val pm = context.packageManager
            val apps = mutableListOf<Map<String, Any?>>()
            val myPackage = context.packageName
            val coreSystemExclusions = setOf("android", "com.android.systemui", "com.android.settings")

            try {
                // Tier 1: Query Category Launcher Activities (user-facing launchable apps)
                val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PackageManager.MATCH_ALL else 0
                val resolveInfos = pm.queryIntentActivities(launcherIntent, flags)
                for (info in resolveInfos) {
                    val pkgName = info.activityInfo.packageName
                    if (pkgName != myPackage && !coreSystemExclusions.contains(pkgName)) {
                        val appName = info.loadLabel(pm).toString()
                        val iconBase64 = try {
                            val iconDrawable = info.loadIcon(pm)
                            drawableToBase64(iconDrawable)
                        } catch (e: Exception) {
                            null
                        }
                        apps.add(
                            mapOf(
                                "packageName" to pkgName,
                                "appName" to appName,
                                "isSystemApp" to false,
                                "appIconBase64" to iconBase64
                            )
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error querying launcher activities", e)
            }

            // Tier 2: Also query all installed applications that have a launch intent (catches pre-installed YouTube, Chrome, etc.)
            try {
                val installedList = pm.getInstalledApplications(PackageManager.GET_META_DATA)
                for (appInfo in installedList) {
                    val pkgName = appInfo.packageName
                    if (pkgName != myPackage && !coreSystemExclusions.contains(pkgName)) {
                        val launchIntent = pm.getLaunchIntentForPackage(pkgName)
                        if (launchIntent != null) {
                            val appName = appInfo.loadLabel(pm).toString()
                            val iconBase64 = try {
                                val iconDrawable = appInfo.loadIcon(pm)
                                drawableToBase64(iconDrawable)
                            } catch (e: Exception) {
                                null
                            }
                            apps.add(
                                mapOf(
                                    "packageName" to pkgName,
                                    "appName" to appName,
                                    "isSystemApp" to false,
                                    "appIconBase64" to iconBase64
                                )
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error querying installed applications with launch intents", e)
            }

            val result = apps.distinctBy { it["packageName"] }.sortedBy { ((it["appName"] as? String) ?: "").lowercase() }
            Log.d(TAG, "Total launchable apps discovered: ${result.size}")
            result
        }
    }

    private fun drawableToBase64(drawable: Drawable?): String? {
        if (drawable == null) return null
        var bitmap: Bitmap? = null
        return try {
            val size = 64
            bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 80, outputStream)
            val byteArray = outputStream.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "Error encoding icon drawable: ${e.message}")
            null
        } finally {
            try {
                bitmap?.recycle()
            } catch (_: Exception) {}
        }
    }
}
