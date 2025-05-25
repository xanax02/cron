import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';

// Import navigation utilities for path calculation
import { getDirections, setCurrentBuilding, findShortestPath } from '../utils/navigationUtils';
import { availableData } from '../utils/availableBuildings';

const QRScanner = ({ 
  onLocationDetected, 
  onClose, 
  navigation, 
  currentBuilding,
  destination 
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const device = useCameraDevice('back');
  
  // Use the built-in code scanner
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        console.log(`QR Code scanned:`, codes[0].value);
        processQRCode(codes[0].value);
      }
    }
  });

  useEffect(() => {
    // Refresh when device or permission changes
    setRefresh(!refresh);
  }, [device, hasPermission]);
  
  useEffect(() => {
    // Request camera permission
    const requestCameraPermission = async () => {
      const permission = await Camera.requestCameraPermission();
      console.log('Camera permission status:', permission);
      setHasPermission(permission === 'granted');
    };
    
    requestCameraPermission();
    
    // Auto-close after 15 seconds of inactivity
    const timeout = setTimeout(() => {
      onClose();
    }, 15000);
    
    return () => clearTimeout(timeout);
  }, []);



  // Process the QR code data
  const processQRCode = (data) => {
    try {
      // For QR codes with building:location format
      if (data.includes(':')) {
        const [building, location] = data.split(':');
        
        if (building && location) {
          // Call the callback with the detected location
          onLocationDetected({
            building,
            location,
            timestamp: new Date().toISOString(),
            qrData: data,
            directions: destination ? ['Navigate to ' + destination] : null
          });
        }
      } else {
        // For simple QR codes without the format
        onLocationDetected({
          location: data,
          qrData: data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('QR processing error:', error);
    }
  };

  // Loading state
  if (device == null || !hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          Camera not available or not permitted
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera preview */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      
      {/* QR scan overlay */}
      <View style={styles.scanFrame}>
        <View style={styles.scanCorner} />
        <View style={[styles.scanCorner, styles.topRight]} />
        <View style={[styles.scanCorner, styles.bottomLeft]} />
        <View style={[styles.scanCorner, styles.bottomRight]} />
      </View>
      
      {/* Header with back button */}
      <View style={styles.backHeader}>
        <TouchableOpacity
          style={{ padding: 10 }}
          onPress={onClose}
        >
          <Icon name="arrow-back-outline" size={25} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Footer with guidance text and close button */}
      <View style={styles.footer}>
        <Text style={styles.scanText}>
          Position QR code in the frame to scan
        </Text>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Get screen dimensions for layout calculations
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  scanFrame: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.15,
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
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
  backHeader: {
    backgroundColor: '#00000090',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '2%',
    height: '8%',
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: '#00000090',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '5%',
    height: '20%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: 'white',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
});

export default QRScanner;
