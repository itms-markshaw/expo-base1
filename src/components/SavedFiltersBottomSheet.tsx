/**
 * Saved Filters Bottom Sheet Component
 * Manages saved filter combinations for helpdesk tickets
 */

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { authService } from '../models/base/services/BaseAuthService';

interface HelpdeskFilters {
  stages: string[];
  teams: string[];
  assignees: string[];
  types: string[];
  priorities: string[];
}

interface SavedFilter {
  id: number;
  name: string;
  filters: HelpdeskFilters;
  user_id: number;
  is_default: boolean;
  domain: string;
}

interface SavedFiltersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectFilter: (filters: HelpdeskFilters) => void;
}

export default function SavedFiltersBottomSheet({
  visible,
  onClose,
  onSelectFilter,
}: SavedFiltersBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
      loadSavedFilters();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const loadSavedFilters = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      // Load saved filters from ir.filters for helpdesk.ticket model
      // First try to get the model ID for helpdesk.ticket
      let modelCondition;
      try {
        const modelData = await client.searchRead('ir.model', [['model', '=', 'helpdesk.ticket']], ['id']);
        if (modelData.length > 0) {
          modelCondition = ['model_id', '=', modelData[0].id];
        } else {
          modelCondition = ['model_id', '=', 'helpdesk.ticket']; // Fallback
        }
      } catch (error) {
        modelCondition = ['model_id', '=', 'helpdesk.ticket']; // Fallback
      }

      const filterData = await client.searchRead('ir.filters',
        [modelCondition, '|', ['user_id', '=', client.uid], ['user_id', '=', false]], // Include global filters
        ['name', 'domain', 'context', 'is_default', 'user_id'],
        { order: 'name asc' }
      );

      console.log('🔖 Found saved filters:', filterData.length);
      if (filterData.length > 0) {
        console.log('📋 Sample filter:', JSON.stringify(filterData[0], null, 2));
      }

      const parsedFilters = filterData.map(filter => ({
        id: filter.id,
        name: filter.name,
        filters: parseOdooFilter(filter.domain),
        user_id: filter.user_id[0],
        is_default: filter.is_default,
        domain: filter.domain
      }));

      setSavedFilters(parsedFilters);
    } catch (error) {
      console.warn('Could not load saved filters:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const parseOdooFilter = (domain: string): HelpdeskFilters => {
    // Parse Odoo domain format to our filter structure
    const parsedFilters: HelpdeskFilters = {
      stages: [],
      teams: [],
      assignees: [],
      types: [],
      priorities: []
    };

    try {
      let domainArray;

      // Handle different domain formats
      if (typeof domain === 'string') {
        if (domain.startsWith('[') || domain.startsWith('(')) {
          domainArray = JSON.parse(domain);
        } else {
          // Try to evaluate as Python-like expression
          domainArray = eval(domain);
        }
      } else if (Array.isArray(domain)) {
        domainArray = domain;
      }

      if (!Array.isArray(domainArray)) {
        console.warn('Domain is not an array:', domain);
        return parsedFilters;
      }

      console.log('🔍 Parsing domain:', domainArray);

      const parseConditions = (conditions) => {
        conditions.forEach(condition => {
          if (Array.isArray(condition) && condition.length >= 3) {
            const [field, operator, value] = condition;

            console.log(`📋 Parsing condition: ${field} ${operator}`, value);

            if (field === 'stage_id') {
              if (operator === 'in' && Array.isArray(value)) {
                parsedFilters.stages = value.map(v => String(v));
              } else if (operator === '=' && value) {
                parsedFilters.stages = [String(value)];
              }
            } else if (field === 'team_id') {
              if (operator === 'in' && Array.isArray(value)) {
                parsedFilters.teams = value.map(v => String(v));
              } else if (operator === '=' && value) {
                parsedFilters.teams = [String(value)];
              }
            } else if (field === 'user_id') {
              if (operator === 'in' && Array.isArray(value)) {
                parsedFilters.assignees = value.map(v => String(v));
              } else if (operator === '=' && value) {
                parsedFilters.assignees = [String(value)];
              }
            } else if (field === 'priority') {
              if (operator === 'in' && Array.isArray(value)) {
                parsedFilters.priorities = value.map(v => String(v));
              } else if (operator === '=' && value) {
                parsedFilters.priorities = [String(value)];
              }
            }
          } else if (Array.isArray(condition)) {
            // Handle nested conditions
            parseConditions(condition);
          }
        });
      };

      parseConditions(domainArray);

      console.log('✅ Parsed filters:', parsedFilters);
    } catch (error) {
      console.warn('Failed to parse domain:', error, 'Domain:', domain);
    }

    return parsedFilters;
  };

  const handleSelectFilter = (filter: SavedFilter) => {
    onSelectFilter(filter.filters);
    onClose();
  };

  const handleDeleteFilter = async (filterId: number, filterName: string) => {
    Alert.alert(
      'Delete Filter',
      `Are you sure you want to delete "${filterName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = authService.getClient();
              if (!client) return;

              await client.delete('ir.filters', [filterId]);
              await loadSavedFilters(); // Reload the list
            } catch (error) {
              console.error('Failed to delete filter:', error);
              Alert.alert('Error', 'Failed to delete filter');
            }
          }
        }
      ]
    );
  };

  const renderFilterItem = ({ item }: { item: SavedFilter }) => (
    <TouchableOpacity
      style={styles.filterItem}
      onPress={() => handleSelectFilter(item)}
    >
      <View style={styles.filterInfo}>
        <View style={styles.filterHeader}>
          <MaterialIcons name="bookmark" size={20} color="#007AFF" />
          <Text style={styles.filterName}>{item.name}</Text>
          {item.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          )}
        </View>
        
        <View style={styles.filterSummary}>
          {item.filters.stages.length > 0 && (
            <Text style={styles.filterDetail}>
              Stages: {item.filters.stages.slice(0, 2).join(', ')}
              {item.filters.stages.length > 2 && ` +${item.filters.stages.length - 2} more`}
            </Text>
          )}
          {item.filters.teams.length > 0 && (
            <Text style={styles.filterDetail}>
              Teams: {item.filters.teams.slice(0, 2).join(', ')}
              {item.filters.teams.length > 2 && ` +${item.filters.teams.length - 2} more`}
            </Text>
          )}
          {item.filters.assignees.length > 0 && (
            <Text style={styles.filterDetail}>
              Assignees: {item.filters.assignees.slice(0, 2).join(', ')}
              {item.filters.assignees.length > 2 && ` +${item.filters.assignees.length - 2} more`}
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteFilter(item.id, item.name)}
      >
        <MaterialIcons name="delete" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Saved Filters</Text>
            <Text style={styles.subtitle}>
              {savedFilters.length} saved filter{savedFilters.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading saved filters...</Text>
          </View>
        ) : savedFilters.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="bookmark-border" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Saved Filters</Text>
            <Text style={styles.emptySubtext}>
              Save your filter combinations to quickly access them later
            </Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={savedFilters}
            renderItem={renderFilterItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: '#C7C7CC',
    width: 40,
    height: 4,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 4,
  },
  filterInfo: {
    flex: 1,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterSummary: {
    marginLeft: 28,
  },
  filterDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  separator: {
    height: 8,
  },
});
