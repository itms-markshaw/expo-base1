import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface ActivityItem {
  id: number;
  summary: string;
  activity_type_id: [number, string];
  res_model: string;
  res_name: string;
  date_deadline: string;
  user_id: [number, string];
}

interface StatsData {
  id: string;
  title: string;
  count: number;
  change?: string;
  color: string;
  bgColor: string;
  icon: string;
}

interface PersonalInsightsProps {
  stats: StatsData[];
  todaysActivities: ActivityItem[];
}

export const PersonalInsights: React.FC<PersonalInsightsProps> = ({
  stats,
  todaysActivities
}) => {
  const totalTasks = todaysActivities.length;
  const totalNotifications = stats.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <View style={tw`mx-6 mb-6`}>
      <View style={tw`bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5 border border-blue-100 shadow-sm`}>
        {/* Header */}
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3`}>
            <MaterialIcons name="insights" size={20} color="#3B82F6" />
          </View>
          <Text style={tw`font-black text-blue-900 text-lg`}>
            Your Day at a Glance
          </Text>
        </View>
        
        {/* Summary */}
        <Text style={tw`text-blue-700 text-sm leading-6 mb-4`}>
          {totalTasks > 0 
            ? `${totalTasks} tasks due today • ${totalNotifications} items need attention`
            : `All caught up! • ${totalNotifications} items to review`
          }
        </Text>
        
        {/* Next Task Preview */}
        {totalTasks > 0 && (
          <View style={tw`flex-row items-center bg-white/60 rounded-xl p-3`}>
            <View style={tw`w-3 h-3 rounded-full bg-orange-400 mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1`}>
                Next Up
              </Text>
              <Text style={tw`text-sm font-bold text-blue-900`} numberOfLines={1}>
                {todaysActivities[0]?.summary}
              </Text>
            </View>
          </View>
        )}
        
        {/* Motivational Element */}
        {totalTasks === 0 && (
          <View style={tw`flex-row items-center bg-green-100/80 rounded-xl p-3`}>
            <MaterialIcons name="celebration" size={20} color="#059669" />
            <Text style={tw`text-sm font-bold text-green-800 ml-3`}>
              Great work! You're all caught up for today.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
