/**
 * 102_ContactDetail - Contact detail/form view (read-only)
 * Screen Number: 102
 * Model: res.partner
 * Type: detail
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseFormView from '../../base/components/BaseFormView';
import { contactService } from '../services/ContactService';
import { Contact, CONTACT_FIELDS } from '../types/Contact';
import ScreenBadge from '../../../components/ScreenBadge';
import ScreenBadge from '../../../components/ScreenBadge';

interface ContactDetailProps {
  contactId: number;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  onChatter?: (contact: Contact) => void;
  onActivities?: (contact: Contact) => void;
  onAttachments?: (contact: Contact) => void;
}

export default function ContactDetail({
  contactId,
  onEdit,
  onDelete,
  onChatter,
  onActivities,
  onAttachments,
}: ContactDetailProps) {
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

  const handleEdit = () => {
    if (contact) {
      onEdit?.(contact);
      // Navigate to 103_ContactEdit
      console.log('Navigate to edit contact:', contact.id);
    }
  };

  const handleDelete = () => {
    if (!contact) return;

    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete "${contact.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.delete(contact.id);
              onDelete?.(contact);
              Alert.alert('Success', 'Contact deleted successfully');
            } catch (error) {
              console.error('Failed to delete contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!contact) return;

    const shareContent = `Contact: ${contact.name}\n` +
      (contact.email ? `Email: ${contact.email}\n` : '') +
      (contact.phone ? `Phone: ${contact.phone}\n` : '') +
      (contact.mobile ? `Mobile: ${contact.mobile}\n` : '') +
      (contact.website ? `Website: ${contact.website}\n` : '');

    try {
      await Share.share({
        message: shareContent,
        title: `Contact: ${contact.name}`,
      });
    } catch (error) {
      console.error('Failed to share contact:', error);
    }
  };

  const formatRelationalField = (field: [number, string] | undefined, fallback: string = 'Not set') => {
    return Array.isArray(field) ? field[1] : fallback;
  };

  const getContactFields = () => {
    if (!contact) return [];

    return [
      // Basic Information
      {
        key: 'name',
        label: 'Name',
        type: 'readonly' as const,
        value: contact.name,
        required: true,
      },
      {
        key: 'is_company',
        label: 'Is Company',
        type: 'boolean' as const,
        value: contact.is_company,
      },
      {
        key: 'parent_id',
        label: 'Parent Company',
        type: 'readonly' as const,
        value: formatRelationalField(contact.parent_id),
      },
      {
        key: 'title',
        label: 'Title',
        type: 'readonly' as const,
        value: formatRelationalField(contact.title),
      },
      {
        key: 'function',
        label: 'Job Position',
        type: 'readonly' as const,
        value: contact.function || 'Not set',
      },

      // Contact Information
      {
        key: 'email',
        label: 'Email',
        type: 'readonly' as const,
        value: contact.email || 'Not set',
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'readonly' as const,
        value: contact.phone || 'Not set',
      },
      {
        key: 'mobile',
        label: 'Mobile',
        type: 'readonly' as const,
        value: contact.mobile || 'Not set',
      },
      {
        key: 'website',
        label: 'Website',
        type: 'readonly' as const,
        value: contact.website || 'Not set',
      },

      // Address Information
      {
        key: 'street',
        label: 'Street',
        type: 'readonly' as const,
        value: contact.street || 'Not set',
      },
      {
        key: 'street2',
        label: 'Street 2',
        type: 'readonly' as const,
        value: contact.street2 || 'Not set',
      },
      {
        key: 'city',
        label: 'City',
        type: 'readonly' as const,
        value: contact.city || 'Not set',
      },
      {
        key: 'state_id',
        label: 'State',
        type: 'readonly' as const,
        value: formatRelationalField(contact.state_id),
      },
      {
        key: 'zip',
        label: 'ZIP Code',
        type: 'readonly' as const,
        value: contact.zip || 'Not set',
      },
      {
        key: 'country_id',
        label: 'Country',
        type: 'readonly' as const,
        value: formatRelationalField(contact.country_id),
      },

      // Business Information
      {
        key: 'customer_rank',
        label: 'Customer Rank',
        type: 'readonly' as const,
        value: contact.customer_rank.toString(),
      },
      {
        key: 'supplier_rank',
        label: 'Supplier Rank',
        type: 'readonly' as const,
        value: contact.supplier_rank.toString(),
      },
      {
        key: 'vat',
        label: 'Tax ID',
        type: 'readonly' as const,
        value: contact.vat || 'Not set',
      },
      {
        key: 'credit_limit',
        label: 'Credit Limit',
        type: 'readonly' as const,
        value: contact.credit_limit ? contact.credit_limit.toString() : 'Not set',
      },

      // Additional Information
      {
        key: 'lang',
        label: 'Language',
        type: 'readonly' as const,
        value: contact.lang || 'Not set',
      },
      {
        key: 'tz',
        label: 'Timezone',
        type: 'readonly' as const,
        value: contact.tz || 'Not set',
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
        value: contact.comment || 'No notes',
      },
    ];
  };

  const getCustomActions = () => [
    {
      icon: 'message',
      label: 'Chatter',
      onPress: () => {
        if (contact) {
          onChatter?.(contact);
          // Navigate to 106_ContactChatter
          console.log('Navigate to contact chatter:', contact.id);
        }
      },
      color: '#007AFF',
    },
    {
      icon: 'event-note',
      label: 'Activities',
      onPress: () => {
        if (contact) {
          onActivities?.(contact);
          // Navigate to 108_ContactActivities
          console.log('Navigate to contact activities:', contact.id);
        }
      },
      color: '#FF9500',
    },
    {
      icon: 'attach-file',
      label: 'Attachments',
      onPress: () => {
        if (contact) {
          onAttachments?.(contact);
          // Navigate to 107_ContactAttachments
          console.log('Navigate to contact attachments:', contact.id);
        }
      },
      color: '#34C759',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BaseFormView
        record={contact}
        mode="view"
        loading={loading}
        readonly={true}
        fields={getContactFields()}
        title={contact?.name}
        showHeader={true}
        showActions={true}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        customActions={getCustomActions()}
      />
      <ScreenBadge screenNumber={102} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
