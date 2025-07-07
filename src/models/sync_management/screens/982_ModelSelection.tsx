/**
 * 982_ModelSelection - Enhanced with Save Button and Other Models Section
 * Screen Number: 982
 * Model: sync_management
 * Type: detail
 *
 * ENHANCED: Added save functionality and comprehensive model list
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
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAppStore } from '../../../store';
import { syncService } from '../../base/services/BaseSyncService';
import { authService } from '../../base/services/BaseAuthService';
import ScreenBadge from '../../../components/ScreenBadge';

// Define clear, logical model templates
interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  models: ModelConfig[];
  estimatedSize: string;
  priority: 'essential' | 'recommended' | 'optional';
}

interface ModelConfig {
  name: string;
  displayName: string;
  description: string;
  syncMode: 'all' | 'recent' | 'selective';
  required?: boolean;
  dependencies?: string[];
}

interface OdooModel {
  name: string;
  displayName: string;
  category: string;
  recordCount?: number;
}

const MODEL_TEMPLATES: ModelTemplate[] = [
  {
    id: 'chat_messaging',
    name: 'Chat & Messaging',
    description: 'Real-time chat, direct messages, and notifications',
    icon: 'chat',
    color: '#007AFF',
    priority: 'essential',
    estimatedSize: '10-50 MB',
    models: [
      {
        name: 'discuss.channel',
        displayName: 'Chat Channels',
        description: 'Group chats and direct message channels',
        syncMode: 'all',
        required: true
      },
      {
        name: 'mail.message',
        displayName: 'Messages',
        description: 'Chat messages and conversations',
        syncMode: 'recent'
      },
      {
        name: 'res.partner',
        displayName: 'Contacts',
        description: 'Contact information for chat participants',
        syncMode: 'selective',
        dependencies: ['discuss.channel']
      },
      {
        name: 'res.users',
        displayName: 'Users',
        description: 'User accounts and presence information',
        syncMode: 'all'
      }
    ]
  },
  {
    id: 'sales_crm',
    name: 'Sales & CRM',
    description: 'Opportunities, quotations, and customer management',
    icon: 'trending-up',
    color: '#34C759',
    priority: 'recommended',
    estimatedSize: '25-100 MB',
    models: [
      {
        name: 'crm.lead',
        displayName: 'Leads & Opportunities',
        description: 'Sales pipeline and opportunity management',
        syncMode: 'recent'
      },
      {
        name: 'sale.order',
        displayName: 'Sales Orders',
        description: 'Quotations and confirmed sales orders',
        syncMode: 'recent'
      },
      {
        name: 'sale.order.line',
        displayName: 'Order Lines',
        description: 'Individual items in sales orders',
        syncMode: 'recent',
        dependencies: ['sale.order']
      },
      {
        name: 'product.product',
        displayName: 'Products',
        description: 'Product catalog and pricing',
        syncMode: 'all'
      }
    ]
  },
  {
    id: 'helpdesk_support',
    name: 'Helpdesk & Support',
    description: 'Support tickets, teams, and customer service',
    icon: 'support-agent',
    color: '#FF9500',
    priority: 'recommended',
    estimatedSize: '15-75 MB',
    models: [
      {
        name: 'helpdesk.ticket',
        displayName: 'Support Tickets',
        description: 'Customer support requests and issues',
        syncMode: 'recent'
      },
      {
        name: 'helpdesk.team',
        displayName: 'Support Teams',
        description: 'Support team organization and settings',
        syncMode: 'all'
      },
      {
        name: 'helpdesk.stage',
        displayName: 'Ticket Stages',
        description: 'Workflow stages for ticket progression',
        syncMode: 'all',
        dependencies: ['helpdesk.team']
      }
    ]
  },
  {
    id: 'project_management',
    name: 'Project Management',
    description: 'Tasks, projects, and team collaboration',
    icon: 'assignment',
    color: '#8E44AD',
    priority: 'recommended',
    estimatedSize: '20-80 MB',
    models: [
      {
        name: 'project.project',
        displayName: 'Projects',
        description: 'Project overview and settings',
        syncMode: 'all'
      },
      {
        name: 'project.task',
        displayName: 'Tasks',
        description: 'Individual tasks and assignments',
        syncMode: 'recent'
      },
      {
        name: 'hr.employee',
        displayName: 'Team Members',
        description: 'Employee information and assignments',
        syncMode: 'all'
      }
    ]
  },
  {
    id: 'document_management',
    name: 'Documents & Files',
    description: 'File attachments, chatter, and document collaboration',
    icon: 'folder',
    color: '#17A2B8',
    priority: 'optional',
    estimatedSize: '50-200 MB',
    models: [
      {
        name: 'ir.attachment',
        displayName: 'Attachments',
        description: 'Files and documents attached to records',
        syncMode: 'selective'
      },
      {
        name: 'mail.activity',
        displayName: 'Activities',
        description: 'Scheduled activities and reminders',
        syncMode: 'recent'
      },
      {
        name: 'mail.followers',
        displayName: 'Followers',
        description: 'Document followers and subscriptions',
        syncMode: 'selective'
      }
    ]
  },
  {
    id: 'hr_employee',
    name: 'Human Resources',
    description: 'Employee directory, attendance, and HR management',
    icon: 'people',
    color: '#E91E63',
    priority: 'optional',
    estimatedSize: '10-30 MB',
    models: [
      {
        name: 'hr.employee',
        displayName: 'Employees',
        description: 'Employee directory and information',
        syncMode: 'all'
      },
      {
        name: 'hr.department',
        displayName: 'Departments',
        description: 'Organizational structure',
        syncMode: 'all'
      },
      {
        name: 'hr.job',
        displayName: 'Job Positions',
        description: 'Job titles and positions',
        syncMode: 'all'
      }
    ]
  }
];

const SYNC_MODE_INFO = {
  'all': {
    label: 'All Records',
    description: 'Sync all records (recommended for small datasets)',
    icon: 'cloud-download',
    color: '#34C759'
  },
  'recent': {
    label: 'Recent Only',
    description: 'Last 30 days or 500 records (recommended)',
    icon: 'schedule',
    color: '#FF9500'
  },
  'selective': {
    label: 'Selective',
    description: 'Only records you interact with',
    icon: 'filter-list',
    color: '#007AFF'
  }
};

export default function ModelSelectionScreen() {
  const navigation = useNavigation();
  const { selectedModels, toggleModel, syncSettings, updateSyncSettings } = useAppStore();
  
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableModels, setAvailableModels] = useState<OdooModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showOtherModels, setShowOtherModels] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get all models included in templates
  const getTemplateModels = (): Set<string> => {
    const templateModels = new Set<string>();
    MODEL_TEMPLATES.forEach(template => {
      template.models.forEach(model => {
        templateModels.add(model.name);
      });
    });
    return templateModels;
  };

  // Load available models from Odoo
  const loadAvailableModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      // Get all available models
      const models = await client.searchRead('ir.model', 
        [['transient', '=', false]], // Exclude transient models
        ['model', 'name'],
        { order: 'model asc', limit: 500 }
      );

      const processedModels: OdooModel[] = models.map(model => ({
        name: model.model,
        displayName: model.name || formatDisplayName(model.model),
        category: getModelCategory(model.model)
      }));

      setAvailableModels(processedModels);
    } catch (error) {
      console.error('Failed to load available models:', error);
      // Fallback to a common model list
      const fallbackModels = [
        'res.partner', 'res.users', 'sale.order', 'purchase.order',
        'product.product', 'product.template', 'stock.picking',
        'account.move', 'account.payment', 'project.project',
        'project.task', 'hr.employee', 'hr.department', 'crm.lead',
        'mail.message', 'mail.activity', 'ir.attachment',
        'helpdesk.ticket', 'helpdesk.team'
      ].map(modelName => ({
        name: modelName,
        displayName: formatDisplayName(modelName),
        category: getModelCategory(modelName)
      }));
      
      setAvailableModels(fallbackModels);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Format model display name
  const formatDisplayName = (modelName: string): string => {
    return modelName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Get category for model
  const getModelCategory = (modelName: string): string => {
    if (modelName.startsWith('mail.') || modelName.startsWith('discuss.')) return 'Communication';
    if (modelName.startsWith('sale.') || modelName.startsWith('crm.')) return 'Sales';
    if (modelName.startsWith('product.')) return 'Products';
    if (modelName.startsWith('res.partner')) return 'Contacts';
    if (modelName.startsWith('project.')) return 'Projects';
    if (modelName.startsWith('stock.') || modelName.startsWith('purchase.')) return 'Inventory';
    if (modelName.startsWith('account.')) return 'Accounting';
    if (modelName.startsWith('helpdesk.')) return 'Support';
    if (modelName.startsWith('hr.')) return 'Human Resources';
    if (modelName.startsWith('ir.')) return 'System';
    return 'Other';
  };

  // Get other models (not in templates)
  const getOtherModels = (): OdooModel[] => {
    const templateModels = getTemplateModels();
    return availableModels.filter(model => !templateModels.has(model.name));
  };

  useEffect(() => {
    loadAvailableModels();
  }, [loadAvailableModels]);

  // Initialize selected templates based on existing selected models
  useEffect(() => {
    const initialTemplates = new Set<string>();
    
    MODEL_TEMPLATES.forEach(template => {
      const templateModelsSelected = template.models.filter(model => 
        selectedModels.includes(model.name)
      );
      
      // Consider template selected if most of its models are selected
      if (templateModelsSelected.length >= Math.ceil(template.models.length * 0.6)) {
        initialTemplates.add(template.id);
      }
    });
    
    setSelectedTemplates(initialTemplates);
  }, [selectedModels]);

  // Calculate total estimated size and model count
  const calculateSelectionStats = () => {
    const totalSelected = selectedModels.length;
    let templateModelCount = 0;
    let totalSize = 0;
    
    selectedTemplates.forEach(templateId => {
      const template = MODEL_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        templateModelCount += template.models.length;
        // Simple size estimation (in MB)
        const sizeRange = template.estimatedSize.match(/(\d+)-(\d+)/);
        if (sizeRange) {
          totalSize += parseInt(sizeRange[2]); // Use upper bound
        }
      }
    });
    
    const otherModelCount = totalSelected - templateModelCount;
    
    return { totalSelected, templateModelCount, otherModelCount, totalSize };
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const newSelected = new Set(selectedTemplates);
    
    if (newSelected.has(templateId)) {
      // Remove template
      newSelected.delete(templateId);
      
      // Remove all models from this template
      const template = MODEL_TEMPLATES.find(t => t.id === templateId);
      template?.models.forEach(model => {
        if (selectedModels.includes(model.name)) {
          toggleModel(model.name);
        }
      });
    } else {
      // Add template
      newSelected.add(templateId);
      
      // Add all models from this template
      const template = MODEL_TEMPLATES.find(t => t.id === templateId);
      template?.models.forEach(model => {
        if (!selectedModels.includes(model.name)) {
          toggleModel(model.name);
        }
      });
    }
    
    setSelectedTemplates(newSelected);
  };

  // Handle individual model toggle
  const handleModelToggle = (modelName: string, templateId?: string) => {
    toggleModel(modelName);
    
    if (templateId) {
      // Check if all models in template are still selected
      const template = MODEL_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        const selectedCount = template.models.filter(model => 
          selectedModels.includes(model.name) || model.name === modelName
        ).length;
        
        const newSelected = new Set(selectedTemplates);
        
        // Template considered selected if most models are selected
        if (selectedCount >= Math.ceil(template.models.length * 0.6) && !selectedModels.includes(modelName)) {
          newSelected.add(templateId);
        } else if (selectedCount < Math.ceil(template.models.length * 0.6) && selectedModels.includes(modelName)) {
          newSelected.delete(templateId);
        }
        
        setSelectedTemplates(newSelected);
      }
    }
  };

  // Handle save selection
  const handleSaveSelection = async () => {
    setSaving(true);
    try {
      // Update sync settings with selected models
      await updateSyncSettings({
        ...syncSettings,
        selectedModels: selectedModels,
        lastUpdated: new Date().toISOString()
      });

      Alert.alert(
        'Selection Saved',
        `${selectedModels.length} models selected for offline sync.`,
        [
          { 
            text: 'Start Sync', 
            onPress: () => navigation.navigate('SyncProgress' as never)
          },
          { 
            text: 'Done', 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Failed to save selection:', error);
      Alert.alert('Error', 'Failed to save model selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render priority badge
  const renderPriorityBadge = (priority: string) => {
    const colors = {
      essential: '#FF3B30',
      recommended: '#FF9500', 
      optional: '#8E8E93'
    };
    
    return (
      <View style={[styles.priorityBadge, { backgroundColor: colors[priority] }]}>
        <Text style={styles.priorityText}>
          {priority.toUpperCase()}
        </Text>
      </View>
    );
  };

  // Render template card
  const renderTemplateCard = (template: ModelTemplate) => {
    const isSelected = selectedTemplates.has(template.id);
    const isExpanded = expandedTemplate === template.id;
    
    return (
      <View key={template.id} style={[
        styles.templateCard,
        isSelected && styles.templateCardSelected
      ]}>
        {/* Template Header */}
        <TouchableOpacity
          style={styles.templateHeader}
          onPress={() => handleTemplateSelect(template.id)}
        >
          <View style={styles.templateLeft}>
            <View style={[styles.templateIcon, { backgroundColor: template.color }]}>
              <MaterialIcons name={template.icon as any} size={24} color="#FFF" />
            </View>
            <View style={styles.templateInfo}>
              <View style={styles.templateTitleRow}>
                <Text style={styles.templateName}>{template.name}</Text>
                {renderPriorityBadge(template.priority)}
              </View>
              <Text style={styles.templateDescription}>{template.description}</Text>
              <View style={styles.templateMeta}>
                <Text style={styles.templateSize}>{template.estimatedSize}</Text>
                <Text style={styles.templateModelCount}>
                  {template.models.length} models
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.templateRight}>
            <MaterialIcons
              name={isSelected ? "check-circle" : "radio-button-unchecked"}
              size={24}
              color={isSelected ? template.color : "#C7C7CC"}
            />
            <TouchableOpacity
              style={styles.expandButton}
              onPress={(e) => {
                e.stopPropagation();
                setExpandedTemplate(isExpanded ? null : template.id);
              }}
            >
              <MaterialIcons
                name={isExpanded ? "expand-less" : "expand-more"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Expanded Model Details */}
        {isExpanded && (
          <View style={styles.modelDetails}>
            <Text style={styles.modelDetailsTitle}>Included Models:</Text>
            {template.models.map((model, index) => (
              <View key={model.name} style={styles.modelRow}>
                <View style={styles.modelLeft}>
                  <TouchableOpacity
                    onPress={() => handleModelToggle(model.name, template.id)}
                  >
                    <MaterialIcons
                      name={selectedModels.includes(model.name) ? "check-box" : "check-box-outline-blank"}
                      size={20}
                      color={selectedModels.includes(model.name) ? template.color : "#666"}
                    />
                  </TouchableOpacity>
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelDisplayName}>
                      {model.displayName}
                      {model.required && <Text style={styles.requiredIndicator}> *</Text>}
                    </Text>
                    <Text style={styles.modelDescription}>{model.description}</Text>
                    <Text style={styles.modelTechnicalName}>{model.name}</Text>
                  </View>
                </View>
                
                <View style={[
                  styles.syncModeTag,
                  { backgroundColor: SYNC_MODE_INFO[model.syncMode].color + '20' }
                ]}>
                  <MaterialIcons
                    name={SYNC_MODE_INFO[model.syncMode].icon as any}
                    size={12}
                    color={SYNC_MODE_INFO[model.syncMode].color}
                  />
                  <Text style={[
                    styles.syncModeText,
                    { color: SYNC_MODE_INFO[model.syncMode].color }
                  ]}>
                    {SYNC_MODE_INFO[model.syncMode].label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render other model item
  const renderOtherModel = ({ item }: { item: OdooModel }) => {
    const isSelected = selectedModels.includes(item.name);
    
    return (
      <TouchableOpacity
        style={[styles.otherModelItem, isSelected && styles.otherModelItemSelected]}
        onPress={() => handleModelToggle(item.name)}
      >
        <MaterialIcons
          name={isSelected ? "check-box" : "check-box-outline-blank"}
          size={20}
          color={isSelected ? "#007AFF" : "#666"}
        />
        <View style={styles.otherModelInfo}>
          <Text style={styles.otherModelName}>{item.displayName}</Text>
          <Text style={styles.otherModelTechnical}>{item.name}</Text>
          <Text style={styles.otherModelCategory}>{item.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const stats = calculateSelectionStats();
  const otherModels = getOtherModels();
  const filteredOtherModels = otherModels.filter(model =>
    !searchQuery || 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={982} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Data to Sync</Text>
        <TouchableOpacity onPress={() => setShowOtherModels(!showOtherModels)}>
          <MaterialIcons name="tune" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      {stats.totalSelected > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="folder" size={20} color="#007AFF" />
              <Text style={styles.statValue}>{selectedTemplates.size}</Text>
              <Text style={styles.statLabel}>Templates</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="storage" size={20} color="#34C759" />
              <Text style={styles.statValue}>{stats.totalSelected}</Text>
              <Text style={styles.statLabel}>Total Models</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="cloud-download" size={20} color="#FF9500" />
              <Text style={styles.statValue}>~{stats.totalSize}MB</Text>
              <Text style={styles.statLabel}>Est. Size</Text>
            </View>
          </View>
        </View>
      )}

      {!showOtherModels ? (
        /* Templates List */
        <ScrollView style={styles.templatesContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="inventory" size={20} color="#666" />
            <Text style={styles.sectionTitle}>Data Templates</Text>
          </View>
          
          <Text style={styles.sectionSubtitle}>
            Select pre-configured data packages for common business needs.
          </Text>

          {/* Group templates by priority */}
          {['essential', 'recommended', 'optional'].map(priority => {
            const templatesInPriority = MODEL_TEMPLATES.filter(t => t.priority === priority);
            
            return (
              <View key={priority} style={styles.priorityGroup}>
                <Text style={styles.priorityGroupTitle}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)} Templates
                </Text>
                {templatesInPriority.map(renderTemplateCard)}
              </View>
            );
          })}

          {/* Quick access to other models */}
          <View style={styles.priorityGroup}>
            <TouchableOpacity 
              style={styles.otherModelsButton}
              onPress={() => setShowOtherModels(true)}
            >
              <MaterialIcons name="more-horiz" size={24} color="#007AFF" />
              <View style={styles.otherModelsInfo}>
                <Text style={styles.otherModelsTitle}>Other Models</Text>
                <Text style={styles.otherModelsSubtitle}>
                  Browse all {otherModels.length} available models individually
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* Other Models List */
        <View style={styles.otherModelsContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="list" size={20} color="#666" />
            <Text style={styles.sectionTitle}>All Available Models</Text>
          </View>

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

          {loadingModels ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading available models...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOtherModels}
              renderItem={renderOtherModel}
              keyExtractor={item => item.name}
              style={styles.otherModelsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="inbox" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No models found</Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'No additional models available'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Footer with Save Button */}
      <View style={styles.footer}>
        <View style={styles.footerStats}>
          <Text style={styles.footerText}>
            {stats.totalSelected} models selected
          </Text>
          {stats.otherModelCount > 0 && (
            <Text style={styles.footerSubtext}>
              {stats.templateModelCount} from templates + {stats.otherModelCount} individual
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.saveButton,
            stats.totalSelected === 0 && styles.saveButtonDisabled
          ]}
          onPress={handleSaveSelection}
          disabled={stats.totalSelected === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <MaterialIcons name="save" size={20} color="#FFF" />
          )}
          <Text style={[
            styles.saveButtonText,
            stats.totalSelected === 0 && styles.saveButtonTextDisabled
          ]}>
            {saving ? 'Saving...' : `Save Selection (${stats.totalSelected})`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  templatesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  priorityGroup: {
    marginBottom: 24,
  },
  priorityGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  templateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  templateCardSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  templateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  templateSize: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  templateModelCount: {
    fontSize: 12,
    color: '#666',
  },
  templateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandButton: {
    padding: 4,
  },
  modelDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modelDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  modelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  modelInfo: {
    flex: 1,
  },
  modelDisplayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  requiredIndicator: {
    color: '#FF3B30',
  },
  modelDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modelTechnicalName: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  syncModeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  syncModeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  otherModelsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  otherModelsInfo: {
    flex: 1,
  },
  otherModelsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  otherModelsSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  otherModelsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  otherModelsList: {
    flex: 1,
  },
  otherModelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  otherModelItemSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  otherModelInfo: {
    flex: 1,
  },
  otherModelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  otherModelTechnical: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  otherModelCategory: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  footer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerStats: {
    flex: 1,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minWidth: 160,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});