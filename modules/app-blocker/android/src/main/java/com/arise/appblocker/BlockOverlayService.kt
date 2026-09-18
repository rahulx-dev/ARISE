package com.arise.appblocker

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Pixel-perfect implementation of the ARISE Lock Screen Overlay matching
 * the reference design:
 * - Glowing circular lock badge with radiant cyan bloom & padlock
 * - Dynamic app icon of the locked app with red forbidden badge overlay
 * - High-impact "B L O C K E D" header & restricted domain subhead
 * - Luminous royal electric-blue Pushup Hero Trial card
 * - 2x2 Inner-glow action cards (Watch Ad, Shop Pass, 5-Min Pass, Return Home)
 * - Cyber header & footer: "DISCIPLINE BUILDS FREEDOM"
 */
class BlockOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var currentPackageName: String? = null
    private var currentBudgetMs: Long = 0L
    private var currentUsedMs: Long = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val pkg = intent?.getStringExtra("PACKAGE_NAME")
        if (pkg != null) {
            currentPackageName = pkg
        }
        currentBudgetMs = intent?.getLongExtra("BUDGET_MS", 0L) ?: 0L
        currentUsedMs = intent?.getLongExtra("USED_MS", 0L) ?: 0L

        if (overlayView != null && overlayView?.isAttachedToWindow == true) {
            overlayView?.visibility = View.VISIBLE
            overlayView?.bringToFront()
        } else {
            if (overlayView != null) {
                try {
                    windowManager?.removeViewImmediate(overlayView)
                } catch (_: Exception) {}
                overlayView = null
            }
            showOverlay()
        }
        return START_STICKY
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun isEmergencyBailoutAvailable(): Boolean {
        return try {
            val prefs = getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val lastDate = prefs.getString("last_emergency_bailout_date", "")
            today != lastDate
        } catch (_: Exception) {
            true
        }
    }

    private fun claimEmergencyBailout() {
        try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            getSharedPreferences("arise_blocker_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("last_emergency_bailout_date", today)
                .apply()

            val unlockUntil = System.currentTimeMillis() + (5 * 60 * 1000L)
            AppMonitorService.setUnlockUntil(this, unlockUntil)

            try {
                val serviceIntent = Intent(this, AppMonitorService::class.java).apply {
                    putExtra("UNLOCKED_UNTIL_EPOCH", unlockUntil)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
            } catch (_: Exception) {}

            Toast.makeText(this, "Emergency 5-Minute Pass Activated! Stay disciplined.", Toast.LENGTH_LONG).show()
        } catch (_: Exception) {}
        stopSelf()
    }

    private fun claimAdPass() {
        try {
            val adIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://watch-ad-unlock")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(adIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        stopSelf()
    }

    private fun launchWorkoutUnlock() {
        try {
            val workoutIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://exercise/pushup?target=10&source=overlay")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(workoutIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        stopSelf()
    }

    private fun launchShopUnlock() {
        try {
            val shopIntent = Intent(Intent.ACTION_VIEW, Uri.parse("arise://shop")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(shopIntent)
        } catch (_: Exception) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            if (launchIntent != null) startActivity(launchIntent)
        }
        stopSelf()
    }

    private fun exitToHomeScreen() {
        try {
            val startMain = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            startActivity(startMain)
        } catch (_: Exception) {}
        // Overlay will be cleanly dismissed by AppMonitorService once Launcher is confirmed active
    }

    // =========================================================================
    // CUSTOM PROCEDURAL ICONS & DRAWABLES MATCHING REFERENCE IMAGE
    // =========================================================================

    /**
     * Large glowing circular lock badge:
     * - Intense luminous electric cyan-blue outer circular bloom
     * - Inner dark disk with radial blue backlight
     * - Crisp centered glowing padlock
     */
    private inner class GlowingLockBadgeView(context: Context) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f
            val radius = (Math.min(width, height) / 2f) - dpToPx(8).toFloat()

            // 1. Dark circular base
            val darkBasePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#020713")
                style = Paint.Style.FILL
            }
            canvas.drawCircle(cx, cy, radius, darkBasePaint)

            // 2. Radial center blue backlight
            val radialShader = RadialGradient(
                cx, cy, radius * 0.75f,
                Color.parseColor("#550A84FF"),
                Color.TRANSPARENT,
                Shader.TileMode.CLAMP
            )
            val radialPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = radialShader
                style = Paint.Style.FILL
            }
            canvas.drawCircle(cx, cy, radius * 0.75f, radialPaint)

            // 3. Multi-layer outer neon cyan luminous glow rings
            val glowPaintWide = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#3300D2EE")
                strokeWidth = dpToPx(7).toFloat()
                style = Paint.Style.STROKE
            }
            val glowPaintMid = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#6600D2EE")
                strokeWidth = dpToPx(4).toFloat()
                style = Paint.Style.STROKE
            }
            val solidRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#00D2EE")
                strokeWidth = dpToPx(2).toFloat()
                style = Paint.Style.STROKE
            }
            canvas.drawCircle(cx, cy, radius, glowPaintWide)
            canvas.drawCircle(cx, cy, radius, glowPaintMid)
            canvas.drawCircle(cx, cy, radius, solidRingPaint)

            // 4. Centered Padlock Icon
            val lockColor = Color.parseColor("#38BDF8")

            // Shackle (U-arch)
            val shackleWidth = dpToPx(13).toFloat()
            val shackleHeight = dpToPx(17).toFloat()
            val shackleTop = cy - dpToPx(24).toFloat()
            val shacklePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = lockColor
                strokeWidth = dpToPx(4).toFloat()
                style = Paint.Style.STROKE
                strokeCap = Paint.Cap.ROUND
            }
            val shackleRect = RectF(
                cx - shackleWidth,
                shackleTop,
                cx + shackleWidth,
                shackleTop + (shackleHeight * 2f)
            )
            canvas.drawArc(shackleRect, 180f, 180f, false, shacklePaint)
            canvas.drawLine(cx - shackleWidth, shackleTop + shackleHeight, cx - shackleWidth, cy - dpToPx(7).toFloat(), shacklePaint)
            canvas.drawLine(cx + shackleWidth, shackleTop + shackleHeight, cx + shackleWidth, cy - dpToPx(7).toFloat(), shacklePaint)

            // Body (rounded rect)
            val bodyWidth = dpToPx(18).toFloat()
            val bodyHeight = dpToPx(16).toFloat()
            val bodyTop = cy - dpToPx(8).toFloat()
            val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = lockColor
                style = Paint.Style.FILL
            }
            val bodyRect = RectF(
                cx - bodyWidth,
                bodyTop,
                cx + bodyWidth,
                bodyTop + (bodyHeight * 1.5f)
            )
            canvas.drawRoundRect(bodyRect, dpToPx(4).toFloat(), dpToPx(4).toFloat(), bodyPaint)

            // Keyhole
            val keyholePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#020713")
                style = Paint.Style.FILL
            }
            canvas.drawCircle(cx, cy + dpToPx(1).toFloat(), dpToPx(3).toFloat(), keyholePaint)
            val keySlotPath = Path().apply {
                moveTo(cx - dpToPx(2).toFloat(), cy + dpToPx(1).toFloat())
                lineTo(cx + dpToPx(2).toFloat(), cy + dpToPx(1).toFloat())
                lineTo(cx + dpToPx(1).toFloat(), cy + dpToPx(7).toFloat())
                lineTo(cx - dpToPx(1).toFloat(), cy + dpToPx(7).toFloat())
                close()
            }
            canvas.drawPath(keySlotPath, keyholePaint)
        }
    }

    /**
     * Dumbbell icon for the Hero Pushup Trial card
     */
    private inner class DumbbellIconView(context: Context) : View(context) {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#E0F2FE")
            style = Paint.Style.FILL
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f

            // Central bar
            val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#E0F2FE")
                strokeWidth = dpToPx(3.5f.toInt().coerceAtLeast(3)).toFloat()
                style = Paint.Style.STROKE
                strokeCap = Paint.Cap.ROUND
            }
            canvas.drawLine(cx - dpToPx(14).toFloat(), cy, cx + dpToPx(14).toFloat(), cy, barPaint)

            // Left inner collar & outer plate
            val r = dpToPx(2).toFloat()
            canvas.drawRoundRect(RectF(cx - dpToPx(9).toFloat(), cy - dpToPx(6).toFloat(), cx - dpToPx(6).toFloat(), cy + dpToPx(6).toFloat()), r, r, paint)
            canvas.drawRoundRect(RectF(cx - dpToPx(14).toFloat(), cy - dpToPx(11).toFloat(), cx - dpToPx(10).toFloat(), cy + dpToPx(11).toFloat()), r, r, paint)

            // Right inner collar & outer plate
            canvas.drawRoundRect(RectF(cx + dpToPx(6).toFloat(), cy - dpToPx(6).toFloat(), cx + dpToPx(9).toFloat(), cy + dpToPx(6).toFloat()), r, r, paint)
            canvas.drawRoundRect(RectF(cx + dpToPx(10).toFloat(), cy - dpToPx(11).toFloat(), cx + dpToPx(14).toFloat(), cy + dpToPx(11).toFloat()), r, r, paint)
        }
    }

    /**
     * Circular right chevron (>) inside hero card
     */
    private inner class ActionChevronCircleView(context: Context) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f
            val radius = width / 2f

            val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#004299")
                style = Paint.Style.FILL
            }
            canvas.drawCircle(cx, cy, radius, bgPaint)

            // Chevron path
            val chevronPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                strokeWidth = dpToPx(2.5f.toInt().coerceAtLeast(2)).toFloat()
                style = Paint.Style.STROKE
                strokeCap = Paint.Cap.ROUND
                strokeJoin = Paint.Join.ROUND
            }
            val p = Path().apply {
                moveTo(cx - dpToPx(3).toFloat(), cy - dpToPx(6).toFloat())
                lineTo(cx + dpToPx(4).toFloat(), cy)
                lineTo(cx - dpToPx(3).toFloat(), cy + dpToPx(6).toFloat())
            }
            canvas.drawPath(p, chevronPaint)
        }
    }

    /**
     * Small red circular forbidden badge (circle with diagonal slash) overlaid on app icon
     */
    private inner class RedForbiddenBadgeView(context: Context) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f
            val radius = (Math.min(width, height) / 2f) - dpToPx(1).toFloat()

            // Dark perimeter border
            val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#070E1A")
                strokeWidth = dpToPx(2).toFloat()
                style = Paint.Style.STROKE
            }
            canvas.drawCircle(cx, cy, radius, borderPaint)

            // Red circle ring
            val redRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#EF4444")
                strokeWidth = dpToPx(2).toFloat()
                style = Paint.Style.STROKE
            }
            canvas.drawCircle(cx, cy, radius - dpToPx(1).toFloat(), redRingPaint)

            // Diagonal slash line
            val offset = (radius - dpToPx(1).toFloat()) * 0.707f
            canvas.drawLine(cx - offset, cy - offset, cx + offset, cy + offset, redRingPaint)
        }
    }

    /**
     * Reusable circular icon badge for the 2x2 grid (Play, Cart, Clock, Home)
     */
    private inner class GridBadgeIconView(
        context: Context,
        private val iconType: String,
        private val iconColorHex: String
    ) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f
            val strokeColor = Color.parseColor(iconColorHex)

            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = strokeColor
            }

            when (iconType) {
                "PLAY" -> {
                    // Solid Play Triangle
                    val triPath = Path().apply {
                        moveTo(cx - dpToPx(4).toFloat(), cy - dpToPx(6).toFloat())
                        lineTo(cx + dpToPx(6).toFloat(), cy)
                        lineTo(cx - dpToPx(4).toFloat(), cy + dpToPx(6).toFloat())
                        close()
                    }
                    paint.style = Paint.Style.FILL
                    canvas.drawPath(triPath, paint)
                }
                "CART" -> {
                    // Shopping Cart / Basket
                    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = strokeColor
                        strokeWidth = dpToPx(1.8f.toInt().coerceAtLeast(2)).toFloat()
                        style = Paint.Style.STROKE
                        strokeCap = Paint.Cap.ROUND
                        strokeJoin = Paint.Join.ROUND
                    }
                    val cartPath = Path().apply {
                        moveTo(cx - dpToPx(8).toFloat(), cy - dpToPx(6).toFloat())
                        lineTo(cx - dpToPx(5).toFloat(), cy - dpToPx(6).toFloat())
                        lineTo(cx - dpToPx(3).toFloat(), cy + dpToPx(2).toFloat())
                        lineTo(cx + dpToPx(6).toFloat(), cy + dpToPx(2).toFloat())
                        lineTo(cx + dpToPx(7).toFloat(), cy - dpToPx(3).toFloat())
                        lineTo(cx - dpToPx(4).toFloat(), cy - dpToPx(3).toFloat())
                    }
                    canvas.drawPath(cartPath, strokePaint)
                    // Wheels
                    paint.style = Paint.Style.FILL
                    canvas.drawCircle(cx - dpToPx(2).toFloat(), cy + dpToPx(6).toFloat(), dpToPx(1.5f.toInt().coerceAtLeast(1)).toFloat(), paint)
                    canvas.drawCircle(cx + dpToPx(5).toFloat(), cy + dpToPx(6).toFloat(), dpToPx(1.5f.toInt().coerceAtLeast(1)).toFloat(), paint)
                }
                "CLOCK" -> {
                    // Clock
                    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = strokeColor
                        strokeWidth = dpToPx(1.8f.toInt().coerceAtLeast(2)).toFloat()
                        style = Paint.Style.STROKE
                    }
                    canvas.drawCircle(cx, cy, dpToPx(7).toFloat(), strokePaint)
                    // Hands
                    canvas.drawLine(cx, cy, cx, cy - dpToPx(4).toFloat(), strokePaint)
                    canvas.drawLine(cx, cy, cx + dpToPx(3).toFloat(), cy, strokePaint)
                }
                "HOME" -> {
                    // Home House Icon
                    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = strokeColor
                        strokeWidth = dpToPx(1.8f.toInt().coerceAtLeast(2)).toFloat()
                        style = Paint.Style.STROKE
                        strokeCap = Paint.Cap.ROUND
                        strokeJoin = Paint.Join.ROUND
                    }
                    // Roof
                    val roofPath = Path().apply {
                        moveTo(cx - dpToPx(7).toFloat(), cy - dpToPx(1).toFloat())
                        lineTo(cx, cy - dpToPx(7).toFloat())
                        lineTo(cx + dpToPx(7).toFloat(), cy - dpToPx(1).toFloat())
                    }
                    canvas.drawPath(roofPath, strokePaint)
                    // Walls
                    val wallPath = Path().apply {
                        moveTo(cx - dpToPx(5).toFloat(), cy)
                        lineTo(cx - dpToPx(5).toFloat(), cy + dpToPx(6).toFloat())
                        lineTo(cx + dpToPx(5).toFloat(), cy + dpToPx(6).toFloat())
                        lineTo(cx + dpToPx(5).toFloat(), cy)
                    }
                    canvas.drawPath(wallPath, strokePaint)
                }
            }
        }
    }

    /**
     * Creates each card of the 2x2 grid with exact inner luminous glow and colored circular badge
     */
    private fun createGridActionCard(
        titleText: String,
        subtitleText: String,
        iconType: String,
        accentColorHex: String,
        badgeBgColorHex: String,
        cardTopTintHex: String,
        textColorHex: String,
        isEnabled: Boolean = true,
        onClick: () -> Unit
    ): LinearLayout {
        val cardDrawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(14).toFloat()
            orientation = GradientDrawable.Orientation.TOP_BOTTOM
            colors = intArrayOf(
                Color.parseColor(cardTopTintHex),
                Color.parseColor("#070B14")
            )
            setStroke(dpToPx(1.5f.toInt().coerceAtLeast(1)), Color.parseColor(accentColorHex))
        }

        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = cardDrawable
            setPadding(dpToPx(12), dpToPx(12), dpToPx(12), dpToPx(12))
            alpha = if (isEnabled) 1.0f else 0.45f
            if (isEnabled) {
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    try {
                        performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                    } catch (_: Exception) {}
                    onClick()
                }
            }

            // Left icon circular badge
            val iconBadgeFrame = FrameLayout(context).apply {
                val circleDrawable = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor(badgeBgColorHex))
                }
                background = circleDrawable
                layoutParams = LinearLayout.LayoutParams(dpToPx(38), dpToPx(38))
            }
            val badgeIcon = GridBadgeIconView(context, iconType, accentColorHex).apply {
                layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            }
            iconBadgeFrame.addView(badgeIcon)
            addView(iconBadgeFrame)

            // Text column
            val textCol = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginStart = dpToPx(10)
                }
            }

            val titleView = TextView(context).apply {
                text = titleText
                setTextColor(Color.parseColor(textColorHex))
                textSize = 12f
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                letterSpacing = 0.05f
            }

            val subView = TextView(context).apply {
                text = subtitleText
                setTextColor(Color.parseColor("#94A3B8"))
                textSize = 10f
                setPadding(0, dpToPx(2), 0, 0)
            }

            textCol.addView(titleView)
            textCol.addView(subView)
            addView(textCol)
        }
    }

    // =========================================================================
    // MAIN OVERLAY INVOCATION & PROCEDURAL BUILDER
    // =========================================================================

    private fun showOverlay() {
        if (overlayView != null) return
        if (System.currentTimeMillis() < AppMonitorService.getUnlockUntil(this)) {
            stopSelf()
            return
        }

        val layoutParamsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutParamsType,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED or
                    WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        ).apply {
            flags = flags and WindowManager.LayoutParams.FLAG_SPLIT_TOUCH.inv()
            gravity = Gravity.FILL
            x = 0
            y = 0
            width = WindowManager.LayoutParams.MATCH_PARENT
            height = WindowManager.LayoutParams.MATCH_PARENT
            screenOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }

        showProceduralOverlay(params)
    }

    private fun showProceduralOverlay(params: WindowManager.LayoutParams) {
        var appLabel = "Application"
        var appIconDrawable: Drawable? = null
        val pkg = currentPackageName
        if (pkg != null) {
            try {
                val pm = packageManager
                val appInfo = pm.getApplicationInfo(pkg, 0)
                appLabel = pm.getApplicationLabel(appInfo).toString()
                appIconDrawable = pm.getApplicationIcon(appInfo)
            } catch (_: Exception) {}
        }

        // 1. Fullscreen Pitch Black Screen with strict touch capture & immersive mode
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#000000"))
            isClickable = true
            isFocusable = true
            isFocusableInTouchMode = true
            systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setOnTouchListener { _, _ -> true }
            setOnKeyListener { _, keyCode, event ->
                if (keyCode == android.view.KeyEvent.KEYCODE_BACK && event.action == android.view.KeyEvent.ACTION_UP) {
                    exitToHomeScreen()
                    true
                } else {
                    false
                }
            }
        }

        // 2. ScrollView container for all screen resolutions
        val scrollView = ScrollView(this).apply {
            isFillViewport = true
            overScrollMode = View.OVER_SCROLL_NEVER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        val contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dpToPx(20), dpToPx(36), dpToPx(20), dpToPx(24))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // ---------------------------------------------------------------------
        // TOP HEADER BAR: "FOCUS MODE" on left, "DISCIPLINE" creed on right
        // ---------------------------------------------------------------------
        val topHeaderRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(24)
            }
        }

        // Left Col
        val topLeftCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        val focusModeText = TextView(this).apply {
            text = "FOCUS MODE"
            setTextColor(Color.WHITE)
            textSize = 13f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.12f
        }
        val cyanUnderline = View(this).apply {
            setBackgroundColor(Color.parseColor("#00D2EE"))
            layoutParams = LinearLayout.LayoutParams(dpToPx(26), dpToPx(2)).apply {
                topMargin = dpToPx(3)
                bottomMargin = dpToPx(4)
            }
        }
        val betterYouText = TextView(this).apply {
            text = "A BETTER YOU"
            setTextColor(Color.parseColor("#64748B"))
            textSize = 9f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.10f
        }
        topLeftCol.addView(focusModeText)
        topLeftCol.addView(cyanUnderline)
        topLeftCol.addView(betterYouText)

        // Right Col
        val topRightCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        listOf("DISCIPLINE", "TODAY", "FREEDOM TOMORROW").forEach { line ->
            val tv = TextView(this).apply {
                text = line
                setTextColor(Color.parseColor("#64748B"))
                textSize = 8.5f
                gravity = Gravity.END
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                letterSpacing = 0.08f
            }
            topRightCol.addView(tv)
        }

        topHeaderRow.addView(topLeftCol)
        topHeaderRow.addView(topRightCol)
        contentLayout.addView(topHeaderRow)

        // ---------------------------------------------------------------------
        // CENTER GLOWING LOCK BADGE
        // ---------------------------------------------------------------------
        val lockBadge = GlowingLockBadgeView(this).apply {
            val badgeSize = dpToPx(136)
            layoutParams = LinearLayout.LayoutParams(badgeSize, badgeSize).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                topMargin = dpToPx(6)
                bottomMargin = dpToPx(18)
            }
        }
        contentLayout.addView(lockBadge)

        // ---------------------------------------------------------------------
        // "B L O C K E D" HEADER & "RESTRICTED DOMAIN // <APP_NAME>"
        // ---------------------------------------------------------------------
        val blockedTitle = TextView(this).apply {
            text = "B L O C K E D"
            setTextColor(Color.WHITE)
            textSize = 25f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.28f
            gravity = Gravity.CENTER
        }
        val restrictedDomainSub = TextView(this).apply {
            text = "RESTRICTED DOMAIN  //  ${appLabel.uppercase()}"
            setTextColor(Color.parseColor("#38BDF8"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.12f
            gravity = Gravity.CENTER
            setPadding(0, dpToPx(5), 0, dpToPx(18))
        }
        contentLayout.addView(blockedTitle)
        contentLayout.addView(restrictedDomainSub)

        // ---------------------------------------------------------------------
        // LOCKED APP INFO CARD (Dynamic app icon + red forbidden badge)
        // ---------------------------------------------------------------------
        val appCardBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(14).toFloat()
            setColor(Color.parseColor("#070E1A"))
            setStroke(dpToPx(1), Color.parseColor("#152238"))
        }

        val appCard = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = appCardBg
            setPadding(dpToPx(14), dpToPx(14), dpToPx(14), dpToPx(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(14)
            }
        }

        // App Icon with Red Forbidden Overlay Badge
        val iconBadgeFrame = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(48), dpToPx(48))
        }
        val appImageView = ImageView(this).apply {
            layoutParams = FrameLayout.LayoutParams(dpToPx(44), dpToPx(44)).apply {
                gravity = Gravity.CENTER
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                clipToOutline = true
                outlineProvider = object : ViewOutlineProvider() {
                    override fun getOutline(view: View, outline: android.graphics.Outline) {
                        outline.setRoundRect(0, 0, view.width, view.height, dpToPx(10).toFloat())
                    }
                }
            }
            if (appIconDrawable != null) {
                setImageDrawable(appIconDrawable)
            } else {
                // Fallback icon
                setBackgroundColor(Color.parseColor("#1E293B"))
            }
        }
        val forbiddenBadge = RedForbiddenBadgeView(this).apply {
            val badgeSize = dpToPx(18)
            layoutParams = FrameLayout.LayoutParams(badgeSize, badgeSize).apply {
                gravity = Gravity.BOTTOM or Gravity.END
            }
        }
        iconBadgeFrame.addView(appImageView)
        iconBadgeFrame.addView(forbiddenBadge)
        appCard.addView(iconBadgeFrame)

        // App Card Text
        val appTextCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dpToPx(14)
            }
        }
        val allowanceText = TextView(this).apply {
            text = "Daily Screen Time Allowance Exhausted"
            setTextColor(Color.parseColor("#F1F5F9"))
            textSize = 12.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        val protectionSubText = TextView(this).apply {
            text = "This domain is temporarily restricted to protect your focus."
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 11f
            setPadding(0, dpToPx(3), 0, 0)
        }
        appTextCol.addView(allowanceText)
        appTextCol.addView(protectionSubText)
        appCard.addView(appTextCol)
        contentLayout.addView(appCard)

        // ---------------------------------------------------------------------
        // PRIMARY HERO ACTION: 10 PUSHUPS TRIAL (Luminous Electric Blue Card)
        // ---------------------------------------------------------------------
        val heroCardBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(16).toFloat()
            orientation = GradientDrawable.Orientation.LEFT_RIGHT
            colors = intArrayOf(
                Color.parseColor("#0052D4"),
                Color.parseColor("#0A84FF")
            )
            setStroke(dpToPx(1.5f.toInt().coerceAtLeast(1)), Color.parseColor("#38BDF8"))
        }

        val heroCard = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = heroCardBg
            setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(14)
            }
            isClickable = true
            isFocusable = true
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                launchWorkoutUnlock()
            }
        }

        // Dumbbell Icon
        val dumbbellIcon = DumbbellIconView(this).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(32), dpToPx(32))
        }
        heroCard.addView(dumbbellIcon)

        // Middle Text Col
        val heroTextCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dpToPx(14)
            }
        }
        val heroHeaderTag = TextView(this).apply {
            text = "EXECUTE TRIAL"
            setTextColor(Color.parseColor("#BAE6FD"))
            textSize = 10f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.12f
        }
        val heroMainAction = TextView(this).apply {
            text = "10 PUSHUPS"
            setTextColor(Color.WHITE)
            textSize = 17f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.05f
            setPadding(0, dpToPx(2), 0, 0)
        }
        val heroSubReward = TextView(this).apply {
            text = "AI Motion Sensor  •  Unlock +20m"
            setTextColor(Color.parseColor("#E0F2FE"))
            textSize = 11f
            setPadding(0, dpToPx(2), 0, 0)
        }
        heroTextCol.addView(heroHeaderTag)
        heroTextCol.addView(heroMainAction)
        heroTextCol.addView(heroSubReward)
        heroCard.addView(heroTextCol)

        // Right Chevron Action Circle
        val chevronCircle = ActionChevronCircleView(this).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(36), dpToPx(36))
        }
        heroCard.addView(chevronCircle)
        contentLayout.addView(heroCard)

        // ---------------------------------------------------------------------
        // 2x2 SECONDARY ACTION GRID (Matching Reference Image)
        // ---------------------------------------------------------------------
        val gridContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // Row 1: [WATCH AD] + [SHOP PASS]
        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(10)
            }
        }

        val watchAdCard = createGridActionCard(
            titleText = "WATCH AD",
            subtitleText = "+15 Mins",
            iconType = "PLAY",
            accentColorHex = "#F59E0B",
            badgeBgColorHex = "#281E08",
            cardTopTintHex = "#16130A",
            textColorHex = "#F59E0B",
            onClick = { claimAdPass() }
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginEnd = dpToPx(5)
            }
        }

        val shopPassCard = createGridActionCard(
            titleText = "SHOP PASS",
            subtitleText = "Instant Unlock",
            iconType = "CART",
            accentColorHex = "#8B5CF6",
            badgeBgColorHex = "#1A102E",
            cardTopTintHex = "#130E22",
            textColorHex = "#C084FC",
            onClick = { launchShopUnlock() }
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dpToPx(5)
            }
        }
        row1.addView(watchAdCard)
        row1.addView(shopPassCard)
        gridContainer.addView(row1)

        // Row 2: [5-MIN PASS] + [RETURN HOME]
        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val emergencyAvailable = isEmergencyBailoutAvailable()
        val fiveMinCard = if (emergencyAvailable) {
            createGridActionCard(
                titleText = "5-MIN PASS",
                subtitleText = "Emergency Bailout",
                iconType = "CLOCK",
                accentColorHex = "#10B981",
                badgeBgColorHex = "#062018",
                cardTopTintHex = "#0B1813",
                textColorHex = "#34D399",
                onClick = { claimEmergencyBailout() }
            )
        } else {
            createGridActionCard(
                titleText = "BAILOUT USED",
                subtitleText = "Resets Tomorrow",
                iconType = "CLOCK",
                accentColorHex = "#334155",
                badgeBgColorHex = "#0B1017",
                cardTopTintHex = "#080B10",
                textColorHex = "#64748B",
                isEnabled = false,
                onClick = {}
            )
        }.apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginEnd = dpToPx(5)
            }
        }

        val returnHomeCard = createGridActionCard(
            titleText = "RETURN HOME",
            subtitleText = "Preserve Discipline",
            iconType = "HOME",
            accentColorHex = "#475569",
            badgeBgColorHex = "#161D2B",
            cardTopTintHex = "#0F131C",
            textColorHex = "#FFFFFF",
            onClick = { exitToHomeScreen() }
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dpToPx(5)
            }
        }
        row2.addView(fiveMinCard)
        row2.addView(returnHomeCard)
        gridContainer.addView(row2)
        contentLayout.addView(gridContainer)

        // ---------------------------------------------------------------------
        // FOOTER CREED: "DISCIPLINE BUILDS FREEDOM" WITH ACCENT DIVIDERS
        // ---------------------------------------------------------------------
        val footerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(28)
                bottomMargin = dpToPx(12)
            }
        }

        val leftLine = View(this).apply {
            setBackgroundColor(Color.parseColor("#0C233C"))
            layoutParams = LinearLayout.LayoutParams(0, dpToPx(1), 1.0f)
        }
        val footerText = TextView(this).apply {
            text = "DISCIPLINE BUILDS FREEDOM"
            setTextColor(Color.parseColor("#64748B"))
            textSize = 9f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.14f
            setPadding(dpToPx(12), 0, dpToPx(12), 0)
        }
        val rightLine = View(this).apply {
            setBackgroundColor(Color.parseColor("#0C233C"))
            layoutParams = LinearLayout.LayoutParams(0, dpToPx(1), 1.0f)
        }
        footerRow.addView(leftLine)
        footerRow.addView(footerText)
        footerRow.addView(rightLine)
        contentLayout.addView(footerRow)

        // Assemble All
        scrollView.addView(contentLayout)
        rootLayout.addView(scrollView)

        overlayView = rootLayout
        try {
            windowManager?.addView(overlayView, params)
            isOverlayShowing = true
        } catch (e: Exception) {
            e.printStackTrace()
            overlayView = null
            isOverlayShowing = false
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isOverlayShowing = false
        if (overlayView != null) {
            try {
                windowManager?.removeView(overlayView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            overlayView = null
        }
    }

    companion object {
        @Volatile
        var isOverlayShowing: Boolean = false
    }
}
