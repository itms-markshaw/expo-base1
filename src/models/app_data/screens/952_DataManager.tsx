/**
 * 952_DataManager - Browse synced data
 * Screen Number: 952
 * Model: app.data
 * Type: manager
 *
 * MIGRATED: From src/screens/DataScreen.tsx
 * Browse synced data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { databaseService } from '../../../services/database';
import ImprovedChatterComponent from '../../../components/ImprovedChatterComponent';
import ScreenBadge from '../../../components/ScreenBadge';

interface DataRecord {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  is_company?: boolean;
  synced_at?: number;
}

export default function DataManager() {
  const [selectedTable, setSelectedTable] = useState('contacts' as 'contacts' | 'users' | 'employees' | 'crm_leads');
  const [data, setData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChatter, setShowChatter] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ id: number; name: string; model: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedTable]);

  const loadData = async () => {
    setLoading(true);
    try {
      await databaseService.initialize();
      const records = await databaseService.getRecords(selectedTable, 100);
      setData(records);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all synced data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearAllData();
              setData([]);
              Alert.alert('Success', 'All data cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleOpenChatter = (record: DataRecord) => {
    const modelMap = {
      'contacts': 'res.partner',
      'users': 'res.users',
      'employees': 'hr.employee',
      'crm_leads': 'crm.lead',
    };

    setSelectedRecord({
      id: record.id,
      name: record.name,
      model: modelMap[selectedTable] || selectedTable
    });
    setShowChatter(true);
  };

  const renderRecord = ({ item }: { item: DataRecord }) => (
    <TouchableOpacity
      style={styles.recordCard}
      onPress={() => handleOpenChatter(item)}
    >
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordName}>{item.name}</Text>
          <Text style={styles.recordId}>ID: {item.id}</Text>
        </View>
        <View style={styles.recordActions}>
          <MaterialIcons name="chat" size={20} color="#007AFF" />
        </View>
        {selectedTable === 'contacts' && item.is_company ? (
          <View style={styles.companyBadge}>
            <Text style={styles.companyBadgeText}>Company</Text>
          </View>
        ) : null}
        {selectedTable === 'crm_leads' && item.stage_name ? (
          <View style={[styles.companyBadge, { backgroundColor: '#E8F5E8' }]}>
            <Text style={[styles.companyBadgeText, { color: '#34C759' }]}>{item.stage_name}</Text>
          </View>
        ) : null}
      </View>
      
      {(item.email || item.email_from) ? (
        <View style={styles.recordDetail}>
          <MaterialIcons name="email" size={16} color="#666" />
          <Text style={styles.recordDetailText}>{item.email || item.email_from}</Text>
        </View>
      ) : null}

      {item.phone ? (
        <View style={styles.recordDetail}>
          <MaterialIcons name="phone" size={16} color="#666" />
          <Text style={styles.recordDetailText}>{item.phone}</Text>
        </View>
      ) : null}

      {selectedTable === 'crm_leads' && item.probability !== undefined ? (
        <View style={styles.recordDetail}>
          <MaterialIcons name="trending-up" size={16} color="#666" />
          <Text style={styles.recordDetailText}>{item.probability}% probability</Text>
        </View>
      ) : null}

      {selectedTable === 'crm_leads' && item.expected_revenue ? (
        <View style={styles.recordDetail}>
          <MaterialIcons name="attach-money" size={16} color="#666" />
          <Text style={styles.recordDetailText}>${item.expected_revenue}</Text>
        </View>
      ) : null}

      {item.synced_at ? (
        <View style={styles.recordDetail}>
          <MaterialIcons name="sync" size={16} color="#666" />
          <Text style={styles.recordDetailText}>
            Synced: {new Date(item.synced_at * 1000).toLocaleString()}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={952} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Browse Data</Text>
        <TouchableOpacity onPress={handleClearData} style={styles.clearButton}>
          <MaterialIcons name="delete" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Table Selector */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[
            styles.selectorButton,
            selectedTable === 'contacts' && styles.selectorButtonActive,
          ]}
          onPress={() => setSelectedTable('contacts')}
        >
          <MaterialIcons 
            name="contacts" 
            size={20} 
            color={selectedTable === 'contacts' ? '#FFF' : '#007AFF'} 
          />
          <Text
            style={[
              styles.selectorButtonText,
              selectedTable === 'contacts' && styles.selectorButtonTextActive,
            ]}
          >
            Contacts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            selectedTable === 'users' && styles.selectorButtonActive,
          ]}
          onPress={() => setSelectedTable('users')}
        >
          <MaterialIcons
            name="people"
            size={20}
            color={selectedTable === 'users' ? '#FFF' : '#007AFF'}
          />
          <Text
            style={[
              styles.selectorButtonText,
              selectedTable === 'users' && styles.selectorButtonTextActive,
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            selectedTable === 'employees' && styles.selectorButtonActive,
          ]}
          onPress={() => setSelectedTable('employees')}
        >
          <MaterialIcons
            name="badge"
            size={20}
            color={selectedTable === 'employees' ? '#FFF' : '#007AFF'}
          />
          <Text
            style={[
              styles.selectorButtonText,
              selectedTable === 'employees' && styles.selectorButtonTextActive,
            ]}
          >
            Employees
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            selectedTable === 'crm_leads' && styles.selectorButtonActive,
          ]}
          onPress={() => setSelectedTable('crm_leads')}
        >
          <MaterialIcons
            name="trending-up"
            size={20}
            color={selectedTable === 'crm_leads' ? '#FFF' : '#007AFF'}
          />
          <Text
            style={[
              styles.selectorButtonText,
              selectedTable === 'crm_leads' && styles.selectorButtonTextActive,
            ]}
          >
            Leads
          </Text>
        </TouchableOpacity>
      </View>

      {/* Data List */}
      <FlatList
        data={data}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptySubtitle}>
              {loading ? 'Loading...' : 'No records found. Try syncing some data first.'}
            </Text>
          </View>
        }
      />

      {/* Record Count */}
      {data.length > 0 ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Showing {data.length} {selectedTable}
          </Text>
        </View>
      ) : null}

      {/* Chatter Modal */}
      <Modal
        visible={showChatter}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowChatter(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chatter</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedRecord && (
            <ImprovedChatterComponent
              model={selectedRecord.model}
              recordId={selectedRecord.id}
              recordName={selectedRecord.name}
            />
          )}
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  clearButton: {
    padding: 8,
  },
  selectorContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#FFF',
  },
  selectorButtonActive: {
    backgroundColor: '#007AFF',
  },
  selectorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  selectorButtonTextActive: {
    color: '#FFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  recordCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordActions: {
    padding: 4,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  recordId: {
    fontSize: 12,
    color: '#666',
  },
  companyBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  companyBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  recordDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
