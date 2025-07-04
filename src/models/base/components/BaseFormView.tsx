/**
 * Base Form View Component
 * Universal form component for viewing and editing records
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BaseModel, BaseFormViewProps } from '../types/BaseModel';

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'multiline' | 'boolean' | 'selection' | 'readonly';
  value: any;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  editable?: boolean;
}

interface BaseFormViewComponentProps<T extends BaseModel> extends BaseFormViewProps<T> {
  fields: FormField[];
  title?: string;
  showHeader?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  customActions?: Array<{
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
  }>;
}

export default function BaseFormView<T extends BaseModel>({
  record,
  mode = 'view',
  onSave,
  onCancel,
  loading = false,
  readonly = false,
  fields,
  title,
  showHeader = true,
  showActions = true,
  onEdit,
  onDelete,
  onShare,
  customActions = [],
}: BaseFormViewComponentProps<T>) {
  const [formData, setFormData] = useState<Record<string, any>>(
    record ? { ...record } : {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEditing = mode === 'edit' || mode === 'create';
  const isCreating = mode === 'create';

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.required && (!formData[field.key] || formData[field.key].toString().trim() === '')) {
        newErrors[field.key] = `${field.label} is required`;
      }

      // Email validation
      if (field.type === 'email' && formData[field.key]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.key])) {
          newErrors[field.key] = 'Invalid email format';
        }
      }

      // Phone validation
      if (field.type === 'phone' && formData[field.key]) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(formData[field.key])) {
          newErrors[field.key] = 'Invalid phone format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      await onSave?.(formData);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.key];
    const fieldValue = formData[field.key] || field.value || '';

    if (!isEditing || field.type === 'readonly' || (readonly && field.editable !== true)) {
      // Read-only display
      return (
        <View key={field.key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.readonlyField}>
            {field.type === 'boolean' ? (
              <View style={styles.booleanContainer}>
                <MaterialIcons 
                  name={fieldValue ? 'check-circle' : 'radio-button-unchecked'} 
                  size={20} 
                  color={fieldValue ? '#34C759' : '#C7C7CC'} 
                />
                <Text style={styles.booleanText}>
                  {fieldValue ? 'Yes' : 'No'}
                </Text>
              </View>
            ) : field.type === 'selection' && field.options ? (
              <Text style={styles.readonlyText}>
                {field.options.find(opt => opt.value === fieldValue)?.label || fieldValue}
              </Text>
            ) : (
              <Text style={styles.readonlyText}>
                {fieldValue || 'Not set'}
              </Text>
            )}
          </View>
        </View>
      );
    }

    // Editable field
    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, field.required && styles.requiredLabel]}>
          {field.label}
          {field.required && <Text style={styles.requiredAsterisk}> *</Text>}
        </Text>
        
        {field.type === 'boolean' ? (
          <TouchableOpacity
            style={styles.booleanField}
            onPress={() => handleFieldChange(field.key, !fieldValue)}
          >
            <MaterialIcons 
              name={fieldValue ? 'check-circle' : 'radio-button-unchecked'} 
              size={24} 
              color={fieldValue ? '#34C759' : '#C7C7CC'} 
            />
            <Text style={styles.booleanText}>
              {fieldValue ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        ) : field.type === 'selection' && field.options ? (
          <View style={[styles.selectionContainer, hasError && styles.fieldError]}>
            {field.options.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectionOption,
                  fieldValue === option.value && styles.selectedOption
                ]}
                onPress={() => handleFieldChange(field.key, option.value)}
              >
                <Text style={[
                  styles.selectionText,
                  fieldValue === option.value && styles.selectedText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput
            style={[
              styles.textInput,
              field.type === 'multiline' && styles.multilineInput,
              hasError && styles.fieldError
            ]}
            value={fieldValue.toString()}
            onChangeText={(text) => handleFieldChange(field.key, text)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            placeholderTextColor="#C7C7CC"
            multiline={field.type === 'multiline'}
            numberOfLines={field.type === 'multiline' ? 4 : 1}
            keyboardType={
              field.type === 'email' ? 'email-address' :
              field.type === 'phone' ? 'phone-pad' : 'default'
            }
            autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
            autoCorrect={field.type !== 'email'}
          />
        )}
        
        {hasError && (
          <Text style={styles.errorText}>{errors[field.key]}</Text>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {title || (isCreating ? 'New Record' : record?.display_name || 'Record Details')}
          </Text>
          {record && (
            <Text style={styles.subtitle}>
              ID: {record.id} • {mode === 'view' ? 'Read-only' : 'Editing'}
            </Text>
          )}
        </View>
        
        {showActions && !isEditing && (
          <View style={styles.headerActions}>
            {customActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={action.onPress}
              >
                <MaterialIcons 
                  name={action.icon as any} 
                  size={20} 
                  color={action.color || '#007AFF'} 
                />
              </TouchableOpacity>
            ))}
            {onShare && (
              <TouchableOpacity style={styles.actionButton} onPress={onShare}>
                <MaterialIcons name="share" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
                <MaterialIcons name="edit" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
                <MaterialIcons name="delete" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderActions = () => {
    if (!isEditing) return null;

    return (
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isCreating ? 'Create' : 'Save'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {fields.map(renderField)}
      </ScrollView>

      {renderActions()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  requiredLabel: {
    color: '#000',
  },
  requiredAsterisk: {
    color: '#FF3B30',
  },
  readonlyField: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  readonlyText: {
    fontSize: 16,
    color: '#000',
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  fieldError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  booleanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  booleanField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  booleanText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
  },
  selectionContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectionOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectedOption: {
    backgroundColor: '#007AFF15',
  },
  selectionText: {
    fontSize: 16,
    color: '#000',
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
});
