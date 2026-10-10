package com.arise.posedetector

import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.accurate.AccuratePoseDetectorOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayInputStream

class PoseDetectorModule : Module() {
    private var poseDetector: PoseDetector? = null

    override fun definition() = ModuleDefinition {
        Name("PoseDetector")

        AsyncFunction("initialize") {
            try {
                if (poseDetector == null) {
                    try {
                        val fastOptions = com.google.mlkit.vision.pose.defaults.PoseDetectorOptions.Builder()
                            .setDetectorMode(com.google.mlkit.vision.pose.defaults.PoseDetectorOptions.STREAM_MODE)
                            .build()
                        poseDetector = PoseDetection.getClient(fastOptions)
                        Log.d("ARISE_POSE", "Fast Stream PoseDetector (BlazePose Base) initialized successfully")
                    } catch (eFast: Throwable) {
                        Log.w("ARISE_POSE", "Default PoseDetector unavailable, falling back to Accurate: ${eFast.message}")
                        val accurateOptions = AccuratePoseDetectorOptions.Builder()
                            .setDetectorMode(AccuratePoseDetectorOptions.STREAM_MODE)
                            .build()
                        poseDetector = PoseDetection.getClient(accurateOptions)
                        Log.d("ARISE_POSE", "Accurate PoseDetector fallback initialized successfully")
                    }
                }
                return@AsyncFunction true
            } catch (e: Exception) {
                Log.e("ARISE_POSE", "Error initializing PoseDetector", e)
                return@AsyncFunction false
            }
        }

        AsyncFunction("processBase64Frame") { base64Image: String, facing: String? ->
            try {
                val detector = poseDetector ?: throw IllegalStateException("PoseDetector not initialized")
                
                val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)

                // Detect EXIF orientation from JPEG header
                var exifRotation = -1
                try {
                    val exif = ExifInterface(ByteArrayInputStream(decodedBytes))
                    val orientation = exif.getAttributeInt(
                        ExifInterface.TAG_ORIENTATION,
                        ExifInterface.ORIENTATION_UNDEFINED
                    )
                    exifRotation = when (orientation) {
                        ExifInterface.ORIENTATION_ROTATE_90 -> 90
                        ExifInterface.ORIENTATION_ROTATE_180 -> 180
                        ExifInterface.ORIENTATION_ROTATE_270 -> 270
                        ExifInterface.ORIENTATION_NORMAL -> 0
                        else -> -1
                    }
                } catch (e: Exception) {
                    Log.w("ARISE_POSE", "EXIF read error: ${e.message}")
                }

                // Dynamically downsample large bitmaps to ~480px max dimension.
                // ML Kit Pose operates internally on 256x256, so downsampling eliminates 90% memory & GC pauses.
                val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, boundsOptions)
                var sampleSize = 1
                val maxDim = maxOf(boundsOptions.outWidth, boundsOptions.outHeight)
                while (maxDim / (sampleSize * 2) >= 360) {
                    sampleSize *= 2
                }

                val decodeOptions = BitmapFactory.Options().apply {
                    inPreferredConfig = android.graphics.Bitmap.Config.RGB_565
                    inSampleSize = sampleSize
                }
                val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, decodeOptions)
                    ?: throw IllegalArgumentException("Failed to decode base64 string into bitmap")
                
                try {
                    val rawW = bitmap.width.toFloat().coerceAtLeast(1f)
                    val rawH = bitmap.height.toFloat().coerceAtLeast(1f)

                    val isFront = (facing ?: "front") == "front"
                    // Orientation Resolution:
                    // 1. If rawW < rawH, the bitmap is ALREADY portrait upright (Expo Camera rotated pixels).
                    //    Rotation MUST be 0 (or 180 if upside down). NEVER rotate by 90 or 270!
                    // 2. If rawW > rawH, the bitmap is in raw landscape sensor orientation.
                    //    We must rotate to portrait: Front camera default is 270, Back camera is 90.
                    var rotation = if (rawW < rawH) {
                        if (exifRotation == 180) 180 else 0
                    } else {
                        if (exifRotation == 90 || exifRotation == 270) {
                            exifRotation
                        } else {
                            if (isFront) 270 else 90
                        }
                    }

                    var image = InputImage.fromBitmap(bitmap, rotation)
                    var pose = Tasks.await(detector.process(image))
                    
                    // If 0 landmarks detected and image was landscape, attempt alternate orientation
                    if (pose.allPoseLandmarks.size < 3 && rawW > rawH) {
                        val fallbackRot = if (rotation == 270) 90 else 270
                        try {
                            val altImage = InputImage.fromBitmap(bitmap, fallbackRot)
                            val altPose = Tasks.await(detector.process(altImage))
                            if (altPose.allPoseLandmarks.size > pose.allPoseLandmarks.size) {
                                pose = altPose
                                rotation = fallbackRot
                            }
                        } catch (_: Exception) {}
                    }
                    
                    val resultList = mutableListOf<Map<String, Any>>()
                    
                    // When rotated 90 or 270 degrees, ML Kit coordinates are in rotated coordinate space:
                    val effectiveWidth = if (rotation == 90 || rotation == 270) rawH else rawW
                    val effectiveHeight = if (rotation == 90 || rotation == 270) rawW else rawH
                    
                    for (landmark in pose.allPoseLandmarks) {
                        val normX = (landmark.position.x / effectiveWidth).coerceIn(0f, 1f)
                        val normY = (landmark.position.y / effectiveHeight).coerceIn(0f, 1f)
                        val landmarkMap = mapOf(
                            "x" to normX,
                            "y" to normY,
                            "z" to landmark.position3D.z,
                            "confidence" to landmark.inFrameLikelihood,
                            "type" to landmark.landmarkType,
                            "frameWidth" to effectiveWidth,
                            "frameHeight" to effectiveHeight
                        )
                        resultList.add(landmarkMap)
                    }
                    
                    return@AsyncFunction resultList
                } finally {
                    try {
                        bitmap.recycle()
                    } catch (_: Exception) {}
                }
            } catch (e: Exception) {
                Log.e("ARISE_POSE", "Error processing frame", e)
                return@AsyncFunction emptyList<Map<String, Any>>()
            }
        }

        Function("muteShutter") {
            try {
                val context = appContext.reactContext
                val audioManager = context?.getSystemService(android.content.Context.AUDIO_SERVICE) as? android.media.AudioManager
                audioManager?.let { am ->
                    am.adjustStreamVolume(android.media.AudioManager.STREAM_SYSTEM, android.media.AudioManager.ADJUST_MUTE, 0)
                }
            } catch (e: Exception) {
                Log.w("ARISE_POSE", "muteShutter failed: ${e.message}")
            }
            Unit
        }

        Function("unmuteShutter") {
            try {
                val context = appContext.reactContext
                val audioManager = context?.getSystemService(android.content.Context.AUDIO_SERVICE) as? android.media.AudioManager
                audioManager?.let { am ->
                    am.adjustStreamVolume(android.media.AudioManager.STREAM_SYSTEM, android.media.AudioManager.ADJUST_UNMUTE, 0)
                }
            } catch (e: Exception) {
                Log.w("ARISE_POSE", "unmuteShutter failed: ${e.message}")
            }
            Unit
        }

        Function("release") {
            try {
                poseDetector?.close()
                poseDetector = null
                Log.d("ARISE_POSE", "PoseDetector released")
            } catch (e: Exception) {
                Log.e("ARISE_POSE", "Error releasing PoseDetector", e)
            }
        }

        View(PoseCameraView::class) {
            Events("onPoseDetected")

            Prop("facing") { view: PoseCameraView, facing: String? ->
                view.setFacing(facing ?: "front")
            }

            Prop("enableTorch") { view: PoseCameraView, enabled: Boolean? ->
                view.setTorch(enabled ?: false)
            }
        }
    }
}
