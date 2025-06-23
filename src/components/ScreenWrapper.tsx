/**
 * Screen Wrapper Component
 * Automatically adds bottom navigation to any screen
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import CustomBottomNavigation from './CustomBottomNavigation';

interface ScreenWrapperProps {
  children: React.ReactNode;
  currentScreen?: string;
  showBottomNav?: boolean;
}

export default function ScreenWrapper({ 
  children, 
  currentScreen, 
  showBottomNav = true 
}: ScreenWrapperProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      {showBottomNav && (
        <CustomBottomNavigation currentScreen={currentScreen} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
