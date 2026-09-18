package com.arise.appblocker

import android.content.Context
import android.util.Log
import java.util.Calendar
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

object BlockPolicyController {

    private const val TAG_BLOCKER = "ARISE_BLOCKER"
    private const val TAG_LIMIT_UPDATE = "ARISE_LIMIT_UPDATE"
    private const val TAG_ENFORCEMENT = "ARISE_ENFORCEMENT"

    private val packageBudgetsMs = ConcurrentHashMap<String, Long>()
    private val activePolicies = ConcurrentHashMap<String, BlockedAppPolicy>()

    @Volatile
    var defaultBudgetMs: Long = 0L

    @Volatile
    var unlockedUntilEpochMs: Long = 0L

    fun getTodayStartEpoch(): Long {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return cal.timeInMillis
    }

    fun getTodayEndEpoch(): Long {
        return getTodayStartEpoch() + (24 * 60 * 60 * 1000L)
    }

    fun getBudgetForPackage(context: Context, packageName: String): Long {
        packageBudgetsMs[packageName]?.let { return it }
        try {
            val prefs = context.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
            val savedMs = prefs.getLong("budget_" + packageName, -1L)
            if (savedMs >= 0L) {
                packageBudgetsMs[packageName] = savedMs
                return savedMs
            }
            val defaultMs = prefs.getLong("default_budget_ms", defaultBudgetMs)
            return if (defaultMs >= 0L) defaultMs else 0L
        } catch (_: Exception) {
            return defaultBudgetMs
        }
    }

    fun updateBudget(context: Context?, packageName: String?, budgetMinutes: Double): Long {
        val ms = (budgetMinutes * 60 * 1000).toLong().coerceAtLeast(0L)
        val oldLimit = if (packageName != null) {
            packageBudgetsMs[packageName] ?: defaultBudgetMs
        } else {
            defaultBudgetMs
        }

        if (packageName != null && packageName.isNotEmpty() && packageName != "null") {
            packageBudgetsMs[packageName] = ms
            try {
                context?.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                    ?.edit()?.putLong("budget_" + packageName, ms)?.apply()
            } catch (_: Exception) {}
        } else {
            defaultBudgetMs = ms
            packageBudgetsMs.clear()
            try {
                val prefs = context?.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                val editor = prefs?.edit()
                editor?.putLong("default_budget_ms", ms)
                prefs?.all?.keys?.filter { it.startsWith("budget_") }?.forEach { key ->
                    editor?.remove(key)
                }
                editor?.apply()
            } catch (_: Exception) {}
        }

        val targetPkg = packageName ?: "all_restricted_packages"
        val currentUsage = if (context != null && packageName != null && packageName != "null") {
            UsageStatsHelper.getPackageTodayUsageMs(context, packageName)
        } else {
            0L
        }

        val newDecision = if (ms <= 0L || currentUsage >= ms) "LOCKED" else "UNLOCKED"

        Log.i(
            TAG_LIMIT_UPDATE,
            "[ARISE_LIMIT_UPDATE] package=" + targetPkg +
            " oldLimitMs=" + oldLimit +
            " newLimitMs=" + ms +
            " currentUsageMs=" + currentUsage +
            " newLockDecision=" + newDecision
        )

        return ms
    }

    fun evaluate(context: Context, packageName: String, isForeground: Boolean): BlockedAppPolicy {
        val now = System.currentTimeMillis()
        val limitMs = getBudgetForPackage(context, packageName)
        val usageMs = UsageStatsHelper.getPackageTodayUsageMs(context, packageName)
        val remainingMs = limitMs - usageMs

        val isPassActive = now < getUnlockUntil(context)

        val previousPolicy = activePolicies[packageName]
        val previousState = previousPolicy?.lockState ?: LockState.UNLOCKED

        val lockState = if (isPassActive) {
            LockState.UNLOCKED
        } else if (limitMs <= 0L) {
            LockState.LOCKED
        } else if (usageMs >= limitMs) {
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
            packageName = packageName,
            dailyLimitMs = limitMs,
            usageTodayMs = usageMs,
            remainingMs = remainingMs,
            lockState = lockState,
            lastEvaluationAt = now,
            lastForegroundAt = if (isForeground) now else (previousPolicy?.lastForegroundAt ?: 0L),
            dailyResetTimestamp = getTodayEndEpoch()
        )

        activePolicies[packageName] = policy

        // Log structured audit log
        Log.i(
            TAG_BLOCKER,
            "[ARISE_BLOCKER] package=" + packageName +
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

    fun setUnlockUntil(context: Context?, epochMs: Long) {
        unlockedUntilEpochMs = epochMs
        try {
            context?.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                ?.edit()?.putLong("unlocked_until_epoch", epochMs)?.apply()
        } catch (_: Exception) {}
    }

    fun getUnlockUntil(context: Context?): Long {
        val now = System.currentTimeMillis()
        if (unlockedUntilEpochMs > 0L) {
            if (now >= unlockedUntilEpochMs) {
                unlockedUntilEpochMs = 0L
                try {
                    context?.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                        ?.edit()?.remove("unlocked_until_epoch")?.apply()
                } catch (_: Exception) {}
                return 0L
            }
            return unlockedUntilEpochMs
        }
        try {
            val saved = context?.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                ?.getLong("unlocked_until_epoch", 0L) ?: 0L
            if (saved > now) {
                unlockedUntilEpochMs = saved
                return unlockedUntilEpochMs
            } else if (saved > 0L) {
                context?.getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                    ?.edit()?.remove("unlocked_until_epoch")?.apply()
            }
        } catch (_: Exception) {}
        return 0L
    }

    fun resetDailyState() {
        activePolicies.clear()
    }
}
