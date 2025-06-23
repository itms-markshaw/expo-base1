/**
 * Main App Component - Actually Works!
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
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
import NavigationDashboardScreen from './src/screens/NavigationDashboardScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import ActivitiesScreen from './src/screens/ActivitiesScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SyncScreen from './src/screens/SyncScreen';
import CRMLeadsScreen from './src/screens/CRMLeadsScreen';
import SalesOrderScreen from './src/screens/SalesOrderScreen';
import MoreScreen from './src/screens/MoreScreen';
import EmployeesScreen from './src/screens/EmployeesScreen';
import MobileScreen from './src/screens/MobileScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import AttachmentsScreen from './src/screens/AttachmentsScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import HelpdeskScreen from './src/screens/HelpdeskScreen';
import HelpdeskTeamsScreen from './src/screens/HelpdeskTeamsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { useAppStore } from './src/store';
import AppStoreProvider from './src/store/AppStoreProvider';
import AppNavigationProvider from './src/components/AppNavigationProvider';
import LoadingScreen from './src/components/LoadingScreen';

// Navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator for all screens
function AllScreensStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFF',
          elevation: 1,
          shadowOpacity: 0.1,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1A1A1A',
        },
        headerTintColor: '#007AFF',
        headerBackTitleVisible: false,
      }}
    >
      {/* Primary Tab Screens - No header */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Secondary Screens - With headers and back buttons */}
      <Stack.Screen
        name="SalesOrders"
        component={SalesOrderScreen}
        options={{ title: 'Sales Orders' }}
      />
      <Stack.Screen
        name="Employees"
        component={EmployeesScreen}
        options={{ title: 'Employees' }}
      />
      <Stack.Screen
        name="CRMLeads"
        component={CRMLeadsScreen}
        options={{ title: 'CRM Leads' }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="Attachments"
        component={AttachmentsScreen}
        options={{ title: 'Attachments' }}
      />
      <Stack.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <Stack.Screen
        name="Helpdesk"
        component={HelpdeskScreen}
        options={{ title: 'Helpdesk' }}
      />
      <Stack.Screen
        name="HelpdeskTeams"
        component={HelpdeskTeamsScreen}
        options={{ title: 'Helpdesk Teams' }}
      />
      <Stack.Screen
        name="Mobile"
        component={MobileScreen}
        options={{ title: 'Mobile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
function MainTabs() {

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'CRM') {
            iconName = 'trending-up';
          } else if (route.name === 'Sales') {
            iconName = 'shopping-cart';
          } else if (route.name === 'Activities') {
            iconName = 'event-note';
          } else if (route.name === 'More') {
            iconName = 'more-horiz';
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
        <Tab.Screen name="Dashboard" component={NavigationDashboardScreen} />
        <Tab.Screen name="CRM" component={CRMLeadsScreen} />
        <Tab.Screen name="Sales" component={SalesOrderScreen} />
        <Tab.Screen name="Activities" component={ActivitiesScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
  );
}

// App Content Component (inside provider)
function AppContent() {
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
      <AppNavigationProvider>
        {isAuthenticated ? <AllScreensStack /> : <LoginScreen />}
      </AppNavigationProvider>
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}
