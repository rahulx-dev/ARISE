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
import java.util.Locale

object UsageStatsHelper {

    private const val AUDIT_TAG = "ARISE_BLOCKER"
    private const val TAG = "UsageStatsHelper"

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

    private val knownLauncherPackages = mutableSetOf(
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
    )

    fun isSystemLauncherOrUi(context: Context, packageName: String): Boolean {
        if (packageName == "com.android.systemui") return true
        if (packageName.contains("launcher", ignoreCase = true)) return true
        if (packageName.contains("quickstep", ignoreCase = true)) return true
        if (packageName.contains("nexuslauncher", ignoreCase = true)) return true
        if (knownLauncherPackages.contains(packageName)) return true

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

    private var cachedForegroundPackage: String? = null
    private var lastForegroundTimestamp: Long = 0L

    /**
     * Real-time Chronological Foreground Detection:
     * Queries recent events in the last 10 seconds to determine the exact currently active application.
     */
    fun getForegroundPackage(context: Context): String? {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
        val endTime = System.currentTimeMillis()
        val startTime = endTime - (10 * 1000L)

        var latestEventTime = 0L
        var latestPkg: String? = null

        try {
            val usageEvents = usageStatsManager.queryEvents(startTime, endTime)
            val ev = UsageEvents.Event()

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(ev)
                val pkg = ev.packageName ?: continue
                if (pkg == "com.android.systemui") continue

                val type = ev.eventType
                val time = ev.timeStamp

                when (type) {
                    UsageEvents.Event.ACTIVITY_RESUMED,
                    UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                        if (time >= latestEventTime) {
                            latestEventTime = time
                            latestPkg = pkg
                        }
                    }
                    UsageEvents.Event.ACTIVITY_PAUSED,
                    UsageEvents.Event.ACTIVITY_STOPPED,
                    UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                        if (time >= latestEventTime && latestPkg == pkg) {
                            latestEventTime = time
                            latestPkg = null
                        }
                    }
                }
            }

            if (latestPkg != null) {
                if (isSystemLauncherOrUi(context, latestPkg)) {
                    cachedForegroundPackage = null
                    return null
                }
                cachedForegroundPackage = latestPkg
                lastForegroundTimestamp = latestEventTime
                return latestPkg
            }
        } catch (e: Exception) {
            Log.w(TAG, "queryEvents error: ${e.message}")
        }

        // Secondary Real-Time Fallback: Query INTERVAL_BEST usage stats for instant lastTimeUsed detection
        try {
            val statsList = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_BEST, endTime - 3500L, endTime)
            if (!statsList.isNullOrEmpty()) {
                val topApp = statsList.filter { it.lastTimeUsed > 0 && it.packageName != "com.android.systemui" }
                    .maxByOrNull { it.lastTimeUsed }
                if (topApp != null && (endTime - topApp.lastTimeUsed) < 2500L) {
                    if (isSystemLauncherOrUi(context, topApp.packageName)) {
                        cachedForegroundPackage = null
                        return null
                    }
                    cachedForegroundPackage = topApp.packageName
                    lastForegroundTimestamp = topApp.lastTimeUsed
                    return topApp.packageName
                }
            }
        } catch (_: Exception) {}

        return cachedForegroundPackage
    }

    /**
     * Authoritative Deterministic Daily Millisecond Usage Calculation:
     * Computes usage strictly from 00:00:00 local time today.
     * Uses stateful event transition tracking and adds active session delta if app is currently in foreground.
     */
    fun getPackageTodayUsageMs(context: Context, packageName: String): Long {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()
        val maxPossibleMs = (endTime - startTime).coerceAtLeast(0L)

        var totalUsageMs = 0L
        var sessionStartTime = 0L
        var isSessionActive = false
        var hasEvents = false

        try {
            val usageEvents = usageStatsManager.queryEvents(startTime, endTime)
            val event = UsageEvents.Event()

            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                if (event.packageName == packageName) {
                    hasEvents = true
                    val time = event.timeStamp.coerceIn(startTime, endTime)

                    when (event.eventType) {
                        UsageEvents.Event.ACTIVITY_RESUMED,
                        UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                            if (!isSessionActive) {
                                isSessionActive = true
                                sessionStartTime = time
                            }
                        }
                        UsageEvents.Event.ACTIVITY_PAUSED,
                        UsageEvents.Event.ACTIVITY_STOPPED,
                        UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                            if (isSessionActive) {
                                isSessionActive = false
                                if (time >= sessionStartTime && sessionStartTime > 0L) {
                                    totalUsageMs += (time - sessionStartTime)
                                }
                                sessionStartTime = 0L
                            }
                        }
                    }
                }
            }

            if (isSessionActive && sessionStartTime > 0L && endTime >= sessionStartTime) {
                totalUsageMs += (endTime - sessionStartTime)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating usage events for $packageName", e)
        }

        if (!hasEvents && totalUsageMs == 0L) {
            try {
                val statsMap = usageStatsManager.queryAndAggregateUsageStats(startTime, endTime)
                val pkgStat = statsMap[packageName]
                if (pkgStat != null && pkgStat.totalTimeInForeground > 0L) {
                    totalUsageMs = pkgStat.totalTimeInForeground
                }
            } catch (_: Exception) {}
        }

        return totalUsageMs.coerceIn(0L, maxPossibleMs)
    }

    fun getTotalTodayUsageMs(context: Context): Long {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startTime = calendar.timeInMillis
        val endTime = System.currentTimeMillis()

        try {
            val statsMap = usageStatsManager.queryAndAggregateUsageStats(startTime, endTime)
            var total = 0L
            for ((pkg, stats) in statsMap) {
                if (!isSystemLauncherOrUi(context, pkg) && pkg != context.packageName) {
                    total += stats.totalTimeInForeground
                }
            }
            val maxPossibleMs = (endTime - startTime).coerceAtLeast(0L)
            return total.coerceIn(0L, maxPossibleMs)
        } catch (_: Exception) {}
        return 0L
    }
}
