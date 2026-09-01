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
                
                val image = InputImage.fromBitmap(bitmap, 0)
                
                // Run detection synchronously
                val task = detector.process(image)
                val pose = Tasks.await(task)
                
                val resultList = mutableListOf<Map<String, Any>>()
                
                for (landmark in pose.allPoseLandmarks) {
                    val landmarkMap = mapOf(
                        "x" to landmark.position.x,
                        "y" to landmark.position.y,
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
