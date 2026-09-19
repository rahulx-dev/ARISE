package com.arise.appblocker

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
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

object LockScreenViewFactory {

    fun dpToPx(context: Context, dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            context.resources.displayMetrics
        ).toInt()
    }

    class GlowingLockBadgeView(context: Context) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val dp = { value: Int -> dpToPx(context, value).toFloat() }
            val cx = width / 2f
            val cy = height / 2f
            val radius = (Math.min(width, height) / 2f) - dp(8)

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
                strokeWidth = dp(7)
                style = Paint.Style.STROKE
            }
            val glowPaintMid = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#6600D2EE")
                strokeWidth = dp(4)
                style = Paint.Style.STROKE
            }
            val solidRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#00D2EE")
                strokeWidth = dp(2)
                style = Paint.Style.STROKE
            }
            canvas.drawCircle(cx, cy, radius, glowPaintWide)
            canvas.drawCircle(cx, cy, radius, glowPaintMid)
            canvas.drawCircle(cx, cy, radius, solidRingPaint)

            // 4. Centered Padlock Icon
            val lockColor = Color.parseColor("#38BDF8")

            // Shackle
            val shackleWidth = dp(13)
            val shackleHeight = dp(17)
            val shackleTop = cy - dp(24)
            val shacklePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = lockColor
                strokeWidth = dp(4)
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
            canvas.drawLine(cx - shackleWidth, shackleTop + shackleHeight, cx - shackleWidth, cy - dp(7), shacklePaint)
            canvas.drawLine(cx + shackleWidth, shackleTop + shackleHeight, cx + shackleWidth, cy - dp(7), shacklePaint)

            // Body
            val bodyWidth = dp(18)
            val bodyHeight = dp(16)
            val bodyTop = cy - dp(8)
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
            canvas.drawRoundRect(bodyRect, dp(4), dp(4), bodyPaint)

            // Keyhole
            val keyholePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#020713")
                style = Paint.Style.FILL
            }
            canvas.drawCircle(cx, cy + dp(1), dp(3), keyholePaint)
            val keySlotPath = Path().apply {
                moveTo(cx - dp(2), cy + dp(1))
                lineTo(cx + dp(2), cy + dp(1))
                lineTo(cx + dp(1), cy + dp(7))
                lineTo(cx - dp(1), cy + dp(7))
                close()
            }
            canvas.drawPath(keySlotPath, keyholePaint)
        }
    }

    class DumbbellIconView(context: Context) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val dp = { value: Int -> dpToPx(context, value).toFloat() }
            val cx = width / 2f
            val cy = height / 2f

            val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#E0F2FE")
                strokeWidth = dp(3).coerceAtLeast(3f)
                style = Paint.Style.STROKE
                strokeCap = Paint.Cap.ROUND
            }
            canvas.drawLine(cx - dp(14), cy, cx + dp(14), cy, barPaint)

            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#E0F2FE")
                style = Paint.Style.FILL
            }
            val r = dp(2)
            canvas.drawRoundRect(RectF(cx - dp(9), cy - dp(6), cx - dp(6), cy + dp(6)), r, r, paint)
            canvas.drawRoundRect(RectF(cx - dp(14), cy - dp(11), cx - dp(10), cy + dp(11)), r, r, paint)
            canvas.drawRoundRect(RectF(cx + dp(6), cy - dp(6), cx + dp(9), cy + dp(6)), r, r, paint)
            canvas.drawRoundRect(RectF(cx + dp(10), cy - dp(11), cx + dp(14), cy + dp(11)), r, r, paint)
        }
    }

    class ActionChevronCircleView(context: Context) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val dp = { value: Int -> dpToPx(context, value).toFloat() }
            val cx = width / 2f
            val cy = height / 2f
            val radius = width / 2f

            val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#004299")
                style = Paint.Style.FILL
            }
            canvas.drawCircle(cx, cy, radius, bgPaint)

            val chevronPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                strokeWidth = dp(2).coerceAtLeast(2f)
                style = Paint.Style.STROKE
                strokeCap = Paint.Cap.ROUND
                strokeJoin = Paint.Join.ROUND
            }
            val p = Path().apply {
                moveTo(cx - dp(3), cy - dp(6))
                lineTo(cx + dp(4), cy)
                lineTo(cx - dp(3), cy + dp(6))
            }
            canvas.drawPath(p, chevronPaint)
        }
    }

    class RedForbiddenBadgeView(context: Context) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val dp = { value: Int -> dpToPx(context, value).toFloat() }
            val cx = width / 2f
            val cy = height / 2f
            val radius = (Math.min(width, height) / 2f) - dp(1)

            val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#070E1A")
                strokeWidth = dp(2)
                style = Paint.Style.STROKE
            }
            canvas.drawCircle(cx, cy, radius, borderPaint)

            val redRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#EF4444")
                strokeWidth = dp(2)
                style = Paint.Style.STROKE
            }
            canvas.drawCircle(cx, cy, radius - dp(1), redRingPaint)

            val offset = (radius - dp(1)) * 0.707f
            canvas.drawLine(cx - offset, cy - offset, cx + offset, cy + offset, redRingPaint)
        }
    }

    class GridBadgeIconView(
        context: Context,
        private val iconType: String,
        private val iconColorHex: String
    ) : View(context) {
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val dp = { value: Int -> dpToPx(context, value).toFloat() }
            val cx = width / 2f
            val cy = height / 2f
            val strokeColor = Color.parseColor(iconColorHex)

            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = strokeColor
            }

            when (iconType) {
                "PLAY" -> {
                    val triPath = Path().apply {
                        moveTo(cx - dp(4), cy - dp(6))
                        lineTo(cx + dp(6), cy)
                        lineTo(cx - dp(4), cy + dp(6))
                        close()
                    }
                    paint.style = Paint.Style.FILL
                    canvas.drawPath(triPath, paint)
                }
                "CART" -> {
                    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = strokeColor
                        strokeWidth = dp(2).coerceAtLeast(2f)
                        style = Paint.Style.STROKE
                        strokeCap = Paint.Cap.ROUND
                        strokeJoin = Paint.Join.ROUND
                    }
                    val cartPath = Path().apply {
                        moveTo(cx - dp(8), cy - dp(6))
                        lineTo(cx - dp(5), cy - dp(6))
                        lineTo(cx - dp(3), cy + dp(2))
                        lineTo(cx + dp(6), cy + dp(2))
                        lineTo(cx + dp(7), cy - dp(3))
                        lineTo(cx - dp(4), cy - dp(3))
                    }
                    canvas.drawPath(cartPath, strokePaint)
                    paint.style = Paint.Style.FILL
                    canvas.drawCircle(cx - dp(2), cy + dp(6), dp(1.5f.toInt().coerceAtLeast(1)), paint)
                    canvas.drawCircle(cx + dp(5), cy + dp(6), dp(1.5f.toInt().coerceAtLeast(1)), paint)
                }
                "CLOCK" -> {
                    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = strokeColor
                        strokeWidth = dp(2).coerceAtLeast(2f)
                        style = Paint.Style.STROKE
                    }
                    canvas.drawCircle(cx, cy, dp(7), strokePaint)
                    canvas.drawLine(cx, cy, cx, cy - dp(4), strokePaint)
                    canvas.drawLine(cx, cy, cx + dp(3), cy, strokePaint)
                }
                "HOME" -> {
                    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = strokeColor
                        strokeWidth = dp(2).coerceAtLeast(2f)
                        style = Paint.Style.STROKE
                        strokeCap = Paint.Cap.ROUND
                        strokeJoin = Paint.Join.ROUND
                    }
                    val roofPath = Path().apply {
                        moveTo(cx - dp(7), cy - dp(1))
                        lineTo(cx, cy - dp(7))
                        lineTo(cx + dp(7), cy - dp(1))
                    }
                    canvas.drawPath(roofPath, strokePaint)
                    val wallPath = Path().apply {
                        moveTo(cx - dp(5), cy)
                        lineTo(cx - dp(5), cy + dp(6))
                        lineTo(cx + dp(5), cy + dp(6))
                        lineTo(cx + dp(5), cy)
                    }
                    canvas.drawPath(wallPath, strokePaint)
                }
            }
        }
    }

    fun createGridActionCard(
        context: Context,
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
        val dp = { value: Int -> dpToPx(context, value) }

        val cardDrawable = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(14).toFloat()
            orientation = GradientDrawable.Orientation.TOP_BOTTOM
            colors = intArrayOf(
                Color.parseColor(cardTopTintHex),
                Color.parseColor("#070B14")
            )
            setStroke(dp(1).coerceAtLeast(1), Color.parseColor(accentColorHex))
        }

        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = cardDrawable
            setPadding(dp(12), dp(12), dp(12), dp(12))
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

            val iconBadgeFrame = FrameLayout(context).apply {
                val circleDrawable = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor(badgeBgColorHex))
                }
                background = circleDrawable
                layoutParams = LinearLayout.LayoutParams(dp(38), dp(38))
            }
            val badgeIcon = GridBadgeIconView(context, iconType, accentColorHex).apply {
                layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            }
            iconBadgeFrame.addView(badgeIcon)
            addView(iconBadgeFrame)

            val textCol = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginStart = dp(10)
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
                setPadding(0, dp(2), 0, 0)
            }

            textCol.addView(titleView)
            textCol.addView(subView)
            addView(textCol)
        }
    }

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
        val dp = { value: Int -> dpToPx(context, value) }

        var appLabel = "Restricted App"
        var appIconDrawable: Drawable? = null
        if (packageName != null) {
            try {
                val pm = context.packageManager
                val appInfo = pm.getApplicationInfo(packageName, 0)
                appLabel = pm.getApplicationLabel(appInfo).toString()
                appIconDrawable = pm.getApplicationIcon(appInfo)
            } catch (_: Exception) {}
        }

        val rootLayout = FrameLayout(context).apply {
            setBackgroundColor(Color.parseColor("#000000"))
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
            setPadding(dp(20), dp(36), dp(20), dp(24))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // Top Header
        val topHeaderRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(24)
            }
        }

        val topLeftCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
        }
        val focusModeText = TextView(context).apply {
            text = "FOCUS SHIELD"
            setTextColor(Color.WHITE)
            textSize = 13f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.12f
        }
        val cyanUnderline = View(context).apply {
            setBackgroundColor(Color.parseColor("#E53935"))
            layoutParams = LinearLayout.LayoutParams(dp(26), dp(2)).apply {
                topMargin = dp(3)
                bottomMargin = dp(4)
            }
        }
        val betterYouText = TextView(context).apply {
            text = "DISCIPLINE IS DESTINY"
            setTextColor(Color.parseColor("#64748B"))
            textSize = 9f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.10f
        }
        topLeftCol.addView(focusModeText)
        topLeftCol.addView(cyanUnderline)
        topLeftCol.addView(betterYouText)

        val topRightCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        listOf("DISCIPLINE", "TODAY", "FREEDOM").forEach { line ->
            val tv = TextView(context).apply {
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

        // Center Glowing Lock Badge
        val lockBadge = GlowingLockBadgeView(context).apply {
            val badgeSize = dp(130)
            layoutParams = LinearLayout.LayoutParams(badgeSize, badgeSize).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                topMargin = dp(6)
                bottomMargin = dp(18)
            }
        }
        contentLayout.addView(lockBadge)

        // "B L O C K E D" Header
        val blockedTitle = TextView(context).apply {
            text = "B L O C K E D"
            setTextColor(Color.WHITE)
            textSize = 25f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.28f
            gravity = Gravity.CENTER
        }
        val restrictedDomainSub = TextView(context).apply {
            text = "RESTRICTED APP  //  ${appLabel.uppercase()}"
            setTextColor(Color.parseColor("#E53935"))
            textSize = 10.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.12f
            gravity = Gravity.CENTER
            setPadding(0, dp(5), 0, dp(18))
        }
        contentLayout.addView(blockedTitle)
        contentLayout.addView(restrictedDomainSub)

        // App Icon Card
        val appCardBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(14).toFloat()
            setColor(Color.parseColor("#070E1A"))
            setStroke(dp(1), Color.parseColor("#1C2A3D"))
        }
        val appInfoCard = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = appCardBg
            setPadding(dp(14), dp(10), dp(14), dp(10))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(16)
            }
        }

        val appIconFrame = FrameLayout(context).apply {
            layoutParams = LinearLayout.LayoutParams(dp(44), dp(44))
        }
        val appImageView = ImageView(context).apply {
            if (appIconDrawable != null) {
                setImageDrawable(appIconDrawable)
            } else {
                setImageResource(android.R.drawable.sym_def_app_icon)
            }
            layoutParams = FrameLayout.LayoutParams(dp(40), dp(40)).apply {
                gravity = Gravity.CENTER
            }
        }
        val forbiddenBadge = RedForbiddenBadgeView(context).apply {
            layoutParams = FrameLayout.LayoutParams(dp(16), dp(16)).apply {
                gravity = Gravity.BOTTOM or Gravity.END
            }
        }
        appIconFrame.addView(appImageView)
        appIconFrame.addView(forbiddenBadge)
        appInfoCard.addView(appIconFrame)

        val appTextCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginStart = dp(12)
            }
        }
        val appNameTv = TextView(context).apply {
            text = appLabel
            setTextColor(Color.WHITE)
            textSize = 14f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        }
        val appStatusTv = TextView(context).apply {
            text = "Daily Screen Time Limit Exhausted"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 11f
            setPadding(0, dp(2), 0, 0)
        }
        appTextCol.addView(appNameTv)
        appTextCol.addView(appStatusTv)
        appInfoCard.addView(appTextCol)
        contentLayout.addView(appInfoCard)

        // 10 PUSHUPS HERO TRIAL CARD
        val heroBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(16).toFloat()
            orientation = GradientDrawable.Orientation.TOP_BOTTOM
            colors = intArrayOf(
                Color.parseColor("#B71C1C"),
                Color.parseColor("#E53935")
            )
            setStroke(dp(1.5f.toInt().coerceAtLeast(1)), Color.parseColor("#FF5252"))
        }

        val heroCard = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = heroBg
            setPadding(dp(16), dp(16), dp(16), dp(16))
            isClickable = true
            isFocusable = true
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(14)
            }
            setOnClickListener {
                try {
                    performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                } catch (_: Exception) {}
                onLaunchPushups()
            }
        }

        val dumbbellIcon = DumbbellIconView(context).apply {
            layoutParams = LinearLayout.LayoutParams(dp(36), dp(36))
        }
        heroCard.addView(dumbbellIcon)

        val heroTextCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dp(12)
            }
        }
        val heroTitle = TextView(context).apply {
            text = "10 PUSH-UPS TO UNLOCK"
            setTextColor(Color.WHITE)
            textSize = 14f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.04f
        }
        val heroSub = TextView(context).apply {
            text = "AI Form-Tracked Protocol (+20m Pass)"
            setTextColor(Color.parseColor("#FFCDD2"))
            textSize = 10.5f
            setPadding(0, dp(3), 0, 0)
        }
        heroTextCol.addView(heroTitle)
        heroTextCol.addView(heroSub)
        heroCard.addView(heroTextCol)

        val chevron = ActionChevronCircleView(context).apply {
            layoutParams = LinearLayout.LayoutParams(dp(26), dp(26))
        }
        heroCard.addView(chevron)
        contentLayout.addView(heroCard)

        // 2x2 Grid Actions
        val gridRow1 = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(10)
            }
        }

        val watchAdCard = createGridActionCard(
            context,
            "WATCH AD",
            "Get 15m Pass",
            "PLAY",
            "#0A84FF",
            "#001D40",
            "#001D40",
            "#38BDF8",
            isEnabled = true,
            onClick = onWatchAd
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginEnd = dp(5)
            }
        }

        val emergencyCard = createGridActionCard(
            context,
            "5-MIN PASS",
            if (isEmergencyAvailable) "1x Daily Left" else "Used Today",
            "CLOCK",
            "#E53935",
            "#30060B",
            "#30060B",
            "#F87171",
            isEnabled = isEmergencyAvailable,
            onClick = onEmergencyPass
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dp(5)
            }
        }
        gridRow1.addView(watchAdCard)
        gridRow1.addView(emergencyCard)
        contentLayout.addView(gridRow1)

        val gridRow2 = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(16)
            }
        }

        val shopCard = createGridActionCard(
            context,
            "VAULT SHOP",
            "Use Coins",
            "CART",
            "#F59E0B",
            "#2A1A00",
            "#2A1A00",
            "#FBBF24",
            isEnabled = true,
            onClick = onShop
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginEnd = dp(5)
            }
        }

        val homeCard = createGridActionCard(
            context,
            "HOME SCREEN",
            "Exit Protocol",
            "HOME",
            "#10B981",
            "#02231A",
            "#02231A",
            "#34D399",
            isEnabled = true,
            onClick = onExitHome
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f).apply {
                marginStart = dp(5)
            }
        }
        gridRow2.addView(shopCard)
        gridRow2.addView(homeCard)
        contentLayout.addView(gridRow2)

        // Footer
        val footerTv = TextView(context).apply {
            text = "DISCIPLINE BUILDS FREEDOM  •  ARISE PROTOCOL"
            setTextColor(Color.parseColor("#475569"))
            textSize = 9.5f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            letterSpacing = 0.15f
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(10))
        }
        contentLayout.addView(footerTv)

        scrollView.addView(contentLayout)
        rootLayout.addView(scrollView)
        return rootLayout
    }
}
