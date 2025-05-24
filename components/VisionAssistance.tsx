import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// @ts-ignore - Import Camera and use it directly
import { Camera, CameraView } from 'expo-camera';

// Minimal props for now, assuming onStatusChange might be needed by parent
interface VisionAssistanceProps {
  onStatusChange?: (isActive: boolean) => void;
  isScreenReaderEnabled?: boolean;
  isSpeechAvailable?: boolean;
}

interface DirectionResponse {
  direction: string;
  confidence?: number;
}

const VisionAssistance: React.FC<VisionAssistanceProps> = ({ onStatusChange }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [direction, setDirection] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);
  const processingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status !== 'granted') {
          Alert.alert('Permission Required',
            'Camera permission is needed for vision assistance. Please grant permission in settings.',
            [
              { text: 'OK' }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting camera permissions:', error);
        setHasPermission(false);
        Alert.alert('Camera Error', 'There was an error accessing the camera.');
      }
    })();
  }, []);

  const startCamera = () => {
    if (hasPermission === null) {
      Alert.alert('Permissions Pending', 'Camera permissions are still being checked.');
      return;
    }
    if (!hasPermission) {
      Alert.alert('No Permission',
       'Camera permission has not been granted. Please enable it in your device settings.',
       [
        { text: 'OK' }
       ]
      );
      return;
    }
    setCameraActive(true);
    startFrameProcessing();
    if (onStatusChange) {
      onStatusChange(true);
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
    stopFrameProcessing();
    setDirection('');
    if (onStatusChange) {
      onStatusChange(false);
    }
  };
  
  const startFrameProcessing = () => {
    // Process frames at 5fps (every 200ms)
    processingInterval.current = setInterval(captureAndProcessFrame, 200);
  };
  
  const stopFrameProcessing = () => {
    if (processingInterval.current) {
      clearInterval(processingInterval.current);
      processingInterval.current = null;
    }
  };
  
  const captureAndProcessFrame = async () => {
    if (!cameraRef.current || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // @ts-ignore - Take picture and get base64 data
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.5,
        base64: true,
        skipProcessing: true
      });
      
      // Send to backend for processing
      const response = await fetch('http://192.168.192.149:5000/process-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frame: photo.base64 }),
      });
      
      const data: DirectionResponse = await response.json();
      setDirection(data.direction || 'Unknown');
    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, !cameraActive ? styles.activeButton : styles.inactiveButton]} 
          onPress={startCamera}
          disabled={cameraActive}
        >
          <Text style={styles.buttonText}>Start Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, cameraActive ? styles.activeButton : styles.inactiveButton]} 
          onPress={stopCamera}
          disabled={!cameraActive}
        >
          <Text style={styles.buttonText}>Stop Camera</Text>
        </TouchableOpacity>
      </View>
      
      {cameraActive && hasPermission && (
        <View style={styles.cameraContainer}>
          {/* @ts-ignore - Using Camera component directly */}
          <Camera
            ref={cameraRef}
            style={styles.cameraPreview}
            type="back"
            ratio="16:9"
          />
        </View>
      )}
      
      {direction && (
        <View style={styles.directionContainer}>
          <Text style={styles.directionText}>Direction: {direction}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 20,
  },
  button: {
    width: '40%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  activeButton: {
    backgroundColor: '#007bff',
  },
  inactiveButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  cameraPreview: {
    flex: 1,
  },
  directionContainer: {
    position: 'absolute',
    bottom: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  directionText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default VisionAssistance;
