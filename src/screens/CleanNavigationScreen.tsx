/**
 * Clean Navigation Screen - Main Dashboard
 * Based on NavigationDrawer but as a full screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Alert,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  NavigationService,
  NavigationItem,
  navigationCategories,
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

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export default function CleanNavigationScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NavigationCategoryType | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<NavigationCategoryType>>(
    new Set(['dashboard', 'sales'])
  );
  const [refreshing, setRefreshing] = useState(false);
  const [todaysActivities, setTodaysActivities] = useState<ActivityItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { user } = useAppStore();
  const { navigateToScreen } = useAppNavigation();

  const allItems = NavigationService.getAvailableItems().filter(item =>
    item.id !== 'home' && item.id !== 'analytics' // Remove Dashboard and Home items
  );
  const categories = Object.values(navigationCategories);

  // Quick actions
  const quickActions: QuickAction[] = [
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
  ];

  useEffect(() => {
    loadTodaysActivities();
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    // In a real app, this would load from AsyncStorage
    // For now, we'll use some default favorites
    setFavorites(new Set(['customers', 'activities', 'sales-orders']));
  };

  const saveFavorites = (newFavorites: Set<string>) => {
    // In a real app, this would save to AsyncStorage
    setFavorites(newFavorites);
  };

  const toggleFavorite = (itemId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
      Alert.alert('Removed from Favorites', 'Item removed from your favorites');
    } else {
      newFavorites.add(itemId);
      Vibration.vibrate(50); // Haptic feedback
      Alert.alert('Added to Favorites', 'Item added to your favorites');
    }
    saveFavorites(newFavorites);
  };

  const loadTodaysActivities = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const today = new Date().toISOString().split('T')[0];
      const activities = await client.searchRead('mail.activity',
        [['date_deadline', '=', today]],
        ['id', 'summary', 'activity_type_id', 'res_model', 'res_name', 'date_deadline', 'user_id'],
        { limit: 5, order: 'date_deadline asc' }
      );

      setTodaysActivities(activities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTodaysActivities();
    setRefreshing(false);
  };

  // Filter items based on search and category
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group items by category
  const groupedItems = categories.reduce((acc, category) => {
    acc[category.id] = filteredItems.filter(item => item.category === category.id);
    return acc;
  }, {} as Record<NavigationCategoryType, NavigationItem[]>);

  const toggleCategory = (categoryId: NavigationCategoryType) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleItemPress = (item: NavigationItem) => {
    const screenMapping: Record<string, string> = {
      'home': 'Dashboard',
      'customers': 'Contacts',
      'activities': 'Activities',
      'calendar': 'Calendar',
      'sync': 'Sync',
      'data': 'Data',
      'test': 'Testing',
      'camera': 'Documentation',
      'messages': 'Messages',
      'attachments': 'Attachments',
      'projects': 'Projects',
      'helpdesk': 'Helpdesk',
      'sales-orders': 'Sales Orders',
      'employees': 'Employees',
      'leads': 'CRM Leads',
      'field-service': 'Mobile',
      'settings': 'Settings',
    };

    const screenName = screenMapping[item.id];
    if (screenName) {
      navigateToScreen(screenName);
    } else {
      console.warn(`No screen mapping found for item: ${item.id}`);
    }
  };

  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity key={action.id} style={styles.quickAction} onPress={action.onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
        <MaterialIcons name={action.icon as any} size={24} color={action.color} />
      </View>
      <Text style={styles.quickActionText}>{action.name}</Text>
    </TouchableOpacity>
  );

  const renderActivityItem = (activity: ActivityItem) => (
    <TouchableOpacity key={activity.id} style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: '#FF950015' }]}>
        <MaterialIcons name="event-note" size={16} color="#FF9500" />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {activity.summary}
        </Text>
        <Text style={styles.activitySubtitle} numberOfLines={1}>
          {activity.res_name} • {activity.activity_type_id[1]}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );

  const renderCategoryHeader = (category: any) => {
    const isExpanded = expandedCategories.has(category.id);
    const itemCount = groupedItems[category.id]?.length || 0;
    
    return (
      <TouchableOpacity
        key={category.id}
        style={styles.categoryHeader}
        onPress={() => toggleCategory(category.id)}
      >
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
            <MaterialIcons name={category.icon as any} size={20} color={category.color} />
          </View>
          <View style={styles.categoryText}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </View>
        </View>
        <View style={styles.categoryMeta}>
          <Text style={styles.categoryCount}>{itemCount}</Text>
          <MaterialIcons 
            name={isExpanded ? 'expand-less' : 'expand-more'} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const isFavorite = favorites.has(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.navigationItem}
        onPress={() => handleItemPress(item)}
        onLongPress={() => toggleFavorite(item.id)}
        delayLongPress={500}
      >
        <View style={[styles.itemIcon, { backgroundColor: item.color + '15' }]}>
          <MaterialIcons name={item.icon as any} size={18} color={item.color} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
        </View>
        <View style={styles.itemActions}>
          {isFavorite && (
            <MaterialIcons name="star" size={16} color="#FFD700" style={styles.favoriteIcon} />
          )}
          <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Navigation</Text>
          <Text style={styles.headerSubtitle}>{user?.name || 'Mark Shaw'}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigateToScreen('Settings')}
        >
          <MaterialIcons name="account-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search features..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Filters - Compact */}
        <View style={styles.categoryFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <MaterialIcons name="apps" size={16} color={selectedCategory === 'all' ? '#FFF' : '#666'} />
              <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.filterChip, selectedCategory === category.id && styles.filterChipActive]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <MaterialIcons 
                  name={category.icon as any} 
                  size={16} 
                  color={selectedCategory === category.id ? '#FFF' : category.color} 
                />
                <Text style={[styles.filterChipText, selectedCategory === category.id && styles.filterChipTextActive]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Favorites */}
        {favorites.size > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorites</Text>
              <Text style={styles.seeAllText}>{favorites.size} items</Text>
            </View>
            <View style={styles.favoritesList}>
              {allItems
                .filter(item => favorites.has(item.id))
                .map(renderNavigationItem)}
            </View>
          </View>
        )}

        {/* Today's Activities */}
        {todaysActivities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Activities</Text>
              <TouchableOpacity onPress={() => navigateToScreen('Activities')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activitiesList}>
              {todaysActivities.map(renderActivityItem)}
            </View>
          </View>
        )}

        {/* Navigation Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Features</Text>
            <Text style={styles.hintText}>Long press to favorite</Text>
          </View>
          {selectedCategory === 'all' ? (
            categories.map((category) => {
              const categoryItems = groupedItems[category.id];
              const isExpanded = expandedCategories.has(category.id);
              
              if (categoryItems.length === 0) return null;
              
              return (
                <View key={category.id} style={styles.categorySection}>
                  {renderCategoryHeader(category)}
                  {isExpanded && (
                    <View style={styles.categoryItems}>
                      {categoryItems.map(renderNavigationItem)}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.categoryItems}>
              {filteredItems.map(renderNavigationItem)}
            </View>
          )}
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  categoryFilters: {
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  activitiesList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  favoritesList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#666',
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  categoryItems: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteIcon: {
    marginRight: 4,
  },
  footerSpace: {
    height: 32,
  },
});
