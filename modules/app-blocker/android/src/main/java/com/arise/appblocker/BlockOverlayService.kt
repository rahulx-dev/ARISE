package com.arise.appblocker

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class BlockOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        showOverlay()
    }

    private fun showOverlay() {
        if (overlayView != null) return

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

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0A0E1A"))
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
        }

        val title = TextView(this).apply {
            text = "TIME LOCKED"
            setTextColor(Color.parseColor("#00F0FF"))
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }

        val subtitle = TextView(this).apply {
            text = "Earn Coins to unlock screen time.\nComplete real-world quests in ARISE."
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 48)
            setLineSpacing(8f, 1.2f)
        }

        val ariseButton = Button(this).apply {
            text = "⚡ UNLOCK IN ARISE (EXERCISE)"
            setBackgroundColor(Color.parseColor("#00FF6A"))
            setTextColor(Color.parseColor("#0A0A0A"))
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(32, 24, 32, 24)
            setOnClickListener {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                if (launchIntent != null) {
                    launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    startActivity(launchIntent)
                }
                stopSelf()
            }
        }

        val homeButton = Button(this).apply {
            text = "Exit to Home Screen"
            setBackgroundColor(Color.parseColor("#1E1E1E"))
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(24, 16, 24, 16)
            setOnClickListener {
                val startMain = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(startMain)
                stopSelf()
            }
        }

        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(ariseButton)

        val spacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 24)
        }
        layout.addView(spacer)
        layout.addView(homeButton)

        overlayView = layout
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
