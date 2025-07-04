import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

type LayoutType = 'list' | 'grid-2' | 'grid-3' | 'grid-4';

interface DashboardHeaderProps {
  user: any;
  layoutType: LayoutType;
  isOffline: boolean;
  onProfilePress: () => void;
  onLayoutPress: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  layoutType,
  isOffline,
  onProfilePress,
  onLayoutPress
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={tw`px-6 pt-4 pb-8 bg-gradient-to-br from-blue-500 to-blue-600`}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      
      {/* Offline Banner */}
      {isOffline && (
        <View style={tw`bg-orange-500 -mx-6 -mt-4 px-6 py-2`}>
          <Text style={tw`text-white text-xs text-center font-medium`}>
            📱 Offline mode - Data may not be current
          </Text>
        </View>
      )}
      
      {/* Header Content */}
      <View style={tw`flex-row justify-between items-start mt-2`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-lg text-blue-100 font-medium`}>
            {getGreeting()},
          </Text>
          <Text style={tw`text-2xl font-bold text-white mt-1`}>
            {user?.name || 'User'}
          </Text>
          <Text style={tw`text-blue-100 text-sm mt-1`}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={tw`flex-row gap-3`}>
          <TouchableOpacity
            onPress={onLayoutPress}
            style={tw`w-11 h-11 rounded-full bg-white/20 items-center justify-center shadow-lg`}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name={layoutType === 'list' ? 'view-list' : 'grid-view'} 
              size={20} 
              color="white" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={onProfilePress}
            style={tw`w-11 h-11 rounded-full bg-white/20 items-center justify-center shadow-lg`}
            activeOpacity={0.8}
          >
            <MaterialIcons name="settings" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
