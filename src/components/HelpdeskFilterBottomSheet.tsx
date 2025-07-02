/**
 * Helpdesk Filter Bottom Sheet Component
 * Comprehensive filtering for helpdesk tickets
 */

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { authService } from '../services/auth';

interface HelpdeskFilters {
  stages: string[];
  teams: string[];
  assignees: string[];
  types: string[];
  priorities: string[];
}

interface FilterOption {
  id: string;
  name: string;
  type: 'stage' | 'team' | 'assignee' | 'type' | 'priority';
  selected: boolean;
}

interface SavedFilter {
  id: number;
  name: string;
  filters: HelpdeskFilters;
  user_id: number;
  is_default: boolean;
}

interface HelpdeskFilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: HelpdeskFilters;
  onFiltersChange: (filters: HelpdeskFilters) => void;
  onSaveFilter?: (name: string, filters: HelpdeskFilters) => void;
  onLoadFilter?: (filters: HelpdeskFilters) => void;
}

const PRIORITIES = [
  { id: '0', name: 'Low', stars: 1 },
  { id: '1', name: 'Normal', stars: 2 },
  { id: '2', name: 'High', stars: 3 },
  { id: '3', name: 'Urgent', stars: 3 }
];

export default function HelpdeskFilterBottomSheet({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onSaveFilter,
  onLoadFilter,
}: HelpdeskFilterBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  // Dynamic data state
  const [stages, setStages] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');

  // Infinite scroll state
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
      loadFilterOptions();
      loadSavedFilters();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const loadFilterOptions = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      // Load stages from helpdesk.stage - get all active stages
      try {
        const stageData = await client.searchRead('helpdesk.stage',
          [['active', '=', true]],
          ['name', 'sequence'],
          { order: 'sequence asc, name asc' }
        );
        console.log('📋 Loaded stages for filter:', stageData);
        setStages(stageData.map(stage => stage.name));
      } catch (error) {
        console.warn('Could not load stages:', error.message);
        setStages(['New', 'In Progress', 'Solved', 'Cancelled']); // Fallback
      }

      // Load teams from helpdesk.team
      try {
        const teamData = await client.searchRead('helpdesk.team', [], ['name'], { order: 'name asc' });
        setTeams(['All Teams', ...teamData.map(team => team.name)]);
      } catch (error) {
        console.warn('Could not load teams:', error.message);
        setTeams(['All Teams', 'Support', 'ITMS Admin']); // Fallback
      }

      // Load assignees from hr.employee (employees only, not external users)
      try {
        const employeeData = await client.searchRead('hr.employee', [['active', '=', true]], ['name', 'user_id'], { order: 'name asc' });
        setAssignees(employeeData.map(employee => employee.name));
        console.log('✅ Loaded employees for assignment:', employeeData.length);
      } catch (error) {
        console.warn('Could not load employees:', error.message);
        // Fallback to users if hr.employee not available
        try {
          const userData = await client.searchRead('res.users', [['active', '=', true], ['share', '=', false]], ['name'], { order: 'name asc' });
          setAssignees(userData.map(user => user.name));
          console.log('✅ Fallback to internal users:', userData.length);
        } catch (userError) {
          console.warn('Could not load users either:', userError.message);
          setAssignees(['Mark Shaw', 'Andrew Reseigh']); // Final fallback
        }
      }

      // Load ticket types (if available)
      try {
        const typeData = await client.searchRead('helpdesk.ticket.type', [], ['name'], { order: 'name asc' });
        setTypes(typeData.map(type => type.name));
      } catch (error) {
        console.warn('Could not load ticket types:', error.message);
        setTypes(['Question', 'Issue', 'Billable', 'Contract']); // Fallback
      }

    } catch (error) {
      console.error('Failed to load filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedFilters = async () => {
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

      console.log('🔖 Found saved filters in filter sheet:', filterData.length);

      const parsedFilters = filterData.map(filter => ({
        id: filter.id,
        name: filter.name,
        filters: parseOdooFilter(filter.domain),
        user_id: filter.user_id ? filter.user_id[0] : null,
        is_default: filter.is_default
      }));

      setSavedFilters(parsedFilters);
    } catch (error) {
      console.warn('Could not load saved filters:', error.message);
    }
  };

  const parseOdooFilter = (domain: any): HelpdeskFilters => {
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

      if (!Array.isArray(domainArray)) return parsedFilters;

      const parseConditions = (conditions) => {
        conditions.forEach(condition => {
          if (Array.isArray(condition) && condition.length >= 3) {
            const [field, operator, value] = condition;

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
    } catch (error) {
      console.warn('Failed to parse domain:', error);
    }

    return parsedFilters;
  };

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Remove artificial infinite scroll - let FlatList handle virtualization naturally

  const handleSaveFilter = () => {
    Alert.prompt(
      'Save Filter',
      'Enter a name for this filter combination:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (name) => {
            if (name && name.trim()) {
              saveCurrentFilters(name.trim());
            }
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleShowSavedFilters = () => {
    setShowSavedFilters(!showSavedFilters);
  };

  const toggleFilter = (category: keyof HelpdeskFilters, value: string) => {
    const currentFilters = filters[category];
    const newFilters = currentFilters.includes(value)
      ? currentFilters.filter(f => f !== value)
      : [...currentFilters, value];
    
    onFiltersChange({
      ...filters,
      [category]: newFilters
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      stages: [],
      teams: [],
      assignees: [],
      types: [],
      priorities: []
    });
  };

  const saveCurrentFilters = async (name: string) => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Convert our filters to Odoo domain format
      const domain = [];

      if (filters.stages.length > 0) {
        domain.push(['stage_id', 'in', filters.stages]);
      }
      if (filters.teams.length > 0 && !filters.teams.includes('All Teams')) {
        domain.push(['team_id', 'in', filters.teams]);
      }
      if (filters.assignees.length > 0) {
        domain.push(['user_id', 'in', filters.assignees]);
      }
      if (filters.priorities.length > 0) {
        domain.push(['priority', 'in', filters.priorities]);
      }

      // Create filter in ir.filters
      const filterId = await client.create('ir.filters', {
        name: name,
        model_id: 'helpdesk.ticket',
        domain: JSON.stringify(domain),
        user_id: client.uid,
        is_default: false
      });

      console.log('✅ Saved filter:', name, 'with ID:', filterId);

      // Reload saved filters
      await loadSavedFilters();

      if (onSaveFilter) {
        onSaveFilter(name, filters);
      }
    } catch (error) {
      console.error('Failed to save filter:', error);
    }
  };



  const getActiveFilterCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

  // Create clean, professional filter sections
  const renderFilterSection = (title: string, icon: string, items: string[], category: keyof HelpdeskFilters, selectedItems: string[]) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.filterSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <Text style={styles.sectionCount}>
            {selectedItems.length > 0 ? `${selectedItems.length} selected` : `${items.length} options`}
          </Text>
        </View>

        <View style={styles.optionsGrid}>
          {items.map((item, index) => {
            const isSelected = selectedItems.includes(item);
            return (
              <TouchableOpacity
                key={`${category}_${item}_${index}`}
                style={[
                  styles.optionChip,
                  isSelected && styles.optionChipSelected
                ]}
                onPress={() => toggleFilter(category, item)}
              >
                <Text style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected
                ]}>
                  {item}
                </Text>
                {isSelected && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Add header to the ScrollView content
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>Filter Tickets</Text>
        <Text style={styles.subtitle}>
          {getActiveFilterCount()} filters active
        </Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveFilter}
        >
          <MaterialIcons name="save" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleShowSavedFilters}
        >
          <MaterialIcons
            name={showSavedFilters ? "bookmark" : "bookmark-border"}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading filter options...</Text>
          </View>
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            {renderHeader()}

            {/* Saved Filters Section */}
            {showSavedFilters && savedFilters.length > 0 && (
              <View style={styles.filterSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Text style={styles.sectionIcon}>🔖</Text>
                    <Text style={styles.sectionTitle}>Saved Filters</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowSavedFilters(false)}>
                    <Text style={styles.hideButton}>Hide</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.savedFiltersContainer}>
                  {savedFilters.map(filter => (
                    <TouchableOpacity
                      key={filter.id}
                      style={styles.savedFilterItem}
                      onPress={() => handleLoadSavedFilter(filter)}
                    >
                      <Text style={styles.savedFilterName}>{filter.name}</Text>
                      <Text style={styles.savedFilterDetails}>
                        {Object.values(filter.filters).flat().length} filters
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Filter Sections */}
            {renderFilterSection('Status', '📋', stages, 'stages', filters.stages)}
            {renderFilterSection('Teams', '👥', teams, 'teams', filters.teams)}
            {renderFilterSection('Assigned To', '👤', assignees, 'assignees', filters.assignees)}
            {renderFilterSection('Type', '📝', types, 'types', filters.types)}

            {/* Priority Section */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionIcon}>⭐</Text>
                  <Text style={styles.sectionTitle}>Priority</Text>
                </View>
                <Text style={styles.sectionCount}>
                  {filters.priorities.length > 0 ? `${filters.priorities.length} selected` : `${PRIORITIES.length} options`}
                </Text>
              </View>

              <View style={styles.optionsGrid}>
                {PRIORITIES.map((priority) => {
                  const isSelected = filters.priorities.includes(priority.id);
                  return (
                    <TouchableOpacity
                      key={priority.id}
                      style={[
                        styles.optionChip,
                        isSelected && styles.optionChipSelected,
                        { backgroundColor: isSelected ? priority.color : '#F8F9FA' }
                      ]}
                      onPress={() => toggleFilter('priorities', priority.id)}
                    >
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected
                      ]}>
                        {priority.label}
                      </Text>
                      {isSelected && (
                        <MaterialIcons name="check" size={16} color="#FFFFFF" style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </BottomSheetScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  sectionCount: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionChipSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 6,
  },
  savedFiltersContainer: {
    gap: 12,
  },
  savedFilterItem: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  savedFilterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  savedFilterDetails: {
    fontSize: 14,
    color: '#8E8E93',
  },
  hideButton: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  saveButton: {
    padding: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
  },
  closeButton: {
    padding: 4,
  },
  sectionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    backgroundColor: '#F8F9FA',
    marginHorizontal: -16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 16,
  },
  sectionSeparator: {
    height: 20,
    backgroundColor: 'transparent',
  },
  savedFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 4,
    gap: 8,
  },
  savedFilterName: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
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
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  separator: {
    height: 8,
  },
  filterChip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 4,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityStars: {
    flexDirection: 'row',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
