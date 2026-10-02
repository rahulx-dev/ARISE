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

/**
 * The native policy source of truth.
 *
 * The JavaScript settings database is useful for rendering the settings UI, but it is
 * not available to the monitor after the app process is recreated.  Every package
 * budget is therefore mirrored in SharedPreferences and every evaluation reads the
 * persisted value (rather than trusting an in-memory policy decision).
 */
object BlockPolicyController {

    private const val TAG_BLOCKER = "ARISE_BLOCKER"
    private const val TAG_LIMIT_UPDATE = "ARISE_LIMIT_UPDATE"
    private const val TAG_ENFORCEMENT = "ARISE_ENFORCEMENT"

    const val PREFS_NAME = "arise_blocker_prefs"
    private const val DEFAULT_BUDGET_KEY = "default_budget_ms"
    private const val BUDGET_PREFIX = "budget_"
    private const val UNLOCKED_UNTIL_KEY = "unlocked_until_epoch"
    private const val DAILY_RESET_KEY = "last_daily_reset_epoch"

    private val policyLock = Any()
    private val packageBudgetsMs = ConcurrentHashMap<String, Long>()
    private val activePolicies = ConcurrentHashMap<String, BlockedAppPolicy>()

    @Volatile
    var defaultBudgetMs: Long = 0L

    @Volatile
    var unlockedUntilEpochMs: Long = 0L

    @Volatile
    private var currentDailyResetEpochMs: Long = 0L

    private fun preferences(context: Context): SharedPreferences {
        return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun normalizePackageName(packageName: String?): String? {
        val normalized = packageName?.trim()?.lowercase(LocaleHolder.ROOT)
        return normalized?.takeIf { it.isNotEmpty() && it != "null" }
    }

    private fun budgetKey(packageName: String): String = BUDGET_PREFIX + packageName

    /**
     * Loads all persisted policy inputs when the monitor process starts.  This is
     * deliberately synchronous: starting enforcement with an empty/default policy
     * and filling it in later creates a short restart bypass.
     */
    fun loadPersistedState(context: Context) {
        val prefs = preferences(context)
        val now = System.currentTimeMillis()

        synchronized(policyLock) {
            defaultBudgetMs = if (prefs.contains(DEFAULT_BUDGET_KEY)) {
                prefs.getLong(DEFAULT_BUDGET_KEY, 0L).coerceAtLeast(0L)
            } else {
                0L
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

            val savedUnlock = prefs.getLong(UNLOCKED_UNTIL_KEY, 0L)
            if (savedUnlock > now) {
                unlockedUntilEpochMs = savedUnlock
            } else {
                unlockedUntilEpochMs = 0L
                if (savedUnlock > 0L) {
                    prefs.edit().remove(UNLOCKED_UNTIL_KEY).commit()
                }
            }

            activePolicies.clear()
            currentDailyResetEpochMs = getTodayEndEpoch(now)
            // The value is informational only; it is never used to grant access.
            if (prefs.getLong(DAILY_RESET_KEY, 0L) != currentDailyResetEpochMs) {
                prefs.edit().putLong(DAILY_RESET_KEY, currentDailyResetEpochMs).commit()
            }
        }
    }

    /**
     * Returns the start of the local calendar day containing [nowEpochMs].
     */
    fun getTodayStartEpoch(nowEpochMs: Long = System.currentTimeMillis()): Long {
        return Calendar.getInstance().apply {
            timeInMillis = nowEpochMs
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    /**
     * Returns the next local midnight.  Calendar.add(DAY_OF_YEAR, 1) is important:
     * adding 24 hours is wrong on DST transition days (which can be 23 or 25 hours).
     */
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

    /**
     * Reads the package-specific persisted limit before consulting the cache.  This
     * keeps the package override authoritative even after a service/process restart
     * or an update originating in another native entry point.
     */
    fun getBudgetForPackage(context: Context, packageName: String): Long {
        val normalizedPackage = normalizePackageName(packageName) ?: return 0L
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
                    prefs.getLong(DEFAULT_BUDGET_KEY, 0L).coerceAtLeast(0L)
                } catch (_: Exception) {
                    0L
                }
            }
            return packageBudgetsMs[normalizedPackage]?.coerceAtLeast(0L)
                ?: defaultBudgetMs.coerceAtLeast(0L)
        }
    }

    /**
     * Persists a new limit and invalidates the old decision before returning.  The
     * monitor is then kicked immediately by AppMonitorService, so raising a limit
     * removes a lock and lowering one applies a lock without waiting for a restart.
     */
    fun updateBudget(context: Context?, packageName: String?, budgetMinutes: Double): Long {
        val safeMinutes = if (budgetMinutes.isFinite()) {
            budgetMinutes.coerceAtLeast(0.0)
        } else {
            0.0
        }
        val maxMinutes = Long.MAX_VALUE.toDouble() / 60_000.0
        val ms = (safeMinutes.coerceAtMost(maxMinutes) * 60_000.0).toLong().coerceAtLeast(0L)
        val normalizedPackage = normalizePackageName(packageName)
        val prefs = context?.let { preferences(it) }

        val oldLimit = if (normalizedPackage != null) {
            context?.let { getBudgetForPackage(it, normalizedPackage) }
                ?: packageBudgetsMs[normalizedPackage]
                ?: defaultBudgetMs
        } else {
            context?.let {
                if (preferences(it).contains(DEFAULT_BUDGET_KEY)) {
                    preferences(it).getLong(DEFAULT_BUDGET_KEY, defaultBudgetMs)
                } else {
                    defaultBudgetMs
                }
            } ?: defaultBudgetMs
        }

        synchronized(policyLock) {
            if (normalizedPackage != null) {
                packageBudgetsMs[normalizedPackage] = ms
                try {
                    prefs?.edit()?.putLong(budgetKey(normalizedPackage), ms)?.commit()
                } catch (e: Exception) {
                    Log.e(TAG_LIMIT_UPDATE, "Unable to persist budget for $normalizedPackage", e)
                }
                activePolicies.remove(normalizedPackage)
            } else {
                defaultBudgetMs = ms
                // A null package is the explicit "apply globally" operation used by
                // the settings UI.  Remove old overrides so the new global policy is
                // not shadowed by stale per-package values.
                packageBudgetsMs.clear()
                try {
                    val editor = prefs?.edit()?.putLong(DEFAULT_BUDGET_KEY, ms)
                    prefs?.all?.keys
                        ?.filter { it.startsWith(BUDGET_PREFIX) }
                        ?.forEach { editor?.remove(it) }
                    editor?.commit()
                } catch (e: Exception) {
                    Log.e(TAG_LIMIT_UPDATE, "Unable to persist default budget", e)
                }
                activePolicies.clear()
            }
        }

        val targetPkg = normalizedPackage ?: "all_restricted_packages"
        val currentUsage = if (context != null && normalizedPackage != null) {
            UsageStatsHelper.getPackageTodayUsageMs(context, normalizedPackage)
        } else {
            0L
        }
        val effectiveLimit = if (normalizedPackage != null) ms else defaultBudgetMs
        val newDecision = if (effectiveLimit <= 0L || currentUsage >= effectiveLimit) "LOCKED" else "UNLOCKED"

        Log.i(
            TAG_LIMIT_UPDATE,
            "[ARISE_LIMIT_UPDATE] package=" + targetPkg +
                " oldLimitMs=" + oldLimit +
                " newLimitMs=" + effectiveLimit +
                " currentUsageMs=" + currentUsage +
                " newLockDecision=" + newDecision
        )

        return effectiveLimit
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

    private fun ensureCurrentDailyState() {
        val nextReset = getTodayEndEpoch()
        if (nextReset == currentDailyResetEpochMs) return
        synchronized(policyLock) {
            if (nextReset != currentDailyResetEpochMs) {
                activePolicies.clear()
                currentDailyResetEpochMs = nextReset
            }
        }
    }

    fun evaluate(context: Context, packageName: String, isForeground: Boolean): BlockedAppPolicy {
        val normalizedPackage = normalizePackageName(packageName) ?: packageName.trim().lowercase(LocaleHolder.ROOT)
        ensureCurrentDailyState()

        val now = System.currentTimeMillis()
        val limitMs = getBudgetForPackage(context, normalizedPackage)
        val usageMs = UsageStatsHelper.getPackageTodayUsageMs(context, normalizedPackage)
        val remainingMs = (limitMs - usageMs).coerceAtLeast(0L)
        val isPassActive = now < getUnlockUntil(context)

        val previousPolicy = activePolicies[normalizedPackage]
        val previousState = previousPolicy?.lockState ?: LockState.UNLOCKED
        val lockState = if (isPassActive) {
            LockState.UNLOCKED
        } else if (limitMs <= 0L || usageMs >= limitMs) {
            LockState.LOCKED
        } else {
            LockState.UNLOCKED
        }

        val reason = when {
            isPassActive -> "TEMPORARY_UNLOCK_PASS_ACTIVE"
            limitMs <= 0L -> "ZERO_BUDGET_CONFIGURED"
            usageMs >= limitMs -> "LIMIT_REACHED"
            else -> "BUDGET_NOT_EXHAUSTED"
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

        Log.i(
            TAG_BLOCKER,
            "[ARISE_BLOCKER] package=" + normalizedPackage +
                " actualUsageMs=" + usageMs +
                " limitMs=" + limitMs +
                " remainingMs=" + remainingMs +
                " foreground=" + isForeground +
                " previousState=" + previousState.name +
                " newState=" + lockState.name +
                " reason=" + reason
        )

        return policy
    }

    fun logEnforcement(packageName: String, locked: Boolean, presentationRestored: Boolean, reason: String) {
        Log.i(
            TAG_ENFORCEMENT,
            "[ARISE_ENFORCEMENT] package=" + packageName +
                " locked=" + locked +
                " presentationRestored=" + presentationRestored +
                " reason=" + reason
        )
    }

    /** Returns false when the native context cannot persist the pass. */
    fun setUnlockUntil(context: Context?, epochMs: Long): Boolean {
        val target = if (epochMs > System.currentTimeMillis()) epochMs else 0L
        val actualContext = context ?: return false
        return try {
            val editor = preferences(actualContext).edit()
            if (target > 0L) {
                editor.putLong(UNLOCKED_UNTIL_KEY, target)
            } else {
                editor.remove(UNLOCKED_UNTIL_KEY)
            }
            if (!editor.commit()) {
                false
            } else {
                unlockedUntilEpochMs = target
                invalidateAll()
                true
            }
        } catch (e: Exception) {
            Log.e(TAG_BLOCKER, "Unable to persist unlock window", e)
            false
        }
    }

    /**
     * SharedPreferences is checked on every read so a stale in-memory future pass
     * cannot survive a service restart or an explicit expiry.
     */
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
                if (saved > 0L) prefs.edit().remove(UNLOCKED_UNTIL_KEY).commit()
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
            currentDailyResetEpochMs = nextReset
        }
        if (context != null) {
            try {
                preferences(context).edit().putLong(DAILY_RESET_KEY, nextReset).commit()
            } catch (_: Exception) {}
        }
    }

    /** A tiny holder avoids relying on the device default locale for package keys. */
    private object LocaleHolder {
        val ROOT = java.util.Locale.ROOT
    }
}
