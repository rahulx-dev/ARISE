package com.arise.runningtracker

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import java.util.Locale

class RunningService : Service(), LocationListener, SensorEventListener {

    companion object {
        const val TAG = "ARISE_RUNNING_SERVICE"
        const val CHANNEL_ID = "arise_running_tracker_channel"
        const val NOTIFICATION_ID = 8842

        const val ACTION_START = "com.arise.runningtracker.ACTION_START"
        const val ACTION_PAUSE = "com.arise.runningtracker.ACTION_PAUSE"
        const val ACTION_RESUME = "com.arise.runningtracker.ACTION_RESUME"
        const val ACTION_STOP = "com.arise.runningtracker.ACTION_STOP"

        const val EXTRA_TARGET_KM = "extra_target_km"

        // C15: persisted session state (SharedPreferences). Process death
        // wipes the in-memory companion vars above; the persisted copy lets
        // a null-intent restart RESTORE the run instead of losing it.
        const val PREFS_NAME = "arise_running_session"
        const val KEY_ACTIVE = "active"
        const val KEY_TARGET_KM = "targetKm"
        const val KEY_DISTANCE = "distanceMeters"
        const val KEY_ELAPSED = "elapsedSeconds"
        const val KEY_STEPS = "totalSteps"
        const val KEY_CALORIES = "caloriesBurned"
        const val KEY_PAUSED = "isPaused"
        const val KEY_COMPLETED = "hasTriggeredCompletion"

        var isServiceRunning = false
            private set

        var activeTargetKm = 1.0
            private set

        var totalDistanceMeters = 0.0
            private set

        var elapsedSeconds = 0L
            private set

        var currentSpeedKmh = 0.0
            private set

        var currentPaceFormatted = "--:--"
            private set

        var totalSteps = 0
            private set

        var caloriesBurned = 0
            private set

        var isVehicleSpeed = false
            private set

        var isPaused = false
            private set

        var listener: ((Map<String, Any>) -> Unit)? = null
        var completionListener: (() -> Unit)? = null

        fun getCurrentStatsMap(): Map<String, Any> {
            val distKm = totalDistanceMeters / 1000.0
            return mapOf(
                "distanceKm" to (Math.round(distKm * 1000.0) / 1000.0),
                "speedKmh" to (Math.round(currentSpeedKmh * 10.0) / 10.0),
                "paceMinKm" to currentPaceFormatted,
                "steps" to totalSteps,
                "elapsedSeconds" to elapsedSeconds,
                "caloriesBurned" to caloriesBurned,
                "isVehicleSpeed" to isVehicleSpeed,
                "isTracking" to isServiceRunning,
                "isPaused" to isPaused
            )
        }
    }

    private var locationManager: LocationManager? = null
    private var sensorManager: SensorManager? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var notificationManager: NotificationManager? = null

    private var lastRecordedLocation: Location? = null
    private var speedEmaKmh = 0.0
    private var vehicleSamplesCount = 0
    private var initialStepCount = -1

    private val mainHandler = Handler(Looper.getMainLooper())
    private var timerRunnable: Runnable? = null
    private var hasTriggeredCompletion = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager

        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ARISE:RunningTrackerWakeLock")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            // C15: system restart after process death. Restore the persisted
            // run instead of silently losing it. Only stop if nothing to restore.
            if (!isServiceRunning) {
                if (!restorePersistedSession()) {
                    stopSelf()
                }
            }
            return START_NOT_STICKY
        }

        val action = intent.action
        if (action == null) {
            if (!isServiceRunning && !restorePersistedSession()) {
                stopSelf()
            }
            return START_NOT_STICKY
        }

        when (action) {
            ACTION_START -> {
                if (isServiceRunning) {
                    Log.d(TAG, "Ignoring duplicate ACTION_START: tracking session is already running")
                    return START_NOT_STICKY
                }
                val targetKm = intent.getDoubleExtra(EXTRA_TARGET_KM, 1.0)
                startTrackingSession(targetKm)
            }
            ACTION_PAUSE -> {
                pauseTrackingSession()
            }
            ACTION_RESUME -> {
                resumeTrackingSession()
            }
            ACTION_STOP -> {
                stopTrackingSession()
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startTrackingSession(targetKm: Double) {
        activeTargetKm = if (targetKm > 0) targetKm else 1.0
        totalDistanceMeters = 0.0
        elapsedSeconds = 0L
        currentSpeedKmh = 0.0
        currentPaceFormatted = "--:--"
        totalSteps = 0
        caloriesBurned = 0
        isVehicleSpeed = false
        isPaused = false
        isServiceRunning = true
        hasTriggeredCompletion = false
        lastRecordedLocation = null
        speedEmaKmh = 0.0
        vehicleSamplesCount = 0
        initialStepCount = -1

        beginTrackingInfrastructure()
    }

    /**
     * Foreground notification + location/sensor listeners + elapsed timer.
     * Shared by fresh starts and C15 restores (restore reuses the setup
     * WITHOUT resetting the counters).
     */
    @SuppressLint("MissingPermission")
    private fun beginTrackingInfrastructure() {
        try {
            if (wakeLock?.isHeld != true) {
                wakeLock?.acquire(4 * 60 * 60 * 1000L) // 4 hours max safety cap
            }
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock acquire note: ${e.message}")
        }

        val notification = buildOngoingNotification()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "startForeground error", e)
        }

        // Register Location Updates
        try {
            val locMan = locationManager
            if (locMan != null) {
                if (locMan.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    locMan.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        1000L,
                        1.0f,
                        this,
                        Looper.getMainLooper()
                    )
                }
                if (locMan.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    locMan.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        2000L,
                        2.0f,
                        this,
                        Looper.getMainLooper()
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request location updates", e)
        }

        // Register Step Sensors
        try {
            val sm = sensorManager
            val stepCounter = sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
            if (stepCounter != null) {
                sm.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_UI)
            } else {
                val stepDetector = sm?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
                if (stepDetector != null) {
                    sm.registerListener(this, stepDetector, SensorManager.SENSOR_DELAY_UI)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Step sensor registration note: ${e.message}")
        }

        // Start 1-second elapsed timer
        startElapsedTimer()
        broadcastStats()
    }

    private fun pauseTrackingSession() {
        isPaused = true
        lastRecordedLocation = null
        currentSpeedKmh = 0.0
        updateNotification()
        broadcastStats()
    }

    private fun resumeTrackingSession() {
        isPaused = false
        lastRecordedLocation = null
        updateNotification()
        broadcastStats()
    }

    private fun stopTrackingSession() {
        isServiceRunning = false
        isPaused = false
        // C15: a deliberate stop discards the run — clear persisted state
        // so a later null-intent restart does not resurrect it.
        clearPersistedSession()

        try {
            timerRunnable?.let { mainHandler.removeCallbacks(it) }
            timerRunnable = null
            locationManager?.removeUpdates(this)
            sensorManager?.unregisterListener(this)
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Cleanup exception: ${e.message}")
        }

        stopForeground(true)
        broadcastStats()
    }

    private fun startElapsedTimer() {
        timerRunnable?.let { mainHandler.removeCallbacks(it) }
        val runnable = object : Runnable {
            override fun run() {
                if (isServiceRunning && !isPaused) {
                    elapsedSeconds++
                    updateNotification()
                    broadcastStats()
                }
                mainHandler.postDelayed(this, 1000L)
            }
        }
        timerRunnable = runnable
        mainHandler.postDelayed(runnable, 1000L)
    }

    override fun onLocationChanged(location: Location) {
        if (!isServiceRunning || isPaused) return

        // 1. Accuracy gate: discard inaccurate fixes (> 18m)
        if (location.hasAccuracy() && location.accuracy > 18.0f) {
            return
        }

        val last = lastRecordedLocation
        if (last == null) {
            lastRecordedLocation = location
            return
        }

        // 2. High-precision distance calculation (WGS-84 geodesic)
        val results = FloatArray(1)
        Location.distanceBetween(
            last.latitude,
            last.longitude,
            location.latitude,
            location.longitude,
            results
        )
        val distMeters = results[0].toDouble()
        val timeDiffSec = Math.max(0.5, (location.time - last.time) / 1000.0)
        val calculatedSpeedKmh = (distMeters / timeDiffSec) * 3.6

        val rawSpeedKmh = if (location.hasSpeed() && location.speed > 0f) {
            (location.speed * 3.6).toDouble()
        } else {
            calculatedSpeedKmh
        }

        // 3. Vehicle speed detection (> 30 km/h)
        if (rawSpeedKmh > 30.0) {
            vehicleSamplesCount++
        } else {
            vehicleSamplesCount = Math.max(0, vehicleSamplesCount - 1)
        }
        isVehicleSpeed = vehicleSamplesCount >= 4

        // 4. Anti-Jitter / Stationary drift filter:
        // Discard stationary GPS wobble (< 1.5m when speed is < 1.0 km/h)
        val isStationaryDrift = distMeters < 1.8 && rawSpeedKmh < 1.2
        val isPhysicallyPlausible = distMeters < 80.0 && calculatedSpeedKmh < 35.0

        if (!isVehicleSpeed && !isStationaryDrift && isPhysicallyPlausible) {
            totalDistanceMeters += distMeters

            // Smooth speed exponential moving average
            speedEmaKmh = if (speedEmaKmh == 0.0) rawSpeedKmh else speedEmaKmh * 0.3 + rawSpeedKmh * 0.7
            currentSpeedKmh = Math.max(0.0, Math.min(30.0, speedEmaKmh))

            // Calories: standard ~62 kcal per km for running
            val distKm = totalDistanceMeters / 1000.0
            caloriesBurned = Math.round(distKm * 62.0).toInt()

            // Calculate Pace (minutes:seconds per km)
            if (distKm >= 0.05 && elapsedSeconds >= 5) {
                val paceSecPerKm = Math.round(elapsedSeconds / distKm)
                val paceMin = paceSecPerKm / 60
                val paceSec = paceSecPerKm % 60
                currentPaceFormatted = String.format(Locale.US, "%d:%02d", paceMin, paceSec)
            }

            lastRecordedLocation = location

            // Check completion
            if (!hasTriggeredCompletion && distKm >= activeTargetKm) {
                hasTriggeredCompletion = true
                mainHandler.post {
                    completionListener?.invoke()
                }
            }

            updateNotification()
            broadcastStats()
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isServiceRunning || isPaused || event == null) return

        if (event.sensor.type == Sensor.TYPE_STEP_COUNTER) {
            val totalSensorSteps = event.values[0].toInt()
            if (initialStepCount < 0) {
                initialStepCount = totalSensorSteps
            }
            val sessionSteps = Math.max(0, totalSensorSteps - initialStepCount)
            if (sessionSteps > totalSteps) {
                totalSteps = sessionSteps
                broadcastStats()
            }
        } else if (event.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
            if (event.values[0] == 1.0f) {
                totalSteps++
                broadcastStats()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}
    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    private fun broadcastStats() {
        val stats = getCurrentStatsMap()
        // C15: persist on every stats change so a process death loses at
        // most the last second of progress. No-op when not running.
        persistSessionState()
        mainHandler.post {
            listener?.invoke(stats)
        }
    }

    /**
     * C15: persist the current run to SharedPreferences. Called on every
     * stats broadcast. A deliberate stop clears it (stopTrackingSession);
     * a process kill leaves it, so a null-intent restart can restore.
     */
    private fun persistSessionState() {
        if (!isServiceRunning) return
        try {
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_ACTIVE, true)
                .putFloat(KEY_TARGET_KM, activeTargetKm.toFloat())
                .putFloat(KEY_DISTANCE, totalDistanceMeters.toFloat())
                .putLong(KEY_ELAPSED, elapsedSeconds)
                .putInt(KEY_STEPS, totalSteps)
                .putInt(KEY_CALORIES, caloriesBurned)
                .putBoolean(KEY_PAUSED, isPaused)
                .putBoolean(KEY_COMPLETED, hasTriggeredCompletion)
                .apply()
        } catch (e: Exception) {
            Log.w(TAG, "Persist session note: ${e.message}")
        }
    }

    private fun clearPersistedSession() {
        try {
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
        } catch (e: Exception) {
            Log.w(TAG, "Clear persisted session note: ${e.message}")
        }
    }

    /**
     * C15: restore a run persisted before a process death. Returns false
     * when no active run was persisted. Restores counters WITHOUT
     * resetting them, then re-attaches all tracking infrastructure.
     */
    private fun restorePersistedSession(): Boolean {
        val prefs = try {
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        } catch (e: Exception) {
            Log.w(TAG, "Restore session note: ${e.message}")
            return false
        }
        if (!prefs.getBoolean(KEY_ACTIVE, false)) return false

        activeTargetKm = prefs.getFloat(KEY_TARGET_KM, 1.0f).toDouble().takeIf { it > 0 } ?: 1.0
        totalDistanceMeters = prefs.getFloat(KEY_DISTANCE, 0f).toDouble()
        elapsedSeconds = prefs.getLong(KEY_ELAPSED, 0L)
        totalSteps = prefs.getInt(KEY_STEPS, 0)
        caloriesBurned = prefs.getInt(KEY_CALORIES, 0)
        isPaused = prefs.getBoolean(KEY_PAUSED, false)
        hasTriggeredCompletion = prefs.getBoolean(KEY_COMPLETED, false)
        isVehicleSpeed = false
        currentSpeedKmh = 0.0
        currentPaceFormatted = "--:--"
        lastRecordedLocation = null
        speedEmaKmh = 0.0
        vehicleSamplesCount = 0
        initialStepCount = -1
        isServiceRunning = true

        Log.d(TAG, "Restored persisted run: target=${activeTargetKm}km distance=${totalDistanceMeters}m elapsed=${elapsedSeconds}s")
        beginTrackingInfrastructure()
        return true
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ARISE Running Tracker",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Live stats for active running workouts"
                setShowBadge(false)
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun buildOngoingNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val distKm = totalDistanceMeters / 1000.0
        val distFormatted = String.format(Locale.US, "%.2f", distKm)
        val timeFormatted = formatTime(elapsedSeconds)
        val progressPercent = Math.min(100, Math.max(0, ((distKm / Math.max(0.1, activeTargetKm)) * 100).toInt()))

        // 1. Collapsed Custom View
        val collapsedView = RemoteViews(packageName, R.layout.notification_running_collapsed).apply {
            setTextViewText(R.id.tv_notif_distance, "$distFormatted KM")
            setTextViewText(R.id.tv_notif_time, timeFormatted)
            setTextViewText(R.id.tv_notif_pace, "$currentPaceFormatted /km")
            setProgressBar(R.id.pb_notif_progress, 100, progressPercent, false)

            if (isPaused) {
                setTextViewText(R.id.tv_notif_status, "PAUSED")
                setTextColor(R.id.tv_notif_status, Color.parseColor("#F59E0B"))
                setInt(R.id.tv_notif_status, "setBackgroundResource", R.drawable.notif_badge_bg_paused)
            } else {
                setTextViewText(R.id.tv_notif_status, "LIVE")
                setTextColor(R.id.tv_notif_status, Color.parseColor("#10B981"))
                setInt(R.id.tv_notif_status, "setBackgroundResource", R.drawable.notif_badge_bg_active)
            }
        }

        // 2. Expanded Custom View
        val expandedView = RemoteViews(packageName, R.layout.notification_running_expanded).apply {
            setTextViewText(R.id.tv_notif_exp_distance, distFormatted)
            setTextViewText(R.id.tv_notif_exp_target, String.format(Locale.US, "TARGET: %.1f KM", activeTargetKm))
            setTextViewText(R.id.tv_notif_exp_percent, "$progressPercent% COMPLETED")
            setProgressBar(R.id.pb_notif_exp_progress, 100, progressPercent, false)

            setTextViewText(R.id.tv_notif_exp_time, timeFormatted)
            setTextViewText(R.id.tv_notif_exp_pace, currentPaceFormatted)
            setTextViewText(R.id.tv_notif_exp_steps, String.format(Locale.US, "%,d", totalSteps))
            setTextViewText(R.id.tv_notif_exp_calories, caloriesBurned.toString())

            if (isPaused) {
                setTextViewText(R.id.tv_notif_exp_status, "PAUSED")
                setTextColor(R.id.tv_notif_exp_status, Color.parseColor("#F59E0B"))
                setInt(R.id.tv_notif_exp_status, "setBackgroundResource", R.drawable.notif_badge_bg_paused)
                setTextViewText(R.id.btn_notif_pause_resume, "▶ RESUME")
            } else {
                setTextViewText(R.id.tv_notif_exp_status, "RECORDING")
                setTextColor(R.id.tv_notif_exp_status, Color.parseColor("#10B981"))
                setInt(R.id.tv_notif_exp_status, "setBackgroundResource", R.drawable.notif_badge_bg_active)
                setTextViewText(R.id.btn_notif_pause_resume, "⏸ PAUSE")
            }
        }

        // 3. Interactive Intents
        val toggleAction = if (isPaused) ACTION_RESUME else ACTION_PAUSE
        val toggleIntent = Intent(this, RunningService::class.java).apply {
            action = toggleAction
        }
        val togglePendingIntent = PendingIntent.getService(
            this,
            101,
            toggleIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )
        expandedView.setOnClickPendingIntent(R.id.btn_notif_pause_resume, togglePendingIntent)

        val finishIntent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
        val finishPendingIntent = PendingIntent.getActivity(
            this,
            102,
            finishIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )
        expandedView.setOnClickPendingIntent(R.id.btn_notif_finish, finishPendingIntent)

        // 4. Standard notification fallback & builder
        val iconRes = applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_menu_mylocation
        val fallbackTitle = if (isPaused) "ARISE Run (Paused) • $distFormatted KM" else "ARISE Run • $distFormatted KM"
        val fallbackContent = "Time: $timeFormatted | Pace: $currentPaceFormatted/km | Steps: $totalSteps"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(fallbackTitle)
            .setContentText(fallbackContent)
            .setCustomContentView(collapsedView)
            .setCustomBigContentView(expandedView)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .addAction(
                if (isPaused) android.R.drawable.ic_media_play else android.R.drawable.ic_media_pause,
                if (isPaused) "Resume" else "Pause",
                togglePendingIntent
            )
            .build()
    }

    private fun updateNotification() {
        notificationManager?.notify(NOTIFICATION_ID, buildOngoingNotification())
    }

    private fun formatTime(seconds: Long): String {
        val mins = seconds / 60
        val secs = seconds % 60
        return String.format(Locale.US, "%02d:%02d", mins, secs)
    }

    override fun onDestroy() {
        stopTrackingSession()
        super.onDestroy()
    }
}
