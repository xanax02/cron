import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ScrollView,
  Alert,
  AccessibilityInfo
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { availableData } from '../utils/availableBuildings';
import { findShortestPath, getDirections, setCurrentBuilding } from '../utils/navigationUtils';
import ThemedText from '../components/ThemedText';
import ThemedView from '../components/ThemedView';

const NavigationScreen = ({ route, navigation }) => {
  const { building, floor } = route.params;
  const [navigatorPoints, setNavigatorPoints] = useState([]);
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [directions, setDirections] = useState([]);
  const [isSelectingStart, setIsSelectingStart] = useState(true); // true = selecting start, false = selecting end
  const [isDirectionsVisible, setIsDirectionsVisible] = useState(false);
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

    // Load navigation data for the selected building and floor
    if (building && availableData[building]) {
      // Set the current building for the navigation utils
      setCurrentBuilding(building);
      
      // Get navigator points from the building data
      const points = availableData[building].navigator || [];
      setNavigatorPoints(points);
    }
    
    return () => {
      // Clean up subscription
      subscription.remove();
    };
  }, [building, floor]);

  const handlePointSelect = (point) => {
    if (isSelectingStart) {
      setStartPoint(point);
      setIsSelectingStart(false);
    } else {
      setEndPoint(point);
      
      // Calculate directions after both points are selected
      if (startPoint) {
        try {
          const directionsList = getDirections(startPoint, point);
          setDirections(directionsList);
          setIsDirectionsVisible(true);
        } catch (error) {
          Alert.alert(
            "Navigation Error",
            "Could not find a path between these points. Please try different locations.",
            [{ text: "OK" }]
          );
        }
      }
    }
  };

  const resetNavigation = () => {
    setStartPoint('');
    setEndPoint('');
    setDirections([]);
    setIsSelectingStart(true);
    setIsDirectionsVisible(false);
  };

  const navigateToYellowTapeTracker = () => {
    // Navigate to YellowTapeTracker with the building, source and destination
    navigation.navigate('YellowTapeTracker', { 
      building: building,
      destination: endPoint,
      source: startPoint,
      directions: directions
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back to floor selection"
          accessibilityHint="Return to floor selection"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText type="title">
          {building} - {floor}
        </ThemedText>
      </ThemedView>

      
          <ThemedView style={styles.selectionContainer}>
            <ThemedText type="subtitle" style={styles.selectionTitle}>
              {isSelectingStart ? "Select Start Point" : "Select Destination"}
            </ThemedText>
            
            <ThemedView style={styles.pointsSelection}>
              <TouchableOpacity 
                style={[styles.selectedPoint, !startPoint && styles.emptyPoint]}
                onPress={() => setIsSelectingStart(true)}
                disabled={!startPoint}
              >
                <Icon name="navigate-outline" size={20} color={startPoint ? "#007AFF" : "#999"} />
                <ThemedText style={styles.selectedPointText}>
                  {startPoint || "Start Point"}
                </ThemedText>
              </TouchableOpacity>
              
              <Icon name="arrow-forward" size={20} color="#999" style={styles.arrowIcon} />
              
              <TouchableOpacity 
                style={[styles.selectedPoint, !endPoint && styles.emptyPoint]}
                onPress={() => !startPoint ? null : setIsSelectingStart(false)}
                disabled={!endPoint}
              >
                <Icon name="location-outline" size={20} color={endPoint ? "#007AFF" : "#999"} />
                <ThemedText style={styles.selectedPointText}>
                  {endPoint || "End Point"}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
            <TouchableOpacity 
            style={styles.startNavigationButton}
            onPress={navigateToYellowTapeTracker}
            accessibilityLabel="Start navigation with Yellow Tape"
          >
            <Icon name="navigate" size={20} color="#FFFFFF" style={styles.startNavigationIcon} />
            <ThemedText style={styles.startNavigationText}>Start Navigation</ThemedText>
          </TouchableOpacity>
          </ThemedView>

          <FlatList
            data={navigatorPoints}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.locationItem}
                onPress={() => handlePointSelect(item)}
                accessibilityLabel={`Select ${item} as ${isSelectingStart ? 'start point' : 'destination'}`}
                accessibilityHint={`Tap to select ${item}`}
                accessibilityRole="button"
              >
                <Icon 
                  name={isSelectingStart ? "navigate-outline" : "location-outline"} 
                  size={24} 
                  color="#555"
                  style={styles.locationIcon} 
                />
                <ThemedText style={styles.locationText}>{item}</ThemedText>
              </TouchableOpacity>
            )}
            style={styles.locationsList}
            contentContainerStyle={styles.locationsListContent}
          />
       
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  selectionContainer: {
    marginBottom: 16,
  },
  selectionTitle: {
    marginBottom: 12,
  },
  pointsSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedPoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  emptyPoint: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  selectedPointText: {
    marginLeft: 8,
    flex: 1,
  },
  arrowIcon: {
    marginHorizontal: 10,
  },
  locationsList: {
    flex: 1,
  },
  locationsListContent: {
    paddingBottom: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationText: {
    fontSize: 16,
  },
  directionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  directionsPoints: {
    flex: 1,
  },
  directionsPointText: {
    marginBottom: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  resetButtonText: {
    color: '#007AFF',
    marginLeft: 4,
  },
  directionsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  directionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  directionNumber: {
    backgroundColor: '#007AFF',
    color: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontWeight: 'bold',
  },
  directionText: {
    flex: 1,
    fontSize: 16,
  },
  directionSummary: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  directionSummaryText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  directionNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  startNavigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  startNavigationIcon: {
    marginRight: 8,
  },
  startNavigationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NavigationScreen;
