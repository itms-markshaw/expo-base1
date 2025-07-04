/**
 * App Navigation Provider
 * Simple wrapper that provides navigation utilities
 */

import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NavigationDrawer from './NavigationDrawer';
import { UniversalSearchComponent } from '../models/base/components';
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
  const navigation = useNavigation();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Dashboard');

  const showNavigationDrawer = () => {
    setShowDrawer(true);
  };

  const showUniversalSearch = () => {
    setShowSearch(true);
  };

  // Simple navigation function that uses React Navigation directly
  const navigateToScreen = (screenName: string) => {
    console.log('Navigating to:', screenName);
    setCurrentScreen(screenName);
    setShowDrawer(false);

    // Map screen names to actual navigation routes
    const routeMap: Record<string, string> = {
      'Dashboard': 'MainTabs',
      'Sales': 'MainTabs',
      'Sales Orders': 'MainTabs',
      'Contacts': 'MainTabs',
      'Calendar': 'MainTabs',
      'More': 'MainTabs',
      'Activities': 'Activities',
      'Chat': 'Chat',
      'Messages': 'Messages',
      'Projects': 'Projects',
      'Attachments': 'Attachments',
      'Helpdesk': 'Helpdesk',
      'Helpdesk Ticket Detail': 'HelpdeskTicketDetail',
      'CRM': 'CRMLeads',
      'CRM Leads': 'CRMLeads',
      'Employees': 'Employees',
      'Users': 'Users',
      'Settings': 'Settings',
      'Sync': 'SyncStack',
      'Data': 'Data',
      'Testing': 'Testing',
      'Mobile': 'Mobile',
      'Documentation': 'Mobile',
    };

    const route = routeMap[screenName];
    if (route) {
      if (route === 'MainTabs') {
        // For main tabs, navigate to the tab
        const tabMap: Record<string, string> = {
          'Dashboard': 'Dashboard',
          'Sales': 'Sales',
          'Sales Orders': 'Sales',
          'Contacts': 'Contacts',
          'Calendar': 'Calendar',
          'More': 'More',
        };
        const tab = tabMap[screenName];
        if (tab) {
          navigation.navigate('MainTabs' as never, { screen: tab } as never);
        }
      } else {
        // For stack screens, navigate directly
        navigation.navigate(route as never);
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
