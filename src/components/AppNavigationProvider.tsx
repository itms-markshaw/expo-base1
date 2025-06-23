/**
 * App Navigation Provider
 * Centralized navigation management for all screens
 */

import React, { createContext, useContext, useState } from 'react';
import { useNavigation as useReactNavigation } from '@react-navigation/native';
import NavigationDrawer from './NavigationDrawer';
import UniversalSearchComponent from './UniversalSearchComponent';
import { NavigationItem } from '../navigation/NavigationConfig';

interface NavigationContextType {
  showNavigationDrawer: () => void;
  showUniversalSearch: () => void;
  navigateToScreen: (screenName: string) => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useAppNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider');
  }
  return context;
};

interface AppNavigationProviderProps {
  children: React.ReactNode;
}

export default function AppNavigationProvider({ children }: AppNavigationProviderProps) {
  const navigation = useReactNavigation();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Dashboard');

  const showNavigationDrawer = () => {
    setShowDrawer(true);
  };

  const showUniversalSearch = () => {
    setShowSearch(true);
  };

  const navigateToScreen = (screenName: string) => {
    console.log('Navigating to:', screenName);
    setCurrentScreen(screenName);

    // Map screen names to navigation routes
    const routeMapping: Record<string, string> = {
      'Dashboard': 'MainTabs',
      'Contacts': 'MainTabs',
      'Activities': 'MainTabs',
      'Calendar': 'MainTabs',
      'Sync': 'MainTabs',
      // Secondary screens
      'Sales Orders': 'SalesOrders',
      'Employees': 'Employees',
      'CRM Leads': 'CRMLeads',
      'Messages': 'Messages',
      'Attachments': 'Attachments',
      'Projects': 'Projects',
      'Helpdesk': 'Helpdesk',
      'Helpdesk Teams': 'HelpdeskTeams',
      'Mobile': 'Mobile',
      'Settings': 'Settings',
    };

    const routeName = routeMapping[screenName];

    if (routeName) {
      // Close drawer if open
      setShowDrawer(false);

      // Navigate to the screen
      try {
        if (routeName === 'MainTabs') {
          // For primary tabs, navigate to MainTabs
          navigation.navigate('MainTabs' as never);
        } else {
          // For secondary screens, navigate directly
          navigation.navigate(routeName as never);
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    } else {
      console.warn(`No route found for screen: ${screenName}`);
    }
  };

  const handleNavigate = (item: NavigationItem) => {
    navigateToScreen(item.name);
  };

  const handleRecordSelect = (model: string, recordId: number) => {
    Alert.alert(
      'Record Selected',
      `Opening ${model} record #${recordId}\n\nIn a full implementation, this would navigate to the record detail screen.`,
      [{ text: 'OK' }]
    );
  };

  const contextValue: NavigationContextType = {
    showNavigationDrawer,
    showUniversalSearch,
    navigateToScreen,
    currentScreen,
    setCurrentScreen,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
      
      {/* Navigation Drawer */}
      <NavigationDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        onNavigate={handleNavigate}
        onScreenNavigate={navigateToScreen}
        currentRoute={currentScreen.toLowerCase()}
      />

      {/* Universal Search */}
      <UniversalSearchComponent
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigate={handleNavigate}
        onRecordSelect={handleRecordSelect}
      />
    </NavigationContext.Provider>
  );
}
