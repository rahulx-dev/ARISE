package com.arise.posedetector

import android.content.Context
import android.graphics.SurfaceTexture
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
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class PoseCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
    val onPoseDetected by EventDispatcher<Map<String, Any>>()

    private val textureView: TextureView = TextureView(context).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    }

    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private var poseDetector: PoseDetector? = null
    private var isTorchEnabled: Boolean = false
    private var cameraFacing: String = "front"
    private var isTextureReady: Boolean = false

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
        try {
            val options = PoseDetectorOptions.Builder()
                .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
                .build()
            poseDetector = PoseDetection.getClient(options)
            Log.d("ARISE_POSE_CAMERA", "BlazePose stream detector initialized")
        } catch (e: Exception) {
            Log.e("ARISE_POSE_CAMERA", "Error initializing detector", e)
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
            request.provideSurface(surface, ContextCompat.getMainExecutor(context)) { result ->
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
        val mediaImage = imageProxy.image
        val detector = poseDetector

        if (mediaImage == null || detector == null) {
            imageProxy.close()
            return
        }

        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val inputImage = InputImage.fromMediaImage(mediaImage, rotationDegrees)

        detector.process(inputImage)
            .addOnSuccessListener { pose ->
                val isRotated = rotationDegrees == 90 || rotationDegrees == 270
                val imgW = if (isRotated) mediaImage.height.toFloat() else mediaImage.width.toFloat()
                val imgH = if (isRotated) mediaImage.width.toFloat() else mediaImage.height.toFloat()

                val landmarks = ArrayList<Map<String, Any>>()
                for (lm in pose.allPoseLandmarks) {
                    val normX = (lm.position.x / imgW).coerceIn(0f, 1f)
                    val normY = (lm.position.y / imgH).coerceIn(0f, 1f)
                    landmarks.add(
                        mapOf(
                            "x" to normX.toDouble(),
                            "y" to normY.toDouble(),
                            "z" to lm.position3D.z.toDouble(),
                            "confidence" to lm.inFrameLikelihood.toDouble(),
                            "type" to lm.landmarkType
                        )
                    )
                }

                if (landmarks.isNotEmpty()) {
                    ContextCompat.getMainExecutor(context).execute {
                        onPoseDetected(mapOf("landmarks" to landmarks))
                    }
                }
            }
            .addOnFailureListener { e ->
                Log.w("ARISE_POSE_CAMERA", "Pose detection failed: ${e.message}")
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        try {
            cameraProvider?.unbindAll()
            cameraExecutor.shutdown()
            poseDetector?.close()
            Log.d("ARISE_POSE_CAMERA", "PoseCameraView detached and cleaned up")
        } catch (e: Exception) {
            Log.w("ARISE_POSE_CAMERA", "Cleanup error: ${e.message}")
        }
    }
}
