import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, AccessibilityInfo, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import availableData from '@/utils/availableBuildings';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Define the type for building data
type BuildingData = {
  floors: string[];
  mappedFloors: string[];
};

// Create a type-safe version of availableData
const getBuildingData = (buildingName: string): BuildingData | undefined => {
  // We need to check if the building exists in our data
  if (buildingName in availableData) {
    return availableData[buildingName as keyof typeof availableData];
  }
  return undefined;
};

// Get floors for a building from the availableBuildings data
const getFloorsForBuilding = (buildingName: string) => {
  // Check if the building exists in our data
  const buildingData = getBuildingData(buildingName);
  
  if (buildingData) {
    const mappedFloors = new Set(buildingData.mappedFloors);
    
    // Convert floors to the format needed and mark if they're mapped
    return buildingData.floors.map((floor: string, index: number) => ({
      id: index.toString(),
      name: floor,
      isMapped: mappedFloors.has(floor)
    }));
  }
  
  // Return empty array if building not found
  return [];
};

export default function FloorsScreen() {
  const { building } = useLocalSearchParams();
  const [floors, setFloors] = useState<{ id: string; name: string; isMapped: boolean }[]>([]);
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

  const handleFloorSelect = (floor: { id: string; name: string; isMapped: boolean }) => {
    // Only proceed if the floor is mapped
    if (!floor.isMapped) {
      // Provide haptic feedback to indicate not allowed
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Inform user this floor isn't mapped yet
      if (isScreenReaderEnabled && isSpeechAvailable) {
        Speech.speak(`${floor.name} is not yet mapped for navigation in ${building}.`, {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });
      }
      return;
    }
    
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
                style={[styles.floorItem, !item.isMapped && styles.floorItemDisabled]}
                onPress={() => handleFloorSelect(item)}
                accessibilityLabel={`${item.name}${!item.isMapped ? ', not mapped yet' : ''}`}
                accessibilityHint={item.isMapped 
                  ? `Double tap to navigate to ${item.name} in ${building}` 
                  : `This floor is not yet mapped for navigation`
                }
                accessibilityRole="button"
                disabled={!item.isMapped}
                onAccessibilityTap={() => speakText(`${item.name}${!item.isMapped ? ', not mapped yet' : ''}`)}
              >
                <View style={[styles.floorIconContainer, !item.isMapped && styles.floorIconDisabled]}>
                  <Ionicons 
                    name={item.isMapped ? "layers-outline" : "alert-circle-outline"} 
                    size={24} 
                    color={item.isMapped ? "#555" : "#999"} 
                    style={styles.itemIcon} 
                  />
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
  floorItemDisabled: {
    backgroundColor: '#f9f9f9',
    opacity: 0.7,
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
  floorIconDisabled: {
    backgroundColor: '#e5e5e5',
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
