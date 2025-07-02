import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface StatsData {
  id: string;
  title: string;
  count: number;
  change?: string;
  color: string;
  bgColor: string;
  icon: string;
}

interface StatsCardsProps {
  stats: StatsData[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <View style={tw`mx-6 mb-6`}>
      <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>Overview</Text>
      
      <View style={tw`flex-row gap-3`}>
        {stats.map(stat => (
          <View 
            key={stat.id} 
            style={tw`flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100`}
          >
            {/* Icon */}
            <View style={[
              tw`w-12 h-12 rounded-xl items-center justify-center mb-4`,
              { backgroundColor: stat.bgColor }
            ]}>
              <MaterialIcons name={stat.icon as any} size={22} color={stat.color} />
            </View>
            
            {/* Count */}
            <Text style={tw`text-2xl font-black text-gray-900 mb-1`}>
              {stat.count.toLocaleString()}
            </Text>
            
            {/* Title */}
            <Text style={tw`text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide`}>
              {stat.title}
            </Text>
            
            {/* Change Indicator */}
            {stat.change && (
              <Text style={tw`text-xs text-green-600 font-bold`}>
                ↗ {stat.change}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};
