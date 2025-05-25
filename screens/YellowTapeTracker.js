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
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import Tts from 'react-native-tts';

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
  const [currentLocation, setCurrentLocation] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [currentBuilding, setCurrentBuilding] = useState(route?.params?.building || null);
  const [source, setSource] = useState(route?.params?.source || 'Entrance');
  const [destination, setDestination] = useState(route?.params?.destination || null);
  const [destinationReached, setDestinationReached] = useState(false);
  const [qrScanCooldown, setQrScanCooldown] = useState(false);
  // Get directions map directly from route params
  const [directionsMap, setDirectionsMap] = useState(route?.params?.directions || {});
  const device = useCameraDevice('back');

  // Reference to last processing time to throttle processing
  const lastProcessingTime = useRef(0);

  useEffect(() => {
    // Request camera permission
    (async () => {
      const cameraPermission = await requestCameraPermission();
      setHasPermission(cameraPermission);
    })();
    
    // Initialize TTS
    Tts.setDefaultRate(0.5); // Slower speech rate
    Tts.setDefaultPitch(1.0);
    
    // Log available directions for debugging
    if (route?.params?.directions) {
      console.log('Directions received from NavigationScreen:', JSON.stringify(route.params.directions));
    } else if (currentBuilding && source && destination) {
      // If no directions provided, calculate them (fallback)
      console.log(`No directions provided, calculating from ${source} to ${destination}`);
      calculateDirectionsMap(source, destination);
    }
    
    return () => {
      Tts.stop();
    };
  }, [currentBuilding, source, destination, route?.params?.directions]);
  
  // Setup code scanner for QR codes
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (!qrScanCooldown && codes.length > 0 && codes[0].value) {
        handleQRCode(codes[0].value);
      }
    }
  });

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
  
  // Get directions map from the navigation utilities
  const calculateDirectionsMap = (start, end) => {
    try {
      // Make sure we have the correct building data loaded
      if (currentBuilding) {
        setCurrentBuilding(currentBuilding);
      }
      
      // Get the direction map directly from getDirections
      const directions = getDirections(start, end);
      console.log('Directions map created:', JSON.stringify(directions));
      
      // Make sure directions is not empty before setting it
      if (directions && Object.keys(directions).length > 0) {
        setDirectionsMap(directions);
      } else {
        console.error('Directions map is empty or invalid');
      }
    } catch (error) {
      console.error('Error calculating directions map:', error);
    }
  };
  
  // Handle QR code data
  const handleQRCode = (data) => {
    try {
      // Set cooldown to prevent multiple scans
      setQrScanCooldown(true);
      console.log('QR Code detected:', data);
      console.log('Current directionsMap:', JSON.stringify(directionsMap));
      
      // Parse QR data
      if (data.includes(':')) {
        const [building, location] = data.split(':');
        
        if (building && location) {
          // Update location
          setQrData(data);
          setCurrentLocation(location);
          console.log(`Current location: ${location}, Destination: ${destination}`);
          
          // Check if destination reached
          if (destination && location === destination) {
            setDestinationReached(true);
            
            // Speak destination reached message
            Tts.speak(`You have reached your destination, ${destination}`);
            console.log('Destination reached');
            
            // Navigate back to NavigationScreen after 3 seconds
            setTimeout(() => {
              navigation.navigate('NavigationScreen', { 
                successMessage: `Successfully navigated to ${destination}` 
              });
            }, 3000);
          } 
          // Provide audio direction for this node
          else if (directionsMap && directionsMap[location]) {
            const dirInfo = directionsMap[location];
            console.log('Direction info for location:', JSON.stringify(dirInfo));
            
            // Create a directional message based on the node data
            let directionText = '';
            
            // Check if the direction info contains all required properties
            if (dirInfo.direction && dirInfo.nextNode) {
              // Construct a more detailed direction message
              if (dirInfo.direction === 'destination') {
                directionText = `You are near your destination. Proceed straight ahead to reach ${destination}.`;
              } else {
                // Create a more user-friendly direction with distance
                const distanceText = dirInfo.distance ? `about ${dirInfo.distance} meters` : '';
                directionText = `You are at ${location}. Turn ${dirInfo.direction} ${distanceText} towards ${dirInfo.nextNode}.`;
              }
            } else if (typeof dirInfo === 'string') {
              // Handle case where dirInfo might just be a string
              directionText = `You are at ${location}. ${dirInfo}`;
            } else {
              // Fallback if direction info is incomplete
              directionText = `You are at ${location}. ${dirInfo.directionText || 'Continue following the yellow tape.'}`;
            }
            
            // Speak the direction
            console.log('Speaking direction:', directionText);
            Tts.speak(directionText);
            
            // Update UI state
            setDirection('Follow the yellow tape');
            setConfidence(95);
          } 
          else {
            // Just announce the current location
            const locationMessage = `You are at ${location}. Continue following the yellow tape.`;
            console.log('Speaking location only:', locationMessage);
            Tts.speak(locationMessage);
            setDirection('Follow the yellow tape');
            setConfidence(90);
          }
        }
      } else {
        // Simple QR code
        setQrData(data);
        // Tts.speak(`QR code detected: ${directionsMap[data].direction}`);
        if(directionsMap[data].direction === 'destination') {
          setDestinationReached(true);
          Tts.speak(`You have reached your destination, ${destination}`);
        }
        else if(directionsMap[data].direction === 'left' || 'right') {
          Tts.speak(`QR code detected: Turn ${directionsMap[data].direction}`);
        }
        else if(directionsMap[data].direction === 'straight') {
          Tts.speak(`QR code detected: Go straight`);
        }
        setDirection('Follow the yellow tape');
        setConfidence(90);
      }
       
      // Reset cooldown after delay
      setTimeout(() => {
        setQrScanCooldown(false);
      }, 2000);
    } catch (error) {
      console.error('QR processing error:', error);
      setQrScanCooldown(false);
    }
  };
  
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
          accessibilityLabel="Back button"
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{
          destination ? `Navigating to: ${destination}` : (currentBuilding || 'Yellow Tape Tracker')
        }</Text>
      </View>
      
      <View style={styles.cameraContainer}>
        {device ? (
          <>
            <Camera
              style={styles.camera}
              device={device}
              isActive={true}
              codeScanner={codeScanner}
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
          
          {destination && (
            <Text style={styles.destinationText}>Destination: {destination}</Text>
          )}
          
          {destinationReached && (
            <View style={styles.destinationReachedContainer}>
              <Text style={styles.destinationReachedText}>🎉 Destination Reached! 🎉</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* QR Scanner Crosshair Overlay */}
      <View style={styles.qrScannerOverlay}>
        <View style={styles.scanCorner} />
        <View style={[styles.scanCorner, styles.topRight]} />
        <View style={[styles.scanCorner, styles.bottomLeft]} />
        <View style={[styles.scanCorner, styles.bottomRight]} />
      </View>
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
  destinationText: {
    color: '#ADD8E6', // Light blue color
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  destinationReachedContainer: {
    backgroundColor: 'rgba(0,255,0,0.2)',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  destinationReachedText: {
    color: '#00FF00', // Bright green color
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  qrScannerOverlay: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.15,
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    zIndex: 30,
  },
  scanCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFF',
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    left: undefined,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    top: undefined,
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderTopWidth: 0,
  },
  bottomRight: {
    top: undefined,
    right: -2,
    bottom: -2,
    left: undefined,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
});

export default YellowTapeTracker;
