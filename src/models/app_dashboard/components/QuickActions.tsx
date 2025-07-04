import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

const { width: screenWidth } = Dimensions.get('window');

interface QuickActionItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickActionItem[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <View style={tw`mx-6 mb-6`}>
      <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>Quick Actions</Text>
      
      <View style={tw`flex-row gap-3`}>
        {actions.map(action => (
          <TouchableOpacity
            key={action.id}
            onPress={action.onPress}
            style={[
              tw`flex-1 items-center justify-center rounded-2xl p-4 shadow-lg border border-white/20`,
              { 
                backgroundColor: action.bgColor, 
                minHeight: 88,
                shadowColor: action.bgColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8
              }
            ]}
            activeOpacity={0.9}
          >
            {/* Icon Container */}
            <View style={tw`w-12 h-12 rounded-full bg-white/25 items-center justify-center mb-2 shadow-sm`}>
              <MaterialIcons name={action.icon as any} size={24} color="white" />
            </View>
            
            {/* Action Label */}
            <Text style={tw`text-white text-xs font-bold text-center tracking-wide`}>
              {action.name.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
