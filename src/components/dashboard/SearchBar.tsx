import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  searchHistory: string[];
  onClearHistory: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  searchHistory,
  onClearHistory
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <View style={tw`px-6 -mt-4 mb-6 relative z-10`}>
      <View style={tw`bg-white rounded-2xl shadow-xl border border-gray-100`}>
        {/* Main Search Input */}
        <View style={tw`flex-row items-center px-4 py-4`}>
          <View style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3`}>
            <MaterialIcons name="search" size={18} color="#6B7280" />
          </View>
          
          <TextInput
            style={tw`flex-1 text-gray-900 text-base font-medium`}
            placeholder="Search modules, actions, or data..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          />
          
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => onSearchChange('')}
              style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}
            >
              <MaterialIcons name="clear" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <View style={tw`border-t border-gray-100 p-3`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider`}>
                Recent Searches
              </Text>
              <TouchableOpacity onPress={onClearHistory}>
                <Text style={tw`text-xs text-blue-600 font-semibold`}>Clear All</Text>
              </TouchableOpacity>
            </View>
            
            {searchHistory.slice(0, 3).map((term, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onSearchChange(term)}
                style={tw`flex-row items-center py-2.5 px-2 rounded-lg hover:bg-gray-50`}
                activeOpacity={0.7}
              >
                <MaterialIcons name="history" size={16} color="#9CA3AF" />
                <Text style={tw`text-sm text-gray-700 ml-3 font-medium`}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};
