import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  AccessibilityInfo,
  View,
  Text
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { availableData } from '../utils/availableBuildings';
import ThemedText from '../components/ThemedText';
import ThemedView from '../components/ThemedView';

// Using in-memory storage instead of AsyncStorage
const MAX_RECENT_BUILDINGS = 5;
// This will be reset when the app restarts
let inMemoryRecentBuildings = [];

const BuildingsScreen = ({ navigation }) => {
  const [buildingName, setBuildingName] = useState('');
  const [recentBuildings, setRecentBuildings] = useState([]);
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [availableBuildings] = useState(Object.keys(availableData));
  const [isScreenReaderEnabled, setScreenReaderEnabled] = useState(false);

  // Check accessibility settings
  useEffect(() => {
    const checkAccessibility = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(screenReaderEnabled);
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
    };
  }, []);

  // Load recently used buildings from memory
  const loadRecentBuildings = () => {
    setRecentBuildings(inMemoryRecentBuildings);
  };

  // Save a building to recently used (in memory)
  const saveToRecentBuildings = (building) => {
    // Don't add empty building names
    if (!building.trim()) return;
    
    const updatedBuildings = [
      building,
      ...recentBuildings.filter(item => item !== building)
    ].slice(0, MAX_RECENT_BUILDINGS);
    
    // Update both state and in-memory storage
    setRecentBuildings(updatedBuildings);
    inMemoryRecentBuildings = updatedBuildings;
  };

  const handleBuildingSelect = (building) => {
    // Save to recent buildings
    saveToRecentBuildings(building);
    
    // Navigate to the floors screen with the building name
    navigation.navigate('Floors', { building });
  };

  // Filter buildings based on input
  const filterBuildings = (text) => {
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
      }
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
        />
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          accessibilityLabel="Submit building name"
          accessibilityHint="Tap to submit the building name and start navigation"
        >
          <Icon name="arrow-forward" size={24} color="white" />
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
              >
                <Icon name="business-outline" size={20} color="#555" style={styles.itemIcon} />
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
              >
                <Icon name="location-outline" size={20} color="#555" style={styles.itemIcon} />
                <ThemedText>{item}</ThemedText>
              </TouchableOpacity>
            )}
            style={styles.recentList}
          />
        )}
      </ThemedView>
    </ThemedView>
  );
};

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

export default BuildingsScreen;
