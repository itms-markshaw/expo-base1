/**
 * 104_ContactCreate - Create new contact
 * Screen Number: 104
 * Model: res.partner
 * Type: create
 */

import React, { useState } from 'react';
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

interface ContactCreateProps {
  onSave?: (contact: Contact) => void;
  onCancel?: () => void;
  initialData?: Partial<ContactFormData>;
}

export default function ContactCreate({
  onSave,
  onCancel,
  initialData = {},
}: ContactCreateProps) {
  const [creating, setCreating] = useState(false);

  const handleSave = async (formData: Partial<ContactFormData>) => {
    setCreating(true);
    try {
      // Validate the data
      const validation = contactService.validateContactData(formData as ContactFormData);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Create the contact
      const contactId = await contactService.createContact(formData as ContactFormData);
      if (contactId > 0) {
        // Load the created contact to get full details
        const newContact = await contactService.getContactDetail(contactId);
        if (newContact) {
          onSave?.(newContact);
          Alert.alert('Success', 'Contact created successfully');
        }
      } else {
        Alert.alert('Error', 'Failed to create contact');
      }
    } catch (error) {
      console.error('Failed to create contact:', error);
      Alert.alert('Error', 'Failed to create contact');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Contact',
      'Are you sure you want to discard this new contact?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onCancel },
      ]
    );
  };

  const getCreateFields = () => {
    return [
      // Basic Information
      {
        key: 'name',
        label: 'Name',
        type: 'text' as const,
        value: initialData.name || '',
        required: true,
        placeholder: 'Enter contact name',
      },
      {
        key: 'is_company',
        label: 'Is Company',
        type: 'boolean' as const,
        value: initialData.is_company || false,
      },
      {
        key: 'function',
        label: 'Job Position',
        type: 'text' as const,
        value: initialData.function || '',
        placeholder: 'Enter job position',
      },

      // Contact Information
      {
        key: 'email',
        label: 'Email',
        type: 'email' as const,
        value: initialData.email || '',
        placeholder: 'Enter email address',
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'phone' as const,
        value: initialData.phone || '',
        placeholder: 'Enter phone number',
      },
      {
        key: 'mobile',
        label: 'Mobile',
        type: 'phone' as const,
        value: initialData.mobile || '',
        placeholder: 'Enter mobile number',
      },
      {
        key: 'website',
        label: 'Website',
        type: 'text' as const,
        value: initialData.website || '',
        placeholder: 'https://example.com',
      },

      // Address Information
      {
        key: 'street',
        label: 'Street',
        type: 'text' as const,
        value: initialData.street || '',
        placeholder: 'Enter street address',
      },
      {
        key: 'street2',
        label: 'Street 2',
        type: 'text' as const,
        value: initialData.street2 || '',
        placeholder: 'Apartment, suite, etc.',
      },
      {
        key: 'city',
        label: 'City',
        type: 'text' as const,
        value: initialData.city || '',
        placeholder: 'Enter city',
      },
      {
        key: 'zip',
        label: 'ZIP Code',
        type: 'text' as const,
        value: initialData.zip || '',
        placeholder: 'Enter ZIP code',
      },

      // Business Information
      {
        key: 'customer_rank',
        label: 'Customer Rank',
        type: 'selection' as const,
        value: initialData.customer_rank || 0,
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
        value: initialData.supplier_rank || 0,
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
        value: initialData.vat || '',
        placeholder: 'Enter tax identification number',
      },

      // Additional Information
      {
        key: 'lang',
        label: 'Language',
        type: 'selection' as const,
        value: initialData.lang || 'en_US',
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
        value: initialData.active !== undefined ? initialData.active : true,
      },
      {
        key: 'comment',
        label: 'Notes',
        type: 'multiline' as const,
        value: initialData.comment || '',
        placeholder: 'Enter additional notes about this contact',
      },
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <BaseFormView
        record={null}
        mode="create"
        loading={creating}
        readonly={false}
        fields={getCreateFields()}
        title="New Contact"
        showHeader={true}
        showActions={false}
        onSave={handleSave}
        onCancel={handleCancel}
      />
          <ScreenBadge screenNumber={104} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
