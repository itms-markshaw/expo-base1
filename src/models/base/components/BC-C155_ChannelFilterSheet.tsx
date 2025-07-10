/**
 * BC-C155_ChannelFilterSheet.tsx - Channel List Filter Bottom Sheet
 * 
 * Features:
 * - Group by: Direct Messages vs Channels
 * - Sort by: Name, Last Activity, Member Count
 * - Filter by: Open, Closed, Folded channels
 * - Save filter preferences
 * - Smooth bottom sheet animation
 * 
 * Props:
 * - isVisible: Whether sheet is visible
 * - onClose: Close callback
 * - currentFilters: Current filter state
 * - onFiltersChange: Filter change callback
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

export interface ChannelFilters {
  // Grouping
  groupBy: 'none' | 'type' | 'status';
  
  // Sorting
  sortBy: 'name' | 'activity' | 'members' | 'unread';
  sortOrder: 'asc' | 'desc';
  
  // Visibility filters
  showDirectMessages: boolean;
  showChannels: boolean;
  showClosedChannels: boolean;
  showFoldedChannels: boolean;
  
  // Additional filters
  showEmptyChannels: boolean;
  showArchivedChannels: boolean;
}

interface ChannelFilterSheetProps {
  isVisible: boolean;
  onClose: () => void;
  currentFilters: ChannelFilters;
  onFiltersChange: (filters: ChannelFilters) => void;
}

const ChannelFilterSheet: React.FC<ChannelFilterSheetProps> = ({
  isVisible,
  onClose,
  currentFilters,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState<ChannelFilters>(currentFilters);
  const [slideAnim] = useState(new Animated.Value(SHEET_HEIGHT));

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleClose = () => {
    onClose();
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: ChannelFilters = {
      groupBy: 'type',
      sortBy: 'activity',
      sortOrder: 'desc',
      showDirectMessages: true,
      showChannels: true,
      showClosedChannels: false,
      showFoldedChannels: false,
      showEmptyChannels: true,
      showArchivedChannels: false,
    };
    setLocalFilters(defaultFilters);
  };

  const updateFilter = <K extends keyof ChannelFilters>(
    key: K,
    value: ChannelFilters[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const renderGroupBySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Group By</Text>
      
      {[
        { key: 'none', label: 'No Grouping', icon: 'list' },
        { key: 'type', label: 'Channel Type', icon: 'category' },
        { key: 'status', label: 'Status', icon: 'visibility' },
      ].map(option => (
        <TouchableOpacity
          key={option.key}
          style={styles.optionRow}
          onPress={() => updateFilter('groupBy', option.key as any)}
        >
          <MaterialIcons name={option.icon as any} size={20} color="#007AFF" />
          <Text style={styles.optionLabel}>{option.label}</Text>
          <MaterialIcons
            name={localFilters.groupBy === option.key ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSortBySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sort By</Text>
      
      {[
        { key: 'name', label: 'Name', icon: 'sort-by-alpha' },
        { key: 'activity', label: 'Last Activity', icon: 'schedule' },
        { key: 'members', label: 'Member Count', icon: 'group' },
        { key: 'unread', label: 'Unread Messages', icon: 'mark-unread-chat-alt' },
      ].map(option => (
        <TouchableOpacity
          key={option.key}
          style={styles.optionRow}
          onPress={() => updateFilter('sortBy', option.key as any)}
        >
          <MaterialIcons name={option.icon as any} size={20} color="#007AFF" />
          <Text style={styles.optionLabel}>{option.label}</Text>
          <MaterialIcons
            name={localFilters.sortBy === option.key ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>
      ))}
      
      {/* Sort Order */}
      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => updateFilter('sortOrder', localFilters.sortOrder === 'asc' ? 'desc' : 'asc')}
      >
        <MaterialIcons 
          name={localFilters.sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
          size={20} 
          color="#007AFF" 
        />
        <Text style={styles.optionLabel}>
          {localFilters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Text>
        <Switch
          value={localFilters.sortOrder === 'desc'}
          onValueChange={(value) => updateFilter('sortOrder', value ? 'desc' : 'asc')}
          trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
          thumbColor="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );

  const renderVisibilitySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Show Channels</Text>
      
      {[
        { key: 'showDirectMessages', label: 'Direct Messages', icon: 'chat' },
        { key: 'showChannels', label: 'Group Channels', icon: 'group' },
        { key: 'showClosedChannels', label: 'Closed Channels', icon: 'visibility-off' },
        { key: 'showFoldedChannels', label: 'Folded Channels', icon: 'folder' },
        { key: 'showEmptyChannels', label: 'Empty Channels', icon: 'chat-bubble-outline' },
        { key: 'showArchivedChannels', label: 'Archived Channels', icon: 'archive' },
      ].map(option => (
        <TouchableOpacity
          key={option.key}
          style={styles.optionRow}
          onPress={() => updateFilter(option.key as keyof ChannelFilters, !localFilters[option.key as keyof ChannelFilters])}
        >
          <MaterialIcons name={option.icon as any} size={20} color="#007AFF" />
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Switch
            value={localFilters[option.key as keyof ChannelFilters] as boolean}
            onValueChange={(value) => updateFilter(option.key as keyof ChannelFilters, value)}
            trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
            thumbColor="#FFFFFF"
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
            
            <Text style={styles.title}>Filter Channels</Text>
            
            <TouchableOpacity onPress={handleApply}>
              <Text style={styles.applyButton}>Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderGroupBySection()}
            {renderSortBySection()}
            {renderVisibilitySection()}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  resetButton: {
    fontSize: 16,
    color: '#8E8E93',
  },
  applyButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
});

export default ChannelFilterSheet;
