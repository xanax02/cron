import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import availableData from '@/utils/availableBuildings';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const RECENTLY_USED_KEY = 'recently_used_buildings';
const MAX_RECENT_BUILDINGS = 5;

export default function BuildingsScreen() {
  const [buildingName, setBuildingName] = useState('');
  const [recentBuildings, setRecentBuildings] = useState<string[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<string[]>([]);
  const [availableBuildings] = useState<string[]>(Object.keys(availableData));
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
        Speech.speak('Building selection screen. Enter building name or select from recent buildings.', {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });
      }
    };
    
    checkAccessibility();
    loadRecentBuildings();
    
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
  }, []);

  // Load recently used buildings from storage
  const loadRecentBuildings = async () => {
    try {
      const savedBuildings = await AsyncStorage.getItem(RECENTLY_USED_KEY);
      if (savedBuildings) {
        setRecentBuildings(JSON.parse(savedBuildings));
      }
    } catch (error) {
      console.error('Failed to load recent buildings:', error);
    }
  };

  // Save a building to recently used
  const saveToRecentBuildings = async (building: string) => {
    try {
      // Don't add empty building names
      if (!building.trim()) return;
      
      const updatedBuildings = [
        building,
        ...recentBuildings.filter(item => item !== building)
      ].slice(0, MAX_RECENT_BUILDINGS);
      
      setRecentBuildings(updatedBuildings);
      await AsyncStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(updatedBuildings));
    } catch (error) {
      console.error('Failed to save recent building:', error);
    }
  };

  const handleBuildingSelect = async (building: string) => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Speak the selection for screen reader users
    if (isScreenReaderEnabled && isSpeechAvailable) {
      Speech.speak(`Selected building ${building}. Floor selection.`, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    }
    
    // Save to recent buildings
    await saveToRecentBuildings(building);
    
    // Navigate to the floors screen with the building name
    router.push({
      pathname: '/floors',
      params: { building }
    });
  };

  // Filter buildings based on input
  const filterBuildings = (text: string) => {
    setBuildingName(text);
    
    if (text.trim() === '') {
      setFilteredBuildings([]);
      return;
    }
    
    const filtered = availableBuildings.filter(building => 
      building.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredBuildings(filtered);
  };
  
  const handleSubmit = () => {
    if (buildingName.trim()) {
      // Check if the input matches any available building
      const matchedBuilding = availableBuildings.find(
        building => building.toLowerCase() === buildingName.toLowerCase()
      );
      
      if (matchedBuilding) {
        handleBuildingSelect(matchedBuilding);
      } else if (filteredBuildings.length > 0) {
        // If there's a partial match, select the first result
        handleBuildingSelect(filteredBuildings[0]);
      } else if (isScreenReaderEnabled && isSpeechAvailable) {
        Speech.speak('No matching building found. Please try again.', {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });
      }
    } else if (isScreenReaderEnabled && isSpeechAvailable) {
      Speech.speak('Please enter a building name', {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    }
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
        <ThemedText type="title" accessibilityRole="header">Select Building</ThemedText>
      </ThemedView>

      <ThemedView style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter building name"
          value={buildingName}
          onChangeText={filterBuildings}
          accessibilityLabel="Enter building name"
          accessibilityHint="Type the name of the building you want to navigate"
          onFocus={() => speakText('Enter building name')}
        />
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          accessibilityLabel="Submit building name"
          accessibilityHint="Tap to submit the building name and start navigation"
          onAccessibilityTap={() => speakText('Submit button')}
        >
          <Ionicons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>
      </ThemedView>

      {/* Search Results */}
      {filteredBuildings.length > 0 && (
        <ThemedView style={styles.searchResultsContainer}>
          <ThemedText 
            type="subtitle" 
            style={styles.sectionTitle}
            accessibilityRole="header"
          >
            Search Results
          </ThemedText>
          
          <FlatList
            data={filteredBuildings}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.buildingItem}
                onPress={() => handleBuildingSelect(item)}
                accessibilityLabel={`Select ${item}`}
                accessibilityHint={`Tap to navigate to ${item}`}
                accessibilityRole="button"
                onAccessibilityTap={() => speakText(`${item}`)}
              >
                <Ionicons name="business-outline" size={20} color="#555" style={styles.itemIcon} />
                <ThemedText>{item}</ThemedText>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
          />
        </ThemedView>
      )}
      
      {/* Recently Used */}
      <ThemedView style={styles.recentContainer}>
        <ThemedText 
          type="subtitle" 
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Recently Used
        </ThemedText>
        
        {recentBuildings.length === 0 ? (
          <ThemedText 
            style={styles.noRecentText}
            accessibilityLabel="No recent buildings"
          >
            No recently used buildings
          </ThemedText>
        ) : (
          <FlatList
            data={recentBuildings}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.buildingItem}
                onPress={() => handleBuildingSelect(item)}
                accessibilityLabel={`Select ${item}`}
                accessibilityHint={`Tap to navigate to ${item}`}
                accessibilityRole="button"
                onAccessibilityTap={() => speakText(`${item}`)}
              >
                <Ionicons name="location-outline" size={20} color="#555" style={styles.itemIcon} />
                <ThemedText>{item}</ThemedText>
              </TouchableOpacity>
            )}
            style={styles.recentList}
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
    marginTop: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  submitButton: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  searchResultsContainer: {
    marginBottom: 16,
  },
  resultsList: {
    maxHeight: 200,
  },
  recentContainer: {
    flex: 1,
  },
  recentList: {
    flex: 1,
  },
  buildingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemIcon: {
    marginRight: 12,
  },
  noRecentText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#888',
  },
});
