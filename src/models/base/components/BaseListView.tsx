/**
 * Base List View Component
 * Universal list component for all Odoo models
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BaseModel, BaseListViewProps, FilterOption } from '../types/BaseModel';

interface BaseListViewComponentProps<T extends BaseModel> extends BaseListViewProps<T> {
  renderItem: (item: T) => React.ReactElement;
  emptyStateIcon?: string;
  emptyStateTitle?: string;
  emptyStateSubtext?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
  headerTitle?: string;
  headerSubtitle?: string;
}

export default function BaseListView<T extends BaseModel>({
  data,
  loading = false,
  refreshing = false,
  onRefresh,
  onItemPress,
  searchQuery = '',
  onSearchChange,
  filters = [],
  activeFilter = 'all',
  onFilterChange,
  renderItem,
  emptyStateIcon = 'inbox',
  emptyStateTitle = 'No records found',
  emptyStateSubtext = 'Try adjusting your search or filters',
  showSearch = true,
  showFilters = true,
  showAddButton = true,
  onAddPress,
  headerTitle = 'Records',
  headerSubtitle,
}: BaseListViewComponentProps<T>) {
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const filteredData = data.filter(item => {
    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        item.display_name,
        (item as any).name,
        (item as any).email,
        (item as any).phone,
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Apply active filter
    if (activeFilter && activeFilter !== 'all') {
      const filter = filters.find(f => f.id === activeFilter);
      if (filter && filter.value) {
        // Apply filter logic based on filter type
        // This is a simplified implementation - extend as needed
        return true;
      }
    }

    return true;
  });

  const renderListItem = ({ item }: { item: T }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => onItemPress?.(item)}
      activeOpacity={0.7}
    >
      {renderItem(item)}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <Text style={styles.headerSubtitle}>
          {headerSubtitle || `${filteredData.length} records`}
        </Text>
      </View>
      <View style={styles.headerActions}>
        {showFilters && filters.length > 0 && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterSheet(true)}
          >
            <MaterialIcons name="filter-list" size={20} color="#007AFF" />
            {activeFilter !== 'all' && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        )}
        {showAddButton && onAddPress && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <MaterialIcons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor="#8E8E93"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onSearchChange?.('')}
          >
            <MaterialIcons name="clear" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFilterTabs = () => {
    if (!showFilters || filters.length === 0) return null;

    return (
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'all' && styles.activeFilterTab
          ]}
          onPress={() => onFilterChange?.('all')}
        >
          <Text style={[
            styles.filterTabText,
            activeFilter === 'all' && styles.activeFilterTabText
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {filters.slice(0, 3).map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterTab,
              activeFilter === filter.id && styles.activeFilterTab
            ]}
            onPress={() => onFilterChange?.(filter.id)}
          >
            <Text style={[
              styles.filterTabText,
              activeFilter === filter.id && styles.activeFilterTabText
            ]}>
              {filter.label}
              {filter.count !== undefined && ` (${filter.count})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name={emptyStateIcon as any} size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>{emptyStateTitle}</Text>
      <Text style={styles.emptySubtext}>{emptyStateSubtext}</Text>
      {showAddButton && onAddPress && (
        <TouchableOpacity style={styles.emptyAddButton} onPress={onAddPress}>
          <MaterialIcons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyAddButtonText}>Add First Record</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && data.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSearchBar()}
      {renderFilterTabs()}
      
      <FlatList
        data={filteredData}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredData.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
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
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeFilterTabText: {
    color: '#FFF',
  },
  listItem: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  emptyAddButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
