/**
 * Dashboard Screen
 * Modern dashboard with today’s activities, quick actions, favorites, and navigation
 * Aligned with global standards (e.g., Google Workspace, Salesforce)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import tw from 'twrnc';
import {
  NavigationService,
  NavigationItem,
  NavigationCategoryType,
} from '../navigation/NavigationConfig';
import { useAppStore } from '../store';
import { useAppNavigation } from '../components/AppNavigationProvider';
import { authService } from '../services/auth';

interface ActivityItem {
  id: number;
  summary: string;
  activity_type_id: [number, string];
  res_model: string;
  res_name: string;
  date_deadline: string;
  user_id: [number, string];
}

interface DashboardItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  screenName: string;
}

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
}

const FAVORITES_KEY = '@DashboardFavorites';

const SearchHeader = React.memo(
  ({
    searchQuery,
    setSearchQuery,
    inputRef,
  }: {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    inputRef: React.RefObject<TextInput>;
  }) => {
    console.log('[DEBUG] SearchHeader rendered');
    return (
      <View style={tw`px-4 py-3 bg-white border-b border-gray-200`}>
        <View style={tw`flex-row items-center bg-gray-100 rounded-lg px-3 py-2`}>
          <MaterialIcons name="search" size={20} color="#666" style={tw`mr-2`} />
          <TextInput
            ref={inputRef}
            style={tw`flex-1 text-base text-gray-900`}
            placeholder="Search dashboard..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search dashboard"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button">
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => prevProps.searchQuery === nextProps.searchQuery
);

export default function DashboardScreen() {
  // Hook 1: User state
  const { user } = useAppStore();

  // Hook 2: Navigation
  const { navigateToScreen } = useAppNavigation();

  // Hook 3: Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Hook 4: Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Hook 5: Refreshing state
  const [refreshing, setRefreshing] = useState(false);

  // Hook 6: Activities
  const [todaysActivities, setTodaysActivities] = useState<ActivityItem[]>([]);

  // Hook 7: Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Hook 8: Error state
  const [error, setError] = useState<string | null>(null);

  // Hook 9: Search input ref
  const searchInputRef = useRef<TextInput>(null);

  // Hook 10: Debounced search
  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300),
    []
  );

  // Hook 11: Handle search input
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      debouncedSetSearchQuery(text);
    },
    [debouncedSetSearchQuery]
  );

  // Define dashboard items (combining NavigationService and MoreTabScreen)
  const dashboardItems = useMemo(() => {
    const navItems = NavigationService.getAvailableItems().filter(
      (item) => item.id !== 'home' && item.id !== 'analytics'
    );
    const moreItems: DashboardItem[] = [
      { id: 'activities', name: 'Activities', description: 'Tasks, events, and reminders', icon: 'event-note', color: '#FF9500', screenName: 'Activities' },
      { id: 'crm', name: 'CRM Leads', description: 'Manage leads and opportunities', icon: 'trending-up', color: '#34C759', screenName: 'CRM Leads' },
      { id: 'chat', name: 'Chat', description: 'Real-time messaging and communication', icon: 'chat', color: '#00C851', screenName: 'Chat' },
      { id: 'messages', name: 'Messages', description: 'Email and communication history', icon: 'message', color: '#007AFF', screenName: 'Messages' },
      { id: 'attachments', name: 'Attachments', description: 'Files and documents', icon: 'attach-file', color: '#FF9500', screenName: 'Attachments' },
      { id: 'projects', name: 'Projects', description: 'Project management and tasks', icon: 'folder', color: '#9C27B0', screenName: 'Projects' },
      { id: 'employees', name: 'Employees', description: 'HR and employee management', icon: 'badge', color: '#FF3B30', screenName: 'Employees' },
      { id: 'helpdesk', name: 'Helpdesk', description: 'Support tickets and issues', icon: 'support', color: '#FF9500', screenName: 'Helpdesk' },
      { id: 'mobile', name: 'Field Service', description: 'Mobile tools and documentation', icon: 'smartphone', color: '#34C759', screenName: 'Mobile' },
      { id: 'users', name: 'Users', description: 'User accounts and management', icon: 'manage-accounts', color: '#FF3B30', screenName: 'Users' },
      { id: 'sync', name: 'Data Sync', description: 'Synchronize with Odoo server', icon: 'sync', color: '#666', screenName: 'Sync' },
      { id: 'data', name: 'Data Management', description: 'View and manage synced data', icon: 'storage', color: '#666', screenName: 'Data' },
      { id: 'testing', name: 'Testing', description: 'System diagnostics and testing', icon: 'bug-report', color: '#666', screenName: 'Testing' },
      { id: 'calendar', name: 'Calendar', description: 'Schedule and appointments', icon: 'calendar-today', color: '#007AFF', screenName: 'Calendar' },
      { id: 'settings', name: 'Settings', description: 'App configuration and preferences', icon: 'settings', color: '#8E8E93', screenName: 'Settings' },
    ];

    const allItemsMap = new Map<string, DashboardItem>();
    navItems.forEach((item) => allItemsMap.set(item.id, { ...item, screenName: item.id }));
    moreItems.forEach((item) => allItemsMap.set(item.id, item));
    return Array.from(allItemsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Quick actions
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-order',
        name: 'New Order',
        icon: 'add-shopping-cart',
        color: '#34C759',
        onPress: () => navigateToScreen('Sales Orders'),
      },
      {
        id: 'new-task',
        name: 'New Task',
        icon: 'add-task',
        color: '#FF9500',
        onPress: () => navigateToScreen('Activities'),
      },
      {
        id: 'scan',
        name: 'Scan',
        icon: 'qr-code-scanner',
        color: '#9C27B0',
        onPress: () => navigateToScreen('Mobile'),
      },
      {
        id: 'photo',
        name: 'Photo',
        icon: 'camera-alt',
        color: '#007AFF',
        onPress: () => navigateToScreen('Mobile'),
      },
    ],
    [navigateToScreen]
  );

  // Hook 12: Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        } else {
          setFavorites(new Set(['activities', 'crm', 'sales-orders']));
        }
        await loadTodaysActivities();
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setError('Failed to load dashboard data');
      }
    };
    loadData();
  }, []);

  // Hook 13: Save favorites
  const saveFavorites = useCallback(
    async (newFavorites: Set<string>) => {
      try {
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
        setFavorites(newFavorites);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Failed to save favorites:', error);
        setError('Failed to save favorites');
      }
    },
    []
  );

  // Hook 14: Load activities
  const loadTodaysActivities = useCallback(async () => {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const cachedActivities = await AsyncStorage.getItem(`@Activities_${today}`);
      if (cachedActivities) {
        setTodaysActivities(JSON.parse(cachedActivities));
      }

      const activities = await client.searchRead(
        'mail.activity',
        [['date_deadline', '=', today]],
        ['id', 'summary', 'activity_type_id', 'res_model', 'res_name', 'date_deadline', 'user_id'],
        { limit: 5, order: 'date_deadline asc' }
      );

      setTodaysActivities(activities);
      await AsyncStorage.setItem(`@Activities_${today}`, JSON.stringify(activities));
      setError(null);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setError('Failed to load activities');
    }
  }, []);

  // Hook 15: Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodaysActivities();
    setRefreshing(false);
  }, [loadTodaysActivities]);

  // Hook 16: Toggle favorite
  const toggleFavorite = useCallback(
    (itemId: string) => {
      const newFavorites = new Set(favorites);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      saveFavorites(newFavorites);
    },
    [favorites, saveFavorites]
  );

  // Hook 17: Handle item press
  const handleItemPress = useCallback(
    (item: DashboardItem) => {
      if (item.screenName) {
        navigateToScreen(item.screenName);
      } else {
        console.warn(`No screen mapping for item: ${item.id}`);
        setError(`No screen found for ${item.name}`);
      }
    },
    [navigateToScreen]
  );

  // Filter items
  const filteredItems = useMemo(() => {
    if (!debouncedSearchQuery) return dashboardItems;
    return dashboardItems.filter(
      (item) =>
        item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [debouncedSearchQuery, dashboardItems]);

  // Render components
  const renderActivityItem = useCallback(
    (activity: ActivityItem) => (
      <TouchableOpacity
        key={activity.id}
        style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}
        onPress={() => navigateToScreen('Activities')}
        accessibilityRole="button"
        accessibilityLabel={`View activity ${activity.summary}`}
      >
        <View style={tw`w-8 h-8 rounded-full justify-center items-center bg-orange-100 mr-3`}>
          <MaterialIcons name="event-note" size={16} color="#FF9500" />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-sm font-semibold text-gray-900`} numberOfLines={1}>
            {activity.summary}
          </Text>
          <Text style={tw`text-xs text-gray-600`} numberOfLines={1}>
            {activity.res_name} • {activity.activity_type_id[1]}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
      </TouchableOpacity>
    ),
    [navigateToScreen]
  );

  const renderQuickAction = useCallback(
    (action: QuickAction) => (
      <TouchableOpacity
        key={action.id}
        style={tw`flex-1 items-center p-3`}
        onPress={action.onPress}
        accessibilityRole="button"
        accessibilityLabel={action.name}
      >
        <View style={tw`w-12 h-12 rounded-full justify-center items-center bg-[${action.color}15]`}>
          <MaterialIcons name={action.icon as any} size={24} color={action.color} />
        </View>
        <Text style={tw`text-xs font-medium text-gray-900 mt-2 text-center`}>{action.name}</Text>
      </TouchableOpacity>
    ),
    []
  );

  const renderDashboardItem = useCallback(
    (item: DashboardItem) => {
      const isFavorite = favorites.has(item.id);

      return (
        <TouchableOpacity
          key={item.id}
          style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}
          onPress={() => handleItemPress(item)}
          onLongPress={() => toggleFavorite(item.id)}
          delayLongPress={500}
          accessibilityRole="button"
          accessibilityLabel={`Navigate to ${item.name}`}
        >
          <View style={tw`w-8 h-8 rounded-full justify-center items-center bg-[${item.color}15] mr-3`}>
            <MaterialIcons name={item.icon as any} size={18} color={item.color} />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-sm font-semibold text-gray-900`}>{item.name}</Text>
            <Text style={tw`text-xs text-gray-600`}>{item.description}</Text>
          </View>
          <View style={tw`flex-row items-center gap-2`}>
            {isFavorite && <MaterialIcons name="star" size={16} color="#FFD700" />}
            <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
          </View>
        </TouchableOpacity>
      );
    },
    [favorites, handleItemPress, toggleFavorite]
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-row justify-between items-center p-4 bg-white border-b border-gray-200`}>
        <View>
          <Text style={tw`text-2xl font-bold text-gray-900`}>Dashboard</Text>
          <Text style={tw`text-sm text-gray-600`}>{user?.name || 'Mark Shaw'}</Text>
        </View>
        <TouchableOpacity
          style={tw`p-2`}
          onPress={() => navigateToScreen('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Go to settings"
        >
          <MaterialIcons name="account-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        inputRef={searchInputRef}
      />
      {error && (
        <View style={tw`flex-row items-center bg-red-100 p-3 mx-4 my-2 rounded-lg`}>
          <Text style={tw`flex-1 text-sm text-red-700`}>{error}</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={tw`bg-red-600 px-3 py-1 rounded-md`}
            accessibilityRole="button"
          >
            <Text style={tw`text-xs text-white font-semibold`}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        style={tw`flex-1`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* Today's Activities */}
        {todaysActivities.length > 0 && (
          <View style={tw`p-4 bg-gray-50`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-base font-semibold text-gray-900`}>Today's Activities</Text>
              <TouchableOpacity
                onPress={() => navigateToScreen('Activities')}
                accessibilityRole="button"
              >
                <Text style={tw`text-sm text-blue-600`}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={tw`bg-white rounded-lg overflow-hidden`}>
              {todaysActivities.map(renderActivityItem)}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={tw`p-4 bg-gray-50`}>
          <Text style={tw`text-base font-semibold text-gray-900 mb-3`}>Quick Actions</Text>
          <View style={tw`flex-row flex-wrap justify-around`}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Favorites */}
        {favorites.size > 0 && (
          <View style={tw`p-4 bg-gray-50`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-base font-semibold text-gray-900`}>Favorites</Text>
              <Text style={tw`text-sm text-gray-600`}>{favorites.size} items</Text>
            </View>
            <View style={tw`bg-white rounded-lg overflow-hidden`}>
              {dashboardItems
                .filter((item) => favorites.has(item.id))
                .map(renderDashboardItem)}
            </View>
          </View>
        )}

        {/* All Features */}
        <View style={tw`p-4 bg-gray-50`}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <Text style={tw`text-base font-semibold text-gray-900`}>All Features</Text>
            <Text style={tw`text-xs italic text-gray-600`}>Long press to favorite</Text>
          </View>
          <View style={tw`bg-white rounded-lg overflow-hidden`}>
            {filteredItems.map(renderDashboardItem)}
          </View>
        </View>

        <View style={tw`h-16`} />
      </ScrollView>
    </SafeAreaView>
  );
}