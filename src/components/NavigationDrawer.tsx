/**
 * Navigation Drawer Component
 * Sophisticated navigation with categories, search, and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  NavigationService,
  NavigationItem,
  navigationCategories,
  NavigationCategoryType,
  NavigationCategoryConfig
} from '../navigation/NavigationConfig';
import { useAppStore } from '../store';

const { width: screenWidth } = Dimensions.get('window');

interface NavigationDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (item: NavigationItem) => void;
  onScreenNavigate?: (screenName: string) => void;
  currentRoute?: string;
}

export default function NavigationDrawer({
  visible,
  onClose,
  onNavigate,
  onScreenNavigate,
  currentRoute,
}: NavigationDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NavigationCategoryType | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<NavigationCategoryType>>(new Set(['dashboard', 'sales']));
  
  const { user } = useAppStore();

  const allItems = NavigationService.getAvailableItems();
  const categories = Object.values(navigationCategories);

  const filteredItems = allItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
    // Map navigation items to actual screen names
    const screenMapping: Record<string, string> = {
      'home': 'Dashboard',
      'customers': 'Contacts',
      'activities': 'Activities',
      'calendar': 'Calendar',
      'sync': 'Sync',
      'messages': 'Messages',
      'attachments': 'Attachments',
      'projects': 'Projects',
      'sales-orders': 'Sales Orders',
      'employees': 'Employees',
      'leads': 'CRM Leads',
      'field-service': 'Mobile',
      'settings': 'Settings',
    };

    const screenName = screenMapping[item.id];
    if (screenName && onScreenNavigate) {
      onScreenNavigate(screenName);
    } else {
      onNavigate(item);
    }
    onClose();
  };

  const renderCategoryHeader = (category: NavigationCategoryConfig) => {
    const itemCount = groupedItems[category.id].length;
    const isExpanded = expandedCategories.has(category.id);
    
    if (itemCount === 0) return null;

    return (
      <TouchableOpacity
        key={category.id}
        style={styles.categoryHeader}
        onPress={() => toggleCategory(category.id)}
      >
        <View style={styles.categoryHeaderLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
            <MaterialIcons name={category.icon as any} size={18} color={category.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </View>
        </View>
        
        <View style={styles.categoryHeaderRight}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{itemCount}</Text>
          </View>
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
    const isActive = currentRoute === item.id;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.navigationItem, isActive && styles.navigationItemActive]}
        onPress={() => handleItemPress(item)}
      >
        <View style={[
          styles.itemIcon,
          { backgroundColor: isActive ? item.color + '20' : 'transparent' }
        ]}>
          <MaterialIcons 
            name={item.icon as any} 
            size={20} 
            color={isActive ? item.color : '#666'} 
          />
        </View>
        
        <View style={styles.itemContent}>
          <Text style={[
            styles.itemName,
            isActive && { color: item.color, fontWeight: '600' }
          ]}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
        </View>
        
        <View style={styles.itemRight}>
          {item.badge && (
            <View style={[styles.itemBadge, { backgroundColor: item.color }]}>
              <Text style={styles.itemBadgeText}>{item.badge}</Text>
            </View>
          )}
          {!item.available && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          )}
          <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => {
    const quickActions = [
      { id: 'new-order', name: 'New Order', icon: 'add-shopping-cart', color: '#34C759' },
      { id: 'new-activity', name: 'New Task', icon: 'add-task', color: '#FF9500' },
      { id: 'scan-barcode', name: 'Scan', icon: 'qr-code-scanner', color: '#9C27B0' },
      { id: 'take-photo', name: 'Photo', icon: 'camera-alt', color: '#007AFF' },
    ];

    return (
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.quickAction}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                <MaterialIcons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={styles.quickActionText}>{action.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Navigation</Text>
              <Text style={styles.headerSubtitle}>
                {user?.name || 'Odoo Mobile'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.profileButton}>
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

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryFilterChip,
              selectedCategory === 'all' && styles.categoryFilterChipActive
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <MaterialIcons name="apps" size={16} color={selectedCategory === 'all' ? '#FFF' : '#666'} />
            <Text style={[
              styles.categoryFilterText,
              selectedCategory === 'all' && styles.categoryFilterTextActive
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryFilterChip,
                selectedCategory === category.id && styles.categoryFilterChipActive,
                selectedCategory === category.id && { backgroundColor: category.color }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <MaterialIcons 
                name={category.icon as any} 
                size={16} 
                color={selectedCategory === category.id ? '#FFF' : category.color} 
              />
              <Text style={[
                styles.categoryFilterText,
                selectedCategory === category.id && styles.categoryFilterTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        {searchQuery === '' && selectedCategory === 'all' && renderQuickActions()}

        {/* Navigation Items */}
        <ScrollView style={styles.navigationList}>
          {selectedCategory === 'all' ? (
            // Show grouped by category
            categories.map((category) => {
              const categoryItems = groupedItems[category.id];
              const isExpanded = expandedCategories.has(category.id);
              
              return (
                <View key={category.id}>
                  {renderCategoryHeader(category)}
                  {isExpanded && categoryItems.map(renderNavigationItem)}
                </View>
              );
            })
          ) : (
            // Show filtered items
            filteredItems.map(renderNavigationItem)
          )}

          {filteredItems.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={48} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or category filter
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Odoo Mobile • Version 1.0.0
          </Text>
          <TouchableOpacity style={styles.feedbackButton}>
            <MaterialIcons name="feedback" size={16} color="#007AFF" />
            <Text style={styles.feedbackText}>Send Feedback</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  categoryFilter: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    gap: 4,
  },
  categoryFilterChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  categoryFilterTextActive: {
    color: '#FFF',
  },
  quickActions: {
    padding: 16,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  navigationList: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  navigationItemActive: {
    backgroundColor: '#F8F9FA',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  itemBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  comingSoonBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});
