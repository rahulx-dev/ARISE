package com.arise.appblocker

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

enum class LockState {
    UNLOCKED,
    USAGE_REACHED,
    LOCKED
}

data class BlockedAppPolicy(
    val packageName: String,
    val dailyLimitMs: Long,
    val usageTodayMs: Long,
    val remainingMs: Long,
    val lockState: LockState,
    val lastEvaluationAt: Long,
    val lastForegroundAt: Long,
    val dailyResetTimestamp: Long
)

/**
 * Hybrid Real-Time App Blocking Policy Engine:
 * Combines Android OS Digital Wellbeing (UsageStatsManager) ground-truth baselines
 * with an active sub-second session stopwatch.
 * 
 * Result: Apps lock IMMEDIATELY in real-time when the usage budget expires while
 * actively running on screen — with ZERO need to close or restart the app.
 */
object BlockPolicyController {

    private const val TAG = "ARISE_POLICY_CTRL"

    const val PREFS_NAME = "arise_blocker_prefs"
    private const val DEFAULT_BUDGET_KEY = "default_budget_ms"
    private const val BUDGET_PREFIX = "budget_"
    private const val UNLOCKED_UNTIL_KEY = "unlocked_until_epoch"
    private const val DAILY_RESET_KEY = "last_daily_reset_epoch"
    private const val DAILY_RESET_ANCHOR_ELAPSED_KEY = "daily_reset_anchor_elapsed"
    private const val EMERGENCY_BAILOUT_DATE_KEY = "last_emergency_bailout_date"
    private const val EMERGENCY_BAILOUT_ANCHOR_ELAPSED_KEY = "emergency_bailout_anchor_elapsed"
    private const val PER_PACKAGE_UNLOCK_PREFIX = "unlock_until_"
    private const val MAX_UNLOCK_WINDOW_MS = 30 * 60 * 1000L // Max 30 min pass duration
    private const val EMERGENCY_DURATION_MS = 5 * 60 * 1000L // 5-minute emergency pass

    // Default to 30 minutes if unconfigured
    private const val FALLBACK_DEFAULT_BUDGET_MS = 30 * 60 * 1000L
    private const val USAGE_PREFIX = "usage_today_"

    private val policyLock = Any()
    private val sessionLock = Any()

    private val packageBudgetsMs = ConcurrentHashMap<String, Long>()
    private val packageUsageTodayMs = ConcurrentHashMap<String, Long>()
    private val activePolicies = ConcurrentHashMap<String, BlockedAppPolicy>()

    // Real-Time Active Session Stopwatch State
    @Volatile
    private var activeSessionPackage: String? = null

    @Volatile
    private var activeSessionStartTime: Long = 0L

    @Volatile
    private var activeSessionBaseUsage: Long = 0L

    @Volatile
    var defaultBudgetMs: Long = FALLBACK_DEFAULT_BUDGET_MS

    @Volatile
    var unlockedUntilEpochMs: Long = 0L

    @Volatile
    private var currentDailyResetEpochMs: Long = 0L

    private fun preferences(context: Context): SharedPreferences {
        return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun getTodayDateString(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date())
    }

    /**
     * H13: the "current day" for the once-a-day emergency bailout, anchored
     * to monotonic elapsedRealtime so a backward wall-clock jump cannot
     * re-grant a bailout. The anchor is the (wall date, elapsedRealtime)
     * pair stored at claim time; the day advances by 24h of ELAPSED time,
     * not by the wall clock. A forward clock jump does not create an extra
     * claim — it only moves the anchor forward (the user "loses" the
     * skipped day's claim, same as if the day had really passed).
     * Without an anchor (first run / legacy), falls back to the wall date.
     */
    private fun getAnchoredDayString(context: Context): String {
        return try {
            val prefs = preferences(context)
            val anchorDate = prefs.getString(EMERGENCY_BAILOUT_DATE_KEY, null)
            val anchorElapsed = prefs.getLong(EMERGENCY_BAILOUT_ANCHOR_ELAPSED_KEY, -1L)
            if (anchorDate == null || anchorElapsed < 0L) {
                getTodayDateString()
            } else {
                val daysSince = ((SystemClock.elapsedRealtime() - anchorElapsed) / 86_400_000L)
                    .coerceAtLeast(0L)
                if (daysSince == 0L) {
                    anchorDate
                } else {
                    val cal = Calendar.getInstance().apply {
                        time = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).parse(anchorDate) ?: Date()
                        add(Calendar.DAY_OF_YEAR, daysSince.toInt())
                    }
                    SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(cal.time)
                }
            }
        } catch (_: Exception) {
            getTodayDateString()
        }
    }

    private val PACKAGE_REGEX = Regex("^[a-z][a-z0-9_]*(\\.[a-z0-9_]+)+$")
    private const val MAX_PACKAGE_LENGTH = 256

    fun normalizePackageName(packageName: String?): String? {
        val normalized = packageName?.trim()?.lowercase(Locale.ROOT) ?: return null
        if (normalized.length > MAX_PACKAGE_LENGTH || normalized == "null" || normalized.isEmpty()) return null
        return if (PACKAGE_REGEX.matches(normalized)) normalized else null
    }

    private fun budgetKey(packageName: String): String = BUDGET_PREFIX + packageName
    private fun usageKey(packageName: String): String = USAGE_PREFIX + packageName

    // =========================================================================
    // HYBRID REAL-TIME SESSION ENGINE (MONOTONIC TIME)
    // =========================================================================

    /**
     * Called when a package is detected in the foreground.
     * Initializes the live session stopwatch using Digital Wellbeing as the starting baseline.
     */
    fun onPackageForeground(context: Context, packageName: String) {
        val normalized = normalizePackageName(packageName) ?: return
        synchronized(sessionLock) {
            if (normalized != activeSessionPackage) {
                // Flush previous session if switching apps directly
                flushActiveSession(context)

                activeSessionPackage = normalized
                activeSessionStartTime = SystemClock.elapsedRealtime()
                // Seed base usage from Digital Wellbeing + local storage
                activeSessionBaseUsage = getPersistedUsage(context, normalized)
                Log.d(TAG, "Live stopwatch started for $normalized. Base usage: ${activeSessionBaseUsage / 1000}s")
            }
        }
    }

    /**
     * Called when the user leaves the restricted app (goes to Home, ARISE, or another app),
     * or when the screen turns off. Flushes elapsed time to disk and stops the stopwatch.
     */
    fun onPackageBackground(context: Context) {
        synchronized(sessionLock) {
            if (activeSessionPackage != null) {
                flushActiveSession(context)
            }
        }
    }

    /**
     * Flushes the current session delta into local memory and persistent storage.
     */
    private fun flushActiveSession(context: Context) {
        val pkg = activeSessionPackage ?: return
        val startTime = activeSessionStartTime
        if (startTime > 0L) {
            val durationMs = (SystemClock.elapsedRealtime() - startTime).coerceAtLeast(0L)
            if (durationMs > 0L) {
                val updated = activeSessionBaseUsage + durationMs
                packageUsageTodayMs[pkg] = updated
                try {
                    preferences(context).edit().putLong(usageKey(pkg), updated).apply()
                } catch (_: Exception) {}
                Log.d(TAG, "Flushed live session for $pkg: +${durationMs / 1000}s (Total: ${updated / 1000}s)")
            }
        }
        activeSessionPackage = null
        activeSessionStartTime = 0L
        activeSessionBaseUsage = 0L
    }

    /**
     * Calculates the TRUE real-time usage for a package right at this millisecond.
     * If the app is actively running on screen, returns:
     *   Digital Wellbeing Baseline + Active Session Elapsed Time
     * Otherwise returns the persisted total.
     */
    fun getLiveUsageForPackage(context: Context, packageName: String): Long {
        val normalized = normalizePackageName(packageName) ?: return 0L
        synchronized(sessionLock) {
            if (normalized == activeSessionPackage && activeSessionStartTime > 0L) {
                val liveSessionDelta = (SystemClock.elapsedRealtime() - activeSessionStartTime).coerceAtLeast(0L)
                return activeSessionBaseUsage + liveSessionDelta
            }
        }
        return getPersistedUsage(context, normalized)
    }

    /**
     * Returns the ground-truth persisted usage for a package today:
     * Maximum of Android OS Digital Wellbeing (UsageStatsManager) and local storage.
     */
    private fun getPersistedUsage(context: Context, normalizedPackage: String): Long {
        // 1. Android Digital Wellbeing official OS ground truth
        val systemUsage = UsageStatsHelper.getSystemUsageTodayMs(context, normalizedPackage)

        // 2. Local live tracked usage (from previous sessions today)
        val localUsage = packageUsageTodayMs[normalizedPackage] ?: run {
            val saved = preferences(context).getLong(usageKey(normalizedPackage), 0L).coerceAtLeast(0L)
            packageUsageTodayMs[normalizedPackage] = saved
            saved
        }

        // True baseline is maximum of system stats and local tracking
        val trueUsage = maxOf(systemUsage, localUsage)
        if (trueUsage != localUsage) {
            packageUsageTodayMs[normalizedPackage] = trueUsage
            try {
                preferences(context).edit().putLong(usageKey(normalizedPackage), trueUsage).apply()
            } catch (_: Exception) {}
        }
        return trueUsage
    }

    /**
     * Public accessor: returns real-time live usage today.
     */
    fun getUsageForPackage(context: Context, packageName: String): Long {
        return getLiveUsageForPackage(context, packageName)
    }

    fun addTrackedUsage(context: Context, packageName: String, deltaMs: Long): Long {
        if (deltaMs <= 0L) return getLiveUsageForPackage(context, packageName)
        val normalizedPackage = normalizePackageName(packageName) ?: return 0L
        val current = getLiveUsageForPackage(context, normalizedPackage)
        val updated = (current + deltaMs).coerceAtLeast(0L)
        packageUsageTodayMs[normalizedPackage] = updated
        try {
            preferences(context).edit().putLong(usageKey(normalizedPackage), updated).apply()
        } catch (_: Exception) {}
        return updated
    }

    fun loadPersistedState(context: Context) {
        val prefs = preferences(context)
        val now = System.currentTimeMillis()

        synchronized(policyLock) {
            defaultBudgetMs = if (prefs.contains(DEFAULT_BUDGET_KEY)) {
                prefs.getLong(DEFAULT_BUDGET_KEY, FALLBACK_DEFAULT_BUDGET_MS).coerceAtLeast(0L)
            } else {
                FALLBACK_DEFAULT_BUDGET_MS
            }

            packageBudgetsMs.clear()
            for ((key, value) in prefs.all) {
                if (!key.startsWith(BUDGET_PREFIX)) continue
                val packageName = normalizePackageName(key.removePrefix(BUDGET_PREFIX)) ?: continue
                val budget = when (value) {
                    is Number -> value.toLong()
                    else -> continue
                }
                packageBudgetsMs[packageName] = budget.coerceAtLeast(0L)
            }

            val savedResetBefore = prefs.getLong(DAILY_RESET_KEY, 0L)
            currentDailyResetEpochMs = getAnchoredNextResetEpoch(context)
            // H13: a new day started only if the anchored reset epoch
            // changed (the old reset passed on the monotonic timeline).
            // A backward clock jump leaves the epoch unchanged, so the
            // day is NOT extended and usage is NOT kept past midnight.
            if (savedResetBefore != currentDailyResetEpochMs || savedResetBefore == 0L) {
                // A new day has started: wipe stale daily usage
                packageUsageTodayMs.clear()
                val editor = prefs.edit()
                prefs.all.keys
                    .filter { it.startsWith(USAGE_PREFIX) }
                    .forEach { editor.remove(it) }
                editor.apply()
            } else {
                packageUsageTodayMs.clear()
                for ((key, value) in prefs.all) {
                    if (!key.startsWith(USAGE_PREFIX)) continue
                    val packageName = normalizePackageName(key.removePrefix(USAGE_PREFIX)) ?: continue
                    val usage = when (value) {
                        is Number -> value.toLong()
                        else -> continue
                    }
                    packageUsageTodayMs[packageName] = usage.coerceAtLeast(0L)
                }
            }

            val savedUnlock = prefs.getLong(UNLOCKED_UNTIL_KEY, 0L)
            if (savedUnlock > now) {
                unlockedUntilEpochMs = savedUnlock
                val remainingMs = (savedUnlock - now).coerceAtLeast(0L)
                unlockedUntilElapsedRealtimeMs = SystemClock.elapsedRealtime() + remainingMs
            } else {
                unlockedUntilEpochMs = 0L
                unlockedUntilElapsedRealtimeMs = 0L
                if (savedUnlock > 0L) {
                    prefs.edit().remove(UNLOCKED_UNTIL_KEY).apply()
                }
            }

            // H14: restore per-package passes from their persisted keys.
            perPackageUnlockUntilMs.clear()
            val perPackageEditor = prefs.edit()
            var perPackageDirty = false
            for ((key, value) in prefs.all) {
                if (!key.startsWith(PER_PACKAGE_UNLOCK_PREFIX)) continue
                val pkg = normalizePackageName(key.removePrefix(PER_PACKAGE_UNLOCK_PREFIX)) ?: continue
                val savedEpoch = (value as? Number)?.toLong() ?: continue
                if (savedEpoch > now) {
                    perPackageUnlockUntilMs[pkg] =
                        SystemClock.elapsedRealtime() + (savedEpoch - now)
                } else {
                    perPackageEditor.remove(key)
                    perPackageDirty = true
                }
            }
            if (perPackageDirty) perPackageEditor.apply()

            activePolicies.clear()
        }
    }

    /**
     * H13: the next daily-reset moment, anchored to monotonic
     * elapsedRealtime so wall-clock tampering cannot move it. The
     * stored reset epoch + the elapsedRealtime at which it was computed
     * define the reset on the ORIGINAL timeline: a backward clock jump
     * does not extend the day, and a forward jump does not reset daily
     * usage early. Without a stored anchor (first run / legacy), the
     * wall-clock midnight is computed and the anchor is persisted.
     */
    fun getAnchoredNextResetEpoch(context: Context): Long {
        val prefs = preferences(context)
        val nowWall = System.currentTimeMillis()
        val savedReset = prefs.getLong(DAILY_RESET_KEY, 0L)
        val savedAnchor = prefs.getLong(DAILY_RESET_ANCHOR_ELAPSED_KEY, -1L)
        if (savedReset > 0L && savedAnchor >= 0L) {
            val anchoredReset = savedReset + (SystemClock.elapsedRealtime() - savedAnchor)
            // If the anchored reset is still in the future, it stands
            // (clock was moved back). If it already passed, the day is
            // over — compute the next wall-clock midnight and re-anchor.
            if (anchoredReset > nowWall) return anchoredReset
        }
        val next = getTodayEndEpoch(nowWall)
        prefs.edit()
            .putLong(DAILY_RESET_KEY, next)
            .putLong(DAILY_RESET_ANCHOR_ELAPSED_KEY, SystemClock.elapsedRealtime())
            .apply()
        return next
    }

    fun getTodayStartEpoch(nowEpochMs: Long = System.currentTimeMillis()): Long {
        return Calendar.getInstance().apply {
            timeInMillis = nowEpochMs
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    fun getTodayEndEpoch(nowEpochMs: Long = System.currentTimeMillis()): Long {
        return Calendar.getInstance().apply {
            timeInMillis = nowEpochMs
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            add(Calendar.DAY_OF_YEAR, 1)
        }.timeInMillis
    }

    fun getBudgetForPackage(context: Context, packageName: String): Long {
        val normalizedPackage = normalizePackageName(packageName) ?: return defaultBudgetMs
        val prefs = preferences(context)

        synchronized(policyLock) {
            val key = budgetKey(normalizedPackage)
            if (prefs.contains(key)) {
                val savedMs = try {
                    prefs.getLong(key, 0L).coerceAtLeast(0L)
                } catch (_: Exception) {
                    0L
                }
                packageBudgetsMs[normalizedPackage] = savedMs
                return savedMs
            }

            if (prefs.contains(DEFAULT_BUDGET_KEY)) {
                defaultBudgetMs = try {
                    prefs.getLong(DEFAULT_BUDGET_KEY, FALLBACK_DEFAULT_BUDGET_MS).coerceAtLeast(0L)
                } catch (_: Exception) {
                    FALLBACK_DEFAULT_BUDGET_MS
                }
            }
            return packageBudgetsMs[normalizedPackage]?.coerceAtLeast(0L)
                ?: defaultBudgetMs.coerceAtLeast(0L)
        }
    }

    fun updateBudget(context: Context?, packageName: String?, budgetMinutes: Double): Long {
        val safeMinutes = if (budgetMinutes.isFinite()) {
            budgetMinutes.coerceAtLeast(0.0)
        } else {
            0.0
        }
        val ms = (safeMinutes * 60_000.0).toLong().coerceAtLeast(0L)
        val normalizedPackage = normalizePackageName(packageName)
        val prefs = context?.let { preferences(it) }

        synchronized(policyLock) {
            if (normalizedPackage != null) {
                packageBudgetsMs[normalizedPackage] = ms
                try {
                    prefs?.edit()?.putLong(budgetKey(normalizedPackage), ms)?.commit()
                } catch (e: Exception) {
                    Log.e(TAG, "Unable to persist budget for $normalizedPackage", e)
                }
                activePolicies.remove(normalizedPackage)
            } else {
                defaultBudgetMs = ms
                try {
                    prefs?.edit()?.putLong(DEFAULT_BUDGET_KEY, ms)?.commit()
                } catch (e: Exception) {
                    Log.e(TAG, "Unable to persist default budget", e)
                }
                activePolicies.clear()
            }
        }

        Log.i(TAG, "Updated budget for ${normalizedPackage ?: "global"} -> ${safeMinutes}m ($ms ms)")
        return ms
    }

    fun invalidate(packageName: String?) {
        val normalized = normalizePackageName(packageName)
        if (normalized == null) {
            activePolicies.clear()
        } else {
            activePolicies.remove(normalized)
        }
    }

    fun invalidateAll() {
        activePolicies.clear()
    }

    private fun ensureCurrentDailyState(context: Context? = null) {
        // H13: anchored reset when a context is available (evaluate passes
        // one); wall-clock fallback only when there is no context.
        val nextReset = if (context != null) getAnchoredNextResetEpoch(context) else getTodayEndEpoch()
        if (nextReset == currentDailyResetEpochMs) return
        synchronized(policyLock) {
            if (nextReset != currentDailyResetEpochMs) {
                resetDailyState(context)
            }
        }
    }

    /**
     * Evaluates policy for a package in real-time.
     * If the app is active in foreground, uses LIVE stopwatch usage so lock engages instantly
     * without needing to restart the app.
     */
    fun evaluate(context: Context, packageName: String, isForeground: Boolean): BlockedAppPolicy {
        val normalizedPackage = normalizePackageName(packageName) ?: packageName.trim().lowercase(Locale.ROOT)
        ensureCurrentDailyState(context)

        val now = System.currentTimeMillis()
        val limitMs = getBudgetForPackage(context, normalizedPackage)
        // LIVE REAL-TIME USAGE (Digital Wellbeing + Live Stopwatch)
        val usageMs = getLiveUsageForPackage(context, normalizedPackage)
        val remainingMs = (limitMs - usageMs).coerceAtLeast(0L)
        val isPassActive = isPassActive(normalizedPackage)

        val previousPolicy = activePolicies[normalizedPackage]
        val lockState = when {
            isPassActive -> LockState.UNLOCKED
            limitMs <= 0L -> LockState.LOCKED
            usageMs >= limitMs -> LockState.LOCKED
            else -> LockState.UNLOCKED
        }

        val policy = BlockedAppPolicy(
            packageName = normalizedPackage,
            dailyLimitMs = limitMs,
            usageTodayMs = usageMs,
            remainingMs = remainingMs,
            lockState = lockState,
            lastEvaluationAt = now,
            lastForegroundAt = if (isForeground) now else (previousPolicy?.lastForegroundAt ?: 0L),
            dailyResetTimestamp = getTodayEndEpoch(now)
        )

        activePolicies[normalizedPackage] = policy
        return policy
    }

    // Monotonic elapsed-realtime anchor for temporary unlocks
    @Volatile
    private var unlockedUntilElapsedRealtimeMs: Long = 0L

    // H14: per-package pass deadlines (elapsedRealtime). A pass granted
    // for one package unlocks ONLY that package — previously every pass
    // was global (unlockedUntilElapsedRealtimeMs), so claiming the
    // 5-minute emergency pass for one app unlocked ALL restricted apps.
    private val perPackageUnlockUntilMs = ConcurrentHashMap<String, Long>()

    /**
     * True if any pass is active. With a package name, true if the
     * GLOBAL pass or THAT package's pass is active.
     */
    fun isPassActive(packageName: String? = null): Boolean {
        val nowElapsed = SystemClock.elapsedRealtime()
        if (nowElapsed < unlockedUntilElapsedRealtimeMs) return true
        val normalized = packageName?.let { normalizePackageName(it) } ?: return false
        return (perPackageUnlockUntilMs[normalized] ?: 0L) > nowElapsed
    }

    /**
     * Grants a temporary unlock pass for a specified duration in milliseconds.
     * Uses SystemClock.elapsedRealtime() so device clock tampering cannot extend the unlock.
     * H14: a targetPackage scopes the pass to THAT package only (the
     * emergency bailout). A null targetPackage is the legacy global pass
     * (workout / custom unlocks that intentionally unlock everything).
     * Every grant is immutably recorded in the UnlockLedger.
     */
    fun setUnlockDuration(context: Context?, durationMs: Long, reason: String = "WORKOUT", targetPackage: String? = null): Boolean {
        val actualContext = context ?: return false
        val safeDuration = durationMs.coerceIn(0L, MAX_UNLOCK_WINDOW_MS)
        return synchronized(policyLock) {
            val nowElapsed = SystemClock.elapsedRealtime()
            val nowWall = System.currentTimeMillis()
            val normalizedTarget = targetPackage?.let { normalizePackageName(it) }

            if (normalizedTarget != null) {
                // Per-package pass (H14).
                val targetElapsed = if (safeDuration > 0L) {
                    maxOf(perPackageUnlockUntilMs[normalizedTarget] ?: 0L, nowElapsed + safeDuration)
                } else 0L
                if (targetElapsed > 0L) {
                    perPackageUnlockUntilMs[normalizedTarget] = targetElapsed
                } else {
                    perPackageUnlockUntilMs.remove(normalizedTarget)
                }
                val remainingMs = (targetElapsed - nowElapsed).coerceAtLeast(0L)
                val targetEpoch = if (remainingMs > 0L) nowWall + remainingMs else 0L
                val prefs = preferences(actualContext)
                if (targetEpoch > 0L) {
                    prefs.edit().putLong(PER_PACKAGE_UNLOCK_PREFIX + normalizedTarget, targetEpoch).apply()
                } else {
                    prefs.edit().remove(PER_PACKAGE_UNLOCK_PREFIX + normalizedTarget).apply()
                }
                UnlockLedger.recordUnlock(actualContext, normalizedTarget, reason, safeDuration, safeDuration > 0L)
                invalidateAll()
                true
            } else {
                // Global pass (legacy: workout / custom).
                val targetElapsed = if (safeDuration > 0L) maxOf(unlockedUntilElapsedRealtimeMs, nowElapsed + safeDuration) else 0L
                unlockedUntilElapsedRealtimeMs = targetElapsed

                val remainingMs = (targetElapsed - nowElapsed).coerceAtLeast(0L)
                val targetEpoch = if (remainingMs > 0L) nowWall + remainingMs else 0L
                unlockedUntilEpochMs = targetEpoch

                val prefs = preferences(actualContext)
                if (targetEpoch > 0L) {
                    prefs.edit().putLong(UNLOCKED_UNTIL_KEY, targetEpoch).apply()
                } else {
                    prefs.edit().remove(UNLOCKED_UNTIL_KEY).apply()
                }

                UnlockLedger.recordUnlock(actualContext, "all", reason, safeDuration, safeDuration > 0L)
                invalidateAll()
                true
            }
        }
    }

    fun setUnlockUntil(context: Context?, epochMs: Long): Boolean {
        val now = System.currentTimeMillis()
        val durationMs = if (epochMs > now) epochMs - now else 0L
        return setUnlockDuration(context, durationMs, "CUSTOM", null)
    }

    fun getUnlockUntil(context: Context?): Long {
        val nowElapsed = SystemClock.elapsedRealtime()
        var remaining = (unlockedUntilElapsedRealtimeMs - nowElapsed).coerceAtLeast(0L)
        // H14: a per-package pass also counts — report the longest active pass.
        for (deadline in perPackageUnlockUntilMs.values) {
            remaining = maxOf(remaining, (deadline - nowElapsed).coerceAtLeast(0L))
        }
        return if (remaining > 0L) System.currentTimeMillis() + remaining else 0L
    }

    fun isEmergencyAvailable(context: Context): Boolean {
        return try {
            val prefs = preferences(context)
            val today = getAnchoredDayString(context)
            val lastDate = prefs.getString(EMERGENCY_BAILOUT_DATE_KEY, "")
            today != lastDate
        } catch (_: Exception) {
            true
        }
    }

    /**
     * Executes the once-per-day 5-minute emergency bailout unlock.
     * Counted INSIDE the daily budget. Monotonic time tracking. Recorded in UnlockLedger.
     */
    fun claimEmergencyBailout(context: Context, packageName: String?): Boolean {
        synchronized(policyLock) {
            if (!isEmergencyAvailable(context)) {
                Log.w(TAG, "Emergency bailout already claimed today")
                return false
            }

            val today = getAnchoredDayString(context)
            val normalizedPackage = normalizePackageName(packageName)

            // 1. Set the 5-minute temporary unlock pass using monotonic time & recorded in UnlockLedger
            if (!setUnlockDuration(context, EMERGENCY_DURATION_MS, "EMERGENCY_PASS", normalizedPackage)) {
                Log.e(TAG, "Failed setting unlock window for emergency pass")
                return false
            }

            // 2. Count those 5 minutes INSIDE the daily budget!
            if (normalizedPackage != null) {
                addTrackedUsage(context, normalizedPackage, EMERGENCY_DURATION_MS)
                synchronized(sessionLock) {
                    if (activeSessionPackage == normalizedPackage) {
                        activeSessionBaseUsage += EMERGENCY_DURATION_MS
                    }
                }
                Log.i(TAG, "Emergency 5 min credited inside $normalizedPackage daily budget")
            }

            // 3. Persist today's (anchored) bailout date + the elapsed anchor
            // so a backward clock jump cannot re-grant the bailout.
            try {
                preferences(context).edit()
                    .putString(EMERGENCY_BAILOUT_DATE_KEY, today)
                    .putLong(EMERGENCY_BAILOUT_ANCHOR_ELAPSED_KEY, SystemClock.elapsedRealtime())
                    .commit()
            } catch (e: Exception) {
                Log.e(TAG, "Failed persisting emergency bailout date", e)
            }

            // TODO_PRODUCT_DECISION: Shop Pass / Instant Unlock rules are unsettled; flagged as open product decision per Lucky's requirements.

            invalidateAll()
            Log.i(TAG, "Emergency bailout granted successfully")
            return true
        }
    }

    fun resetDailyState(context: Context? = null) {
        val nextReset = if (context != null) getAnchoredNextResetEpoch(context) else getTodayEndEpoch()
        synchronized(policyLock) {
            activePolicies.clear()
            packageUsageTodayMs.clear()
            currentDailyResetEpochMs = nextReset
        }
        synchronized(sessionLock) {
            activeSessionPackage = null
            activeSessionStartTime = 0L
            activeSessionBaseUsage = 0L
        }
        if (context != null) {
            try {
                val editor = preferences(context).edit()
                preferences(context).all.keys
                    .filter { it.startsWith(USAGE_PREFIX) }
                    .forEach { editor.remove(it) }
                editor.putLong(DAILY_RESET_KEY, nextReset)
                    .putLong(DAILY_RESET_ANCHOR_ELAPSED_KEY, SystemClock.elapsedRealtime())
                    .apply()
            } catch (_: Exception) {}
        }
    }
}
