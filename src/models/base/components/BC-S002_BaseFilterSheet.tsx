/**
 * BC-S002_BaseFilterSheet - Universal filter bottom sheet for all list views
 * Component Reference: BC-S002
 * 
 * Universal filter component that provides consistent filtering functionality
 * across all list views with dynamic filter options and smooth animations
 */

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const { height: screenHeight } = Dimensions.get('window');

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'boolean' | 'date' | 'range';
  options?: { label: string; value: any }[];
  value?: any;
  defaultValue?: any;
}

export interface FilterGroup {
  title: string;
  filters: FilterOption[];
}

interface BaseFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  filterGroups: FilterGroup[];
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  onReset?: () => void;
  onApply?: (filters: Record<string, any>) => void;
}

/**
 * BC-S002: Universal Filter Sheet Component
 * 
 * Features:
 * - Dynamic filter groups and options
 * - Multiple filter types (select, boolean, date, range)
 * - Real-time filter preview
 * - Reset and apply actions
 * - Smooth bottom sheet animations
 * - Responsive design
 */
export default function BaseFilterSheet({
  visible,
  onClose,
  title = 'Filters',
  filterGroups,
  activeFilters,
  onFiltersChange,
  onReset,
  onApply,
}: BaseFilterSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(activeFilters);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    setIsFullScreen(index === 1);
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Open/close sheet based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  // Update local filters when active filters change
  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  // Handle filter value change
  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, onFiltersChange]);

  // Handle reset filters
  const handleReset = useCallback(() => {
    const resetFilters: Record<string, any> = {};
    filterGroups.forEach(group => {
      group.filters.forEach(filter => {
        if (filter.defaultValue !== undefined) {
          resetFilters[filter.key] = filter.defaultValue;
        }
      });
    });
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset?.();
  }, [filterGroups, onFiltersChange, onReset]);

  // Handle apply filters
  const handleApply = useCallback(() => {
    onApply?.(localFilters);
    onClose();
  }, [localFilters, onApply, onClose]);

  // Render filter option based on type
  const renderFilterOption = useCallback((filter: FilterOption) => {
    const value = localFilters[filter.key];

    switch (filter.type) {
      case 'boolean':
        return (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{filter.label}</Text>
            <Switch
              value={value || false}
              onValueChange={(newValue) => handleFilterChange(filter.key, newValue)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        );

      case 'select':
        return (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>{filter.label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.optionsRow}>
                {filter.options?.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionChip,
                      value === option.value && styles.selectedChip
                    ]}
                    onPress={() => handleFilterChange(filter.key, option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      value === option.value && styles.selectedText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 'date':
        return (
          <TouchableOpacity
            style={styles.filterRow}
            onPress={() => {
              // TODO: Implement date picker
              console.log('Date picker for', filter.key);
            }}
          >
            <Text style={styles.filterLabel}>{filter.label}</Text>
            <View style={styles.dateValue}>
              <Text style={styles.dateText}>
                {value ? new Date(value).toLocaleDateString() : 'Select date'}
              </Text>
              <MaterialIcons name="date-range" size={20} color="#8E8E93" />
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  }, [localFilters, handleFilterChange]);

  // Render filter group
  const renderFilterGroup = useCallback((group: FilterGroup) => (
    <View key={group.title} style={styles.groupContainer}>
      <Text style={styles.groupTitle}>{group.title}</Text>
      {group.filters.map(renderFilterOption)}
    </View>
  ), [renderFilterOption]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Start closed
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableContentPanningGesture={!isFullScreen}
      activeOffsetY={isFullScreen ? [-1, 1] : undefined}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
    >
      <BottomSheetView style={styles.bottomSheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.close()}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Filter Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {filterGroups.map(renderFilterGroup)}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#C7C7CC',
  },
  bottomSheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  dateValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
