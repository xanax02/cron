package com.hackapp

import android.graphics.Bitmap
import android.util.Log
import com.facebook.react.bridge.*
import org.opencv.android.Utils
import org.opencv.core.*
import org.opencv.imgproc.Imgproc
import java.util.*
import kotlin.math.atan2

class YellowTapeDetectorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "YellowTapeDetector"
        
        // Load OpenCV native library
        init {
            try {
                System.loadLibrary("opencv_java4")
                Log.d(TAG, "OpenCV library loaded successfully")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load OpenCV library", e)
            }
        }
    }

    override fun getName(): String {
        return "YellowTapeDetector"
    }

    @ReactMethod
    fun detectYellowTape(imageBase64: String, roiMap: ReadableMap?, promise: Promise) {
        try {
            // Convert base64 to bitmap
            val bitmap = base64ToBitmap(imageBase64)
            
            // Extract ROI if provided
            val roi = if (roiMap != null) {
                val x = roiMap.getInt("x")
                val y = roiMap.getInt("y")
                val width = roiMap.getInt("width")
                val height = roiMap.getInt("height")
                Log.d(TAG, "ROI: x=$x, y=$y, width=$width, height=$height")
                Rect(x, y, width, height)
            } else {
                null
            }
            
            // Process the image to detect yellow tape
            val result = processImageForYellowTape(bitmap, roi)
            
            // Create response
            val response = Arguments.createMap()
            response.putString("direction", result.first)
            response.putDouble("confidence", result.second)
            
            promise.resolve(response)
        } catch (e: Exception) {
            Log.e(TAG, "Error in yellow tape detection", e)
            promise.reject("DETECTION_ERROR", e.message, e)
        }
    }

    private fun base64ToBitmap(base64: String): Bitmap {
        val decodedBytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
        return android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
    }

    private fun processImageForYellowTape(bitmap: Bitmap, roi: Rect? = null): Pair<String, Double> {
        // Enable debug output for testing if needed
        val enableDebugOutput = false 
        
        // Collection of mats to be released at the end
        val matsToRelease = mutableListOf<Mat>()
        
        try {
            // Convert bitmap to OpenCV format
            val inputMat = Mat()
            Utils.bitmapToMat(bitmap, inputMat)
            matsToRelease.add(inputMat)
            
            // Extract ROI if provided
            val processedMat = if (roi != null) {
                try {
                    // Create a safe ROI that doesn't exceed image boundaries
                    val safeROI = Rect(
                        Math.max(0, roi.x),
                        Math.max(0, roi.y),
                        Math.min(roi.width, inputMat.width() - roi.x),
                        Math.min(roi.height, inputMat.height() - roi.y)
                    )
                    
                    // Only use ROI if it has meaningful size
                    if (safeROI.width > 10 && safeROI.height > 10) {
                        Mat(inputMat, safeROI).also { matsToRelease.add(it) }
                    } else {
                        inputMat
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "ROI extraction failed", e)
                    inputMat
                }
            } else {
                inputMat
            }
            
            // Convert to HSV for better color detection
            val hsvMat = Mat()
            Imgproc.cvtColor(processedMat, hsvMat, Imgproc.COLOR_BGR2HSV)
            matsToRelease.add(hsvMat)
            
            // Enhanced yellow color detection with two ranges
            // Main yellow range
            val lowerYellow1 = Scalar(20.0, 100.0, 100.0)
            val upperYellow1 = Scalar(40.0, 255.0, 255.0)
            
            // Secondary yellow range (lighter/paler yellows)
            val lowerYellow2 = Scalar(20.0, 50.0, 180.0) 
            val upperYellow2 = Scalar(40.0, 100.0, 255.0)
            
            // Create two masks and combine them
            val yellowMask1 = Mat()
            val yellowMask2 = Mat()
            val yellowMask = Mat()
            
            Core.inRange(hsvMat, lowerYellow1, upperYellow1, yellowMask1)
            Core.inRange(hsvMat, lowerYellow2, upperYellow2, yellowMask2)
            Core.bitwise_or(yellowMask1, yellowMask2, yellowMask)
            
            matsToRelease.add(yellowMask1)
            matsToRelease.add(yellowMask2)
            matsToRelease.add(yellowMask)
            
            // Clean up the mask with morphological operations
            val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(5.0, 5.0))
            Imgproc.morphologyEx(yellowMask, yellowMask, Imgproc.MORPH_OPEN, kernel)
            Imgproc.morphologyEx(yellowMask, yellowMask, Imgproc.MORPH_CLOSE, kernel)
            
            // Find contours in the mask
            val contours = ArrayList<MatOfPoint>()
            val hierarchy = Mat()
            Imgproc.findContours(yellowMask, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
            matsToRelease.add(hierarchy)
            
            // Add all contours to matsToRelease for cleanup
            contours.forEach { matsToRelease.add(it) }
            
            // If no contours found, return "No yellow tape detected"
            if (contours.isEmpty()) {
                return Pair("No yellow tape detected", 0.0)
            }
            
            // Find the largest contour (assuming it's the yellow tape)
            var maxContourIdx = -1
            var maxContourArea = 0.0
            
            for (i in contours.indices) {
                val area = Imgproc.contourArea(contours[i])
                if (area > maxContourArea) {
                    maxContourArea = area
                    maxContourIdx = i
                }
            }
            
            // Minimum area threshold (adjusted for better detection of thin lines)
            val minAreaThreshold = 200.0 
            if (maxContourArea < minAreaThreshold) {
                return Pair("No yellow tape detected", 0.0)
            }
            
            // Calculate confidence based on relative area
            val totalImageArea = processedMat.rows() * processedMat.cols()
            val confidence = (maxContourArea / totalImageArea) * 100.0
            val cappedConfidence = Math.min(100.0, confidence * 15)
            
            val contour = contours[maxContourIdx]
            
            // Create a centroid-based "steady zone" - more accurate than angle for "keep steady"
            val moments = Imgproc.moments(contour)
            
            // Guard against division by zero
            if (moments.get_m00() == 0.0) {
                return Pair("Yellow tape detected - keep steady", cappedConfidence)
            }
            
            // Calculate center of mass
            val cx = moments.get_m10() / moments.get_m00()
            val cy = moments.get_m01() / moments.get_m00()
            
            // Calculate center of image
            val imgCenterX = processedMat.cols() / 2.0
            val imgCenterY = processedMat.rows() / 2.0
            
            // Create a central "steady zone" - if the tape is mostly in this zone, keep steady
            val steadyZoneWidth = processedMat.cols() * 0.2 // 20% of width
            val steadyZoneHeight = processedMat.rows() * 0.2 // 20% of height
            
            val isInSteadyZone = Math.abs(cx - imgCenterX) < steadyZoneWidth / 2 && 
                                 Math.abs(cy - imgCenterY) < steadyZoneHeight / 2
            
            // Get the angle for directional detection - more reliable than just center of mass
            val contourPoints = MatOfPoint2f(*contour.toArray())
            matsToRelease.add(contourPoints)
            
            val rotatedRect = Imgproc.minAreaRect(contourPoints)
            val angle = rotatedRect.angle
            
            // Normalize angle to -45 to 45 range for easier interpretation
            val normalizedAngle = if (angle < -45) angle + 90 else angle
            
            // Combine center of mass position with angle for more accurate direction
            val horizontalOffset = (cx - imgCenterX) / imgCenterX
            
            // Direction determination combining angle and position
            val direction = if (isInSteadyZone) {
                // If in steady zone, keep steady
                "Yellow tape detected - keep steady"
            } else if (Math.abs(normalizedAngle) < 10) {
                // If angle is small, use center of mass position
                if (horizontalOffset < -0.15) {
                    "Yellow tape leads to the LEFT"
                } else if (horizontalOffset > 0.15) {
                    "Yellow tape leads to the RIGHT"
                } else {
                    "Yellow tape detected - keep steady"
                }
            } else {
                // Otherwise use angle
                if (normalizedAngle > 15) {
                    "Yellow tape leads to the LEFT"
                } else if (normalizedAngle < -15) {
                    "Yellow tape leads to the RIGHT"
                } else {
                    "Yellow tape detected - keep steady"
                }
            }
            
            // Debug logging
            Log.d(TAG, "Angle: $normalizedAngle, HOffset: $horizontalOffset, Direction: $direction")
            
            // Optional debug visualization
            if (enableDebugOutput) {
                val debugMat = processedMat.clone()
                matsToRelease.add(debugMat)
                
                // Draw contour
                Imgproc.drawContours(debugMat, listOf(contour), -1, Scalar(0.0, 255.0, 0.0), 2)
                
                // Draw rotated rectangle
                Imgproc.ellipse(debugMat, rotatedRect, Scalar(255.0, 0.0, 0.0), 2)
                
                // Draw angle line
                val center = rotatedRect.center
                val length = 100
                val rad = Math.toRadians(normalizedAngle)
                val xOffset = (Math.cos(rad) * length).toInt()
                val yOffset = (Math.sin(rad) * length).toInt()
                
                Imgproc.line(
                    debugMat,
                    Point(center.x - xOffset, center.y - yOffset),
                    Point(center.x + xOffset, center.y + yOffset),
                    Scalar(255.0, 255.0, 255.0),
                    2
                )
                
                // Draw center of mass
                Imgproc.circle(debugMat, Point(cx, cy), 5, Scalar(0.0, 0.0, 255.0), -1)
                
                // Draw steady zone
                Imgproc.rectangle(
                    debugMat,
                    Point(imgCenterX - steadyZoneWidth/2, imgCenterY - steadyZoneHeight/2),
                    Point(imgCenterX + steadyZoneWidth/2, imgCenterY + steadyZoneHeight/2),
                    Scalar(255.0, 0.0, 255.0),
                    2
                )
                
                val debugBitmap = Bitmap.createBitmap(debugMat.cols(), debugMat.rows(), Bitmap.Config.ARGB_8888)
                Utils.matToBitmap(debugMat, debugBitmap)
                val outputStream = java.io.ByteArrayOutputStream()
                debugBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
            }
            
            return Pair(direction, cappedConfidence)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error in yellow tape detection", e)
            return Pair("Error detecting yellow tape", 0.0)
        } finally {
            // Release all allocated matrices to avoid memory leaks
            matsToRelease.forEach { it.release() }
        }
    }
}
