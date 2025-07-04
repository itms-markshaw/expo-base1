/**
 * 001_MainDashboard - Main ERP dashboard with favorites and modules
 * Screen Number: 001
 * Model: app.dashboard
 * Type: dashboard
 *
 * MIGRATED: From src/screens/CleanNavigationScreen.tsx
 * Clean iOS-style dashboard with customizable layout and favorites
 */

// My Activities component
const MyActivities = React.memo(({ 
  activities, 
  onActivityPress,
  isLoading 
}: {
  activities: any[];
  onActivityPress: () => void;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <View style={tw`px-6 mb-6`}>
        <Text style={tw`text-lg font-semibold text-gray-900 mb-4`}>My Activities</Text>
        <View style={tw`bg-white rounded-lg border border-gray-200 p-4 items-center`}>
          <Text style={tw`text-gray-500`}>Loading activities...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`px-6 mb-6`}>
      <View style={tw`flex-row justify-between items-center mb-4`}>
        <Text style={tw`text-lg font-semibold text-gray-900`}>My Activities</Text>
        <TouchableOpacity onPress={onActivityPress}>
          <Text style={tw`text-blue-600 font-medium text-sm`}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {activities.length > 0 ? (
        <View style={tw`bg-white rounded-lg border border-gray-200 overflow-hidden`}>
          {activities.slice(0, 3).map((activity, index) => (
            <TouchableOpacity
              key={activity.id}
              onPress={onActivityPress}
              style={[
                tw`flex-row items-center p-4`,
                index < Math.min(activities.length - 1, 2) && tw`border-b border-gray-200`
              ]}
              activeOpacity={0.7}
            >
              <View style={tw`w-10 h-10 rounded-lg bg-orange-100 items-center justify-center mr-3`}>
                <MaterialIcons name="event-note" size={18} color="#F97316" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-medium text-gray-900`} numberOfLines={1}>
                  {activity.summary}
                </Text>
                <Text style={tw`text-sm text-gray-600 mt-1`} numberOfLines={1}>
                  {activity.res_name} • {activity.activity_type_id?.[1] || 'Task'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={tw`bg-white rounded-lg border border-gray-200 p-6 items-center`}>
          <MaterialIcons name="event-available" size={32} color="#D1D5DB" />
          <Text style={tw`text-gray-500 mt-2 text-center`}>
            No activities for today
          </Text>
        </View>
      )}
    </View>
  );
});/**
 * Clean Dashboard - iOS More Screen Style
 * Simple, clean design with drag-and-drop favorites
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { useAppStore } from '../../../store';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import { authService } from '../../../services/auth';
import ScreenBadge from '../../../components/ScreenBadge';

const { width: screenWidth } = Dimensions.get('window');
const FAVORITES_KEY = '@DashboardFavorites';
const FAVORITES_ORDER_KEY = '@DashboardFavoritesOrder';
const LAYOUT_PREFERENCE_KEY = '@DashboardLayout';
const PADDING_PREFERENCE_KEY = '@DashboardPadding';

type LayoutType = 'list' | 'grid-2' | 'grid-3' | 'grid-4';
type PaddingType = 'compact' | 'comfy';

interface ModuleCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  screenName: string;
  iconColor: string;
}

// Clean iOS-style header
const Header = React.memo(({ 
  user, 
  layoutType,
  onSettingsPress, 
  onLayoutPress,
  onCameraPress
}: { 
  user: any; 
  layoutType: LayoutType;
  onSettingsPress: () => void;
  onLayoutPress: () => void;
  onCameraPress: () => void;
}) => (
  <View style={tw`px-6 pt-4 pb-4 bg-white border-b border-gray-200`}>
    <View style={tw`flex-row justify-between items-center`}>
      <View>
        <Text style={tw`text-gray-600 mt-1`}>{user?.name || 'User'}</Text>
      </View>
      <View style={tw`flex-row gap-2`}>
        <TouchableOpacity
          onPress={onCameraPress}
          style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center`}
        >
          <MaterialIcons name="camera-alt" size={18} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onLayoutPress}
          style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center`}
        >
          <MaterialIcons 
            name={layoutType === 'list' ? 'view-list' : 'grid-view'} 
            size={18} 
            color="#374151" 
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSettingsPress}
          style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center`}
        >
          <MaterialIcons name="settings" size={18} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
));

// Simple search bar
const SearchBar = React.memo(({ searchQuery, onSearchChange }: {
  searchQuery: string;
  onSearchChange: (text: string) => void;
}) => (
  <View style={tw`px-6 py-4 bg-white border-b border-gray-200`}>
    <View style={tw`flex-row items-center bg-gray-100 rounded-lg px-3 py-2`}>
      <MaterialIcons name="search" size={20} color="#6B7280" />
      <TextInput
        style={tw`flex-1 ml-2 text-gray-900`}
        placeholder="Search"
        placeholderTextColor="#9CA3AF"
        value={searchQuery}
        onChangeText={onSearchChange}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => onSearchChange('')}>
          <MaterialIcons name="clear" size={18} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  </View>
));

// Layout customization modal
const CustomizationModal = React.memo(({
  visible,
  currentLayout,
  currentPadding,
  onClose,
  onLayoutChange,
  onPaddingChange
}: {
  visible: boolean;
  currentLayout: LayoutType;
  currentPadding: PaddingType;
  onClose: () => void;
  onLayoutChange: (layout: LayoutType) => void;
  onPaddingChange: (padding: PaddingType) => void;
}) => {
  const layouts = [
    { type: 'list' as LayoutType, name: 'List', icon: 'view-list' },
    { type: 'grid-2' as LayoutType, name: '2×2', icon: 'view-module' },
    { type: 'grid-3' as LayoutType, name: '3×3', icon: 'grid-view' },
    { type: 'grid-4' as LayoutType, name: '4×4', icon: 'apps' },
  ];

  const paddingOptions = [
    { type: 'comfy' as PaddingType, name: 'Comfortable' },
    { type: 'compact' as PaddingType, name: 'Compact' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-black/50 justify-center items-center`}>
        <View style={tw`bg-white rounded-lg mx-6 p-6 w-80`}>
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-lg font-semibold text-gray-900`}>Display Options</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>Layout</Text>
          <View style={tw`flex-row gap-2 mb-6`}>
            {layouts.map(layout => (
              <TouchableOpacity
                key={layout.type}
                onPress={() => onLayoutChange(layout.type)}
                style={[
                  tw`flex-1 items-center p-3 rounded-lg border`,
                  currentLayout === layout.type ? tw`border-blue-500 bg-blue-50` : tw`border-gray-300`
                ]}
              >
                <MaterialIcons 
                  name={layout.icon as any} 
                  size={20} 
                  color={currentLayout === layout.type ? '#3B82F6' : '#6B7280'} 
                />
                <Text style={[
                  tw`text-xs mt-1`,
                  currentLayout === layout.type ? tw`text-blue-600` : tw`text-gray-600`
                ]}>
                  {layout.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={tw`text-sm font-medium text-gray-700 mb-3`}>Spacing</Text>
          <View style={tw`gap-2 mb-6`}>
            {paddingOptions.map(padding => (
              <TouchableOpacity
                key={padding.type}
                onPress={() => onPaddingChange(padding.type)}
                style={[
                  tw`flex-row items-center justify-between p-3 rounded-lg border`,
                  currentPadding === padding.type ? tw`border-blue-500 bg-blue-50` : tw`border-gray-300`
                ]}
              >
                <Text style={[
                  tw`font-medium`,
                  currentPadding === padding.type ? tw`text-blue-600` : tw`text-gray-700`
                ]}>
                  {padding.name}
                </Text>
                {currentPadding === padding.type && (
                  <MaterialIcons name="check" size={18} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            onPress={onClose}
            style={tw`bg-blue-500 rounded-lg p-3`}
          >
            <Text style={tw`text-white font-medium text-center`}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// Simple module card like iOS More screen
const ModuleCard = React.memo(({ 
  module, 
  isFavorite, 
  layoutType,
  paddingType,
  onPress, 
  onLongPress 
}: {
  module: ModuleCard;
  isFavorite: boolean;
  layoutType: LayoutType;
  paddingType: PaddingType;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const getCardWidth = () => {
    const padding = paddingType === 'compact' ? 32 : 48;
    const gap = paddingType === 'compact' ? 8 : 16;
    
    switch (layoutType) {
      case 'list': return screenWidth - padding;
      case 'grid-2': return (screenWidth - padding - gap) / 2;
      case 'grid-3': return (screenWidth - padding - gap * 2) / 3;
      case 'grid-4': return (screenWidth - padding - gap * 3) / 4;
      default: return (screenWidth - padding - gap) / 2;
    }
  };

  const getCardHeight = () => {
    const baseHeight = {
      'list': 60,
      'grid-2': 100,
      'grid-3': 90,
      'grid-4': 80
    }[layoutType] || 100;
    
    return paddingType === 'compact' ? baseHeight - 10 : baseHeight;
  };

  const getPadding = () => {
    if (layoutType === 'list') {
      return paddingType === 'compact' ? 'p-3' : 'p-4';
    }
    return paddingType === 'compact' ? 'p-3' : 'p-4';
  };

  const isCompact = layoutType === 'grid-3' || layoutType === 'grid-4';
  const isList = layoutType === 'list';
  const showDescription = (layoutType === 'list' || layoutType === 'grid-2') && !isCompact;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        tw`bg-white rounded-lg border border-gray-200`,
        isList ? tw`flex-row items-center ${getPadding()}` : tw`${getPadding()} items-center`,
        { 
          width: getCardWidth(), 
          minHeight: getCardHeight()
        }
      ]}
      activeOpacity={0.7}
    >
      {/* Favorite star */}
      {isFavorite && (
        <View style={tw`absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 items-center justify-center`}>
          <MaterialIcons name="star" size={10} color="white" />
        </View>
      )}

      {/* Icon */}
      <View style={[
        tw`rounded-lg bg-gray-100 items-center justify-center`,
        isList ? tw`w-10 h-10 mr-3` : tw`w-12 h-12 mb-2`,
        isCompact && tw`w-8 h-8 mb-1`
      ]}>
        <MaterialIcons 
          name={module.icon as any} 
          size={isList ? 20 : isCompact ? 16 : 24} 
          color={module.iconColor} 
        />
      </View>
      
      {/* Content */}
      <View style={isList ? tw`flex-1` : tw`flex-1 items-center`}>
        <Text style={[
          tw`font-medium text-gray-900`,
          isList ? tw`text-base` : isCompact ? tw`text-sm text-center` : tw`text-base text-center`
        ]} numberOfLines={1}>
          {module.name}
        </Text>
        
        {showDescription && (
          <Text style={[
            tw`text-gray-600 mt-1`,
            isList ? tw`text-sm` : tw`text-xs text-center`
          ]} numberOfLines={isList ? 1 : 2}>
            {module.description}
          </Text>
        )}
      </View>
      
      {isList && (
        <MaterialIcons name="chevron-right" size={16} color="#D1D5DB" />
      )}
    </TouchableOpacity>
  );
});

// Draggable favorite item
const DraggableFavoriteItem = ({ item, drag, isActive, onPress, onRemove }: RenderItemParams<ModuleCard> & {
  onPress: () => void;
  onRemove: () => void;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        tw`flex-row items-center p-4 bg-white border-b border-gray-200`,
        isActive && tw`bg-blue-50 shadow-lg`
      ]}
      activeOpacity={0.7}
    >
      <View style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center mr-3`}>
        <MaterialIcons name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`font-medium text-gray-900`}>{item.name}</Text>
        <Text style={tw`text-sm text-gray-600`}>{item.description}</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={tw`p-2 mr-2`}>
        <MaterialIcons name="remove-circle" size={20} color="#EF4444" />
      </TouchableOpacity>
      <TouchableOpacity
        onLongPress={drag}
        style={tw`p-2`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="drag-handle" size={24} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function MainDashboard() {
  const { user } = useAppStore();
  const { navigateToScreen } = useAppNavigation();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutType, setLayoutType] = useState<LayoutType>('grid-2');
  const [paddingType, setPaddingType] = useState<PaddingType>('comfy');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOrder, setFavoritesOrder] = useState<string[]>([]);
  const [showEditFavorites, setShowEditFavorites] = useState(false);
  const [todaysActivities, setTodaysActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Clean, simple modules with colored icons
  const moduleCards: ModuleCard[] = useMemo(() => [
    { id: 'crm', name: 'CRM', description: 'Customer management', icon: 'people', screenName: 'CRM Leads', iconColor: '#3B82F6' },
    { id: 'sales', name: 'Sales', description: 'Orders and deals', icon: 'trending-up', screenName: 'Sales Orders', iconColor: '#10B981' },
    { id: 'projects', name: 'Projects', description: 'Task management', icon: 'assignment', screenName: 'Projects', iconColor: '#8B5CF6' },
    { id: 'support', name: 'Support', description: 'Help desk tickets', icon: 'support', screenName: 'Helpdesk', iconColor: '#F59E0B' },
    { id: 'inventory', name: 'Inventory', description: 'Stock management', icon: 'inventory', screenName: 'Inventory', iconColor: '#EF4444' },
    { id: 'finance', name: 'Finance', description: 'Accounting', icon: 'account-balance', screenName: 'Accounting', iconColor: '#059669' },
    { id: 'team', name: 'Team', description: 'Employee management', icon: 'group', screenName: 'Employees', iconColor: '#DC2626' },
    { id: 'calendar', name: 'Calendar', description: 'Schedule', icon: 'event', screenName: 'Calendar', iconColor: '#7C3AED' },
    { id: 'documents', name: 'Files', description: 'Document storage', icon: 'folder', screenName: 'Attachments', iconColor: '#0891B2' },
    { id: 'chat', name: 'Chat', description: 'Team messaging', icon: 'chat', screenName: 'Chat', iconColor: '#EC4899' },
    { id: 'reports', name: 'Reports', description: 'Analytics', icon: 'analytics', screenName: 'Reports', iconColor: '#F97316' },
    { id: 'settings', name: 'Settings', description: 'App configuration', icon: 'settings', screenName: 'Settings', iconColor: '#6B7280' }
  ], []);

  // Get ordered favorites
  const orderedFavorites = useMemo(() => {
    const favoriteModules = moduleCards.filter(module => favorites.has(module.id));
    
    // Sort by saved order, then by name for new favorites
    return favoriteModules.sort((a, b) => {
      const aIndex = favoritesOrder.indexOf(a.id);
      const bIndex = favoritesOrder.indexOf(b.id);
      
      if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [favorites, favoritesOrder, moduleCards]);

  // Filter modules
  const filteredModules = useMemo(() => {
    if (!searchQuery) return moduleCards;
    return moduleCards.filter(module =>
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [moduleCards, searchQuery]);

  // Load preferences and activities
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedFavorites, savedOrder, savedLayout, savedPadding] = await Promise.all([
          AsyncStorage.getItem(FAVORITES_KEY),
          AsyncStorage.getItem(FAVORITES_ORDER_KEY),
          AsyncStorage.getItem(LAYOUT_PREFERENCE_KEY),
          AsyncStorage.getItem(PADDING_PREFERENCE_KEY)
        ]);
        
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        } else {
          setFavorites(new Set(['crm', 'sales', 'projects', 'support']));
        }
        
        if (savedOrder) {
          setFavoritesOrder(JSON.parse(savedOrder));
        }
        
        if (savedLayout) {
          setLayoutType(savedLayout as LayoutType);
        }
        
        if (savedPadding) {
          setPaddingType(savedPadding as PaddingType);
        }
        
        // Load today's activities
        await loadTodaysActivities();
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };
    loadData();
  }, []);

  const loadTodaysActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const client = authService?.getClient?.();
      if (!client) {
        setTodaysActivities([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const activities = await client.searchRead(
        'mail.activity',
        [['date_deadline', '=', today], ['user_id', '=', user?.id || false]],
        ['id', 'summary', 'activity_type_id', 'res_model', 'res_name', 'date_deadline'],
        { limit: 10, order: 'date_deadline asc' }
      );

      setTodaysActivities(activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setTodaysActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodaysActivities();
    setRefreshing(false);
  }, [loadTodaysActivities]);

  const toggleFavorite = useCallback((moduleId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(moduleId)) {
      newFavorites.delete(moduleId);
      // Remove from order
      setFavoritesOrder(prev => prev.filter(id => id !== moduleId));
    } else {
      newFavorites.add(moduleId);
      // Add to end of order
      setFavoritesOrder(prev => [...prev, moduleId]);
    }
    setFavorites(newFavorites);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [favorites]);

  const handleDragEnd = useCallback(({ data }: { data: ModuleCard[] }) => {
    const newOrder = data.map(item => item.id);
    setFavoritesOrder(newOrder);
    AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(newOrder));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('New order saved:', newOrder); // Debug log
  }, []);

  const removeFavorite = useCallback((moduleId: string) => {
    const newFavorites = new Set(favorites);
    newFavorites.delete(moduleId);
    setFavorites(newFavorites);
    setFavoritesOrder(prev => prev.filter(id => id !== moduleId));
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
    AsyncStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(favoritesOrder.filter(id => id !== moduleId)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [favorites, favoritesOrder]);

  const getGap = () => paddingType === 'compact' ? 8 : 16;
  const getContainerPadding = () => paddingType === 'compact' ? 'px-4 mb-4' : 'px-6 mb-6';

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScreenBadge screenNumber={1} />
      <Header
        user={user} 
        layoutType={layoutType}
        onSettingsPress={() => navigateToScreen('Settings')}
        onLayoutPress={() => setShowCustomModal(true)}
        onCameraPress={() => navigateToScreen('Mobile')}
      />
      
      <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <ScrollView
        style={tw`flex-1`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Favorites Section */}
        {!searchQuery && favorites.size > 0 && (
          <View style={tw`${getContainerPadding()}`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={tw`text-lg font-semibold text-gray-900`}>Favorites</Text>
              <TouchableOpacity 
                onPress={() => setShowEditFavorites(true)}
                style={tw`px-3 py-1 rounded-lg bg-blue-100`}
              >
                <Text style={tw`text-blue-600 font-medium text-sm`}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={[
              layoutType === 'list' ? tw`gap-3` : tw`flex-row flex-wrap`,
              { gap: layoutType !== 'list' ? getGap() : 0 }
            ]}>
              {orderedFavorites.map(module => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isFavorite={true}
                  layoutType={layoutType}
                  paddingType={paddingType}
                  onPress={() => navigateToScreen(module.screenName)}
                  onLongPress={() => toggleFavorite(module.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* My Activities Section */}
        {!searchQuery && (
          <MyActivities
            activities={todaysActivities}
            onActivityPress={() => navigateToScreen('Activities')}
            isLoading={activitiesLoading}
          />
        )}

        {/* All Modules */}
        <View style={tw`${getContainerPadding()}`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={tw`text-lg font-semibold text-gray-900`}>
              {searchQuery ? `Results (${filteredModules.length})` : 'All Modules'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                onPress={() => {
                  const layouts: LayoutType[] = ['grid-2', 'grid-3', 'grid-4', 'list'];
                  const currentIndex = layouts.indexOf(layoutType);
                  const nextIndex = (currentIndex + 1) % layouts.length;
                  const newLayout = layouts[nextIndex];
                  setLayoutType(newLayout);
                  AsyncStorage.setItem(LAYOUT_PREFERENCE_KEY, newLayout);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={tw`p-2 rounded-lg bg-gray-100`}
              >
                <MaterialIcons 
                  name={layoutType === 'list' ? 'grid-view' : 'view-list'} 
                  size={16} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={[
            layoutType === 'list' ? tw`gap-3` : tw`flex-row flex-wrap`,
            { gap: layoutType !== 'list' ? getGap() : 0 }
          ]}>
            {filteredModules.map(module => (
              <ModuleCard
                key={module.id}
                module={module}
                isFavorite={favorites.has(module.id)}
                layoutType={layoutType}
                paddingType={paddingType}
                onPress={() => navigateToScreen(module.screenName)}
                onLongPress={() => toggleFavorite(module.id)}
              />
            ))}
          </View>
        </View>

        <View style={tw`h-6`} />
      </ScrollView>

      {/* Edit Favorites Modal */}
      <Modal visible={showEditFavorites} animationType="slide" onRequestClose={() => setShowEditFavorites(false)}>
        <SafeAreaView style={tw`flex-1 bg-white`}>
          <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-200`}>
            <TouchableOpacity onPress={() => setShowEditFavorites(false)}>
              <Text style={tw`text-blue-600 font-medium text-lg`}>Done</Text>
            </TouchableOpacity>
            <Text style={tw`font-semibold text-gray-900 text-lg`}>Edit Favorites</Text>
            <View style={tw`w-12`} />
          </View>
          <View style={tw`p-4 bg-gray-50 border-b border-gray-200`}>
            <Text style={tw`text-sm text-gray-600 text-center`}>
              Drag the handles to reorder • Tap the red circle to remove
            </Text>
          </View>
          {orderedFavorites.length > 0 ? (
            <DraggableFlatList
              data={orderedFavorites}
              onDragEnd={handleDragEnd}
              keyExtractor={(item) => item.id}
              renderItem={(params) => (
                <DraggableFavoriteItem
                  {...params}
                  onPress={() => {
                    navigateToScreen(params.item.screenName);
                    setShowEditFavorites(false);
                  }}
                  onRemove={() => removeFavorite(params.item.id)}
                />
              )}
              activationDistance={10}
              containerStyle={tw`flex-1`}
            />
          ) : (
            <View style={tw`flex-1 items-center justify-center p-8`}>
              <MaterialIcons name="star-outline" size={64} color="#D1D5DB" />
              <Text style={tw`text-gray-500 text-center mt-4 text-lg`}>
                No favorites yet
              </Text>
              <Text style={tw`text-gray-400 text-center mt-2`}>
                Long press any module to add it to favorites
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Customization Modal */}
      <CustomizationModal
        visible={showCustomModal}
        currentLayout={layoutType}
        currentPadding={paddingType}
        onClose={() => setShowCustomModal(false)}
        onLayoutChange={(layout) => {
          setLayoutType(layout);
          AsyncStorage.setItem(LAYOUT_PREFERENCE_KEY, layout);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPaddingChange={(padding) => {
          setPaddingType(padding);
          AsyncStorage.setItem(PADDING_PREFERENCE_KEY, padding);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      />
    </SafeAreaView>
  );
}
