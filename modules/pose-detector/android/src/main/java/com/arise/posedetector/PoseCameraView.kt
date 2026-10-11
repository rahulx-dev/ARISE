package com.arise.posedetector

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.os.SystemClock
import android.util.Log
import android.util.Size
import android.view.TextureView
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.SurfaceRequest
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class PoseCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
    val onPoseDetected by EventDispatcher<Map<String, Any>>()

    private val textureView: TextureView = TextureView(context).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    }

    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private var poseLandmarker: PoseLandmarker? = null
    private var isTorchEnabled: Boolean = false
    private var cameraFacing: String = "front"
    private var isTextureReady: Boolean = false

    // Frame pacing: 15 FPS (min interval ~66ms) with non-queuing frame dropping
    private var lastAnalysisTimestampMs = 0L
    private var monotonicVideoTimestampMs = 1L
    private val isAnalyzing = AtomicBoolean(false)

    init {
        addView(textureView)
        initPoseDetector()

        textureView.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(st: SurfaceTexture, w: Int, h: Int) {
                isTextureReady = true
                startCamera()
            }
            override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, w: Int, h: Int) {}
            override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
                isTextureReady = false
                return true
            }
            override fun onSurfaceTextureUpdated(st: SurfaceTexture) {}
        }
    }

    private fun initPoseDetector() {
        val appContextObj = appContext.reactContext ?: context
        val baseOptionsBuilder = BaseOptions.builder()
            .setModelAssetPath("pose_landmarker_full.task")

        try {
            val gpuBaseOptions = baseOptionsBuilder.setDelegate(Delegate.GPU).build()
            val gpuOptions = PoseLandmarker.PoseLandmarkerOptions.builder()
                .setBaseOptions(gpuBaseOptions)
                .setRunningMode(RunningMode.VIDEO)
                .setMinPoseDetectionConfidence(0.5f)
                .setMinPosePresenceConfidence(0.5f)
                .setMinTrackingConfidence(0.5f)
                .setNumPoses(1)
                .build()
            poseLandmarker = PoseLandmarker.createFromOptions(appContextObj, gpuOptions)
            Log.d("ARISE_POSE_CAMERA", "MediaPipe PoseLandmarker initialized with GPU delegate (pose_landmarker_full.task)")
        } catch (eGpu: Throwable) {
            Log.w("ARISE_POSE_CAMERA", "GPU delegate failed (${eGpu.message}), falling back to CPU")
            try {
                val cpuBaseOptions = BaseOptions.builder()
                    .setModelAssetPath("pose_landmarker_full.task")
                    .setDelegate(Delegate.CPU)
                    .build()
                val cpuOptions = PoseLandmarker.PoseLandmarkerOptions.builder()
                    .setBaseOptions(cpuBaseOptions)
                    .setRunningMode(RunningMode.VIDEO)
                    .setMinPoseDetectionConfidence(0.5f)
                    .setMinPosePresenceConfidence(0.5f)
                    .setMinTrackingConfidence(0.5f)
                    .setNumPoses(1)
                    .build()
                poseLandmarker = PoseLandmarker.createFromOptions(appContextObj, cpuOptions)
                Log.d("ARISE_POSE_CAMERA", "MediaPipe PoseLandmarker initialized with CPU delegate fallback")
            } catch (eCpu: Throwable) {
                Log.e("ARISE_POSE_CAMERA", "Failed to initialize PoseLandmarker on CPU", eCpu)
            }
        }
    }

    fun setFacing(facing: String) {
        if (facing != cameraFacing) {
            cameraFacing = facing
            if (isTextureReady) {
                ContextCompat.getMainExecutor(context).execute {
                    bindCameraUseCases()
                }
            }
        }
    }

    fun setTorch(torch: Boolean) {
        isTorchEnabled = torch
        try {
            camera?.cameraControl?.enableTorch(torch)
        } catch (e: Exception) {
            Log.w("ARISE_POSE_CAMERA", "Failed to set torch: ${e.message}")
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
            } catch (e: Exception) {
                Log.e("ARISE_POSE_CAMERA", "Error starting camera provider", e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: return
        val activity = appContext.currentActivity
        val lifecycleOwner = activity as? LifecycleOwner

        if (lifecycleOwner == null) {
            Log.w("ARISE_POSE_CAMERA", "Current activity is not a LifecycleOwner")
            return
        }

        val cameraSelector = if (cameraFacing == "back") {
            CameraSelector.DEFAULT_BACK_CAMERA
        } else {
            CameraSelector.DEFAULT_FRONT_CAMERA
        }

        val preview = Preview.Builder()
            .setTargetResolution(Size(480, 640))
            .build()

        preview.setSurfaceProvider { request: SurfaceRequest ->
            val surfaceTexture = textureView.surfaceTexture ?: return@setSurfaceProvider
            val resolution = request.resolution
            surfaceTexture.setDefaultBufferSize(resolution.width, resolution.height)
            val surface = android.view.Surface(surfaceTexture)
            request.provideSurface(surface, ContextCompat.getMainExecutor(context)) {
                surface.release()
            }
        }

        val imageAnalysis = ImageAnalysis.Builder()
            .setTargetResolution(Size(480, 640))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
            .build()

        imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
            processImageProxy(imageProxy)
        }

        try {
            provider.unbindAll()
            camera = provider.bindToLifecycle(
                lifecycleOwner,
                cameraSelector,
                preview,
                imageAnalysis
            )
            camera?.cameraControl?.enableTorch(isTorchEnabled)
            Log.d("ARISE_POSE_CAMERA", "Camera bound with facing=$cameraFacing")
        } catch (e: Exception) {
            Log.e("ARISE_POSE_CAMERA", "Use case binding failed", e)
        }
    }

    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    private fun processImageProxy(imageProxy: ImageProxy) {
        val currentRealTime = SystemClock.uptimeMillis()
        // Feed CameraX frames at 15 FPS (~66ms interval)
        if (currentRealTime - lastAnalysisTimestampMs < 66) {
            imageProxy.close()
            return
        }

        // Drop incoming frame if previous inference is still executing — never queue frames
        if (!isAnalyzing.compareAndSet(false, true)) {
            imageProxy.close()
            return
        }

        try {
            val detector = poseLandmarker
            if (detector == null) {
                return
            }

            lastAnalysisTimestampMs = currentRealTime

            val rawBitmap = imageProxy.toBitmap()
            val rotationDegrees = imageProxy.imageInfo.rotationDegrees

            val finalBitmap = if (rotationDegrees != 0) {
                val matrix = Matrix().apply {
                    postRotate(rotationDegrees.toFloat())
                }
                val rotated = Bitmap.createBitmap(
                    rawBitmap, 0, 0, rawBitmap.width, rawBitmap.height, matrix, true
                )
                if (rotated != rawBitmap) {
                    rawBitmap.recycle()
                }
                rotated
            } else {
                rawBitmap
            }

            try {
                val mpImage = BitmapImageBuilder(finalBitmap).build()
                val timestampMs = monotonicVideoTimestampMs++
                val result = detector.detectForVideo(mpImage, timestampMs)

                if (result.landmarks().isNotEmpty()) {
                    val poseLandmarks = result.landmarks()[0]
                    val worldLandmarks = if (result.worldLandmarks().isNotEmpty()) result.worldLandmarks()[0] else null

                    val landmarksList = ArrayList<Map<String, Any>>(poseLandmarks.size)
                    for (i in poseLandmarks.indices) {
                        val normLm = poseLandmarks[i]
                        val worldLm = worldLandmarks?.getOrNull(i)

                        val vis = if (normLm.visibility().isPresent) normLm.visibility().get().toDouble() else 0.8
                        val pres = if (normLm.presence().isPresent) normLm.presence().get().toDouble() else 0.8

                        val lmMap = mutableMapOf<String, Any>(
                            "index" to i,
                            "x" to normLm.x().toDouble().coerceIn(0.0, 1.0),
                            "y" to normLm.y().toDouble().coerceIn(0.0, 1.0),
                            "z" to normLm.z().toDouble(),
                            "visibility" to vis,
                            "presence" to pres
                        )

                        if (worldLm != null) {
                            lmMap["worldX"] = worldLm.x().toDouble()
                            lmMap["worldY"] = worldLm.y().toDouble()
                            lmMap["worldZ"] = worldLm.z().toDouble()
                        }

                        landmarksList.add(lmMap)
                    }

                    ContextCompat.getMainExecutor(context).execute {
                        onPoseDetected(mapOf("landmarks" to landmarksList))
                    }
                }
            } finally {
                finalBitmap.recycle()
            }
        } catch (e: Exception) {
            Log.w("ARISE_POSE_CAMERA", "Pose detection failed: ${e.message}")
        } finally {
            isAnalyzing.set(false)
            imageProxy.close()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        try {
            cameraProvider?.unbindAll()
            cameraExecutor.shutdown()
            poseLandmarker?.close()
            poseLandmarker = null
            Log.d("ARISE_POSE_CAMERA", "PoseCameraView detached and cleaned up")
        } catch (e: Exception) {
            Log.w("ARISE_POSE_CAMERA", "Cleanup error: ${e.message}")
        }
    }
}
