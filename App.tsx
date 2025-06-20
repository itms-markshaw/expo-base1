/**
 * Main App Component - Actually Works!
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';

// Import screens and store
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SyncScreen from './src/screens/SyncScreen';
import DataScreen from './src/screens/DataScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { useAppStore } from './src/store';

// Tab Navigator
const Tab = createBottomTabNavigator();

// Loading Screen Component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Initializing...</Text>
    </View>
  );
}

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Sync') {
            iconName = 'sync';
          } else if (route.name === 'Data') {
            iconName = 'table-view';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else {
            iconName = 'help';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Sync" component={SyncScreen} />
      <Tab.Screen name="Data" component={DataScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  const { isAuthenticated, authLoading, checkAuth } = useAppStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor="#F8F9FA" />
      {isAuthenticated ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
