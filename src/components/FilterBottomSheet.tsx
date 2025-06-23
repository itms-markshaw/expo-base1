/**
 * Filter Bottom Sheet Component
 * Reusable filter interface for lists
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';

interface FilterOption {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  filters: FilterOption[];
  selectedFilter: string;
  onFilterSelect: (filterId: string) => void;
  sortOptions?: {
    id: string;
    name: string;
    icon: string;
  }[];
  selectedSort?: string;
  onSortSelect?: (sortId: string) => void;
}

export default function FilterBottomSheet({
  visible,
  onClose,
  title,
  filters,
  selectedFilter,
  onFilterSelect,
  sortOptions,
  selectedSort,
  onSortSelect,
}: FilterBottomSheetProps) {

  console.log('FilterBottomSheet render:', { visible, title, filtersCount: filters.length });

  const handleFilterSelect = (filterId: string) => {
    onFilterSelect(filterId);
    onClose();
  };

  const handleSortSelect = (sortId: string) => {
    if (onSortSelect) {
      onSortSelect(sortId);
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      height={60}
    >
      <View style={styles.container}>
        {/* Filters Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filter by</Text>
          <View style={styles.optionsGrid}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterOption,
                  selectedFilter === filter.id && styles.filterOptionActive
                ]}
                onPress={() => handleFilterSelect(filter.id)}
              >
                <View style={styles.filterOptionContent}>
                  <MaterialIcons
                    name={filter.icon as any}
                    size={20}
                    color={selectedFilter === filter.id ? '#007AFF' : '#666'}
                  />
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === filter.id && styles.filterOptionTextActive
                  ]}>
                    {filter.name}
                  </Text>
                  {filter.count > 0 && (
                    <View style={[
                      styles.filterBadge,
                      selectedFilter === filter.id && styles.filterBadgeActive
                    ]}>
                      <Text style={[
                        styles.filterBadgeText,
                        selectedFilter === filter.id && styles.filterBadgeTextActive
                      ]}>
                        {filter.count}
                      </Text>
                    </View>
                  )}
                </View>
                {selectedFilter === filter.id && (
                  <MaterialIcons name="check" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sort Section */}
        {sortOptions && sortOptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort by</Text>
            <View style={styles.optionsGrid}>
              {sortOptions.map((sort) => (
                <TouchableOpacity
                  key={sort.id}
                  style={[
                    styles.sortOption,
                    selectedSort === sort.id && styles.sortOptionActive
                  ]}
                  onPress={() => handleSortSelect(sort.id)}
                >
                  <View style={styles.sortOptionContent}>
                    <MaterialIcons
                      name={sort.icon as any}
                      size={20}
                      color={selectedSort === sort.id ? '#007AFF' : '#666'}
                    />
                    <Text style={[
                      styles.sortOptionText,
                      selectedSort === sort.id && styles.sortOptionTextActive
                    ]}>
                      {sort.name}
                    </Text>
                  </View>
                  {selectedSort === sort.id && (
                    <MaterialIcons name="check" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  optionsGrid: {
    gap: 6,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 6,
  },
  filterOptionActive: {
    backgroundColor: '#FFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  filterOptionTextActive: {
    color: '#007AFF',
  },
  filterBadge: {
    backgroundColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#007AFF',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#FFF',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortOptionActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  sortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  sortOptionTextActive: {
    color: '#007AFF',
  },
});
