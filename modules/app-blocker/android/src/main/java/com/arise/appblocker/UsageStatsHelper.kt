package com.arise.appblocker

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.util.Log
import java.util.Calendar
import java.util.concurrent.ConcurrentHashMap

object UsageStatsHelper {

    private const val TAG = "ARISE_USAGE_HELPER"

    /**
     * Cache of detected launcher and system UI package names.
     */
    private val knownLauncherPackages = ConcurrentHashMap.newKeySet<String>().apply {
        addAll(listOf(
            "com.android.systemui",
            "com.google.android.apps.nexuslauncher",
            "com.android.launcher",
            "com.android.launcher3",
            "com.sec.android.app.launcher",
            "com.miui.home",
            "com.oppo.launcher",
            "com.oneplus.launcher",
            "com.huawei.android.launcher",
            "com.motorola.launcher3",
            "com.transsion.hilauncher",
            "com.transsion.XOSLauncher",
            "com.bbk.launcher2",
            "com.vivo.launcher",
            "com.nothing.launcher"
        ))
    }

    @Volatile
    private var lastKnownForegroundPackage: String? = null

    @Volatile
    private var activeSessionPackage: String? = null

    @Volatile
    private var activeSessionStartTime: Long = 0L

    fun hasUsagePermission(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun isSystemLauncherOrUi(context: Context, packageName: String): Boolean {
        if (packageName == "com.android.systemui") return true
        if (knownLauncherPackages.contains(packageName)) return true
        if (packageName.contains("launcher", ignoreCase = true)) return true
        if (packageName.contains("quickstep", ignoreCase = true)) return true

        try {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val resolveInfos = context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            for (info in resolveInfos) {
                val pkg = info.activityInfo?.packageName
                if (pkg != null) {
                    knownLauncherPackages.add(pkg)
                    if (pkg == packageName) return true
                }
            }
        } catch (_: Exception) {}
        return false
    }

    private fun updateActiveSession(pkg: String?, eventTimestamp: Long) {
        if (pkg != activeSessionPackage) {
            activeSessionPackage = pkg
            activeSessionStartTime = if (pkg != null) eventTimestamp else 0L
        }
    }

    /**
     * Real-time Foreground Detection:
     * Chronologically tracks ACTIVITY_RESUMED / MOVE_TO_FOREGROUND events across a sliding 60-second window.
     * Prevents false negatives during in-app activity navigation or static screen viewing.
     */
    fun getForegroundPackage(context: Context): String? {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val now = System.currentTimeMillis()
        val windowStart = now - (60 * 1000L)

        var latestEventTime = 0L
        var latestResumedPkg: String? = null

        try {
            val usageEvents = usageStatsManager.queryEvents(windowStart, now)
            val event = UsageEvents.Event()

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                val pkg = event.packageName ?: continue
                if (pkg == "com.android.systemui") continue

                val type = event.eventType
                val time = event.timeStamp

                if (type == UsageEvents.Event.ACTIVITY_RESUMED || type == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    if (time >= latestEventTime) {
                        latestEventTime = time
                        latestResumedPkg = pkg
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "queryEvents error: ${e.message}")
        }

        if (latestResumedPkg != null) {
            if (isSystemLauncherOrUi(context, latestResumedPkg)) {
                updateActiveSession(null, now)
                lastKnownForegroundPackage = null
                return null
            }

            updateActiveSession(latestResumedPkg, latestEventTime)
            lastKnownForegroundPackage = latestResumedPkg
            return latestResumedPkg
        }

        // Secondary fallback: queryUsageStats INTERVAL_BEST over recent seconds
        try {
            val statsList = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_BEST, now - 10000L, now)
            if (!statsList.isNullOrEmpty()) {
                val topApp = statsList
                    .filter { it.lastTimeUsed > 0 && it.packageName != "com.android.systemui" }
                    .maxByOrNull { it.lastTimeUsed }
                if (topApp != null && (now - topApp.lastTimeUsed) < 8000L) {
                    val pkg = topApp.packageName
                    if (isSystemLauncherOrUi(context, pkg)) {
                        updateActiveSession(null, now)
                        lastKnownForegroundPackage = null
                        return null
                    }
                    updateActiveSession(pkg, topApp.lastTimeUsed)
                    lastKnownForegroundPackage = pkg
                    return pkg
                }
            }
        } catch (_: Exception) {}

        // If no events fired in the last window (e.g. user continuously reading a long post or watching a video),
        // retain the last known foreground package unless it was cleared as home.
        return lastKnownForegroundPackage
    }

    fun clearForegroundCache() {
        lastKnownForegroundPackage = null
        activeSessionPackage = null
        activeSessionStartTime = 0L
    }

    private fun getTodayStartEpoch(): Long {
        return Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    /**
     * Authoritative Deterministic Daily Usage Calculation:
     * 1. Reads the system's aggregated totalTimeInForeground from 00:00:00 local time today.
     * 2. Adds the live session delta if the app is currently in foreground right now.
     */
    fun getPackageTodayUsageMs(context: Context, packageName: String): Long {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L
        val startOfDay = getTodayStartEpoch()
        val now = System.currentTimeMillis()
        val maxPossibleMs = (now - startOfDay).coerceAtLeast(0L)

        var baseUsageMs = 0L

        // Primary source: system aggregated usage stats
        try {
            val statsMap = usageStatsManager.queryAndAggregateUsageStats(startOfDay, now)
            val pkgStat = statsMap[packageName]
            if (pkgStat != null && pkgStat.totalTimeInForeground > 0L) {
                baseUsageMs = pkgStat.totalTimeInForeground
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error querying aggregate usage for $packageName: ${e.message}")
        }

        // Secondary fallback: query daily interval stats directly if aggregate was 0
        if (baseUsageMs == 0L) {
            try {
                val dailyStats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now)
                if (!dailyStats.isNullOrEmpty()) {
                    val match = dailyStats.firstOrNull { it.packageName == packageName }
                    if (match != null && match.totalTimeInForeground > 0L) {
                        baseUsageMs = match.totalTimeInForeground
                    }
                }
            } catch (_: Exception) {}
        }

        // Add in-progress live session delta if the app is currently active in foreground
        var totalUsageMs = baseUsageMs
        if (packageName == activeSessionPackage && activeSessionStartTime > 0L) {
            val liveDelta = (now - activeSessionStartTime).coerceAtLeast(0L)
            totalUsageMs = (baseUsageMs + liveDelta).coerceAtMost(maxPossibleMs)
        }

        return totalUsageMs.coerceIn(0L, maxPossibleMs)
    }

    fun getTotalTodayUsageMs(context: Context): Long {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L
        val startOfDay = getTodayStartEpoch()
        val now = System.currentTimeMillis()

        try {
            val statsMap = usageStatsManager.queryAndAggregateUsageStats(startOfDay, now)
            var total = 0L
            val myPackage = context.packageName
            for ((pkg, stats) in statsMap) {
                if (pkg != myPackage && !isSystemLauncherOrUi(context, pkg)) {
                    total += stats.totalTimeInForeground
                }
            }
            val maxPossibleMs = (now - startOfDay).coerceAtLeast(0L)
            return total.coerceIn(0L, maxPossibleMs)
        } catch (_: Exception) {}
        return 0L
    }
}
