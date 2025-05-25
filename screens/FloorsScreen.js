import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  AccessibilityInfo, 
  View, 
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { availableData } from '../utils/availableBuildings';
import ThemedText from '../components/ThemedText';
import ThemedView from '../components/ThemedView';

// Get floors for a building from the availableBuildings data
const getFloorsForBuilding = (buildingName) => {
  // Check if the building exists in our data
  if (buildingName && availableData[buildingName]) {
    const buildingData = availableData[buildingName];
    const mappedFloors = new Set(buildingData.mappedFloors || []);
    
    // Convert floors to the format needed and mark if they're mapped
    return (buildingData.floors || []).map((floor, index) => ({
      id: index.toString(),
      name: floor,
      isMapped: mappedFloors.has(floor)
    }));
  }
  
  // Return empty array if building not found
  return [];
};

const FloorsScreen = ({ route, navigation }) => {
  const { building } = route.params;
  const [floors, setFloors] = useState([]);
  const [isScreenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // Check accessibility settings
    const checkAccessibility = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(screenReaderEnabled);
    };
    
    checkAccessibility();
    
    // Add accessibility change listener
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled
    );

    // Load floors data for the selected building
    const buildingFloors = getFloorsForBuilding(building);
    setFloors(buildingFloors);
    
    return () => {
      // Clean up subscription
      subscription.remove();
    };
  }, [building]);

  const handleFloorSelect = (floor) => {
    // Only proceed if the floor is mapped
    if (!floor.isMapped) {
      // Inform user this floor isn't mapped yet
      Alert.alert(
        "Floor Not Mapped", 
        `The ${floor.name} of ${building} is not mapped yet.`,
        [{ text: "OK" }]
      );
      return;
    }
    
    // Navigate to the Navigation screen with building and floor info
    navigation.navigate('Navigation', { 
      building, 
      floor: floor.name
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back to building selection"
          accessibilityHint="Return to building selection"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText type="title" accessibilityRole="header">
          {building || 'Select Floor'}
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
                  ? `Tap to navigate to ${item.name} in ${building}` 
                  : `This floor is not yet mapped for navigation`
                }
                accessibilityRole="button"
                disabled={!item.isMapped}
              >
                <View style={[styles.floorIconContainer, !item.isMapped && styles.floorIconDisabled]}>
                  <Icon 
                    name={item.isMapped ? "layers-outline" : "alert-circle-outline"} 
                    size={24} 
                    color={item.isMapped ? "#555" : "#999"} 
                    style={styles.itemIcon} 
                  />
                </View>
                <View style={styles.floorTextContainer}>
                  <ThemedText style={item.isMapped ? styles.floorText : styles.unmappedText}>
                    {item.name}
                    {!item.isMapped && " (Not mapped yet)"}
                  </ThemedText>
                </View>
                <Icon name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            )}
            style={styles.floorsList}
            contentContainerStyle={styles.floorsListContent}
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
  floorText: {
    fontWeight: '600',
  },
  unmappedText: {
    color: '#888',
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

export default FloorsScreen;
