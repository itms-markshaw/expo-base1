/**
 * 103_ContactEdit - Contact edit form view
 * Screen Number: 103
 * Model: res.partner
 * Type: edit
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import BaseFormView from '../../base/components/BaseFormView';
import { contactService } from '../services/ContactService';
import { Contact, ContactFormData } from '../types/Contact';
import ScreenBadge from '../../../components/ScreenBadge';

interface ContactEditProps {
  contactId: number;
  onSave?: (contact: Contact) => void;
  onCancel?: () => void;
}

export default function ContactEdit({
  contactId,
  onSave,
  onCancel,
}: ContactEditProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    setLoading(true);
    try {
      const contactData = await contactService.getContactDetail(contactId);
      setContact(contactData);
    } catch (error) {
      console.error('Failed to load contact:', error);
      Alert.alert('Error', 'Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<Contact>) => {
    if (!contact) return;

    try {
      // Validate the data
      const validation = contactService.validateContactData(formData as ContactFormData);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Update the contact
      const success = await contactService.updateContact(contact.id, formData as ContactFormData);
      if (success) {
        // Reload the updated contact
        const updatedContact = await contactService.getContactDetail(contact.id);
        if (updatedContact) {
          setContact(updatedContact);
          onSave?.(updatedContact);
          Alert.alert('Success', 'Contact updated successfully');
        }
      } else {
        Alert.alert('Error', 'Failed to update contact');
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
      Alert.alert('Error', 'Failed to save contact changes');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onCancel },
      ]
    );
  };

  const getEditableFields = () => {
    if (!contact) return [];

    return [
      // Basic Information
      {
        key: 'name',
        label: 'Name',
        type: 'text' as const,
        value: contact.name,
        required: true,
        placeholder: 'Enter contact name',
      },
      {
        key: 'is_company',
        label: 'Is Company',
        type: 'boolean' as const,
        value: contact.is_company,
      },
      {
        key: 'function',
        label: 'Job Position',
        type: 'text' as const,
        value: contact.function || '',
        placeholder: 'Enter job position',
      },

      // Contact Information
      {
        key: 'email',
        label: 'Email',
        type: 'email' as const,
        value: contact.email || '',
        placeholder: 'Enter email address',
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'phone' as const,
        value: contact.phone || '',
        placeholder: 'Enter phone number',
      },
      {
        key: 'mobile',
        label: 'Mobile',
        type: 'phone' as const,
        value: contact.mobile || '',
        placeholder: 'Enter mobile number',
      },
      {
        key: 'website',
        label: 'Website',
        type: 'text' as const,
        value: contact.website || '',
        placeholder: 'Enter website URL',
      },

      // Address Information
      {
        key: 'street',
        label: 'Street',
        type: 'text' as const,
        value: contact.street || '',
        placeholder: 'Enter street address',
      },
      {
        key: 'street2',
        label: 'Street 2',
        type: 'text' as const,
        value: contact.street2 || '',
        placeholder: 'Enter additional address info',
      },
      {
        key: 'city',
        label: 'City',
        type: 'text' as const,
        value: contact.city || '',
        placeholder: 'Enter city',
      },
      {
        key: 'zip',
        label: 'ZIP Code',
        type: 'text' as const,
        value: contact.zip || '',
        placeholder: 'Enter ZIP code',
      },

      // Business Information
      {
        key: 'customer_rank',
        label: 'Customer Rank',
        type: 'selection' as const,
        value: contact.customer_rank,
        options: [
          { label: 'Not a Customer', value: 0 },
          { label: 'Customer', value: 1 },
          { label: 'Important Customer', value: 2 },
          { label: 'VIP Customer', value: 3 },
        ],
      },
      {
        key: 'supplier_rank',
        label: 'Supplier Rank',
        type: 'selection' as const,
        value: contact.supplier_rank,
        options: [
          { label: 'Not a Supplier', value: 0 },
          { label: 'Supplier', value: 1 },
          { label: 'Important Supplier', value: 2 },
          { label: 'Preferred Supplier', value: 3 },
        ],
      },
      {
        key: 'vat',
        label: 'Tax ID',
        type: 'text' as const,
        value: contact.vat || '',
        placeholder: 'Enter tax identification number',
      },

      // Additional Information
      {
        key: 'lang',
        label: 'Language',
        type: 'selection' as const,
        value: contact.lang || 'en_US',
        options: [
          { label: 'English', value: 'en_US' },
          { label: 'Spanish', value: 'es_ES' },
          { label: 'French', value: 'fr_FR' },
          { label: 'German', value: 'de_DE' },
          { label: 'Italian', value: 'it_IT' },
          { label: 'Portuguese', value: 'pt_PT' },
        ],
      },
      {
        key: 'active',
        label: 'Active',
        type: 'boolean' as const,
        value: contact.active,
      },
      {
        key: 'comment',
        label: 'Notes',
        type: 'multiline' as const,
        value: contact.comment || '',
        placeholder: 'Enter additional notes about this contact',
      },
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <BaseFormView
        record={contact}
        mode="edit"
        loading={loading}
        readonly={false}
        fields={getEditableFields()}
        title={`Edit ${contact?.name || 'Contact'}`}
        showHeader={true}
        showActions={false}
        onSave={handleSave}
        onCancel={handleCancel}
      />
          <ScreenBadge screenNumber={103} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
