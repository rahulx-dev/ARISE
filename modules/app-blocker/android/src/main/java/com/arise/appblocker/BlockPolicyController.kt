package com.arise.appblocker

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import java.util.Calendar
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

object BlockPolicyController {

    private const val TAG = "ARISE_POLICY_CTRL"

    const val PREFS_NAME = "arise_blocker_prefs"
    private const val DEFAULT_BUDGET_KEY = "default_budget_ms"
    private const val BUDGET_PREFIX = "budget_"
    private const val UNLOCKED_UNTIL_KEY = "unlocked_until_epoch"
    private const val DAILY_RESET_KEY = "last_daily_reset_epoch"
    private const val MAX_UNLOCK_WINDOW_MS = 30 * 60 * 1000L // Up to 30 min passes

    // Default to 30 minutes if unconfigured
    private const val FALLBACK_DEFAULT_BUDGET_MS = 30 * 60 * 1000L
    private const val USAGE_PREFIX = "usage_today_"

    private val policyLock = Any()
    private val packageBudgetsMs = ConcurrentHashMap<String, Long>()
    private val packageUsageTodayMs = ConcurrentHashMap<String, Long>()
    private val activePolicies = ConcurrentHashMap<String, BlockedAppPolicy>()

    @Volatile
    var defaultBudgetMs: Long = FALLBACK_DEFAULT_BUDGET_MS

    @Volatile
    var unlockedUntilEpochMs: Long = 0L

    @Volatile
    private var currentDailyResetEpochMs: Long = 0L

    private fun preferences(context: Context): SharedPreferences {
        return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun normalizePackageName(packageName: String?): String? {
        val normalized = packageName?.trim()?.lowercase(java.util.Locale.ROOT)
        return normalized?.takeIf { it.isNotEmpty() && it != "null" }
    }

    private fun budgetKey(packageName: String): String = BUDGET_PREFIX + packageName
    private fun usageKey(packageName: String): String = USAGE_PREFIX + packageName

    fun getUsageForPackage(context: Context, packageName: String): Long {
        val normalizedPackage = normalizePackageName(packageName) ?: return 0L
        return packageUsageTodayMs[normalizedPackage] ?: run {
            val saved = preferences(context).getLong(usageKey(normalizedPackage), 0L).coerceAtLeast(0L)
            packageUsageTodayMs[normalizedPackage] = saved
            saved
        }
    }

    fun addTrackedUsage(context: Context, packageName: String, deltaMs: Long): Long {
        if (deltaMs <= 0L) return getUsageForPackage(context, packageName)
        val normalizedPackage = normalizePackageName(packageName) ?: return 0L
        val current = getUsageForPackage(context, normalizedPackage)
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

            currentDailyResetEpochMs = getTodayEndEpoch(now)
            val savedReset = prefs.getLong(DAILY_RESET_KEY, 0L)
            if (savedReset != currentDailyResetEpochMs) {
                // A new day has started: wipe stale usage from memory and prefs
                packageUsageTodayMs.clear()
                val editor = prefs.edit()
                prefs.all.keys
                    .filter { it.startsWith(USAGE_PREFIX) }
                    .forEach { editor.remove(it) }
                editor.putLong(DAILY_RESET_KEY, currentDailyResetEpochMs).apply()
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
            } else {
                unlockedUntilEpochMs = 0L
                if (savedUnlock > 0L) {
                    prefs.edit().remove(UNLOCKED_UNTIL_KEY).apply()
                }
            }

            activePolicies.clear()
        }
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
                packageBudgetsMs.clear()
                try {
                    val editor = prefs?.edit()?.putLong(DEFAULT_BUDGET_KEY, ms)
                    prefs?.all?.keys
                        ?.filter { it.startsWith(BUDGET_PREFIX) }
                        ?.forEach { editor?.remove(it) }
                    editor?.commit()
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
        val nextReset = getTodayEndEpoch()
        if (nextReset == currentDailyResetEpochMs) return
        synchronized(policyLock) {
            if (nextReset != currentDailyResetEpochMs) {
                resetDailyState(context)
            }
        }
    }

    fun evaluate(context: Context, packageName: String, isForeground: Boolean): BlockedAppPolicy {
        val normalizedPackage = normalizePackageName(packageName) ?: packageName.trim().lowercase(java.util.Locale.ROOT)
        ensureCurrentDailyState(context)

        val now = System.currentTimeMillis()
        val limitMs = getBudgetForPackage(context, normalizedPackage)
        val usageMs = getUsageForPackage(context, normalizedPackage)
        val remainingMs = (limitMs - usageMs).coerceAtLeast(0L)
        val isPassActive = now < getUnlockUntil(context)

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

    fun setUnlockUntil(context: Context?, epochMs: Long): Boolean {
        val now = System.currentTimeMillis()
        val target = when {
            epochMs <= now -> 0L
            epochMs - now > MAX_UNLOCK_WINDOW_MS -> {
                Log.w(TAG, "Rejecting unlock window longer than 30 minutes")
                return false
            }
            else -> epochMs
        }
        val actualContext = context ?: return false
        return try {
            val editor = preferences(actualContext).edit()
            if (target > 0L) {
                editor.putLong(UNLOCKED_UNTIL_KEY, target)
            } else {
                editor.remove(UNLOCKED_UNTIL_KEY)
            }
            if (editor.commit()) {
                unlockedUntilEpochMs = target
                invalidateAll()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unable to persist unlock window", e)
            false
        }
    }

    fun getUnlockUntil(context: Context?): Long {
        val actualContext = context ?: return 0L
        val now = System.currentTimeMillis()
        return try {
            val prefs = preferences(actualContext)
            val saved = prefs.getLong(UNLOCKED_UNTIL_KEY, 0L)
            if (saved > now) {
                unlockedUntilEpochMs = saved
                saved
            } else {
                if (saved > 0L) prefs.edit().remove(UNLOCKED_UNTIL_KEY).apply()
                unlockedUntilEpochMs = 0L
                0L
            }
        } catch (_: Exception) {
            unlockedUntilEpochMs = 0L
            0L
        }
    }

    fun resetDailyState(context: Context? = null) {
        val nextReset = getTodayEndEpoch()
        synchronized(policyLock) {
            activePolicies.clear()
            packageUsageTodayMs.clear()
            currentDailyResetEpochMs = nextReset
        }
        if (context != null) {
            try {
                val editor = preferences(context).edit()
                preferences(context).all.keys
                    .filter { it.startsWith(USAGE_PREFIX) }
                    .forEach { editor.remove(it) }
                editor.putLong(DAILY_RESET_KEY, nextReset).apply()
            } catch (_: Exception) {}
        }
    }
}
