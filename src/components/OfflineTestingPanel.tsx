/**
 * Offline Testing Panel - Test offline sync capabilities
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { databaseService } from '../services/database';
import { offlineQueueService } from '../services/offlineQueue';
import NetInfo from '@react-native-community/netinfo';

interface Contact {
  id?: number;
  name: string;
  email: string;
  phone: string;
  is_company: boolean;
}

export function OfflineTestingPanel() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [testContact, setTestContact] = useState<Contact>({
    name: 'Test Contact',
    email: 'test@example.com',
    phone: '+1234567890',
    is_company: false,
  });
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    loadTestData();
    return unsubscribe;
  }, []);

  const loadTestData = async () => {
    try {
      // Load some test contacts
      const records = await databaseService.getRecords('res_partner', 5, 0);
      setContacts(records.map(r => ({
        id: r.id,
        name: r.name || 'Unknown',
        email: r.email || '',
        phone: r.phone || '',
        is_company: r.is_company === 1,
      })));

      // Get queue count
      const queue = await offlineQueueService.getQueuedOperations();
      setQueueCount(queue.length);
    } catch (error) {
      console.warn('Failed to load test data:', error);
    }
  };

  const createTestContact = async () => {
    try {
      const newContact = {
        ...testContact,
        id: Date.now(), // Temporary ID for offline
        create_date: new Date().toISOString(),
        write_date: new Date().toISOString(),
      };

      if (isOnline) {
        // Online: Save directly to database
        await databaseService.saveRecords('res_partner', [newContact]);
        Alert.alert('Success', 'Contact created online!');
      } else {
        // Offline: Queue the operation
        await offlineQueueService.queueOperation({
          id: `create_${Date.now()}`,
          type: 'create',
          modelName: 'res.partner',
          data: newContact,
          timestamp: new Date().toISOString(),
          status: 'queued',
          retryCount: 0,
        });
        Alert.alert('Queued', 'Contact queued for sync when online!');
      }

      await loadTestData();
    } catch (error) {
      Alert.alert('Error', 'Failed to create contact');
      console.error('Create contact error:', error);
    }
  };

  const updateTestContact = async (contact: Contact) => {
    try {
      const updatedContact = {
        ...contact,
        name: `${contact.name} (Modified ${new Date().toLocaleTimeString()})`,
        write_date: new Date().toISOString(),
      };

      if (isOnline) {
        // Online: Update directly
        await databaseService.updateRecord('res_partner', contact.id!, updatedContact);
        Alert.alert('Success', 'Contact updated online!');
      } else {
        // Offline: Queue the operation
        await offlineQueueService.queueOperation({
          id: `update_${contact.id}_${Date.now()}`,
          type: 'update',
          modelName: 'res.partner',
          recordId: contact.id!,
          data: updatedContact,
          timestamp: new Date().toISOString(),
          status: 'queued',
          retryCount: 0,
        });
        Alert.alert('Queued', 'Contact update queued for sync!');
      }

      await loadTestData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update contact');
      console.error('Update contact error:', error);
    }
  };

  const processQueue = async () => {
    try {
      await offlineQueueService.processQueue();
      await loadTestData();
      Alert.alert('Success', 'Queue processed!');
    } catch (error) {
      Alert.alert('Error', 'Failed to process queue');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Offline Sync Testing</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          {queueCount > 0 && (
            <View style={styles.queueBadge}>
              <Text style={styles.queueText}>{queueCount}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Create Test Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Test Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={testContact.name}
            onChangeText={(text) => setTestContact(prev => ({ ...prev, name: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={testContact.email}
            onChangeText={(text) => setTestContact(prev => ({ ...prev, email: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={testContact.phone}
            onChangeText={(text) => setTestContact(prev => ({ ...prev, phone: text }))}
          />
          <TouchableOpacity style={styles.createButton} onPress={createTestContact}>
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={styles.buttonText}>
              {isOnline ? 'Create Contact' : 'Queue Contact'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Existing Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Contacts ({contacts.length})</Text>
          {contacts.slice(0, 3).map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactEmail}>{contact.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => updateTestContact(contact)}
              >
                <MaterialIcons name="edit" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Queue Actions */}
        {queueCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Queued Operations</Text>
            <TouchableOpacity style={styles.processButton} onPress={processQueue}>
              <MaterialIcons name="sync" size={20} color="white" />
              <Text style={styles.buttonText}>Process Queue ({queueCount})</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Testing Instructions</Text>
          <Text style={styles.instruction}>1. Turn off WiFi/cellular</Text>
          <Text style={styles.instruction}>2. Create or edit contacts</Text>
          <Text style={styles.instruction}>3. See operations queue up</Text>
          <Text style={styles.instruction}>4. Turn WiFi back on</Text>
          <Text style={styles.instruction}>5. Process queue to sync</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  queueBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  queueText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    maxHeight: 400,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  contactEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  instruction: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});
