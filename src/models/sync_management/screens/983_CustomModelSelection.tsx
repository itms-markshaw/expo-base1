/**
 * 983_CustomModelSelection - Choose from all available models
 * Screen Number: 983
 * Model: sync.management
 * Type: detail
 *
 * PRESERVED: All original sync functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAppStore } from '../../../store';
import { authService } from '../../base/services/BaseAuthService';
import ScreenBadge from '../../../components/ScreenBadge';

interface ModelInfo {
  name: string;
  displayName: string;
  priority: 'High' | 'Medium' | 'Low';
  recordCount: number;
  estimatedSize: string;
  isSelected: boolean;
  fields?: string[];
}

export default function CustomModelSelectionScreen() {
  console.log('🔍 CustomModelSelectionScreen mounted');

  const navigation = useNavigation();
  const { selectedModels, toggleModel } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [modelsCache, setModelsCache] = useState<ModelInfo[]>([]);

  // Model priority mapping
  const getModelPriority = (modelName: string): 'High' | 'Medium' | 'Low' => {
    const highPriority = ['res.partner', 'sale.order', 'product.product', 'crm.lead', 'hr.employee'];
    const mediumPriority = ['project.task', 'account.move', 'stock.picking', 'mail.message'];
    
    if (highPriority.includes(modelName)) return 'High';
    if (mediumPriority.includes(modelName)) return 'Medium';
    return 'Low';
  };

  // Format model display name
  const formatDisplayName = (modelName: string): string => {
    return modelName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Load all models from Odoo (with caching)
  const loadModels = useCallback(async (forceRefresh = false) => {
    if (isLoading) return;

    // Use cache if available and not forcing refresh
    if (!forceRefresh && modelsCache.length > 0) {
      console.log('📋 Using cached models');
      const updatedModels = modelsCache.map(model => ({
        ...model,
        isSelected: selectedModels.includes(model.name)
      }));
      setModels(updatedModels);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Loading ALL models from ir.model...');

      const client = authService.getClient();
      if (!client) {
        throw new Error('No Odoo client available');
      }

      // Get ALL models directly from ir.model
      const totalCount = await client.searchCount('ir.model', []);
      console.log(`🔍 Total models in ir.model: ${totalCount}`);

      const allModels = await client.searchRead('ir.model', [], ['model', 'name', 'info'], {
        limit: totalCount,
        offset: 0
      });

      console.log(`📋 Retrieved ${allModels.length} models from ir.model`);

      const modelInfos: ModelInfo[] = allModels.map((model: any) => ({
        name: model.model,
        displayName: model.name || formatDisplayName(model.model),
        priority: getModelPriority(model.model),
        recordCount: 0,
        estimatedSize: '0 MB',
        isSelected: selectedModels.includes(model.model),
      }));

      // Sort models: selected first, then by priority, then alphabetically
      modelInfos.sort((a, b) => {
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;

        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return a.displayName.localeCompare(b.displayName);
      });

      // Cache the models (without selection state)
      const cacheModels = modelInfos.map(model => ({ ...model, isSelected: false }));
      setModelsCache(cacheModels);

      setModels(modelInfos);
      console.log(`✅ Displaying ${modelInfos.length} models`);
    } catch (error) {
      console.error('❌ Failed to load models:', error);
      Alert.alert('Error', `Failed to load models: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModels, modelsCache]);

  // Filter models based on search and selection filter
  const filteredModels = models.filter(model => {
    const matchesSearch = searchQuery === '' ||
           model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           model.displayName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = !showSelectedOnly || model.isSelected;

    return matchesSearch && matchesFilter;
  });

  // Handle model toggle
  const handleToggleModel = (modelName: string) => {
    toggleModel(modelName);
    setModels(prev => prev.map(model =>
      model.name === modelName
        ? { ...model, isSelected: !model.isSelected }
        : model
    ));
  };

  // Calculate selected count
  const selectedCount = selectedModels.length;
  const totalEstimatedSize = models
    .filter(m => selectedModels.includes(m.name))
    .reduce((sum, m) => sum + parseFloat(m.estimatedSize), 0);

  useEffect(() => {
    loadModels();
  }, []);

  // Update local model state when store selectedModels changes (without reloading from server)
  useEffect(() => {
    if (modelsCache.length > 0) {
      // Use cache and just update selection state
      const updatedModels = modelsCache.map(model => ({
        ...model,
        isSelected: selectedModels.includes(model.name)
      }));
      setModels(updatedModels);
    }
  }, [selectedModels, modelsCache]);

  const renderModelItem = ({ item }: { item: ModelInfo }) => (
    <TouchableOpacity 
      style={styles.modelItem}
      onPress={() => handleToggleModel(item.name)}
    >
      <View style={styles.modelLeft}>
        <MaterialIcons 
          name={item.isSelected ? "check-box" : "check-box-outline-blank"} 
          size={24} 
          color={item.isSelected ? "#2196F3" : "#666"} 
        />
        <View style={styles.modelInfo}>
          <Text style={styles.modelName}>{item.displayName}</Text>
          <Text style={styles.modelTechnicalName}>{item.name}</Text>
          <View style={styles.modelStats}>
            <View style={[styles.priorityBadge, styles[`priority${item.priority}`]]}>
              <Text style={[styles.priorityText, styles[`priority${item.priority}Text`]]}>
                {item.priority}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={983} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Custom Selection</Text>
        <TouchableOpacity
          onPress={() => setShowSelectedOnly(!showSelectedOnly)}
          style={[styles.filterButton, showSelectedOnly && styles.filterButtonActive]}
        >
          <MaterialIcons
            name={showSelectedOnly ? "filter-list" : "filter-list-off"}
            size={24}
            color={showSelectedOnly ? "#2196F3" : "#666"}
          />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={showSelectedOnly ? `Search ${selectedCount} selected models...` : "Search all 844 models..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Info */}
      {showSelectedOnly && (
        <View style={styles.filterInfo}>
          <MaterialIcons name="info" size={16} color="#2196F3" />
          <Text style={styles.filterInfoText}>
            Showing only selected models ({selectedCount} of {models.length})
          </Text>
          <TouchableOpacity onPress={() => setShowSelectedOnly(false)}>
            <Text style={styles.filterInfoAction}>Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Models List */}
      <FlatList
        data={filteredModels}
        renderItem={renderModelItem}
        keyExtractor={item => item.name}
        style={styles.modelsList}
        contentContainerStyle={styles.modelsListContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={() => loadModels(true)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading models...' : 'No models found'}
            </Text>
            {!isLoading && searchQuery && (
              <Text style={styles.emptySubtext}>
                Try adjusting your search
              </Text>
            )}
          </View>
        }
      />

      {/* Footer Stats and Actions */}
      <View style={styles.footer}>
        <View style={styles.footerStats}>
          <Text style={styles.footerText}>
            {selectedCount} models selected • {totalEstimatedSize.toFixed(1)} MB estimated
          </Text>
        </View>
        <View style={styles.footerActions}>
          {selectedCount > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                Alert.alert(
                  'Clear All',
                  'Remove all selected models?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: () => {
                        selectedModels.forEach(modelName => toggleModel(modelName));
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveButton, selectedCount === 0 && styles.saveButtonDisabled]}
            onPress={() => {
              if (selectedCount > 0) {
                Alert.alert(
                  'Models Selected',
                  `${selectedCount} models have been selected for sync.`,
                  [
                    { text: 'Continue Editing', style: 'cancel' },
                    {
                      text: 'Save & Continue',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                Alert.alert('No Models Selected', 'Please select at least one model to sync.');
              }
            }}
            disabled={selectedCount === 0}
          >
            <Text style={[styles.saveButtonText, selectedCount === 0 && styles.saveButtonTextDisabled]}>
              Save Selection ({selectedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    padding: 4,
    borderRadius: 4,
  },
  filterButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  filterInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
  },
  filterInfoAction: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  modelsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modelsListContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modelItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modelInfo: {
    marginLeft: 12,
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modelTechnicalName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityHigh: {
    backgroundColor: '#FFEBEE',
  },
  priorityMedium: {
    backgroundColor: '#FFF3E0',
  },
  priorityLow: {
    backgroundColor: '#E8F5E8',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityHighText: {
    color: '#C62828',
  },
  priorityMediumText: {
    color: '#EF6C00',
  },
  priorityLowText: {
    color: '#2E7D32',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  footerStats: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  saveButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});
