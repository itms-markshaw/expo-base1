/**
 * Screen Badge Component
 * Shows screen number badge for development and user feedback
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useAppStore } from '../store';

interface ScreenBadgeProps {
  screenNumber: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function ScreenBadge({
  screenNumber,
  position = 'top-right',
  size = 'medium',
  color = '#007AFF',
}: ScreenBadgeProps) {
  const { showScreenBadges } = useAppStore();

  // Don't render if badges are disabled
  if (!showScreenBadges) {
    return null;
  }

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 9999,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: 12, left: 12 };
      case 'top-right':
        return { ...baseStyle, top: 12, right: 12 };
      case 'bottom-left':
        return { ...baseStyle, bottom: 12, left: 12 };
      case 'bottom-right':
        return { ...baseStyle, bottom: 12, right: 12 };
      default:
        return { ...baseStyle, top: 12, right: 12 };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          width: 24,
          height: 24,
          borderRadius: 12,
        };
      case 'medium':
        return {
          width: 32,
          height: 32,
          borderRadius: 16,
        };
      case 'large':
        return {
          width: 40,
          height: 40,
          borderRadius: 20,
        };
      default:
        return {
          width: 32,
          height: 32,
          borderRadius: 16,
        };
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case 'small':
        return { fontSize: 10, fontWeight: '700' as const };
      case 'medium':
        return { fontSize: 12, fontWeight: '700' as const };
      case 'large':
        return { fontSize: 14, fontWeight: '700' as const };
      default:
        return { fontSize: 12, fontWeight: '700' as const };
    }
  };

  return (
    <View
      style={[
        styles.badge,
        getPositionStyle(),
        getSizeStyle(),
        { backgroundColor: color },
      ]}
    >
      <Text style={[styles.badgeText, getTextStyle()]}>
        {screenNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
