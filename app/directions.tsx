import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Dimensions, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
// @ts-ignore - We've added the package but TypeScript may need time to recognize it

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Import navigation utilities
import { findShortestPath } from '@/utils/navigationUtils';

// Simplified direction mapping for the blind user
const DIRECTIONS = {
  STRAIGHT: 'straight',
  RIGHT: 'right',
  LEFT: 'left',
  BACK: 'back'
};

// Improved function to determine relative direction for navigation
const getRelativeDirection = (from: {x: number, y: number}, to: {x: number, y: number}, previous?: {x: number, y: number}) => {
  // If no previous point, assume initial facing direction is toward Hall (positive Y)
  if (!previous) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    // Determine direction relative to initial forward direction (toward Hall)
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'straight' : 'back';
    }
  }
  
  // Calculate previous direction vector
  const prevDx = from.x - previous.x;
  const prevDy = from.y - previous.y;
  
  // Calculate current direction vector
  const currDx = to.x - from.x;
  const currDy = to.y - from.y;
  
  // Calculate cross product to determine turn direction
  const crossProduct = prevDx * currDy - prevDy * currDx;
  
  // Calculate dot product to determine if it's forward/backward
  const dotProduct = prevDx * currDx + prevDy * currDy;
  
  // Determine relative direction
  if (Math.abs(crossProduct) < 0.1) {
    // Going straight or backward
    if (dotProduct > 0) {
      return 'straight';
    } else {
      return 'around (180°)';
    }
  } else if (crossProduct > 0) {
    return 'left';
  } else {
    return 'right';
  }
};

const getPathDescription = (path: string[], nodes) => {
  if (!path || path.length < 2) return ['No valid path found'];
  
  const directions = [];
  
  // First movement - no previous direction to reference
  if (path.length >= 2) {
    const first = path[0];
    const second = path[1];
    
    const distance = Math.sqrt(
      Math.pow(nodes[second].x - nodes[first].x, 2) + 
      Math.pow(nodes[second].y - nodes[first].y, 2)
    ).toFixed(1);
    
    const initialDirection = getRelativeDirection(nodes[first], nodes[second]);
    directions.push(`From ${first}, go ${initialDirection} for approximately ${distance} meters to reach ${second}`);
  }
  
  // For subsequent points, we can determine relative direction
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i-1];
    const current = path[i];
    const next = path[i + 1];
    
    const distance = Math.sqrt(
      Math.pow(nodes[next].x - nodes[current].x, 2) + 
      Math.pow(nodes[next].y - nodes[current].y, 2)
    ).toFixed(1);
    
    const direction = getRelativeDirection(nodes[current], nodes[next], nodes[prev]);
    directions.push(`At ${current}, turn ${direction} and go approximately ${distance} meters to reach ${next}`);
  }
  
  return directions;
};

export default function DirectionsScreen() {
  const { building, floor, floorName, source, destination } = useLocalSearchParams();
  const [path, setPath] = useState<string[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpeechAvailable, setSpeechAvailable] = useState(false);
  const [isScreenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const router = useRouter();

  const windowWidth = Dimensions.get('window').width - 32; // Padding on both sides
  const windowHeight = 300; // Fixed height for map view

  // Check accessibility settings and calculate path
  useEffect(() => {
    const checkAccessibility = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setScreenReaderEnabled(screenReaderEnabled);
      
      // Assuming speech is available as Expo handles this
      setSpeechAvailable(true);
    };
    
    checkAccessibility();
    
    // Calculate the path if source and destination are set
    if (source && destination) {
      try {
        const calculatedPath = findShortestPath(source as string, destination as string);
        setPath(calculatedPath);
        console.log(calculatedPath);
        
        // Get textual directions from the path
        // @ts-ignore - We know the imported function has this property
        const textDirections = getPathDescription(calculatedPath, findShortestPath.nodes);
        setDirections(textDirections);
        
        // Speak the first direction for screen reader users
        if (isScreenReaderEnabled && isSpeechAvailable && textDirections.length > 0) {
          Speech.speak(`Navigation from ${source} to ${destination}. ${textDirections[0]}`, {
            language: 'en',
            pitch: 1.0,
            rate: 0.9,
          });
        }
      } catch (error) {
        console.error('Error calculating path:', error);
        setDirections(['Unable to calculate a path. Please try again.']);
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
  }, [source, destination, isScreenReaderEnabled, isSpeechAvailable]);

  // Function to speak the current direction
  const speakCurrentDirection = () => {
    if (isScreenReaderEnabled && isSpeechAvailable && directions.length > currentStepIndex) {
      Speech.speak(directions[currentStepIndex], {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    }
  };

  // Handle next step
  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (currentStepIndex < directions.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Speak the next direction
      if (isScreenReaderEnabled && isSpeechAvailable) {
        Speech.speak(directions[nextIndex], {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });
      }
      
      // Scroll to the next direction
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ 
          y: nextIndex * 100, // Approximate height of each direction item
          animated: true 
        });
      }
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      
      // Speak the previous direction
      if (isScreenReaderEnabled && isSpeechAvailable) {
        Speech.speak(directions[prevIndex], {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });
      }
      
      // Scroll to the previous direction
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ 
          y: prevIndex * 100, // Approximate height of each direction item
          animated: true 
        });
      }
    }
  };

  // Calculate map scaling and translation
  const calculateMapTransform = () => {
    if (!path || path.length === 0) return { scale: 1, translateX: 0, translateY: 0 };
    
    // @ts-ignore - We know the imported function has this property
    const nodes = findShortestPath.nodes;
    
    // Find min and max coordinates to determine bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    path.forEach(nodeId => {
      const node = nodes[nodeId];
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    });
    
    // Add some padding
    const padding = 2;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Calculate scale to fit the map in the available space
    const scaleX = windowWidth / (maxX - minX);
    const scaleY = windowHeight / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate translation to center the map
    const translateX = (windowWidth - (maxX - minX) * scale) / 2 - minX * scale;
    const translateY = (windowHeight - (maxY - minY) * scale) / 2 - minY * scale;
    
    return { scale, translateX, translateY };
  };

  const { scale, translateX, translateY } = calculateMapTransform();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          accessibilityLabel="Go back to navigation setup"
          accessibilityHint="Double tap to return to navigation setup"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedView style={styles.titleTextContainer}>
          <ThemedText type="title" accessibilityRole="header">
            {`${source} → ${destination}`}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.locationName}>
            {`${building}, ${floorName}`}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Map View */}
      {/* <ThemedView style={styles.mapContainer}>
        <Svg height={windowHeight} width={windowWidth}>
          {path.length > 1 && path.map((nodeId, index) => {
            if (index < path.length - 1) {
              // @ts-ignore - We know the imported function has this property
              const currentNode = findShortestPath.nodes[nodeId];
              // @ts-ignore - We know the imported function has this property
              const nextNode = findShortestPath.nodes[path[index + 1]];
              
              return (
                <Line
                  key={`line-${index}`}
                  x1={currentNode.x * scale + translateX}
                  y1={currentNode.y * scale + translateY}
                  x2={nextNode.x * scale + translateX}
                  y2={nextNode.y * scale + translateY}
                  stroke={index <= currentStepIndex ? "#007AFF" : "#CCCCCC"}
                  strokeWidth="3"
                />
              );
            }
            return null;
          })}
          
          {path.map((nodeId, index) => {
            // @ts-ignore - We know the imported function has this property
            const node = findShortestPath.nodes[nodeId];
            let color = "#555555";
            
            if (index === 0) color = "#00C853"; // Start (green)
            else if (index === path.length - 1) color = "#D50000"; // End (red)
            else if (index === currentStepIndex) color = "#007AFF"; // Current step (blue)
            
            return (
              <React.Fragment key={`node-${index}`}>
                <Circle
                  cx={node.x * scale + translateX}
                  cy={node.y * scale + translateY}
                  r={index === 0 || index === path.length - 1 || index === currentStepIndex ? 8 : 5}
                  fill={color}
                />
                <SvgText
                  x={node.x * scale + translateX}
                  y={node.y * scale + translateY - 15}
                  fontSize="12"
                  fill="#333333"
                  textAnchor="middle"
                >
                  {nodeId}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ThemedView> */}

      {/* Step navigation controls */}
      <ThemedView style={styles.stepControls}>
        <TouchableOpacity
          style={[styles.stepButton, currentStepIndex === 0 && styles.stepButtonDisabled]}
          onPress={handlePrevStep}
          disabled={currentStepIndex === 0}
          accessibilityLabel="Previous step"
          accessibilityHint="Double tap to go to the previous navigation step"
        >
          <Ionicons name="arrow-back" size={24} color={currentStepIndex === 0 ? "#CCCCCC" : "#007AFF"} />
        </TouchableOpacity>
        
        <ThemedText style={styles.stepCounter}>
          {`Step ${currentStepIndex + 1} of ${directions.length}`}
        </ThemedText>
        
        <TouchableOpacity
          style={[styles.stepButton, currentStepIndex === directions.length - 1 && styles.stepButtonDisabled]}
          onPress={handleNextStep}
          disabled={currentStepIndex === directions.length - 1}
          accessibilityLabel="Next step"
          accessibilityHint="Double tap to go to the next navigation step"
        >
          <Ionicons name="arrow-forward" size={24} color={currentStepIndex === directions.length - 1 ? "#CCCCCC" : "#007AFF"} />
        </TouchableOpacity>
      </ThemedView>

      {/* Directions list */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.directionsContainer}
        contentContainerStyle={styles.directionsContent}
      >
        {directions.map((direction, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.directionItem,
              index === currentStepIndex && styles.directionItemActive
            ]}
            onPress={() => {
              setCurrentStepIndex(index);
              speakCurrentDirection();
            }}
            accessibilityLabel={`Step ${index + 1}: ${direction}`}
            accessibilityRole="button"
          >
            <ThemedView style={styles.directionNumberContainer}>
              <ThemedText style={styles.directionNumber}>{index + 1}</ThemedText>
            </ThemedView>
            <ThemedText style={styles.directionText}>{direction}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Replay current instruction button for accessibility */}
      <TouchableOpacity
        style={styles.replayButton}
        onPress={speakCurrentDirection}
        accessibilityLabel="Repeat current instruction"
        accessibilityHint="Double tap to hear the current navigation instruction again"
        accessibilityRole="button"
      >
        <Ionicons name="volume-high" size={20} color="white" style={styles.buttonIcon} />
        <ThemedText style={styles.buttonText}>Repeat Instruction</ThemedText>
      </TouchableOpacity>
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
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  titleTextContainer: {
    flex: 1,
  },
  locationName: {
    marginTop: 4,
    opacity: 0.7,
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.5,
  },
  stepCounter: {
    fontSize: 14,
  },
  directionsContainer: {
    flex: 1,
    marginBottom: 8,
  },
  directionsContent: {
    paddingBottom: 16,
  },
  directionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  directionItemActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  directionNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  directionNumber: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  directionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  replayButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
