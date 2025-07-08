/**
 * Main App Component - Actually Works!
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';

// Suppress timeout error console displays
if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Suppress XML-RPC timeout errors from showing in red error overlay
    const message = args.join(' ');
    if (message.includes('Network request timed out') ||
        message.includes('XML-RPC call failed') ||
        message.includes('TimeoutError')) {
      // Still log to console but don't trigger error overlay
      console.warn('🔇 Suppressed timeout error:', ...args);
      return;
    }
    originalConsoleError(...args);
  };
}

// Import screens and store
import LoginScreen from './src/models/app_auth/screens/990_LoginScreen';
import MainDashboard from './src/models/app_dashboard/screens/001_MainDashboard';
import MoreTabScreen from './src/models/app_navigation/screens/991_MoreTab';
// Import new numbered screens
import ContactsList from './src/models/res_partner/screens/101_ContactsList';
import SalesOrdersList from './src/models/sale_order/screens/201_SalesOrdersList';
import SettingsMain from './src/models/app_settings/screens/901_SettingsMain';
import AccountSettings from './src/models/app_settings/screens/902_AccountSettings';
import ServerSettings from './src/models/app_settings/screens/903_ServerSettings';
import NotificationSettings from './src/models/app_settings/screens/904_NotificationSettings';
import PrivacySettings from './src/models/app_settings/screens/905_PrivacySettings';
import AppearanceSettings from './src/models/app_settings/screens/906_AppearanceSettings';
import SyncPreferences from './src/models/app_settings/screens/907_SyncPreferences';
import TestingDashboard from './src/models/app_testing/screens/951_TestingDashboard';
import SyncDashboard from './src/models/sync_management/screens/981_SyncDashboard';

// Import migrated screens
import ActivitiesList from './src/models/mail_activity/screens/501_ActivitiesList';
import CalendarView from './src/models/calendar_event/screens/701_CalendarView';
import ChatList from './src/models/discuss_channel/screens/151_ChatList';
import CallScreen from './src/models/discuss_channel/screens/152_CallScreen';
import VideoCallScreen from './src/models/discuss_channel/screens/152_VideoCallScreen';
import ModelSelectionScreen from './src/models/sync_management/screens/982_ModelSelection';
import CustomModelSelectionScreen from './src/models/sync_management/screens/983_CustomModelSelection';
import TemplateModelSelectionScreen from './src/models/sync_management/screens/984_TemplateModelSelection';
import SyncSettingsScreen from './src/models/sync_management/screens/985_SyncSettings';
import SyncProgressScreen from './src/models/sync_management/screens/986_SyncProgress';
import ConflictResolutionScreen from './src/models/sync_management/screens/987_ConflictResolution';
import OfflineQueueScreen from './src/models/sync_management/screens/988_OfflineQueue';
import DatabaseManagerScreen from './src/models/sync_management/screens/989_DatabaseManager';
import CRMLeadsList from './src/models/crm_lead/screens/301_CRMLeadsList';
import EmployeesList from './src/models/hr_employee/screens/451_EmployeesList';
import UsersList from './src/models/res_users/screens/401_UsersList';
import FieldServiceDashboard from './src/models/app_field_service/screens/801_FieldServiceDashboard';
import MessagesList from './src/models/mail_message/screens/521_MessagesList';
import AttachmentsList from './src/models/ir_attachment/screens/551_AttachmentsList';
import ProjectsList from './src/models/project_project/screens/751_ProjectsList';
import HelpdeskTicketsList from './src/models/helpdesk_ticket/screens/601_HelpdeskTicketsList';
import HelpdeskTeamsList from './src/models/helpdesk_team/screens/651_HelpdeskTeamsList';
import HelpdeskTicketDetail from './src/models/helpdesk_ticket/screens/602_HelpdeskTicketDetail';
import DataManager from './src/models/app_data/screens/952_DataManager';
import { useAppStore } from './src/store';
import { autoSyncService } from './src/models/sync_management/services';
import AppStoreProvider from './src/store/AppStoreProvider';
import AppNavigationProvider from './src/components/AppNavigationProvider';
import { notificationService } from './src/models/base/services/BC-S009_NotificationService';
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
        component={withBottomNav(SalesOrdersList, 'Sales Orders')}
        options={{ title: 'Sales Orders' }}
      />
      <Stack.Screen
        name="Employees"
        component={withBottomNav(EmployeesList, 'Employees')}
        options={{ title: 'Employees' }}
      />
      <Stack.Screen
        name="Users"
        component={withBottomNav(UsersList, 'Users')}
        options={{ title: 'Users' }}
      />
      <Stack.Screen
        name="CRMLeads"
        component={withBottomNav(CRMLeadsList, 'CRM Leads')}
        options={{ title: 'CRM Leads' }}
      />
      <Stack.Screen
        name="Messages"
        component={withBottomNav(MessagesList, 'Messages')}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="Attachments"
        component={withBottomNav(AttachmentsList, 'Attachments')}
        options={{ title: 'Attachments' }}
      />
      <Stack.Screen
        name="Projects"
        component={withBottomNav(ProjectsList, 'Projects')}
        options={{ title: 'Projects' }}
      />
      <Stack.Screen
        name="Helpdesk"
        component={withBottomNav(HelpdeskTicketsList, 'Helpdesk')}
        options={{ title: 'Helpdesk' }}
      />
      <Stack.Screen
        name="HelpdeskTeams"
        component={withBottomNav(HelpdeskTeamsList, 'Helpdesk Teams')}
        options={{ title: 'Helpdesk Teams' }}
      />
      <Stack.Screen
        name="HelpdeskTicketDetail"
        component={HelpdeskTicketDetail}
        options={{
          title: 'Ticket Details',
          headerShown: false // We handle our own header in the component
        }}
      />
      <Stack.Screen
        name="Mobile"
        component={withBottomNav(FieldServiceDashboard, 'Field Service')}
        options={{ title: 'Field Service' }}
      />
      <Stack.Screen
        name="Settings"
        component={withBottomNav(SettingsMain, 'Settings')}
        options={{ title: 'Settings' }}
      />

      {/* Settings Sub-screens */}
      <Stack.Screen
        name="AccountSettings"
        component={withBottomNav(AccountSettings, 'Settings')}
        options={{ title: 'Account Settings' }}
      />
      <Stack.Screen
        name="ServerSettings"
        component={withBottomNav(ServerSettings, 'Settings')}
        options={{ title: 'Server Settings' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={withBottomNav(NotificationSettings, 'Settings')}
        options={{ title: 'Notification Settings' }}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={withBottomNav(PrivacySettings, 'Settings')}
        options={{ title: 'Privacy Settings' }}
      />
      <Stack.Screen
        name="AppearanceSettings"
        component={withBottomNav(AppearanceSettings, 'Settings')}
        options={{ title: 'Appearance Settings' }}
      />
      <Stack.Screen
        name="SyncPreferences"
        component={withBottomNav(SyncPreferences, 'Settings')}
        options={{ title: 'Sync Preferences' }}
      />
      <Stack.Screen
        name="SyncStack"
        component={withBottomNav(SyncDashboard, 'Sync')}
        options={{ title: 'Sync Dashboard' }}
      />
      <Stack.Screen
        name="Testing"
        component={withBottomNav(TestingDashboard, 'Testing')}
        options={{ title: 'Testing & Diagnostics' }}
      />
      <Stack.Screen
        name="SyncModels"
        component={withBottomNav(ModelSelectionScreen, 'Sync')}
        options={{ title: 'Select Models' }}
      />
      <Stack.Screen
        name="CustomModelSelection"
        component={withBottomNav(CustomModelSelectionScreen, 'Sync')}
        options={{ title: 'Custom Model Selection' }}
      />
      <Stack.Screen
        name="TemplateModelSelection"
        component={withBottomNav(TemplateModelSelectionScreen, 'Sync')}
        options={{ title: 'Template Models' }}
      />
      <Stack.Screen
        name="SyncSettings"
        component={withBottomNav(SyncSettingsScreen, 'Sync')}
        options={{ title: 'Sync Settings' }}
      />
      <Stack.Screen
        name="SyncProgress"
        component={withBottomNav(SyncProgressScreen, 'Sync')}
        options={{ title: 'Sync Progress' }}
      />
      <Stack.Screen
        name="SyncConflicts"
        component={withBottomNav(ConflictResolutionScreen, 'Sync')}
        options={{ title: 'Resolve Conflicts' }}
      />
      <Stack.Screen
        name="OfflineQueue"
        component={withBottomNav(OfflineQueueScreen, 'Sync')}
        options={{ title: 'Offline Queue' }}
      />
      <Stack.Screen
        name="DatabaseManager"
        component={withBottomNav(DatabaseManagerScreen, 'Sync')}
        options={{ title: 'Database Manager' }}
      />
      <Stack.Screen
        name="Data"
        component={withBottomNav(DataManager, 'Data')}
        options={{ title: 'Data Management' }}
      />

      <Stack.Screen
        name="Documentation"
        component={withBottomNav(FieldServiceDashboard, 'Documentation')}
        options={{ title: 'Documentation' }}
      />
      <Stack.Screen
        name="Activities"
        component={withBottomNav(ActivitiesList, 'Activities')}
        options={{ title: 'Activities' }}
      />
      <Stack.Screen
        name="Chat"
        component={withBottomNav(ChatList, 'Chat')}
        options={{ title: 'Chat' }}
      />
      <Stack.Screen
        name="CallScreen"
        component={CallScreen}
        options={{
          title: 'Call',
          headerShown: false,
          presentation: 'fullScreenModal'
        }}
      />
      <Stack.Screen
        name="VideoCallScreen"
        component={VideoCallScreen}
        options={{
          title: 'Video Call',
          headerShown: false,
          presentation: 'fullScreenModal',
          gestureEnabled: false
        }}
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
        <Tab.Screen name="Dashboard" component={MainDashboard} />
        <Tab.Screen name="Sales" component={SalesOrdersList} />
        <Tab.Screen name="Contacts" component={ContactsList} />
        <Tab.Screen name="Calendar" component={CalendarView} />
        <Tab.Screen name="More" component={MoreTabScreen} />
      </Tab.Navigator>
  );
}

// App Content Component (inside provider)
function AppContent() {
  console.log('🔄 AppContent component starting...');
  const { isAuthenticated, authLoading, checkAuth } = useAppStore();

  useEffect(() => {
    console.log('🔐 Checking authentication...');
    checkAuth();
  }, []);

  // Initialize services when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Initialize auto-sync service
      autoSyncService.initialize().catch(error => {
        console.warn('Failed to initialize auto-sync service:', error);
      });

      // Initialize notification service for push notifications and calls
      notificationService.initialize().catch(error => {
        console.warn('Failed to initialize notification service:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      if (isAuthenticated) {
        autoSyncService.cleanup();
      }
    };
  }, [isAuthenticated]);

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

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 App Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 App Error Boundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
          <Text style={styles.errorDetails}>
            Check the console for more details
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Main App Component
export default function App() {
  console.log('🚀 App component starting...');

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppStoreProvider>
          <AppContent />
        </AppStoreProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Error styles
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
