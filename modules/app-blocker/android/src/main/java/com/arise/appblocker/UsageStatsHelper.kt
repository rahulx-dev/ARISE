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
import java.util.concurrent.ConcurrentHashMap

/**
 * High-performance foreground app detector and Digital Wellbeing stats accessor.
 * Uses event-driven UsageEvents with a tight sliding window and caches launcher packages
 * to eliminate expensive IPC overhead.
 */
object UsageStatsHelper {
    private const val TAG = "ARISE_USAGE_HELPER"
    private const val EVENT_WINDOW_MS = 5_000L // 5-second sliding event window

    private val knownLauncherPackages = ConcurrentHashMap.newKeySet<String>().apply {
        addAll(
            listOf(
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
                "com.transsion.xoslauncher",
                "com.bbk.launcher2",
                "com.vivo.launcher",
                "com.nothing.launcher"
            )
        )
    }

    @Volatile
    private var launcherCacheInitialized = false

    @Volatile
    private var lastKnownForegroundPackage: String? = null

    @Volatile
    private var lastQueriedTimestamp: Long = 0L

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

    private fun ensureLauncherCache(context: Context) {
        if (launcherCacheInitialized) return
        try {
            val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val flags = PackageManager.MATCH_DEFAULT_ONLY
            val homeActivities = context.packageManager.queryIntentActivities(homeIntent, flags)
            for (resolveInfo in homeActivities) {
                val pkg = resolveInfo.activityInfo?.packageName?.trim()?.lowercase(Locale.ROOT)
                if (!pkg.isNullOrEmpty()) {
                    knownLauncherPackages.add(pkg)
                }
            }
            launcherCacheInitialized = true
        } catch (error: Exception) {
            Log.w(TAG, "Unable to query default home launcher", error)
        }
    }

    fun isSystemLauncherOrUi(context: Context, packageName: String): Boolean {
        val normalized = BlockPolicyController.normalizePackageName(packageName) ?: return false
        if (normalized == "android" || knownLauncherPackages.contains(normalized)) return true

        ensureLauncherCache(context)
        return knownLauncherPackages.contains(normalized)
    }

    /**
     * Determines the currently active foreground app package name.
     * Evaluates UsageEvents chronologically over a tight sliding window to ensure
     * virtually zero latency with minimal CPU & battery footprint.
     */
    fun getForegroundPackage(context: Context): String? {
        if (!hasUsagePermission(context)) {
            return lastKnownForegroundPackage
        }

        val usageStatsManager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return lastKnownForegroundPackage

        val now = System.currentTimeMillis()
        val windowStart = if (lastQueriedTimestamp > 0L) {
            (lastQueriedTimestamp - 1000L).coerceAtLeast(now - EVENT_WINDOW_MS)
        } else {
            now - EVENT_WINDOW_MS
        }
        lastQueriedTimestamp = now

        var latestEventTimestamp = 0L
        var latestPackage: String? = null
        var isLatestBackgroundEvent = false

        try {
            val events = usageStatsManager.queryEvents(windowStart, now)
            val event = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                val type = event.eventType
                if (type == UsageEvents.Event.ACTIVITY_RESUMED ||
                    type == UsageEvents.Event.MOVE_TO_FOREGROUND
                ) {
                    if (event.timeStamp >= latestEventTimestamp) {
                        latestEventTimestamp = event.timeStamp
                        latestPackage = event.packageName
                        isLatestBackgroundEvent = false
                    }
                } else if (type == UsageEvents.Event.ACTIVITY_PAUSED ||
                    type == UsageEvents.Event.ACTIVITY_STOPPED ||
                    type == UsageEvents.Event.MOVE_TO_BACKGROUND
                ) {
                    if (event.packageName == latestPackage && event.timeStamp > latestEventTimestamp) {
                        isLatestBackgroundEvent = true
                    }
                }
            }
        } catch (error: Exception) {
            Log.w(TAG, "Error querying recent usage events", error)
        }

        if (latestPackage != null && !isLatestBackgroundEvent) {
            val clean = latestPackage.trim().lowercase(Locale.ROOT)
            if (isSystemLauncherOrUi(context, clean)) {
                lastKnownForegroundPackage = null
                return null
            }
            lastKnownForegroundPackage = clean
            return clean
        }

        // If the latest detected event for this package was a pause/stop/background transition
        // and no subsequent resume event occurred, the app is no longer in foreground.
        if (latestPackage != null && isLatestBackgroundEvent) {
            val clean = latestPackage.trim().lowercase(Locale.ROOT)
            if (clean == lastKnownForegroundPackage) {
                lastKnownForegroundPackage = null
                return null
            }
        }

        // Secondary fallback for OEMs where UsageEvents can lag (e.g. video playback without resume events)
        try {
            val recentStats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST,
                now - EVENT_WINDOW_MS,
                now
            )
            val mostRecent = recentStats
                ?.filter { it.lastTimeUsed in (now - EVENT_WINDOW_MS)..now }
                ?.maxByOrNull { it.lastTimeUsed }

            if (mostRecent != null) {
                val clean = mostRecent.packageName.trim().lowercase(Locale.ROOT)
                if (isSystemLauncherOrUi(context, clean)) {
                    lastKnownForegroundPackage = null
                    return null
                }
                lastKnownForegroundPackage = clean
                return clean
            }
        } catch (error: Exception) {
            Log.w(TAG, "Error reading best-interval stats", error)
        }

        return lastKnownForegroundPackage
    }

    fun clearForegroundCache() {
        lastKnownForegroundPackage = null
        lastQueriedTimestamp = 0L
    }

    private fun getTodayStartEpoch(now: Long = System.currentTimeMillis()): Long {
        return Calendar.getInstance().apply {
            timeInMillis = now
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    /**
     * Reads official Android OS Digital Wellbeing usage ground-truth for today.
     */
    fun getSystemUsageTodayMs(context: Context, packageName: String): Long {
        if (!hasUsagePermission(context)) return 0L
        val manager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L
        val startOfDay = getTodayStartEpoch()
        val now = System.currentTimeMillis()
        val cleanPkg = packageName.trim().lowercase(Locale.ROOT)
        return try {
            val aggregated = manager.queryAndAggregateUsageStats(startOfDay, now)
            val stats = aggregated[cleanPkg] ?: aggregated[packageName]
            stats?.totalTimeInForeground?.coerceAtLeast(0L) ?: 0L
        } catch (error: Exception) {
            Log.w(TAG, "Unable to query Digital Wellbeing usage for $packageName", error)
            0L
        }
    }

    fun getPackageTodayUsageMs(context: Context, packageName: String): Long {
        return BlockPolicyController.getLiveUsageForPackage(context, packageName)
    }

    fun getTotalTodayUsageMs(context: Context): Long {
        val manager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L
        val startOfDay = getTodayStartEpoch()
        val now = System.currentTimeMillis()
        return try {
            val total = manager.queryAndAggregateUsageStats(startOfDay, now)
                .filterKeys { it != context.packageName && !isSystemLauncherOrUi(context, it) }
                .values
                .sumOf { it.totalTimeInForeground.coerceAtLeast(0L) }
            total.coerceIn(0L, (now - startOfDay).coerceAtLeast(0L))
        } catch (error: Exception) {
            Log.w(TAG, "Unable to calculate total daily usage", error)
            0L
        }
    }
}
