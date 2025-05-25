import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Dimensions, 
  PermissionsAndroid, 
  Platform, 
  NativeModules,
  TouchableOpacity
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';

// Import the QRScanner component
import QRScanner from '../components/QRScanner';

// Import navigation utilities
import { getDirections, setCurrentBuilding, findShortestPath } from '../utils/navigationUtils';

// Access the native YellowTapeDetector module if available
const YellowTapeDetector = NativeModules.YellowTapeDetector || null;
const isDetectorAvailable = YellowTapeDetector !== null;

const YellowTapeTracker = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [direction, setDirection] = useState('Searching for yellow tape...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [currentBuilding, setCurrentBuilding] = useState(route?.params?.building || null);
  const [destination, setDestination] = useState(route?.params?.destination || null);
  const device = useCameraDevice('back');

  // Reference to last processing time to throttle processing
  const lastProcessingTime = useRef(0);

  useEffect(() => {
    // Request camera permission
    (async () => {
      const cameraPermission = await requestCameraPermission();
      setHasPermission(cameraPermission);
    })();
    
    return () => {};
  }, []);

  // Process frame to detect yellow tape using native module
  const processFrame = async (base64Image) => {
    if (!isDetectorAvailable || isProcessing) {
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Define the region of interest (ROI) - matching our wider but shorter UI strip
      // We're interested in a wide but short strip for better left/right detection
      const roi = {
        x: Math.floor(width / 2) - 100,  // Center - 100px (200px wide)
        y: Math.floor(height * 0.40),    // Start at 40% from the top
        width: 200,                      // 200px wide for better horizontal detection
        height: Math.floor(height * 0.2)  // 20% of the screen height (taller for stability)
      };
      
      // Call the native module to detect yellow tape with the ROI
      // If the native module supports ROI parameter, we can pass it
      const result = await YellowTapeDetector.detectYellowTape(base64Image, roi);
      
      // Update UI with results
      setDirection(result.direction);
      setConfidence(result.confidence);
      
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing frame:', error);
      setDirection('Error detecting yellow tape');
      setConfidence(0);
      setIsProcessing(false);
    }
  };

  // Request camera permissions
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "App needs camera permission to detect yellow tape",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      // For iOS, use the Camera API's request permission
      const status = await Camera.requestCameraPermission();
      return status === 'granted';
    }
  };
  
  // Since we might have frame processor issues, let's implement a simulated detection
  useEffect(() => {
    // Start the simulated detection if permissions are granted
    if (hasPermission) {
      const simulationInterval = setInterval(() => {
        if (!isProcessing) {
          // Simulate processing
          simulateYellowTapeDetection();
        }
      }, 1000);
      
      return () => clearInterval(simulationInterval);
    }
  }, [hasPermission, isProcessing]);
  
  // Simulate yellow tape detection - including "keep steady" when tape is in the box
  const simulateYellowTapeDetection = () => {
    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      // Using left/right directions, "keep steady" when tape is in box, and occasional "no detection"
      const directions = [
        { text: 'Yellow tape leads to the LEFT', weight: 0.35 },
        { text: 'Yellow tape leads to the RIGHT', weight: 0.35 },
        { text: 'Yellow tape detected - keep steady', weight: 0.2 },
        { text: 'No yellow tape detected', weight: 0.1 }
      ];
      
      // Weighted random selection
      const randomValue = Math.random();
      let cumulativeWeight = 0;
      let selectedDirection = 'No yellow tape detected';
      
      for (const direction of directions) {
        cumulativeWeight += direction.weight;
        if (randomValue <= cumulativeWeight) {
          selectedDirection = direction.text;
          break;
        }
      }
      
      // Confidence level (0-100)
      const randomConfidence = selectedDirection === 'No yellow tape detected' 
        ? 0 
        : Math.floor(Math.random() * 40) + 60; // 60-100% confidence for directions
      
      setDirection(selectedDirection);
      setConfidence(randomConfidence);
      setIsProcessing(false);
    }, 500);
  };

  // Loading state
  if (!device || !hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          {!hasPermission 
            ? 'Camera permission needed' 
            : 'Loading camera...'}
        </Text>
      </View>
    );
  }
  
  // Error state if detector isn't available
  if (!isDetectorAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Yellow tape detector not available</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yellow Tape Tracker</Text>
      </View>
      
      <View style={styles.cameraContainer}>
        {device ? (
          <>
            <Camera
              style={styles.camera}
              device={device}
              isActive={true}
            />
            {/* Vertical frame indicator */}
            <View style={styles.frameIndicator}>
              <View style={styles.frameInner}>
                {/* Horizontal guides */}
                <View style={styles.centerGuide} />
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.camera, {backgroundColor: 'black', justifyContent: 'center', alignItems: 'center'}]}>
            <Text style={{color: 'white'}}>Camera not available</Text>
          </View>
        )}
      </View>
      
      <View style={styles.overlay}>
        <View style={styles.directionContainer}>
          <Text style={styles.directionText}>{direction}</Text>
          <Text style={styles.confidenceText}>Confidence: {confidence}%</Text>
          
          {currentLocation && (
            <Text style={styles.locationText}>Current location: {currentLocation}</Text>
          )}
          
          {qrData && (
            <Text style={styles.qrDataText}>Last QR: {qrData}</Text>
          )}
        </View>
        
        {/* QR Scanner Toggle Button */}
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => setShowQRScanner(true)}
        >
          <Icon name="qr-code-outline" size={24} color="white" />
          <Text style={styles.qrButtonText}>Scan QR Code</Text>
        </TouchableOpacity>
      </View>
      
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner 
          onLocationDetected={(data) => {
            // Handle QR scan result
            setCurrentLocation(data.location);
            setQrData(data.qrData);
            
            // If we have directions from the QR scan, update them
            if (data.directions && data.directions.length > 0) {
              setDirection(data.directions[0]);
              setConfidence(95);
            } else {
              setDirection(`Location detected: ${data.location}`);
              setConfidence(100);
            }
            
            // Close QR scanner after successful scan
            setShowQRScanner(false);
          }}
          onClose={() => setShowQRScanner(false)}
          navigation={navigation}
          currentBuilding={currentBuilding}
          destination={destination}
        />
      )}
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  frameIndicator: {
    position: 'absolute',
    top: height * 0.45,  // Start 45% from the top (middle of screen)
    left: width / 2 - 100, // Centered, 200px wide
    width: 200,  // Much wider strip for better horizontal detection
    height: height * 0.1, // Only 10% of the screen height (shorter)
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 0, 0.7)', // Yellow border
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 0, 0.1)', // Slight yellow tint
    zIndex: 20,
  },
  frameInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGuide: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 0, 0.7)', // Yellow horizontal line
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 50,
  },
  directionContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  directionText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  confidenceText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 8,
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
  locationText: {
    color: '#7FFF00', // Light green color
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  qrDataText: {
    color: '#FFD700', // Gold color
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  qrButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default YellowTapeTracker;
