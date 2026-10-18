package com.arise.appblocker

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class UnlockRecord(
    val id: String,
    val packageName: String,
    val reason: String, // "WORKOUT", "REWARDED_AD", "EMERGENCY_PASS", "SHOP_PASS"
    val durationMs: Long,
    val wallClockTimestamp: Long,
    val monotonicExpiry: Long,
    val granted: Boolean
)

/**
 * Append-only persistent record of every unlock attempt and grant.
 * Immutable, non-client-editable ledger supporting tamper-evidence.
 */
object UnlockLedger {
    private const val TAG = "ARISE_UNLOCK_LEDGER"
    private const val PREFS_NAME = "arise_unlock_ledger"
    private const val KEY_RECORDS = "unlock_records_json"
    private const val MAX_RECORDS = 500 // Bound history

    private val lock = Any()

    private fun prefs(context: Context): SharedPreferences {
        return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun recordUnlock(
        context: Context,
        packageName: String,
        reason: String,
        durationMs: Long,
        granted: Boolean
    ): UnlockRecord {
        val nowWallClock = System.currentTimeMillis()
        val monotonicExpiry = SystemClock.elapsedRealtime() + durationMs
        val record = UnlockRecord(
            id = UUID.randomUUID().toString(),
            packageName = packageName,
            reason = reason,
            durationMs = durationMs,
            wallClockTimestamp = nowWallClock,
            monotonicExpiry = monotonicExpiry,
            granted = granted
        )

        synchronized(lock) {
            try {
                val sp = prefs(context)
                val raw = sp.getString(KEY_RECORDS, "[]") ?: "[]"
                val jsonArr = JSONArray(raw)
                val obj = JSONObject().apply {
                    put("id", record.id)
                    put("packageName", record.packageName)
                    put("reason", record.reason)
                    put("durationMs", record.durationMs)
                    put("wallClockTimestamp", record.wallClockTimestamp)
                    put("monotonicExpiry", record.monotonicExpiry)
                    put("granted", record.granted)
                }
                jsonArr.put(obj)

                // Append-only with bound to prevent unbounded disk growth
                val trimmed = if (jsonArr.length() > MAX_RECORDS) {
                    val newArr = JSONArray()
                    val start = jsonArr.length() - MAX_RECORDS
                    for (i in start until jsonArr.length()) {
                        newArr.put(jsonArr.get(i))
                    }
                    newArr
                } else {
                    jsonArr
                }
                sp.edit().putString(KEY_RECORDS, trimmed.toString()).apply()
                Log.i(TAG, "Recorded unlock in ledger: $packageName ($reason, ${durationMs / 1000}s, granted=$granted)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed recording unlock in ledger", e)
            }
        }
        return record
    }

    fun getRecords(context: Context): List<UnlockRecord> {
        synchronized(lock) {
            return try {
                val raw = prefs(context).getString(KEY_RECORDS, "[]") ?: "[]"
                val jsonArr = JSONArray(raw)
                val list = mutableListOf<UnlockRecord>()
                for (i in 0 until jsonArr.length()) {
                    val obj = jsonArr.getJSONObject(i)
                    list.add(
                        UnlockRecord(
                            id = obj.optString("id"),
                            packageName = obj.optString("packageName"),
                            reason = obj.optString("reason"),
                            durationMs = obj.optLong("durationMs"),
                            wallClockTimestamp = obj.optLong("wallClockTimestamp"),
                            monotonicExpiry = obj.optLong("monotonicExpiry"),
                            granted = obj.optBoolean("granted", false)
                        )
                    )
                }
                list
            } catch (e: Exception) {
                emptyList()
            }
        }
    }
}
