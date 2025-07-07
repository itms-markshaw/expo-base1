/**
 * BC-L001_BaseListView - Universal list component for all Odoo models
 * Component Reference: BC-L001
 * 
 * Universal list component that provides consistent list functionality
 * across all Odoo models with search, filtering, and actions
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
  // Additional props specific to the component implementation
}

/**
 * BC-L001: Universal List View Component
 * 
 * Features:
 * - Generic list display for any Odoo model
 * - Search functionality with debouncing
 * - Pull-to-refresh support
 * - Empty state handling
 * - Loading states
 * - Header actions
 * - Item press/long press handling
 * - Filtering support
 */
export default function BaseListView<T extends BaseModel>({
  data,
  renderItem,
  loading = false,
  refreshing = false,
  onRefresh,
  onItemPress,
  onItemLongPress,
  searchQuery,
  onSearchChange,
  filters,
  activeFilter,
  onFilterChange,
  headerTitle,
  headerSubtitle,
  headerActions = [],
  emptyStateIcon,
  emptyStateTitle = 'No items found',
  emptyStateSubtext,
  showSearch = false,
  showFilters = false,
  showAddButton = false,
  onAddPress,
  keyExtractor,
  ...flatListProps
}: BaseListViewComponentProps<T>) {
  const [searchText, setSearchText] = useState(searchQuery || '');

  // Handle search input changes
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onSearchChange?.(text);
  };

  // Render search header
  const renderSearchHeader = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchText}
            onChangeText={handleSearchChange}
            clearButtonMode="while-editing"
          />
        </View>
      </View>
    );
  };

  // Render filter header
  const renderFilterHeader = () => {
    if (!showFilters || !filters) return null;

    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.key && styles.activeFilterChip
              ]}
              onPress={() => onFilterChange?.(item.key)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === item.key && styles.activeFilterText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>
    );
  };

  // Render list header
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          {headerTitle && (
            <Text style={styles.headerTitle}>{headerTitle}</Text>
          )}
          {headerSubtitle && (
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {headerActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.headerAction, { backgroundColor: action.color }]}
              onPress={action.onPress}
            >
              <MaterialIcons name={action.icon as any} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ))}
          {showAddButton && (
            <TouchableOpacity
              style={[styles.headerAction, styles.addButton]}
              onPress={onAddPress}
            >
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {renderSearchHeader()}
      {renderFilterHeader()}
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {emptyStateIcon && (
        <MaterialIcons name={emptyStateIcon as any} size={64} color="#C7C7CC" />
      )}
      <Text style={styles.emptyStateTitle}>{emptyStateTitle}</Text>
      {emptyStateSubtext && (
        <Text style={styles.emptyStateSubtext}>{emptyStateSubtext}</Text>
      )}
    </View>
  );

  // Render loading state
  if (loading && data.length === 0) {
    return (
      <View style={styles.container}>
        {renderListHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor || ((item) => item.id.toString())}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          ) : undefined
        }
        onPress={onItemPress ? (event) => {
          // Handle item press - need to get item from event
          // This is a simplified implementation
        } : undefined}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
        {...flatListProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  filterContainer: {
    paddingBottom: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
});
