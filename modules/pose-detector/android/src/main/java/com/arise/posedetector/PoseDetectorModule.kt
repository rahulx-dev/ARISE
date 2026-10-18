package com.arise.posedetector

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.os.SystemClock
import android.util.Base64
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayInputStream
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

class PoseDetectorModule : Module() {
    private var poseLandmarker: PoseLandmarker? = null
    // H12: AtomicLong (was a plain Long with ++) — AsyncFunctions run on
    // a pool, so two processBase64Frame calls could interleave and reuse
    // a timestamp. MediaPipe requires strictly increasing timestamps.
    private val videoTimestampMs = AtomicLong(1L)
    private val detectorLock = Any()
    // H12: set in release() before teardown; checked inside the lock
    // before every detectForVideo so a frame that arrives during/after
    // teardown never touches a closed landmarker (SIGBUS/crash).
    private val isClosed = AtomicBoolean(false)

    override fun definition() = ModuleDefinition {
        Name("PoseDetector")

        AsyncFunction("initialize") {
            try {
                synchronized(detectorLock) {
                    if (poseLandmarker == null) {
                        val context = appContext.reactContext ?: return@AsyncFunction false
                    val baseOptions = BaseOptions.builder()
                        .setModelAssetPath("pose_landmarker_full.task")

                    try {
                        val gpuOptions = PoseLandmarker.PoseLandmarkerOptions.builder()
                            .setBaseOptions(baseOptions.setDelegate(Delegate.GPU).build())
                            .setRunningMode(RunningMode.VIDEO)
                            .setMinPoseDetectionConfidence(0.5f)
                            .setMinPosePresenceConfidence(0.5f)
                            .setMinTrackingConfidence(0.5f)
                            .setNumPoses(1)
                            .build()
                        poseLandmarker = PoseLandmarker.createFromOptions(context, gpuOptions)
                        Log.d("ARISE_POSE", "MediaPipe PoseLandmarker initialized with GPU delegate")
                    } catch (eGpu: Throwable) {
                        Log.w("ARISE_POSE", "GPU delegate failed (${eGpu.message}), falling back to CPU")
                        val cpuOptions = PoseLandmarker.PoseLandmarkerOptions.builder()
                            .setBaseOptions(BaseOptions.builder().setModelAssetPath("pose_landmarker_full.task").setDelegate(Delegate.CPU).build())
                            .setRunningMode(RunningMode.VIDEO)
                            .setMinPoseDetectionConfidence(0.5f)
                            .setMinPosePresenceConfidence(0.5f)
                            .setMinTrackingConfidence(0.5f)
                            .setNumPoses(1)
                            .build()
                        poseLandmarker = PoseLandmarker.createFromOptions(context, cpuOptions)
                        Log.d("ARISE_POSE", "MediaPipe PoseLandmarker initialized with CPU delegate")
                    }
                    // H12: a fresh landmarker is usable again after release().
                    isClosed.set(false)
                }
                }
                return@AsyncFunction true
            } catch (e: Exception) {
                Log.e("ARISE_POSE", "Error initializing MediaPipe PoseLandmarker", e)
                return@AsyncFunction false
            }
        }

        AsyncFunction("processBase64Frame") { base64Image: String, facing: String? ->
            try {
                // H12: do NOT read poseLandmarker outside the lock — a
                // concurrent release() could null/close it between the read
                // and detectForVideo (stale reference → crash). The detector
                // is read inside the lock below, alongside the closed check.
                val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)

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

                val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, boundsOptions)
                var sampleSize = 1
                val maxDim = maxOf(boundsOptions.outWidth, boundsOptions.outHeight)
                while (maxDim / (sampleSize * 2) >= 360) {
                    sampleSize *= 2
                }

                val decodeOptions = BitmapFactory.Options().apply {
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                    inSampleSize = sampleSize
                }
                val rawBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, decodeOptions)
                    ?: throw IllegalArgumentException("Failed to decode base64 string into bitmap")

                try {
                    val rawW = rawBitmap.width.toFloat().coerceAtLeast(1f)
                    val rawH = rawBitmap.height.toFloat().coerceAtLeast(1f)
                    val isFront = (facing ?: "front") == "front"

                    val rotation = if (rawW < rawH) {
                        if (exifRotation == 180) 180 else 0
                    } else {
                        if (exifRotation == 90 || exifRotation == 270) {
                            exifRotation
                        } else {
                            if (isFront) 270 else 90
                        }
                    }

                    val finalBitmap = if (rotation != 0) {
                        val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
                        val rotated = Bitmap.createBitmap(rawBitmap, 0, 0, rawBitmap.width, rawBitmap.height, matrix, true)
                        if (rotated != rawBitmap) {
                            rawBitmap.recycle()
                        }
                        rotated
                    } else {
                        rawBitmap
                    }

                    try {
                        val mpImage = BitmapImageBuilder(finalBitmap).build()
                        val result = synchronized(detectorLock) {
                            // H12: closed check + detector read inside the
                            // lock — release() holds the same lock, so the
                            // landmarker cannot be closed mid-inference.
                            if (isClosed.get()) return@synchronized null
                            val detector = poseLandmarker ?: return@synchronized null
                            detector.detectForVideo(mpImage, videoTimestampMs.getAndIncrement())
                        } ?: return@AsyncFunction emptyList<Map<String, Any>>()
                        val resultList = mutableListOf<Map<String, Any>>()

                        if (result.landmarks().isNotEmpty()) {
                            val poseLandmarks = result.landmarks()[0]
                            val worldLandmarks = if (result.worldLandmarks().isNotEmpty()) result.worldLandmarks()[0] else null

                            for (i in poseLandmarks.indices) {
                                val normLm = poseLandmarks[i]
                                val worldLm = worldLandmarks?.getOrNull(i)

                                val vis = if (normLm.visibility().isPresent) normLm.visibility().get().toDouble() else 0.8
                                val pres = if (normLm.presence().isPresent) normLm.presence().get().toDouble() else 0.8

                                val landmarkMap = mutableMapOf<String, Any>(
                                    "index" to i,
                                    "x" to normLm.x().toDouble().coerceIn(0.0, 1.0),
                                    "y" to normLm.y().toDouble().coerceIn(0.0, 1.0),
                                    "z" to normLm.z().toDouble(),
                                    "visibility" to vis,
                                    "presence" to pres,
                                    "frameWidth" to finalBitmap.width.toDouble(),
                                    "frameHeight" to finalBitmap.height.toDouble()
                                )
                                if (worldLm != null) {
                                    landmarkMap["worldX"] = worldLm.x().toDouble()
                                    landmarkMap["worldY"] = worldLm.y().toDouble()
                                    landmarkMap["worldZ"] = worldLm.z().toDouble()
                                }
                                resultList.add(landmarkMap)
                            }
                        }

                        return@AsyncFunction resultList
                    } finally {
                        finalBitmap.recycle()
                    }
                } catch (e: Exception) {
                    Log.e("ARISE_POSE", "Error running pose detection", e)
                    return@AsyncFunction emptyList<Map<String, Any>>()
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
                synchronized(detectorLock) {
                    // H12: mark closed BEFORE close() so any in-flight
                    // processBase64Frame that acquires the lock next sees
                    // the closed flag instead of a torn-down landmarker.
                    isClosed.set(true)
                    poseLandmarker?.close()
                    poseLandmarker = null
                }
                Log.d("ARISE_POSE", "PoseLandmarker released safely")
            } catch (e: Exception) {
                Log.e("ARISE_POSE", "Error releasing PoseLandmarker", e)
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
