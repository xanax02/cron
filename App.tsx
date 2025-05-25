/**
 * Yellow Tape Navigation App
 * Tracks yellow tape using camera and provides indoor navigation
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, StatusBar, useColorScheme, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import navigation utilities
import { setCurrentBuilding } from './utils/navigationUtils';

// Import existing screens
import BuildingsScreen from './screens/BuildingsScreen';
import FloorsScreen from './screens/FloorsScreen';
import NavigationScreen from './screens/NavigationScreen';
import YellowTapeTracker from './screens/YellowTapeTracker';

// Define types for the navigation stack
export type RootStackParamList = {
  Buildings: undefined;
  Floors: { building: string };
  Navigation: { building: string; floor: string };
  YellowTapeTracker: { building: string; floor: string; directions: string[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Set up app on initial load
  useEffect(() => {
    const initializeApp = async () => {
      // Set default building
      setCurrentBuilding('MainBuilding');
      
      // Any other initialization tasks here
      
      setIsAppReady(true);
    };
    
    initializeApp();
  }, []);
  
  if (!isAppReady) {
    // Simple loading screen
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
        <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#000' : '#fff'}
      />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Buildings"
          screenOptions={{
            headerStyle: {
              backgroundColor: isDarkMode ? '#121212' : '#f8f8f8',
            },
            headerTintColor: isDarkMode ? '#fff' : '#000',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen 
            name="Buildings" 
            component={BuildingsScreen} 
            options={{ title: 'Select Building' }} 
          />
          <Stack.Screen 
            name="Floors" 
            component={FloorsScreen}
            options={({ route }) => ({ 
              title: route.params?.building || 'Select Floor' 
            })} 
          />
          <Stack.Screen 
            name="Navigation" 
            component={NavigationScreen}
            options={({ route }) => ({ 
              title: `${route.params?.building} - ${route.params?.floor}` 
            })} 
          />
          <Stack.Screen 
            name="YellowTapeTracker" 
            component={YellowTapeTracker}
            options={{ 
              title: 'Yellow Tape Tracker',
              headerShown: false // Hide header for full camera experience
            }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
