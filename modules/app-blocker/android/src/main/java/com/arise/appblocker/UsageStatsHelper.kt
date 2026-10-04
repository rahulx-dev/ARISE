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
 * Reads the same daily foreground totals exposed by Android Digital Wellbeing
 * and maintains only the small amount of state needed to make the current
 * session update immediately.
 */
object UsageStatsHelper {
    private const val TAG = "ARISE_USAGE_HELPER"
    private const val FOREGROUND_WINDOW_MS = 60_000L

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
                "com.transsion.XOSLauncher",
                "com.bbk.launcher2",
                "com.vivo.launcher",
                "com.nothing.launcher"
            )
        )
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
        val normalized = packageName.trim().lowercase(Locale.ROOT)
        if (normalized == "android" || knownLauncherPackages.contains(normalized)) return true
        if (normalized.contains("launcher") || normalized.contains("quickstep")) return true

        return try {
            val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val homePackages = context.packageManager
                .queryIntentActivities(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)
                .mapNotNull { it.activityInfo?.packageName?.lowercase(Locale.ROOT) }
            knownLauncherPackages.addAll(homePackages)
            normalized in homePackages
        } catch (error: Exception) {
            Log.w(TAG, "Unable to resolve the device home launcher", error)
            false
        }
    }

    private fun setActivePackage(packageName: String?, eventTimestamp: Long) {
        if (packageName == activeSessionPackage) return
        activeSessionPackage = packageName
        activeSessionStartTime = if (packageName == null) 0L else eventTimestamp
    }

    /**
     * Uses resume/foreground events only. Paused/stopped events are deliberately
     * ignored because app-internal activity changes emit them between resumes.
     */
    fun getForegroundPackage(context: Context): String? {
        val usageStatsManager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                ?: return lastKnownForegroundPackage
        val now = System.currentTimeMillis()
        val windowStart = now - FOREGROUND_WINDOW_MS
        var latestEventTimestamp = 0L
        var latestPackage: String? = null

        try {
            val events = usageStatsManager.queryEvents(windowStart, now)
            val event = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                if (event.eventType != UsageEvents.Event.ACTIVITY_RESUMED &&
                    event.eventType != UsageEvents.Event.MOVE_TO_FOREGROUND
                ) {
                    continue
                }
                if (event.timeStamp >= latestEventTimestamp) {
                    latestEventTimestamp = event.timeStamp
                    latestPackage = event.packageName
                }
            }
        } catch (error: Exception) {
            Log.w(TAG, "Unable to read recent usage events", error)
        }

        if (latestPackage != null) {
            if (isSystemLauncherOrUi(context, latestPackage!!)) {
                setActivePackage(null, now)
                lastKnownForegroundPackage = null
                return null
            }
            setActivePackage(latestPackage, latestEventTimestamp)
            lastKnownForegroundPackage = latestPackage
            return latestPackage
        }

        // Some OEMs omit usage events while a video/article remains visible.
        // INTERVAL_BEST can still provide a recent lastTimeUsed in that case.
        try {
            val recentStats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST,
                windowStart,
                now
            )
            val recentPackage = recentStats
                .filter { it.lastTimeUsed in windowStart..now }
                .maxByOrNull { it.lastTimeUsed }
                ?.packageName
            if (recentPackage != null) {
                if (isSystemLauncherOrUi(context, recentPackage)) {
                    setActivePackage(null, now)
                    lastKnownForegroundPackage = null
                    return null
                }
                setActivePackage(recentPackage, recentStats.first { it.packageName == recentPackage }.lastTimeUsed)
                lastKnownForegroundPackage = recentPackage
                return recentPackage
            }
        } catch (error: Exception) {
            Log.w(TAG, "Unable to read best-interval usage stats", error)
        }

        // No new signal is not evidence that the user left the app.
        return lastKnownForegroundPackage
    }

    fun clearForegroundCache() {
        lastKnownForegroundPackage = null
        activeSessionPackage = null
        activeSessionStartTime = 0L
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

    fun getPackageTodayUsageMs(context: Context, packageName: String): Long {
        return BlockPolicyController.getUsageForPackage(context, packageName)
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
