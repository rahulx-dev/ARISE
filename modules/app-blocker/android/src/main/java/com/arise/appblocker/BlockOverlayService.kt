package com.arise.appblocker

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/**
 * High-fidelity iOS 18 Screen Time style App Lock Overlay Service.
 * Renders a frosted glassmorphic card over restricted applications when budget is depleted.
 */
class BlockOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        showOverlay()
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun showOverlay() {
        if (overlayView != null) return
        if (System.currentTimeMillis() < AppMonitorService.unlockedUntilEpochMs) {
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
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT
        )

        // Root fullscreen translucent dark container
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#F005070D"))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        // Center Wrapper
        val centerContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ).apply {
                gravity = Gravity.CENTER
                setMargins(dpToPx(24), dpToPx(24), dpToPx(24), dpToPx(24))
            }
        }

        // iOS Frosted Glass Card Container
        val cardBackground = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(28).toFloat()
            setColor(Color.parseColor("#1C1E26"))
            setStroke(dpToPx(1), Color.parseColor("#334055"))
        }

        val glassCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            background = cardBackground
            setPadding(dpToPx(24), dpToPx(32), dpToPx(24), dpToPx(28))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 1. iOS Hourglass / Shield Icon Badge
        val iconBadgeBg = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor("#141720"))
            setStroke(dpToPx(2), Color.parseColor("#D1FF00"))
        }

        val iconContainer = FrameLayout(this).apply {
            background = iconBadgeBg
            layoutParams = LinearLayout.LayoutParams(dpToPx(68), dpToPx(68)).apply {
                setMargins(0, 0, 0, dpToPx(18))
            }
        }

        val iconText = TextView(this).apply {
            text = "⏳"
            textSize = 28f
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        iconContainer.addView(iconText)

        // 2. iOS Title
        val title = TextView(this).apply {
            text = "Screen Time Limit"
            setTextColor(Color.parseColor("#FFFFFF"))
            textSize = 21f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dpToPx(6))
            letterSpacing = -0.02f
        }

        // 3. iOS Subtitle
        val subtitle = TextView(this).apply {
            text = "You've reached your allowed limit on this app. ARISE discipline protocol is active."
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 13.5f
            gravity = Gravity.CENTER
            setLineSpacing(dpToPx(4).toFloat(), 1.2f)
            setPadding(dpToPx(8), 0, dpToPx(8), dpToPx(18))
        }

        // 4. Protocol Badge Pill (Neon Green Accent)
        val pillBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(100).toFloat()
            setColor(Color.parseColor("#182408"))
            setStroke(dpToPx(1), Color.parseColor("#4A5F12"))
        }

        val protocolBadge = TextView(this).apply {
            text = "⚡ Complete Workout Reps to Unlock"
            setTextColor(Color.parseColor("#D1FF00"))
            textSize = 11.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            gravity = Gravity.CENTER
            background = pillBg
            setPadding(dpToPx(14), dpToPx(6), dpToPx(14), dpToPx(6))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, dpToPx(24))
            }
        }

        // 5. Primary Action Button: "Unlock in ARISE" (Neon Pill)
        val primaryBtnBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(100).toFloat()
            setColor(Color.parseColor("#D1FF00"))
        }

        val primaryBtn = Button(this).apply {
            text = "Unlock with Exercise"
            background = primaryBtnBg
            setTextColor(Color.parseColor("#05070D"))
            textSize = 15f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAllCaps = false
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(50)
            ).apply {
                setMargins(0, 0, 0, dpToPx(10))
            }
            setOnClickListener {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                if (launchIntent != null) {
                    launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    startActivity(launchIntent)
                }
                stopSelf()
            }
        }

        // 6. Secondary Action Button: "Exit to Home" (Frosted Dark Pill)
        val secondaryBtnBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(100).toFloat()
            setColor(Color.parseColor("#282C37"))
            setStroke(dpToPx(1), Color.parseColor("#384055"))
        }

        val secondaryBtn = Button(this).apply {
            text = "Exit to Home Screen"
            background = secondaryBtnBg
            setTextColor(Color.parseColor("#D1D5DB"))
            textSize = 13.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAllCaps = false
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(46)
            )
            setOnClickListener {
                val startMain = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(startMain)
                stopSelf()
            }
        }

        // Assemble Glass Card Hierarchy
        glassCard.addView(iconContainer)
        glassCard.addView(title)
        glassCard.addView(subtitle)
        glassCard.addView(protocolBadge)
        glassCard.addView(primaryBtn)
        glassCard.addView(secondaryBtn)

        centerContainer.addView(glassCard)
        rootLayout.addView(centerContainer)

        overlayView = rootLayout
        try {
            windowManager?.addView(overlayView, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (overlayView != null) {
            try {
                windowManager?.removeView(overlayView)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            overlayView = null
        }
    }
}
