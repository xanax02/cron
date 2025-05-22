import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, AccessibilityInfo, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Mock data for floors - in a real app, this could come from an API based on the building
const getFloorsForBuilding = (buildingName: string) => {
  // This is just mock data, in a real app this would be fetched from a server
  // based on the building name
  return [
    { id: '1', name: 'Ground Floor' },
    { id: '2', name: '1st Floor' },
    { id: '3', name: '2nd Floor' },
    { id: '4', name: '3rd Floor' },
    { id: '5', name: '4th Floor' }
  ];
};

export default function FloorsScreen() {
  const { building } = useLocalSearchParams();
  const [floors, setFloors] = useState<{ id: string; name: string }[]>([]);
  const [isSpeechAvailable, setSpeechAvailable] = useState(false);
  const [isScreenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const router = useRouter();

  // Check accessibility settings
  useEffect(() => {
    const checkAccessibility = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(screenReaderEnabled);
      
      // Speech.isAvailable() is the correct method, not isAvailableAsync
      setSpeechAvailable(true); // Assuming speech is available as Expo handles this
      
      if (screenReaderEnabled && isSpeechAvailable) {
        Speech.speak(`Floor selection for ${building}. Select a floor to navigate.`, {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });
      }
    };
    
    checkAccessibility();
    
    // Load floors for the selected building
    if (building) {
      const buildingFloors = getFloorsForBuilding(building as string);
      setFloors(buildingFloors);
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
  }, [building]);

  const handleFloorSelect = (floor: { id: string; name: string }) => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Speak the selection for screen reader users
    if (isScreenReaderEnabled && isSpeechAvailable) {
      Speech.speak(`Selected ${floor.name} in ${building}. Setting up navigation.`, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    }
    
    // Navigate to the navigation setup screen with building and floor info
    router.push({
      pathname: '/navigation',
      params: { building, floor: floor.id, floorName: floor.name }
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
          accessibilityLabel="Go back to building selection"
          accessibilityHint="Double tap to return to building selection"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText type="title" accessibilityRole="header">
          {building ? `${building}` : 'Select Floor'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.floorsContainer}>
        <ThemedText 
          type="subtitle" 
          style={styles.floorsTitle}
          accessibilityRole="header"
        >
          Available Floors
        </ThemedText>
        
        {floors.length === 0 ? (
          <ThemedText 
            style={styles.noFloorsText}
            accessibilityLabel="No floors available for this building"
          >
            No floors available for this building
          </ThemedText>
        ) : (
          <FlatList
            data={floors}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.floorItem}
                onPress={() => handleFloorSelect(item)}
                accessibilityLabel={`Select ${item.name}`}
                accessibilityHint={`Double tap to navigate to ${item.name} in ${building}`}
                accessibilityRole="button"
                onAccessibilityTap={() => speakText(`${item.name}`)}
              >
                <View style={styles.floorIconContainer}>
                  <Ionicons name="layers-outline" size={24} color="#555" style={styles.itemIcon} />
                </View>
                <ThemedView style={styles.floorTextContainer}>
                  <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                </ThemedView>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            )}
            style={styles.floorsList}
            contentContainerStyle={styles.floorsListContent}
          />
        )}
      </ThemedView>
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
  floorsContainer: {
    flex: 1,
  },
  floorsTitle: {
    marginBottom: 12,
  },
  floorsList: {
    flex: 1,
  },
  floorsListContent: {
    paddingBottom: 24,
  },
  floorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  floorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  floorTextContainer: {
    flex: 1,
  },
  itemIcon: {
    marginRight: 0,
  },
  noFloorsText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#888',
  },
});
