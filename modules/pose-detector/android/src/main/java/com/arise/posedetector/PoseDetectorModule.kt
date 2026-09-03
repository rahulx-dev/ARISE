package com.arise.posedetector

import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PoseDetectorModule : Module() {
    private var poseDetector: PoseDetector? = null

    override fun definition() = ModuleDefinition {
        Name("PoseDetector")

        AsyncFunction("initialize") {
            try {
                if (poseDetector == null) {
                    // Use STREAM_MODE for fast inference (analogous to BASE_POSE_DETECTOR focus)
                    val options = PoseDetectorOptions.Builder()
                        .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
                        .build()
                    poseDetector = PoseDetection.getClient(options)
                    Log.d("ARISE_POSE", "PoseDetector initialized")
                }
                return@AsyncFunction true
            } catch (e: Exception) {
                Log.e("ARISE_POSE", "Error initializing PoseDetector", e)
                return@AsyncFunction false
            }
        }

        AsyncFunction("processBase64Frame") { base64Image: String ->
            try {
                val detector = poseDetector ?: throw IllegalStateException("PoseDetector not initialized")
                
                // Decode base64 to Bitmap
                val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
                val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                    ?: throw IllegalArgumentException("Failed to decode base64 string into bitmap")
                
                val rawW = bitmap.width.toFloat().coerceAtLeast(1f)
                val rawH = bitmap.height.toFloat().coerceAtLeast(1f)

                // If Camera sensor captured in landscape orientation while phone is portrait:
                val rotation = if (rawW > rawH) 270 else 0
                val image = InputImage.fromBitmap(bitmap, rotation)
                
                // Run detection synchronously
                val task = detector.process(image)
                val pose = Tasks.await(task)
                
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
                        "type" to landmark.landmarkType
                    )
                    resultList.add(landmarkMap)
                }
                
                return@AsyncFunction resultList
            } catch (e: Exception) {
                Log.e("ARISE_POSE", "Error processing frame", e)
                return@AsyncFunction emptyList<Map<String, Any>>()
            }
        }

        Function("muteShutter") {
            try {
                val context = appContext.reactContext
                val audioManager = context?.getSystemService(android.content.Context.AUDIO_SERVICE) as? android.media.AudioManager
                audioManager?.adjustStreamVolume(android.media.AudioManager.STREAM_SYSTEM, android.media.AudioManager.ADJUST_MUTE, 0)
            } catch (e: Exception) {
                Log.w("ARISE_POSE", "muteShutter failed: ${e.message}")
            }
            Unit
        }

        Function("unmuteShutter") {
            try {
                val context = appContext.reactContext
                val audioManager = context?.getSystemService(android.content.Context.AUDIO_SERVICE) as? android.media.AudioManager
                audioManager?.adjustStreamVolume(android.media.AudioManager.STREAM_SYSTEM, android.media.AudioManager.ADJUST_UNMUTE, 0)
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
    }
}
