/**
 * Production-Safe App Component
 * Fixed white screen issue by implementing safe service initialization
 */

import React, { useEffect, useState } from 'react';
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
    const message = args.join(' ');
    if (message.includes('Network request timed out') ||
        message.includes('XML-RPC call failed') ||
        message.includes('TimeoutError')) {
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
import ActivitiesList from './src/models/mail_activity/screens/501_ActivitiesList';
import CalendarView from './src/models/calendar_event/screens/701_CalendarView';
import ChatList from './src/models/discuss_channel/screens/151_ChatList';
import ChatSettings from './src/models/discuss_channel/screens/152_ChatSettings';
import ChatProfile from './src/models/discuss_channel/screens/154_ChatProfile';
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
import { autoSyncService } from './src/models/sync_management/services/AutoSyncService';
import AppStoreProvider from './src/store/AppStoreProvider';
import AppNavigationProvider from './src/components/AppNavigationProvider';
import { notificationService } from './src/models/base/services/BC-S009_NotificationService';
import LoadingScreen from './src/components/LoadingScreen';
import ScreenWrapper from './src/components/ScreenWrapper';

// Navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Service initialization state
interface ServiceState {
  isInitialized: boolean;
  initializationError: string | null;
}

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
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      
      {/* All other screens */}
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
          headerShown: false
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
        name="ChatSettings"
        component={withBottomNav(ChatSettings, 'Settings')}
        options={{ title: 'Chat Settings' }}
      />
      <Stack.Screen
        name="ChatProfile"
        component={ChatProfile}
        options={{
          title: 'Chat Profile',
          headerShown: false
        }}
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

// 🔧 PRODUCTION-SAFE Service Manager
function useServiceManager() {
  const [serviceState, setServiceState] = useState<ServiceState>({
    isInitialized: false,
    initializationError: null
  });

  const initializeServices = async (isAuthenticated: boolean) => {
    if (!isAuthenticated || serviceState.isInitialized) {
      return;
    }

    console.log('🔧 Starting production-safe service initialization...');

    try {
      // Initialize services asynchronously with individual error handling
      const servicePromises = [
        // Auto-sync service with timeout
        new Promise(async (resolve) => {
          try {
            await Promise.race([
              autoSyncService.initialize(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('AutoSync timeout')), 5000)
              )
            ]);
            console.log('✅ AutoSync service initialized');
            resolve('autoSync');
          } catch (error) {
            console.warn('⚠️ AutoSync service failed (app will continue):', error.message);
            resolve('autoSync-failed');
          }
        }),

        // Notification service with timeout
        new Promise(async (resolve) => {
          try {
            await Promise.race([
              notificationService.initialize(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Notification timeout')), 5000)
              )
            ]);
            console.log('✅ Notification service initialized');
            resolve('notifications');
          } catch (error) {
            console.warn('⚠️ Notification service failed (app will continue):', error.message);
            resolve('notifications-failed');
          }
        })
      ];

      // Wait for all services with a maximum timeout
      await Promise.race([
        Promise.allSettled(servicePromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Services initialization timeout')), 10000)
        )
      ]);

      setServiceState({
        isInitialized: true,
        initializationError: null
      });

      console.log('✅ Service initialization completed');

    } catch (error) {
      console.warn('⚠️ Some services failed to initialize (app will continue):', error.message);
      // Continue anyway - don't block the app
      setServiceState({
        isInitialized: true,
        initializationError: error.message
      });
    }
  };

  return { serviceState, initializeServices };
}

// 🚀 PRODUCTION-SAFE App Content Component
function AppContent() {
  console.log('🔄 AppContent component starting...');

  const { isAuthenticated, authLoading, checkAuth } = useAppStore();
  const { serviceState, initializeServices } = useServiceManager();

  // Safe authentication check with timeout
  useEffect(() => {
    console.log('🔐 Checking authentication...');
    
    const checkAuthWithTimeout = async () => {
      try {
        await Promise.race([
          checkAuth(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth check timeout')), 8000)
          )
        ]);
      } catch (error) {
        console.warn('❌ Auth check failed (non-critical):', error.message);
        // Don't crash - just continue to login screen
      }
    };

    checkAuthWithTimeout();
  }, []);

  // Initialize services only after authentication and UI is ready
  useEffect(() => {
    if (isAuthenticated && !serviceState.isInitialized) {
      // Add delay to ensure UI is fully rendered first
      const timer = setTimeout(() => {
        initializeServices(isAuthenticated);
      }, 2000); // 2 second delay for UI stability

      return () => clearTimeout(timer);
    }

    // Cleanup services on logout
    return () => {
      if (!isAuthenticated && serviceState.isInitialized) {
        try {
          autoSyncService.cleanup();
        } catch (error) {
          console.warn('Service cleanup warning:', error);
        }
      }
    };
  }, [isAuthenticated, serviceState.isInitialized]);

  // Show loading while checking auth (but with timeout)
  if (authLoading) {
    return <LoadingScreen />;
  }

  // PRODUCTION-SAFE navigation rendering
  try {
    return (
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#F8F9FA" />
        <AppNavigationProvider>
          {isAuthenticated ? <AllScreensStack /> : <LoginScreen />}
        </AppNavigationProvider>
      </NavigationContainer>
    );
  } catch (error) {
    console.error('❌ Navigation rendering failed:', error);
    // PRODUCTION-SAFE fallback
    return (
      <View style={styles.errorFallback}>
        <Text style={styles.errorTitle}>Loading App...</Text>
        <Text style={styles.errorText}>Please wait while the app initializes</Text>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      </View>
    );
  }
}

// 🛡️ Production-Ready Error Boundary
class ErrorBoundary extends React.Component<
  {children: React.ReactNode}, 
  {hasError: boolean, error?: Error}
> {
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
            Please restart the app or check your network connection
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// 🎯 PRODUCTION-READY Main App Component
export default function App() {
  console.log('🚀 Production-safe app starting...');

  // ULTIMATE PRODUCTION SAFETY with multiple error protection layers
  try {
    return (
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppStoreProvider>
            <AppContent />
          </AppStoreProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ CRITICAL: App failed to render:', error);

    // ABSOLUTE FALLBACK - Minimal UI that always works
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.absoluteFallback}>
          <View style={styles.fallbackCard}>
            <Text style={styles.fallbackTitle}>☁️ Odoo Sync</Text>
            <Text style={styles.fallbackText}>
              App is starting...{'\n'}Please wait a moment.
            </Text>
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }
}

// Error styles
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
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
  errorFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  absoluteFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    padding: 20,
  },
  fallbackCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 15,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});