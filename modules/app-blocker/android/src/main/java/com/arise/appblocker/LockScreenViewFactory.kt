package com.arise.appblocker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.util.Locale

/**
 * 1:1 Neumorphic Lock Screen View Factory for ARISE.
 * Recreates the exact reference design with dynamic blocked app data,
 * dynamic red progress arc (usage ÷ budget), and interactive unlock passes.
 */
object LockScreenViewFactory {

    fun dpToPx(context: Context, dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            context.resources.displayMetrics
        ).toInt()
    }

    private fun createRoundedCard(
        context: Context,
        bgColor: String,
        strokeColor: String,
        radiusDp: Int,
        strokeWidthDp: Float = 1.0f
    ): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(context, radiusDp).toFloat()
            setColor(Color.parseColor(bgColor))
            setStroke(
                dpToPx(context, strokeWidthDp.toInt()).coerceAtLeast(1),
                Color.parseColor(strokeColor)
            )
        }
    }

    /**
     * Hero Circular Lock Composition View.
     * Features:
     * - Outer thin groove circle
     * - Outer raised concentric bevel
     * - Sunken circular track channel
     * - Dynamic Red Progress Arc (usage ÷ budget) with rounded caps & specular shine
     * - Inner concentric bevel
     * - Centered 3D Red Padlock disc
     */
    class HeroLockCircleView(
        context: Context,
        private val progressRatio: Float
    ) : View(context) {

        private val discBitmap: Bitmap? by lazy {
            try {
                BitmapFactory.decodeResource(resources, R.drawable.lock_hero_lock_disc)
            } catch (_: Exception) {
                null
            }
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val dp = { v: Int -> dpToPx(context, v).toFloat() }
            val cx = width / 2f
            val cy = height / 2f
            val baseRadius = (Math.min(width, height) / 2f) - dp(8)

            // 1. Outer thin groove ring
            val outerGroovePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#DDE2EA")
                style = Paint.Style.STROKE
                strokeWidth = dp(1).coerceAtLeast(1f)
            }
            canvas.drawCircle(cx, cy, baseRadius, outerGroovePaint)

            // 2. Outer raised bevel ring
            val outerBevelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#F4F6F9")
                style = Paint.Style.STROKE
                strokeWidth = dp(4)
            }
            canvas.drawCircle(cx, cy, baseRadius - dp(3), outerBevelPaint)

            // 3. Middle sunken circular track channel
            val trackRadius = baseRadius - dp(18)
            val trackWidth = dp(13)
            val trackBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#E4E8F0")
                style = Paint.Style.STROKE
                strokeWidth = trackWidth
                strokeCap = Paint.Cap.ROUND
            }
            canvas.drawCircle(cx, cy, trackRadius, trackBgPaint)

            // 4. Dynamic Red Progress Arc (Reflects usage / daily budget)
            val arcRect = RectF(
                cx - trackRadius,
                cy - trackRadius,
                cx + trackRadius,
                cy + trackRadius
            )

            // Map progress ratio: in reference begins at 210 degrees (around 10 o'clock)
            val sweepAngle = (progressRatio.coerceIn(0.12f, 1.0f) * 360f).coerceAtMost(360f)
            val redArcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = trackWidth
                strokeCap = Paint.Cap.ROUND
                shader = SweepGradient(
                    cx, cy,
                    intArrayOf(
                        Color.parseColor("#FF4D4D"),
                        Color.parseColor("#E53935"),
                        Color.parseColor("#DC2626"),
                        Color.parseColor("#FF4D4D")
                    ),
                    floatArrayOf(0f, 0.4f, 0.8f, 1f)
                )
            }
            canvas.drawArc(arcRect, 210f, sweepAngle, false, redArcPaint)

            // 4b. Specular 3D highlight along the top of the red arc
            val shineArcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dp(2)
                strokeCap = Paint.Cap.ROUND
                color = Color.parseColor("#66FFFFFF")
            }
            val shineRadius = trackRadius - dp(2)
            val shineRect = RectF(
                cx - shineRadius,
                cy - shineRadius,
                cx + shineRadius,
                cy + shineRadius
            )
            canvas.drawArc(shineRect, 214f, Math.max(10f, sweepAngle - 14f), false, shineArcPaint)

            // 5. Inner concentric raised bevel
            val innerBevelRadius = trackRadius - dp(12)
            val innerBevelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#F4F6F9")
                style = Paint.Style.STROKE
                strokeWidth = dp(4)
            }
            canvas.drawCircle(cx, cy, innerBevelRadius, innerBevelPaint)

            // 6. Draw centered white plateau + 3D Red Padlock
            discBitmap?.let { bmp ->
                val discRadius = innerBevelRadius - dp(2)
                val destRect = RectF(
                    cx - discRadius,
                    cy - discRadius,
                    cx + discRadius,
                    cy + discRadius
                )
                canvas.drawBitmap(
                    bmp,
                    null,
                    destRect,
                    Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
                )
            }
        }
    }

    /**
     * Builds and returns the complete 1:1 Lock Screen View hierarchy.
     */
    fun buildLockView(
        context: Context,
        packageName: String?,
        isEmergencyAvailable: Boolean,
        onExitHome: () -> Unit,
        onLaunchPushups: () -> Unit,
        onWatchAd: () -> Unit,
        onEmergencyPass: () -> Unit,
        onShop: () -> Unit
    ): View {
        val dp = { v: Int -> dpToPx(context, v) }

        // Dynamic app info lookup
        var appLabel = "YouTube"
        var appIconDrawable: Drawable? = null
        if (packageName != null) {
            try {
                val pm = context.packageManager
                val appInfo = pm.getApplicationInfo(packageName, 0)
                appLabel = pm.getApplicationLabel(appInfo).toString()
                appIconDrawable = pm.getApplicationIcon(appInfo)
            } catch (_: Exception) {
                // If package name is youtube or fallback
                if (packageName.lowercase(Locale.ROOT).contains("youtube")) {
                    appLabel = "YouTube"
                }
            }
        }

        // Dynamic usage & budget ratio calculation for red progress arc
        val usageMs = if (packageName != null) {
            BlockPolicyController.getLiveUsageForPackage(context, packageName)
        } else 0L
        val budgetMs = if (packageName != null) {
            BlockPolicyController.getBudgetForPackage(context, packageName)
        } else (30 * 60 * 1000L)

        val progressRatio = if (budgetMs > 0) {
            (usageMs.toFloat() / budgetMs.toFloat()).coerceIn(0.15f, 1.0f)
        } else 1.0f

        // Root container: light warm off-white surface
        val rootLayout = FrameLayout(context).apply {
            setBackgroundColor(Color.parseColor("#EEF1F6"))
            isClickable = true
            isFocusable = true
            isFocusableInTouchMode = true
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        val scrollView = ScrollView(context).apply {
            isFillViewport = true
            overScrollMode = View.OVER_SCROLL_NEVER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        val contentLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(18), dp(44), dp(18), dp(24))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // -------------------------------------------------------------
        // 1. HEADER ROW: Hamburger | ARISE Logo | Settings Gear
        // -------------------------------------------------------------
        val headerRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(20)
            }
        }

        // Hamburger Button (Left)
        val hamburgerBtn = ImageView(context).apply {
            setImageResource(R.drawable.lock_header_hamburger)
            scaleType = ImageView.ScaleType.FIT_CENTER
            isClickable = true
            isFocusable = true
            layoutParams = LinearLayout.LayoutParams(dp(44), dp(44))
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                onExitHome()
            }
        }

        // Centered ARISE Logo
        val logoContainer = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        val logoView = ImageView(context).apply {
            setImageResource(R.drawable.lock_header_arise_logo)
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = LinearLayout.LayoutParams(dp(112), dp(36))
        }
        logoContainer.addView(logoView)

        // Settings Gear Button (Right)
        val gearBtn = ImageView(context).apply {
            setImageResource(R.drawable.lock_header_gear)
            scaleType = ImageView.ScaleType.FIT_CENTER
            isClickable = true
            isFocusable = true
            layoutParams = LinearLayout.LayoutParams(dp(44), dp(44))
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                onExitHome()
            }
        }

        headerRow.addView(hamburgerBtn)
        headerRow.addView(logoContainer)
        headerRow.addView(gearBtn)
        contentLayout.addView(headerRow)

        // -------------------------------------------------------------
        // 2. SUB-HEADER ROW: FOCUS MODE / DISCIPLINE TODAY | RED BAR / A BETTER YOU TOMORROW
        // -------------------------------------------------------------
        val subHeaderRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(16)
            }
        }

        // Left Block
        val subLeftCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        val focusModeTv = TextView(context).apply {
            text = "FOCUS MODE"
            setTextColor(Color.parseColor("#111827"))
            textSize = 13.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.15f
        }
        val disciplineTodayTv = TextView(context).apply {
            text = "DISCIPLINE TODAY"
            setTextColor(Color.parseColor("#858F9E"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            letterSpacing = 0.18f
            setPadding(0, dp(2), 0, 0)
        }
        subLeftCol.addView(focusModeTv)
        subLeftCol.addView(disciplineTodayTv)

        // Right Block
        val subRightCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        val redBar = View(context).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(2).toFloat()
                setColor(Color.parseColor("#E53935"))
            }
            layoutParams = LinearLayout.LayoutParams(dp(32), dp(3.5f.toInt().coerceAtLeast(3))).apply {
                gravity = Gravity.END
                bottomMargin = dp(4)
            }
        }
        val aBetterTv = TextView(context).apply {
            text = "A BETTER"
            setTextColor(Color.parseColor("#858F9E"))
            textSize = 9.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            letterSpacing = 0.15f
            gravity = Gravity.END
        }
        val youTomorrowTv = TextView(context).apply {
            text = "YOU TOMORROW"
            setTextColor(Color.parseColor("#858F9E"))
            textSize = 9.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            letterSpacing = 0.15f
            gravity = Gravity.END
        }
        subRightCol.addView(redBar)
        subRightCol.addView(aBetterTv)
        subRightCol.addView(youTomorrowTv)

        subHeaderRow.addView(subLeftCol)
        subHeaderRow.addView(subRightCol)
        contentLayout.addView(subHeaderRow)

        // -------------------------------------------------------------
        // 3. HERO: Large Circular Composition + Padlock + Headings
        // -------------------------------------------------------------
        val heroCircle = HeroLockCircleView(context, progressRatio).apply {
            val heroSize = dp(195)
            layoutParams = LinearLayout.LayoutParams(heroSize, heroSize).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                topMargin = dp(6)
                bottomMargin = dp(12)
            }
        }
        contentLayout.addView(heroCircle)

        val blockedHeading = TextView(context).apply {
            text = "Blocked"
            setTextColor(Color.parseColor("#111827"))
            textSize = 27f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            gravity = Gravity.CENTER
        }
        val restrictedSubtext = TextView(context).apply {
            text = "Restricted Domain  /  $appLabel"
            setTextColor(Color.parseColor("#6B7280"))
            textSize = 12.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            gravity = Gravity.CENTER
            setPadding(0, dp(2), 0, dp(14))
        }
        contentLayout.addView(blockedHeading)
        contentLayout.addView(restrictedSubtext)

        // -------------------------------------------------------------
        // 4. INFO CARD: App Icon Squircle + 🚫 + Allowance Exhausted
        // -------------------------------------------------------------
        val infoCard = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = createRoundedCard(context, "#F0F3F7", "#E2E7F0", 20)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(12)
            }
        }

        // App Icon Squircle Frame
        val squircleFrame = FrameLayout(context).apply {
            background = createRoundedCard(context, "#FFFFFF", "#E5E7EB", 12)
            setPadding(dp(4), dp(4), dp(4), dp(4))
            layoutParams = LinearLayout.LayoutParams(dp(48), dp(48))
        }

        val appImageView = ImageView(context).apply {
            if (appIconDrawable != null) {
                setImageDrawable(appIconDrawable)
            } else {
                setImageResource(android.R.drawable.sym_def_app_icon)
            }
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = FrameLayout.LayoutParams(dp(36), dp(36)).apply {
                gravity = Gravity.CENTER
            }
        }
        val prohibitionBadge = ImageView(context).apply {
            setImageResource(R.drawable.lock_prohibition_badge)
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = FrameLayout.LayoutParams(dp(18), dp(18)).apply {
                gravity = Gravity.BOTTOM or Gravity.END
            }
        }
        squircleFrame.addView(appImageView)
        squircleFrame.addView(prohibitionBadge)
        infoCard.addView(squircleFrame)

        // Thin Vertical Divider
        val infoDivider = View(context).apply {
            setBackgroundColor(Color.parseColor("#DDE2EB"))
            layoutParams = LinearLayout.LayoutParams(dp(1), dp(38)).apply {
                marginStart = dp(12)
                marginEnd = dp(12)
            }
        }
        infoCard.addView(infoDivider)

        // Info Text Column
        val infoTextCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        val infoTitleTv = TextView(context).apply {
            text = "Daily Screen Time Allowance Exhausted"
            setTextColor(Color.parseColor("#111827"))
            textSize = 13f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        val infoSubTv = TextView(context).apply {
            text = "Access to this domain is temporarily restricted to protect your focus."
            setTextColor(Color.parseColor("#6B7280"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            setPadding(0, dp(2), 0, 0)
        }
        infoTextCol.addView(infoTitleTv)
        infoTextCol.addView(infoSubTv)
        infoCard.addView(infoTextCol)
        contentLayout.addView(infoCard)

        // -------------------------------------------------------------
        // 5. CTA CARD (Soft Pink Tint): 3D Dumbbell | DO 10 PUSHUPS | Arrow
        // -------------------------------------------------------------
        val ctaCard = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = createRoundedCard(context, "#FDF1F1", "#F9D2D5", 20, 1.2f)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            isClickable = true
            isFocusable = true
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(12)
            }
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                onLaunchPushups()
            }
        }

        val dumbbellBadge = ImageView(context).apply {
            setImageResource(R.drawable.lock_icon_dumbbell_circle)
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = LinearLayout.LayoutParams(dp(50), dp(50))
        }
        ctaCard.addView(dumbbellBadge)

        val ctaDivider = View(context).apply {
            setBackgroundColor(Color.parseColor("#F6C0C4"))
            layoutParams = LinearLayout.LayoutParams(dp(1), dp(42)).apply {
                marginStart = dp(12)
                marginEnd = dp(12)
            }
        }
        ctaCard.addView(ctaDivider)

        val ctaTextCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        val executeTrialTv = TextView(context).apply {
            text = "EXECUTE TRIAL"
            setTextColor(Color.parseColor("#E53935"))
            textSize = 9.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.15f
        }
        val doPushupsTv = TextView(context).apply {
            text = "DO 10 PUSHUPS"
            setTextColor(Color.parseColor("#111827"))
            textSize = 16.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            setPadding(0, dp(1), 0, 0)
        }
        val ctaSubTv = TextView(context).apply {
            text = "AI Motion Sensor • Unlock +20m"
            setTextColor(Color.parseColor("#6B7280"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            setPadding(0, dp(2), 0, 0)
        }
        ctaTextCol.addView(executeTrialTv)
        ctaTextCol.addView(doPushupsTv)
        ctaTextCol.addView(ctaSubTv)
        ctaCard.addView(ctaTextCol)

        val arrowBtn = ImageView(context).apply {
            setImageResource(R.drawable.lock_icon_pink_arrow)
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = LinearLayout.LayoutParams(dp(38), dp(38))
        }
        ctaCard.addView(arrowBtn)
        contentLayout.addView(ctaCard)

        // -------------------------------------------------------------
        // 6. THREE ACTION BUTTONS: WATCH AD | SHOP PASS | 5-MIN PASS
        // -------------------------------------------------------------
        val actionsRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(20)
            }
            weightSum = 3.0f
        }

        // Button 1: WATCH AD (+15 MINS)
        val watchAdCard = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = createRoundedCard(context, "#F0F3F7", "#E2E7F0", 18)
            setPadding(dp(6), dp(12), dp(6), dp(12))
            isClickable = true
            isFocusable = true
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginEnd = dp(4)
            }
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                onWatchAd()
            }
        }
        val playIcon = ImageView(context).apply {
            setImageResource(R.drawable.lock_action_play)
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = LinearLayout.LayoutParams(dp(42), dp(42))
        }
        val watchAdTv = TextView(context).apply {
            text = "WATCH AD"
            setTextColor(Color.parseColor("#111827"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, dp(6), 0, 0)
        }
        val watchAdSubTv = TextView(context).apply {
            text = "+15 MINS"
            setTextColor(Color.parseColor("#6B7280"))
            textSize = 9f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            gravity = Gravity.CENTER
            setPadding(0, dp(1), 0, 0)
        }
        watchAdCard.addView(playIcon)
        watchAdCard.addView(watchAdTv)
        watchAdCard.addView(watchAdSubTv)

        // Button 2: SHOP PASS (INSTANT UNLOCK)
        val shopPassCard = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = createRoundedCard(context, "#F0F3F7", "#E2E7F0", 18)
            setPadding(dp(6), dp(12), dp(6), dp(12))
            isClickable = true
            isFocusable = true
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dp(3)
                marginEnd = dp(3)
            }
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                onShop()
            }
        }
        val cartIcon = ImageView(context).apply {
            setImageResource(R.drawable.lock_action_cart)
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = LinearLayout.LayoutParams(dp(42), dp(42))
        }
        val shopPassTv = TextView(context).apply {
            text = "SHOP PASS"
            setTextColor(Color.parseColor("#111827"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, dp(6), 0, 0)
        }
        val shopPassSubTv = TextView(context).apply {
            text = "INSTANT UNLOCK"
            setTextColor(Color.parseColor("#6B7280"))
            textSize = 8.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            gravity = Gravity.CENTER
            setPadding(0, dp(1), 0, 0)
        }
        shopPassCard.addView(cartIcon)
        shopPassCard.addView(shopPassTv)
        shopPassCard.addView(shopPassSubTv)

        // Button 3: 5-MIN PASS (EMERGENCY BAILOUT / USED TODAY)
        val emergencyCard = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = createRoundedCard(context, "#F0F3F7", "#E2E7F0", 18)
            setPadding(dp(6), dp(12), dp(6), dp(12))
            isClickable = true
            isFocusable = true
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dp(4)
            }
            alpha = if (isEmergencyAvailable) 1.0f else 0.55f
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                if (isEmergencyAvailable) {
                    onEmergencyPass()
                } else {
                    Toast.makeText(context, "Emergency pass already claimed today.", Toast.LENGTH_SHORT).show()
                }
            }
        }
        val clockIcon = ImageView(context).apply {
            setImageResource(R.drawable.lock_action_clock)
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = LinearLayout.LayoutParams(dp(42), dp(42))
        }
        val emergencyTv = TextView(context).apply {
            text = "5-MIN PASS"
            setTextColor(if (isEmergencyAvailable) Color.parseColor("#111827") else Color.parseColor("#9CA3AF"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, dp(6), 0, 0)
        }
        val emergencySubTv = TextView(context).apply {
            text = if (isEmergencyAvailable) "EMERGENCY BAILOUT" else "USED TODAY"
            setTextColor(if (isEmergencyAvailable) Color.parseColor("#6B7280") else Color.parseColor("#9CA3AF"))
            textSize = 8f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            gravity = Gravity.CENTER
            setPadding(0, dp(1), 0, 0)
        }
        emergencyCard.addView(clockIcon)
        emergencyCard.addView(emergencyTv)
        emergencyCard.addView(emergencySubTv)

        actionsRow.addView(watchAdCard)
        actionsRow.addView(shopPassCard)
        actionsRow.addView(emergencyCard)
        contentLayout.addView(actionsRow)

        // -------------------------------------------------------------
        // 7. FOOTER: ——— DISCIPLINE ———
        // -------------------------------------------------------------
        val footerRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginStart = dp(24)
                marginEnd = dp(24)
                bottomMargin = dp(16)
            }
        }

        val leftLine = View(context).apply {
            setBackgroundColor(Color.parseColor("#D1D5DB"))
            layoutParams = LinearLayout.LayoutParams(0, dp(1), 1.0f)
        }
        val disciplineTv = TextView(context).apply {
            text = "DISCIPLINE"
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 9.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
            letterSpacing = 0.25f
            gravity = Gravity.CENTER
            setPadding(dp(12), 0, dp(12), 0)
        }
        val rightLine = View(context).apply {
            setBackgroundColor(Color.parseColor("#D1D5DB"))
            layoutParams = LinearLayout.LayoutParams(0, dp(1), 1.0f)
        }

        footerRow.addView(leftLine)
        footerRow.addView(disciplineTv)
        footerRow.addView(rightLine)
        contentLayout.addView(footerRow)

        scrollView.addView(contentLayout)
        rootLayout.addView(scrollView)
        return rootLayout
    }
}
