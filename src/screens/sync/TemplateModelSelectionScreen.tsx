import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store';

interface RouteParams {
  templateId: string;
  templateName: string;
  templateModels: string[];
}

export default function TemplateModelSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { templateId, templateName, templateModels } = route.params as RouteParams;
  
  const { selectedModels, toggleModel } = useAppStore();
  const [localSelectedModels, setLocalSelectedModels] = useState<string[]>([]);

  useEffect(() => {
    // Initialize with currently selected models that are in this template
    setLocalSelectedModels(selectedModels.filter(model => templateModels.includes(model)));
  }, [selectedModels, templateModels]);

  const handleToggleModel = (modelName: string) => {
    setLocalSelectedModels(prev => {
      if (prev.includes(modelName)) {
        return prev.filter(m => m !== modelName);
      } else {
        return [...prev, modelName];
      }
    });
  };

  const handleSelectAll = () => {
    setLocalSelectedModels([...templateModels]);
  };

  const handleDeselectAll = () => {
    setLocalSelectedModels([]);
  };

  const handleApply = () => {
    // First, deselect all models from this template
    templateModels.forEach(modelName => {
      if (selectedModels.includes(modelName)) {
        toggleModel(modelName);
      }
    });

    // Then select the locally selected models
    localSelectedModels.forEach(modelName => {
      if (!selectedModels.includes(modelName)) {
        toggleModel(modelName);
      }
    });

    Alert.alert(
      'Template Applied',
      `${localSelectedModels.length} models selected for ${templateName}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const renderModelItem = ({ item: modelName }: { item: string }) => {
    const isSelected = localSelectedModels.includes(modelName);
    
    return (
      <TouchableOpacity
        style={[styles.modelItem, isSelected && styles.modelItemSelected]}
        onPress={() => handleToggleModel(modelName)}
      >
        <View style={styles.modelInfo}>
          <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
            {modelName}
          </Text>
          <Text style={styles.modelDescription}>
            {getModelDescription(modelName)}
          </Text>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <MaterialIcons name="check" size={16} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{templateName}</Text>
          <Text style={styles.headerSubtitle}>
            {localSelectedModels.length} of {templateModels.length} models selected
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.selectAllButton]}
          onPress={handleSelectAll}
        >
          <MaterialIcons name="select-all" size={20} color="#007AFF" />
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deselectAllButton]}
          onPress={handleDeselectAll}
        >
          <MaterialIcons name="clear" size={20} color="#FF3B30" />
          <Text style={styles.deselectAllText}>Deselect All</Text>
        </TouchableOpacity>
      </View>

      {/* Models List */}
      <FlatList
        data={templateModels}
        renderItem={renderModelItem}
        keyExtractor={(item) => item}
        style={styles.modelsList}
        showsVerticalScrollIndicator={false}
      />

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.applyButton,
            localSelectedModels.length === 0 && styles.applyButtonDisabled
          ]}
          onPress={handleApply}
          disabled={localSelectedModels.length === 0}
        >
          <Text style={[
            styles.applyButtonText,
            localSelectedModels.length === 0 && styles.applyButtonTextDisabled
          ]}>
            Apply Selection ({localSelectedModels.length})
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getModelDescription(modelName: string): string {
  const descriptions: { [key: string]: string } = {
    'helpdesk.ticket': 'Support tickets and customer issues',
    'helpdesk.team': 'Support teams and configurations',
    'res.partner': 'Customers, vendors, and contacts',
    'hr.employee': 'Employee records and information',
    'mail.message': 'Messages and communications',
    'mail.activity': 'Scheduled activities and tasks',
    'crm.lead': 'Sales leads and opportunities',
    'sale.order': 'Sales orders and quotations',
    'product.product': 'Product variants and items',
    'product.template': 'Product templates and categories',
    'account.move': 'Invoices and accounting entries',
    'stock.picking': 'Deliveries and stock movements',
    'project.project': 'Projects and project management',
    'project.task': 'Tasks and project activities',
    'calendar.event': 'Calendar events and meetings',
    'ir.attachment': 'File attachments and documents',
    'res.users': 'System users and access rights',
    'discuss.channel': 'Chat channels and conversations',
  };
  
  return descriptions[modelName] || 'Odoo data model';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  selectAllButton: {
    backgroundColor: '#E3F2FD',
  },
  deselectAllButton: {
    backgroundColor: '#FFEBEE',
  },
  selectAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  deselectAllText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  modelsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modelItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  modelNameSelected: {
    color: '#007AFF',
  },
  modelDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButtonTextDisabled: {
    color: '#8E8E93',
  },
});
