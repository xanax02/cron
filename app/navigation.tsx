import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
// @ts-ignore - We've added the package but TypeScript may need time to recognize it
import { Picker } from '@react-native-picker/picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Import navigation utilities

// This would normally come from a backend based on building and floor
const getLocations = (building: string, floor: string) => {
  // Mock locations - in a real app, this would be fetched from a backend
  return [
    'Entrance',
    'Hall',
    'Kitchen',
    'Balcony',
    'Room1',
    'WashroomR1',
  ];
};

export default function NavigationScreen() {
  const { building, floor, floorName } = useLocalSearchParams();
  const [locations, setLocations] = useState<string[]>([]);
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [isSpeechAvailable, setSpeechAvailable] = useState(false);
  const [isScreenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const router = useRouter();

  // Check accessibility settings
  useEffect(() => {
    const checkAccessibility = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(screenReaderEnabled);
      
      // Assuming speech is available as Expo handles this
      setSpeechAvailable(true);
      
      if (screenReaderEnabled && isSpeechAvailable) {
        Speech.speak(
          `Navigation setup for ${building}, ${floorName}. Please select your current location and destination.`,
          {
            language: 'en',
            pitch: 1.0,
            rate: 0.9,
          }
        );
      }
    };
    
    checkAccessibility();
    
    // Load locations for the selected building and floor
    if (building && floor) {
      const locationsList = getLocations(building as string, floor as string);
      setLocations(locationsList);
      
      // Set defaults
      if (locationsList.length > 0) {
        setSource(locationsList[0]);
        if (locationsList.length > 1) {
          setDestination(locationsList[1]);
        } else {
          setDestination(locationsList[0]);
        }
      }
    }
    
    // Add accessibility change listener
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );
    
    return () => {
      // Clean up subscription
      subscription.remove();
      if (isSpeechAvailable) {
        Speech.stop();
      }
    };
  }, [building, floor, floorName]);

  const handleStartNavigation = () => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Speak for screen reader users
    if (isScreenReaderEnabled && isSpeechAvailable) {
      Speech.speak(`Starting navigation from ${source} to ${destination}.`, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    }
    
    // Navigate to the directions screen
    router.push({
      pathname: '/directions',
      params: { 
        building, 
        floor, 
        floorName,
        source, 
        destination 
      }
    });
  };

  const speakText = (text: string) => {
    if (isScreenReaderEnabled && isSpeechAvailable) {
      Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          accessibilityLabel="Go back to floor selection"
          accessibilityHint="Double tap to return to floor selection"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedView style={styles.titleTextContainer}>
          <ThemedText type="title" accessibilityRole="header">
            {building ? `${building}` : 'Navigation Setup'}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.floorName}>
            {floorName}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <ThemedView style={styles.selectionContainer}>
          <ThemedText 
            type="defaultSemiBold" 
            style={styles.sectionTitle}
            accessibilityRole="header"
          >
            Current Location
          </ThemedText>
          
          <View 
            style={styles.pickerContainer}
            accessibilityLabel="Select your current location"
            accessibilityHint="Double tap to expand and select your current location"
          >
            <Picker
              selectedValue={source}
              onValueChange={(itemValue: string) => {
                setSource(itemValue);
                speakText(`Current location: ${itemValue}`);
              }}
              style={styles.picker}
              dropdownIconColor="#007AFF"
              accessibilityLabel="Current location selector"
            >
              {locations.map((location) => (
                <Picker.Item key={location} label={location} value={location} />
              ))}
            </Picker>
          </View>
        </ThemedView>

        <ThemedView style={styles.selectionContainer}>
          <ThemedText 
            type="defaultSemiBold" 
            style={styles.sectionTitle}
            accessibilityRole="header"
          >
            Destination
          </ThemedText>
          
          <View 
            style={styles.pickerContainer}
            accessibilityLabel="Select your destination"
            accessibilityHint="Double tap to expand and select your destination"
          >
            <Picker
              selectedValue={destination}
              onValueChange={(itemValue: string) => {
                setDestination(itemValue);
                speakText(`Destination: ${itemValue}`);
              }}
              style={styles.picker}
              dropdownIconColor="#007AFF"
              accessibilityLabel="Destination selector"
            >
              {locations.map((location) => (
                <Picker.Item key={location} label={location} value={location} />
              ))}
            </Picker>
          </View>
        </ThemedView>

        {source === destination && (
          <ThemedView style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color="#FFC107" style={styles.warningIcon} />
            <ThemedText style={styles.warningText}>
              Source and destination are the same
            </ThemedText>
          </ThemedView>
        )}

        <TouchableOpacity
          style={[
            styles.startButton,
            (source === destination) && styles.startButtonDisabled
          ]}
          onPress={handleStartNavigation}
          disabled={source === destination}
          accessibilityLabel="Start Navigation"
          accessibilityHint="Double tap to start navigation from your current location to your destination"
          accessibilityRole="button"
          onAccessibilityTap={() => speakText('Start Navigation button')}
        >
          <Ionicons name="navigate" size={24} color="white" style={styles.buttonIcon} />
          <ThemedText style={styles.buttonText}>Start Navigation</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  titleTextContainer: {
    flex: 1,
  },
  floorName: {
    marginTop: 4,
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  selectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  startButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  startButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    color: '#F57C00',
  },
});
