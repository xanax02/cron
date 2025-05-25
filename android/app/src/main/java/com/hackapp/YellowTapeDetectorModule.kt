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
        // Convert bitmap to Mat (OpenCV format)
        val inputMat = Mat()
        Utils.bitmapToMat(bitmap, inputMat)
        
        // If ROI is provided, extract only that region
        val processedMat = if (roi != null) {
            try {
                // Make sure the ROI is within the image bounds
                val safeROI = Rect(
                    Math.max(0, roi.x),
                    Math.max(0, roi.y),
                    Math.min(roi.width, inputMat.width() - roi.x),
                    Math.min(roi.height, inputMat.height() - roi.y)
                )
                
                Log.d(TAG, "Using ROI: $safeROI on image size: ${inputMat.width()}x${inputMat.height()}")
                Mat(inputMat, safeROI)
            } catch (e: Exception) {
                Log.e(TAG, "Error extracting ROI", e)
                inputMat // Fallback to full image if ROI extraction fails
            }
        } else {
            inputMat
        }
        
        // Convert BGR to HSV color space
        val hsvMat = Mat()
        Imgproc.cvtColor(processedMat, hsvMat, Imgproc.COLOR_BGR2HSV)
        
        // Define yellow color range in HSV
        // Yellow is typically around H: 20-40, S: 100-255, V: 100-255
        val lowerYellow = Scalar(20.0, 100.0, 100.0)
        val upperYellow = Scalar(40.0, 255.0, 255.0)
        
        // Create mask for yellow color
        val yellowMask = Mat()
        Core.inRange(hsvMat, lowerYellow, upperYellow, yellowMask)
        
        // Apply morphological operations to clean up the mask
        val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(5.0, 5.0))
        Imgproc.morphologyEx(yellowMask, yellowMask, Imgproc.MORPH_OPEN, kernel)
        Imgproc.morphologyEx(yellowMask, yellowMask, Imgproc.MORPH_CLOSE, kernel)
        
        // Find contours in the mask
        val contours = ArrayList<MatOfPoint>()
        val hierarchy = Mat()
        Imgproc.findContours(yellowMask, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
        
        // If no contours found, return "No yellow tape detected"
        if (contours.isEmpty()) {
            // Clean up before returning
            processedMat.release()
            inputMat.release()
            hsvMat.release()
            yellowMask.release()
            hierarchy.release()
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
        
        // If the largest contour is too small, return "No yellow tape detected"
        if (maxContourArea < 300) { // Lowered threshold for smaller ROI
            // Clean up before returning
            processedMat.release()
            inputMat.release()
            hsvMat.release()
            yellowMask.release()
            hierarchy.release()
            return Pair("No yellow tape detected", 0.0)
        }
        
        // Calculate confidence based on contour area relative to processed image size
        val totalImageArea = processedMat.rows() * processedMat.cols()
        val confidence = (maxContourArea / totalImageArea) * 100.0
        val cappedConfidence = Math.min(100.0, confidence * 15) // Increase confidence scaling for wider ROI
        
        // Get the largest contour
        val contour = contours[maxContourIdx]
        
        // Get the bounding rectangle of the contour
        val boundingRect = Imgproc.boundingRect(contour)
        
                val moments = Imgproc.moments(contour)
        val cx = moments.get_m10() / moments.get_m00()
        val imgCenterX = processedMat.cols() / 2.0

        // Define Proportional Steady Zone (central area of the ROI)
        val steadyZoneMarginHorizontal = (processedMat.width() * 0.20).toInt() // 20% margin from left/right edges
        val steadyZoneMarginVertical = (processedMat.height() * 0.20).toInt()   // 20% margin from top/bottom edges

        val steadyZoneX = steadyZoneMarginHorizontal
        val steadyZoneY = steadyZoneMarginVertical
        // Ensure steadyZoneWidth and steadyZoneHeight are not negative if ROI is too small
        val steadyZoneWidth = Math.max(0, processedMat.width() - (2 * steadyZoneMarginHorizontal))
        val steadyZoneHeight = Math.max(0, processedMat.height() - (2 * steadyZoneMarginVertical))

        // Bounding box of the detected contour (boundingRect is already available)
        val contourLeft = boundingRect.x
        val contourTop = boundingRect.y
        val contourRight = boundingRect.x + boundingRect.width
        val contourBottom = boundingRect.y + boundingRect.height

        // Check if Contour is Largely Contained within the Steady Zone
        val isLargelyContained = contourLeft >= steadyZoneX &&
                                 contourRight <= (steadyZoneX + steadyZoneWidth) &&
                                 contourTop >= steadyZoneY &&
                                 contourBottom <= (steadyZoneY + steadyZoneHeight)

        val direction: String
        if (isLargelyContained) {
            direction = "Yellow tape detected - keep steady"
        } else {
            // If Not Largely Contained, Analyze for Direction
            // cx and imgCenterX are assumed to be defined before this block (center of mass and ROI center)

            // Horizontal Bias: Where is the center of mass relative to ROI center?
            val horizontalBias = (cx - imgCenterX) / (imgCenterX.takeIf { it != 0.0 } ?: 1.0) // Normalized: -1 to 1

            // Mass Distribution Bias: How is the mass distributed left/right if it crosses ROI centerline?
            var massDistributionBias = 0.0
            if (contourLeft < imgCenterX && contourRight > imgCenterX) { // Crosses centerline
                val mask = Mat.zeros(processedMat.size(), CvType.CV_8UC1)
                Imgproc.drawContours(mask, listOf(contour), 0, Scalar(255.0), -1)
                val midPoint = imgCenterX.toInt()
                if (midPoint > 0 && midPoint < mask.cols()) { // Ensure valid submat indices
                    val leftHalfMat = mask.submat(0, mask.rows(), 0, midPoint)
                    val rightHalfMat = mask.submat(0, mask.rows(), midPoint, mask.cols())
                    val leftWeight = Core.countNonZero(leftHalfMat).toDouble()
                    val rightWeight = Core.countNonZero(rightHalfMat).toDouble()
                    if (leftWeight + rightWeight > 0) { // Avoid division by zero
                        massDistributionBias = (rightWeight - leftWeight) / (leftWeight + rightWeight) // Normalized: -1 to 1
                    }
                    leftHalfMat.release()
                    rightHalfMat.release()
                }
                mask.release()
            } else if (contourRight <= imgCenterX) { // Contour fully in ROI's left half
                massDistributionBias = -1.0
            } else if (contourLeft >= imgCenterX) { // Contour fully in ROI's right half
                massDistributionBias = 1.0
            }
            
            // Exit Factor: Is it actually breaking the boundaries of the ROI (processedMat)?
            var exitFactor = 0.0
            val roiActualWidth = processedMat.width().toDouble()
            if (boundingRect.width > 0 && roiActualWidth > 0) {
                if (contourLeft < 0) { // Exiting hard left of ROI frame
                    exitFactor = (contourLeft.toDouble() / boundingRect.width.toDouble()) // Negative value, proportion of width outside
                } else if (contourRight > roiActualWidth) { // Exiting hard right of ROI frame
                    exitFactor = ((contourRight.toDouble() - roiActualWidth) / boundingRect.width.toDouble()) // Positive, proportion of width outside
                }
            }
            exitFactor = Math.max(-1.0, Math.min(1.0, exitFactor)) // Cap exitFactor to [-1, 1]

            // Combine evidence (Weights: HorizontalBias 0.3, MassDistribution 0.3, ExitFactor 0.4)
            val directionEvidence = (horizontalBias * 0.3) + (massDistributionBias * 0.3) + (exitFactor * 0.4)
            
            val directionThreshold = 0.25 // Stricter threshold for directional cues

            if (directionEvidence > directionThreshold) {
                direction = "Yellow tape leads to the RIGHT"
            } else if (directionEvidence < -directionThreshold) {
                direction = "Yellow tape leads to the LEFT"
            } else {
                direction = "Yellow tape detected - keep steady"
            }
        }
        Log.d(TAG, "Direction decision: $direction")
        
        // Clean up
        processedMat.release()
        inputMat.release()
        hsvMat.release()
        yellowMask.release()
        hierarchy.release()
        
        return Pair(direction, cappedConfidence)
    }
}
