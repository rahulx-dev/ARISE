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

        Function("getInstalledApps") {
            val context = appContext.reactContext ?: appContext.currentActivity
            if (context == null) {
                return@Function emptyList<Map<String, Any?>>()
            }
            val pm = context.packageManager
            val apps = mutableListOf<Map<String, Any?>>()
            val myPackage = context.packageName

            try {
                // Tier 1: Query Category Launcher Activities (user-facing launchable apps)
                val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
                val resolveInfos = pm.queryIntentActivities(launcherIntent, 0)
                for (info in resolveInfos) {
                    val pkgName = info.activityInfo.packageName
                    if (pkgName != myPackage) {
                        val appName = info.loadLabel(pm).toString()
                        val isSystem = (info.activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
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
                                "isSystemApp" to isSystem,
                                "appIconBase64" to iconBase64
                            )
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error querying launcher activities", e)
            }

            // Tier 2: Fallback query if launcher query returned empty
            if (apps.isEmpty()) {
                try {
                    val installedList = pm.getInstalledApplications(PackageManager.GET_META_DATA)
                    for (appInfo in installedList) {
                        val pkgName = appInfo.packageName
                        if (pkgName != myPackage && pm.getLaunchIntentForPackage(pkgName) != null) {
                            val appName = appInfo.loadLabel(pm).toString()
                            val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
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
                                    "isSystemApp" to isSystem,
                                    "appIconBase64" to iconBase64
                                )
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error querying installed applications fallback", e)
                }
            }

            val result = apps.distinctBy { it["packageName"] }.sortedBy { ((it["appName"] as? String) ?: "").lowercase() }
            Log.d(TAG, "Installed apps found: ${result.size}")
            result
        }
    }

    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
                drawable.bitmap
            } else {
                val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth.coerceAtMost(96) else 72
                val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight.coerceAtMost(96) else 72
                val b = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(b)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                b
            }
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, outputStream)
            val byteArray = outputStream.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            null
        }
    }
}
