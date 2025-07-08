import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AvatarProps {
  size?: number;
  source?: string | null;
  name?: string;
  fallbackColor?: string;
  style?: any;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

export function Avatar({
  size = 60,
  source,
  name = '',
  fallbackColor,
  style,
  showOnlineIndicator = false,
  isOnline = false
}: AvatarProps) {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const backgroundColor = fallbackColor || generateColorFromName(name);
  const radius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, { width: size, height: size, borderRadius: radius }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor,
            },
          ]}
        >
          {initials ? (
            <Text style={[styles.initials, { fontSize: size * 0.3 }]}>
              {initials}
            </Text>
          ) : (
            <MaterialIcons name="person" size={size * 0.5} color="#FFF" />
          )}
        </View>
      )}
      
      {showOnlineIndicator && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E',
            },
          ]}
        />
      )}
    </View>
  );
}

function generateColorFromName(name: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#f0f0f0',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFF',
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: '#FFF',
  },
});

export default Avatar;
