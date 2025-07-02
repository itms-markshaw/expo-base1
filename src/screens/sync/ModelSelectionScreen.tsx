/**
 * Model Selection Screen - Choose which models to sync
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
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAppStore } from '../../store';
import { syncService } from '../../services/sync';
import { authService } from '../../services/auth';

interface ModelInfo {
  name: string;
  displayName: string;
  priority: 'High' | 'Medium' | 'Low';
  recordCount: number;
  estimatedSize: string;
  isSelected: boolean;
  fields?: string[];
}

interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  models: string[];
  icon: string;
}

const SYNC_TEMPLATES: ModelTemplate[] = [
  {
    id: 'helpdesk',
    name: 'Helpdesk',
    description: 'Support tickets, teams, and customer communications',
    icon: 'support',
    models: [
      'helpdesk.ticket',
      'helpdesk.team',
      'helpdesk.stage',
      'res.partner',
      'hr.employee',
      'mail.message',
      'mail.activity',
      'ir.attachment'
    ]
  },
  {
    id: 'crm',
    name: 'CRM & Sales',
    description: 'Leads, opportunities, and sales pipeline',
    icon: 'trending-up',
    models: [
      'crm.lead',
      'crm.team',
      'crm.stage',
      'sale.order',
      'sale.order.line',
      'res.partner',
      'product.product',
      'product.template',
      'hr.employee'
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Stock management and transfers',
    icon: 'inventory',
    models: [
      'stock.picking',
      'stock.move',
      'stock.location',
      'product.product',
      'product.template',
      'stock.warehouse',
      'res.partner'
    ]
  },
  {
    id: 'projects',
    name: 'Project Management',
    description: 'Projects, tasks, and timesheets',
    icon: 'folder',
    models: [
      'project.project',
      'project.task',
      'project.task.type',
      'hr.employee',
      'res.partner',
      'account.analytic.line'
    ]
  },
  {
    id: 'custom',
    name: 'Custom Selection',
    description: 'Choose your own models from all 844 available',
    icon: 'tune',
    models: []
  }
];

export default function ModelSelectionScreen() {
  console.log('🔍 ModelSelectionScreen mounted');

  const navigation = useNavigation();
  const { selectedModels, toggleModel } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize selected templates based on current model selection
  useEffect(() => {
    console.log('🔄 Initializing templates based on selected models:', selectedModels);
    const activeTemplates: string[] = [];

    SYNC_TEMPLATES.forEach(template => {
      if (template.id === 'custom') return; // Skip custom template

      const hasAllModels = template.models.every(model => selectedModels.includes(model));
      if (hasAllModels && template.models.length > 0) {
        activeTemplates.push(template.id);
        console.log(`✅ Template ${template.id} is active (all models selected)`);
      } else {
        console.log(`❌ Template ${template.id} not active - missing models:`,
          template.models.filter(model => !selectedModels.includes(model)));
      }
    });

    console.log(`📋 Active templates: ${activeTemplates.join(', ')}`);
    setSelectedTemplates(activeTemplates);
  }, []); // Only run on mount


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

  // Load models data DIRECTLY from Odoo
  const loadModels = useCallback(async () => {
    console.log('🔍 loadModels function called, isLoading:', isLoading);
    if (isLoading) {
      console.log('🔍 Already loading, returning early');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Loading models DIRECTLY from ir.model...');

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

      setModels(modelInfos);
      console.log(`✅ Displaying ${modelInfos.length} models`);
    } catch (error) {
      console.error('❌ Failed to load models directly:', error);
      Alert.alert('Error', `Failed to load models: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModels]);

  // Filter models based on search and template selection
  const filteredModels = models.filter(model => {
    const matchesSearch = searchQuery === '' ||
                         model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.displayName.toLowerCase().includes(searchQuery.toLowerCase());

    // If custom template is selected, show all models
    if (selectedTemplates.includes('custom')) {
      return matchesSearch;
    }

    // If specific templates are selected, show only template models + selected models
    const allTemplateModels = selectedTemplates
      .flatMap(templateId => SYNC_TEMPLATES.find(t => t.id === templateId)?.models || []);
    const isTemplateModel = allTemplateModels.includes(model.name);
    const isSelected = model.isSelected;

    return matchesSearch && (isTemplateModel || isSelected);
  });

  console.log(`🔍 Filtered models: ${filteredModels.length} of ${models.length} total (templates: ${selectedTemplates.join(', ')})`);

  // Handle model toggle
  const handleToggleModel = (modelName: string) => {
    toggleModel(modelName);
    setModels(prev => prev.map(model =>
      model.name === modelName
        ? { ...model, isSelected: !model.isSelected }
        : model
    ));
  };

  // Calculate counts based on current template selection
  const getDisplayedModelsCount = () => {
    if (selectedTemplates.includes('custom')) {
      // For custom selection, show total selected models
      return selectedModels.length;
    } else {
      // For template selection, show only template models that are selected
      const allTemplateModels = selectedTemplates
        .flatMap(templateId => SYNC_TEMPLATES.find(t => t.id === templateId)?.models || []);
      return allTemplateModels.filter(modelName => selectedModels.includes(modelName)).length;
    }
  };

  const selectedCount = getDisplayedModelsCount();
  const totalEstimatedSize = models
    .filter(m => selectedModels.includes(m.name))
    .reduce((sum, m) => sum + parseFloat(m.estimatedSize), 0);

  useEffect(() => {
    console.log('🔍 useEffect triggered, calling loadModels...');
    loadModels();
  }, []); // Empty dependency array - only run once on mount

  // Update local model state when store selectedModels changes
  useEffect(() => {
    setModels(prev => prev.map(model => ({
      ...model,
      isSelected: selectedModels.includes(model.name)
    })));
  }, [selectedModels]);

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
            <Text style={styles.modelStat}>Model from ir.model</Text>
            {item.fields && (
              <>
                <Text style={styles.modelStat}>•</Text>
                <Text style={styles.modelStat}>{item.fields.length} fields</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <View style={[styles.priorityBadge, styles[`priority${item.priority}`]]}>
        <Text style={[styles.priorityText, styles[`priority${item.priority}Text`]]}>
          {item.priority}
        </Text>
      </View>
    </TouchableOpacity>
  );



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Models</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search models..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Template Selection - Scrollable List */}
        <ScrollView style={styles.templatesContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.templatesTitle}>Templates:</Text>
        {SYNC_TEMPLATES.map(template => {
          const isSelected = selectedTemplates.includes(template.id);
          return (
            <TouchableOpacity
              key={template.id}
              style={[styles.templateItem, isSelected && styles.templateItemSelected]}
              onPress={() => {
                if (template.id === 'custom') {
                  // Toggle custom selection
                  if (isSelected) {
                    // Deselect custom
                    setSelectedTemplates(prev => prev.filter(t => t !== 'custom'));
                  } else {
                    // Select custom and navigate
                    setSelectedTemplates(prev => [...prev, 'custom']);
                    navigation.navigate('CustomModelSelection' as never);
                  }
                } else {
                  // Toggle template selection
                  if (isSelected) {
                    // Deselect template
                    setSelectedTemplates(prev => prev.filter(t => t !== template.id));

                    // Remove template models from selection
                    template.models.forEach(modelName => {
                      if (selectedModels.includes(modelName)) {
                        toggleModel(modelName);
                      }
                    });
                  } else {
                    // Select template
                    setSelectedTemplates(prev => [...prev, template.id]);

                    // Add template models to selection
                    template.models.forEach(modelName => {
                      if (!selectedModels.includes(modelName)) {
                        toggleModel(modelName);
                      }
                    });
                  }
                }
              }}
            >
              <MaterialIcons
                name={isSelected ? "check-box" : "check-box-outline-blank"}
                size={24}
                color={isSelected ? "#007AFF" : "#C7C7CC"}
              />

              <View style={styles.templateInfo}>
                <Text style={[styles.templateName, isSelected && styles.templateNameSelected]}>
                  {template.name}
                </Text>
                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>
                {template.models.length > 0 && (
                  <Text style={styles.templateCount}>{template.models.length} models</Text>
                )}
              </View>

              {template.id !== 'custom' && (
                <TouchableOpacity
                  style={styles.configureButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('TemplateModelSelection', {
                      templateId: template.id,
                      templateName: template.name,
                      templateModels: template.models
                    } as never);
                  }}
                >
                  <MaterialIcons name="settings" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}

              {template.id === 'custom' && (
                <TouchableOpacity
                  style={styles.configureButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('CustomModelSelection' as never);
                  }}
                >
                  <MaterialIcons name="tune" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Storage Warning */}
      {totalEstimatedSize > 50 && (
        <View style={styles.warningContainer}>
          <MaterialIcons name="warning" size={20} color="#FF9800" />
          <Text style={styles.warningText}>
            Large selection ({totalEstimatedSize.toFixed(1)} MB) may impact performance
          </Text>
        </View>
      )}

      {/* Models List - Only show when custom template is selected or search is active */}
      {(selectedTemplates.includes('custom') || searchQuery.length > 0) && (
        <FlatList
          data={filteredModels}
          renderItem={renderModelItem}
          keyExtractor={item => item.name}
          style={styles.modelsList}
          contentContainerStyle={styles.modelsListContent}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={loadModels}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading models...' : 'No models found'}
              </Text>
              {!isLoading && searchQuery && (
                <Text style={styles.emptySubtext}>
                  Try adjusting your search or filters
                </Text>
              )}
            </View>
          }
        />
      )}
      </View>

      {/* Footer Stats and Actions */}
      <View style={styles.footer}>
        <View style={styles.footerStats}>
          <Text style={styles.footerText}>
            {selectedCount} models selected • {totalEstimatedSize.toFixed(1)} MB estimated
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, selectedCount === 0 && styles.saveButtonDisabled]}
          onPress={() => {
            if (selectedCount > 0) {
              Alert.alert(
                'Selection Saved',
                `${selectedCount} models have been selected for sync.\n\nYou can now go to the Sync Dashboard to start syncing.`,
                [
                  { text: 'Continue Editing', style: 'cancel' },
                  {
                    text: 'Go to Sync Dashboard',
                    onPress: () => {
                      navigation.goBack(); // Go back to sync dashboard
                    }
                  }
                ]
              );
            } else {
              Alert.alert('No Models Selected', 'Please select at least one model to sync.');
            }
          }}
          disabled={selectedCount === 0}
        >
          <MaterialIcons name="save" size={20} color={selectedCount === 0 ? "#999" : "white"} style={{ marginRight: 8 }} />
          <Text style={[styles.saveButtonText, selectedCount === 0 && styles.saveButtonTextDisabled]}>
            Save Selection ({selectedCount})
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
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
  templatesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
    padding: 12,
    flex: 1, // Allow to grow and fill available space
  },
  templatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  templateItemSelected: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  templateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  templateCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
  },
  modelsList: {
    paddingHorizontal: 16,
    flex: 1, // Take remaining space in content container
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
  modelStat: {
    fontSize: 12,
    color: '#999',
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
    paddingBottom: 34, // Just enough to clear tab bar
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8, // Reduced gap
  },
  footerStats: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
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
  templateNameSelected: {
    color: '#007AFF',
  },
  configureButton: {
    padding: 8,
    marginLeft: 8,
  },
});
