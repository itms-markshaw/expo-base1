/**
 * 106_ContactChatter - Contact chatter/messages view
 * Screen Number: 106
 * Model: res.partner
 * Type: chatter
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseChatter from '../../base/components/BaseChatter';
import { contactService } from '../services/ContactService';
import { Contact } from '../types/Contact';
import ScreenBadge from '../../../components/ScreenBadge';
import ScreenBadge from '../../../components/ScreenBadge';

interface ContactChatterProps {
  contactId: number;
  onBack?: () => void;
  readonly?: boolean;
}

export default function ContactChatter({
  contactId,
  onBack,
  readonly = false,
}: ContactChatterProps) {
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

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {contact?.name || 'Contact Chatter'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Messages, activities, and attachments
          </Text>
        </View>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => {
            // Navigate to contact detail (102)
            console.log('Navigate to contact detail:', contactId);
          }}
        >
          <MaterialIcons name="info" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => {
            // Navigate to contact edit (103)
            console.log('Navigate to contact edit:', contactId);
          }}
        >
          <MaterialIcons name="edit" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading contact...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Contact not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadContact}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <BaseChatter
        modelName="res.partner"
        recordId={contactId}
        readonly={readonly}
        config={{
          showFollowers: true,
          showActivities: true,
          showAttachments: true,
          allowInternalNotes: true,
          allowEmails: true,
          compactMode: false,
        }}
      />
      <ScreenBadge screenNumber={106} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAction: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
