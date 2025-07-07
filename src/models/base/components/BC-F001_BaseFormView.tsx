/**
 * BC-F001_BaseFormView - Universal form component for viewing and editing records
 * Component Reference: BC-F001
 * 
 * Universal form component that provides consistent form functionality
 * across all Odoo models with validation, field rendering, and actions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BaseModel } from '../types/BaseModel';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'boolean' | 'textarea';
  value: any;
  required?: boolean;
  readonly?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  validation?: (value: any) => string | null;
}

export interface FormAction {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

interface BaseFormViewProps<T extends BaseModel> {
  data: T | null;
  fields: FormField[];
  actions?: FormAction[];
  loading?: boolean;
  readonly?: boolean;
  title?: string;
  subtitle?: string;
  onFieldChange?: (key: string, value: any) => void;
  onSave?: (data: Partial<T>) => void;
  onCancel?: () => void;
  showHeader?: boolean;
  showActions?: boolean;
}

/**
 * BC-F001: Universal Form View Component
 * 
 * Features:
 * - Generic form display for any Odoo model
 * - Field validation and error handling
 * - Multiple field types support
 * - Readonly and editable modes
 * - Custom actions support
 * - Responsive layout
 * - Keyboard handling
 */
export default function BaseFormView<T extends BaseModel>({
  data,
  fields,
  actions = [],
  loading = false,
  readonly = false,
  title,
  subtitle,
  onFieldChange,
  onSave,
  onCancel,
  showHeader = true,
  showActions = true,
}: BaseFormViewProps<T>) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach(field => {
      initial[field.key] = field.value;
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle field value changes
  const handleFieldChange = (key: string, value: any) => {
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    
    onFieldChange?.(key, value);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      const value = formData[field.key];
      
      // Required field validation
      if (field.required && (!value || value === '')) {
        newErrors[field.key] = `${field.label} is required`;
        return;
      }
      
      // Custom validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.key] = error;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validateForm()) {
      onSave?.(formData as Partial<T>);
    }
  };

  // Render form header
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {onCancel && (
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <MaterialIcons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render field based on type
  const renderField = (field: FormField) => {
    const value = formData[field.key];
    const error = errors[field.key];
    const isReadonly = readonly || field.readonly;

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {field.label}
          {field.required && <Text style={styles.required}> *</Text>}
        </Text>
        
        <View style={[
          styles.fieldInput,
          error && styles.fieldInputError,
          isReadonly && styles.fieldInputReadonly
        ]}>
          {field.type === 'boolean' ? (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => !isReadonly && handleFieldChange(field.key, !value)}
              disabled={isReadonly}
            >
              <MaterialIcons
                name={value ? "check-box" : "check-box-outline-blank"}
                size={24}
                color={value ? "#007AFF" : "#C7C7CC"}
              />
              <Text style={styles.checkboxLabel}>{field.placeholder || field.label}</Text>
            </TouchableOpacity>
          ) : field.type === 'select' ? (
            <TouchableOpacity
              style={styles.selectField}
              onPress={() => {
                if (!isReadonly && field.options) {
                  // Show picker - simplified for now
                  Alert.alert(
                    field.label,
                    'Select an option',
                    field.options.map(option => ({
                      text: option.label,
                      onPress: () => handleFieldChange(field.key, option.value)
                    }))
                  );
                }
              }}
              disabled={isReadonly}
            >
              <Text style={[
                styles.selectText,
                !value && styles.placeholderText
              ]}>
                {value ? 
                  field.options?.find(opt => opt.value === value)?.label || value :
                  field.placeholder || `Select ${field.label}`
                }
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#8E8E93" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.fieldValue}>
              {value || field.placeholder || 'No value'}
            </Text>
          )}
        </View>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  };

  // Render actions
  const renderActions = () => {
    if (!showActions || actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              { backgroundColor: action.color },
              action.disabled && styles.actionButtonDisabled
            ]}
            onPress={action.onPress}
            disabled={action.disabled || action.loading}
          >
            <MaterialIcons name={action.icon as any} size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {fields.map(renderField)}
      </ScrollView>
      
      {renderActions()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 44,
    justifyContent: 'center',
  },
  fieldInputError: {
    borderColor: '#FF3B30',
  },
  fieldInputReadonly: {
    backgroundColor: '#F8F9FA',
  },
  fieldValue: {
    fontSize: 16,
    color: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 8,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  placeholderText: {
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
