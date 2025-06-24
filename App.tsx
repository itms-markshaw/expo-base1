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
import CleanNavigationScreen from './src/screens/CleanNavigationScreen';
import MoreTabScreen from './src/screens/MoreTabScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import ActivitiesScreen from './src/screens/ActivitiesScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ChatScreen from './src/screens/ChatScreen';
import SyncScreen from './src/screens/SyncScreen';
import CRMLeadsScreen from './src/screens/CRMLeadsScreen';
import SalesOrderScreen from './src/screens/SalesOrderScreen';

import EmployeesScreen from './src/screens/EmployeesScreen';
import MobileScreen from './src/screens/MobileScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import AttachmentsScreen from './src/screens/AttachmentsScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import HelpdeskScreen from './src/screens/HelpdeskScreen';
import HelpdeskTeamsScreen from './src/screens/HelpdeskTeamsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DataScreen from './src/screens/DataScreen';
import TestScreen from './src/screens/TestScreen';
import { useAppStore } from './src/store';
import AppStoreProvider from './src/store/AppStoreProvider';
import AppNavigationProvider from './src/components/AppNavigationProvider';
import LoadingScreen from './src/components/LoadingScreen';
import ScreenWrapper from './src/components/ScreenWrapper';

// Navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Wrapper function to add bottom navigation to screens
const withBottomNav = (Component: React.ComponentType<any>, screenName: string) => {
  return (props: any) => (
    <ScreenWrapper currentScreen={screenName}>
      <Component {...props} />
    </ScreenWrapper>
  );
};

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

      {/* Secondary Screens - With headers, back buttons, and bottom navigation */}
      <Stack.Screen
        name="SalesOrders"
        component={withBottomNav(SalesOrderScreen, 'Sales Orders')}
        options={{ title: 'Sales Orders' }}
      />
      <Stack.Screen
        name="Employees"
        component={withBottomNav(EmployeesScreen, 'Employees')}
        options={{ title: 'Employees' }}
      />
      <Stack.Screen
        name="CRMLeads"
        component={withBottomNav(CRMLeadsScreen, 'CRM Leads')}
        options={{ title: 'CRM Leads' }}
      />
      <Stack.Screen
        name="Messages"
        component={withBottomNav(MessagesScreen, 'Messages')}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="Attachments"
        component={withBottomNav(AttachmentsScreen, 'Attachments')}
        options={{ title: 'Attachments' }}
      />
      <Stack.Screen
        name="Projects"
        component={withBottomNav(ProjectsScreen, 'Projects')}
        options={{ title: 'Projects' }}
      />
      <Stack.Screen
        name="Helpdesk"
        component={withBottomNav(HelpdeskScreen, 'Helpdesk')}
        options={{ title: 'Helpdesk' }}
      />
      <Stack.Screen
        name="HelpdeskTeams"
        component={withBottomNav(HelpdeskTeamsScreen, 'Helpdesk Teams')}
        options={{ title: 'Helpdesk Teams' }}
      />
      <Stack.Screen
        name="Mobile"
        component={withBottomNav(MobileScreen, 'Mobile')}
        options={{ title: 'Mobile' }}
      />
      <Stack.Screen
        name="Settings"
        component={withBottomNav(SettingsScreen, 'Settings')}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="SyncStack"
        component={withBottomNav(SyncScreen, 'Sync')}
        options={{ title: 'Data Sync' }}
      />
      <Stack.Screen
        name="Data"
        component={withBottomNav(DataScreen, 'Data')}
        options={{ title: 'Data Management' }}
      />
      <Stack.Screen
        name="Testing"
        component={withBottomNav(TestScreen, 'Testing')}
        options={{ title: 'Testing & Diagnostics' }}
      />
      <Stack.Screen
        name="Documentation"
        component={withBottomNav(MobileScreen, 'Documentation')}
        options={{ title: 'Documentation' }}
      />
      <Stack.Screen
        name="Activities"
        component={withBottomNav(ActivitiesScreen, 'Activities')}
        options={{ title: 'Activities' }}
      />
      <Stack.Screen
        name="Chat"
        component={withBottomNav(ChatScreen, 'Chat')}
        options={{ title: 'Chat' }}
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

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Sales':
              iconName = 'shopping-cart';
              break;
            case 'Contacts':
              iconName = 'people';
              break;
            case 'Calendar':
              iconName = 'calendar-today';
              break;
            case 'More':
              iconName = 'more-horiz';
              break;
            default:
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
        <Tab.Screen name="Dashboard" component={CleanNavigationScreen} />
        <Tab.Screen name="Sales" component={SalesOrderScreen} />
        <Tab.Screen name="Contacts" component={ContactsScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="More" component={MoreTabScreen} />
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
