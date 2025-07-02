import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { databaseService } from '../services/database';

interface TableInfo {
  name: string;
  recordCount: number;
  lastSync?: string;
}

interface DatabaseRecord {
  [key: string]: any;
}

export default function DatabaseManagerScreen() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);

      // Get actual tables from SQLite database
      const actualTables = await databaseService.getAllTables();

      // Filter out system tables
      const userTables = actualTables.filter(table =>
        !['sync_metadata', 'sync_queue', 'sqlite_sequence'].includes(table)
      );

      const tableInfos: TableInfo[] = [];

      for (const tableName of userTables) {
        try {
          const totalRecords = await getTotalRecordCount(tableName);

          // Try to get sync metadata for this table
          const syncMetadata = await databaseService.getAllSyncMetadata();
          const modelName = getModelNameFromTable(tableName);
          const metadata = syncMetadata.find(m => getTableName(m.model_name) === tableName);

          tableInfos.push({
            name: tableName,
            recordCount: totalRecords,
            lastSync: metadata?.last_sync_timestamp,
          });
        } catch (error) {
          console.warn(`⚠️ Failed to get info for table ${tableName}:`, error);
        }
      }

      setTables(tableInfos.sort((a, b) => b.recordCount - a.recordCount));
    } catch (error) {
      console.error('❌ Failed to load tables:', error);
      Alert.alert('Error', 'Failed to load database tables');
    } finally {
      setLoading(false);
    }
  };

  const getTotalRecordCount = async (tableName: string): Promise<number> => {
    try {
      const records = await databaseService.getRecords(tableName, 10000, 0);
      return records.length;
    } catch (error) {
      return 0;
    }
  };

  const getTableName = (modelName: string): string => {
    const tableMap: { [key: string]: string } = {
      'res.partner': 'contacts',
      'res.users': 'users',
      'hr.employee': 'employees',
      'mail.message': 'messages',
      'mail.activity': 'activities',
      'ir.attachment': 'attachments',
      'discuss.channel': 'chat_channels',
      'sale.order': 'sale_orders',
      'crm.lead': 'crm_leads',
      'calendar.event': 'calendar_events',
      'product.product': 'products',
      'product.template': 'product_templates',
      'account.move': 'invoices',
      'stock.picking': 'deliveries',
      'project.project': 'projects',
      'project.task': 'project_tasks',
      'helpdesk.ticket': 'helpdesk_tickets',
      'helpdesk.team': 'helpdesk_teams',
    };

    return tableMap[modelName] || modelName.replace('.', '_');
  };

  const getModelNameFromTable = (tableName: string): string => {
    const reverseTableMap: { [key: string]: string } = {
      'contacts': 'res.partner',
      'users': 'res.users',
      'employees': 'hr.employee',
      'messages': 'mail.message',
      'activities': 'mail.activity',
      'attachments': 'ir.attachment',
      'chat_channels': 'discuss.channel',
      'sale_orders': 'sale.order',
      'crm_leads': 'crm.lead',
      'calendar_events': 'calendar.event',
      'products': 'product.product',
      'product_templates': 'product.template',
      'invoices': 'account.move',
      'deliveries': 'stock.picking',
      'projects': 'project.project',
      'project_tasks': 'project.task',
      'helpdesk_tickets': 'helpdesk.ticket',
      'helpdesk_teams': 'helpdesk.team',
    };

    return reverseTableMap[tableName] || tableName.replace('_', '.');
  };

  const loadTableRecords = async (tableName: string) => {
    try {
      setLoading(true);
      const tableRecords = await databaseService.getRecords(tableName, 50, 0);
      setRecords(tableRecords);
      setSelectedTable(tableName);
    } catch (error) {
      console.error(`❌ Failed to load records from ${tableName}:`, error);
      Alert.alert('Error', `Failed to load records from ${tableName}`);
    } finally {
      setLoading(false);
    }
  };

  const clearTable = async (tableName: string) => {
    Alert.alert(
      'Clear Table',
      `Are you sure you want to clear all data from ${tableName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would require adding a clearTable method to databaseService
              Alert.alert('Info', 'Clear table functionality needs to be implemented');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear table');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedTable) {
      await loadTableRecords(selectedTable);
    } else {
      await loadTables();
    }
    setRefreshing(false);
  };

  const renderTableItem = ({ item }: { item: TableInfo }) => (
    <TouchableOpacity
      style={styles.tableCard}
      onPress={() => loadTableRecords(item.name)}
    >
      <View style={styles.tableHeader}>
        <MaterialIcons name="table-chart" size={24} color="#2196F3" />
        <View style={styles.tableInfo}>
          <Text style={styles.tableName}>{item.name}</Text>
          <Text style={styles.tableStats}>
            {item.recordCount.toLocaleString()} records
          </Text>
          {item.lastSync && (
            <Text style={styles.lastSync}>
              Last sync: {new Date(item.lastSync).toLocaleDateString()}
            </Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderRecordItem = ({ item, index }: { item: DatabaseRecord; index: number }) => (
    <View style={styles.recordCard}>
      <Text style={styles.recordIndex}>#{index + 1}</Text>
      <View style={styles.recordContent}>
        {Object.entries(item).slice(0, 5).map(([key, value]) => (
          <View key={key} style={styles.recordField}>
            <Text style={styles.fieldName}>{key}:</Text>
            <Text style={styles.fieldValue} numberOfLines={1}>
              {value?.toString() || 'null'}
            </Text>
          </View>
        ))}
        {Object.keys(item).length > 5 && (
          <Text style={styles.moreFields}>
            +{Object.keys(item).length - 5} more fields
          </Text>
        )}
      </View>
    </View>
  );

  if (selectedTable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedTable(null);
              setRecords([]);
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedTable}</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => clearTable(selectedTable)}
          >
            <MaterialIcons name="delete" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {records.length.toLocaleString()} records
          </Text>
        </View>

        <FlatList
          data={records}
          renderItem={renderRecordItem}
          keyExtractor={(item, index) => `${item.id || index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No records found</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Manager</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadTables}
        >
          <MaterialIcons name="refresh" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {tables.length} tables • {tables.reduce((sum, t) => sum + t.recordCount, 0).toLocaleString()} total records
        </Text>
      </View>

      <FlatList
        data={tables}
        renderItem={renderTableItem}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="storage" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tables found</Text>
            <Text style={styles.emptySubtext}>Run a sync to create tables</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  actionButton: {
    padding: 8,
  },
  statsBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  tableInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tableStats: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lastSync: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordIndex: {
    fontSize: 12,
    color: '#999',
    marginRight: 12,
    minWidth: 30,
  },
  recordContent: {
    flex: 1,
  },
  recordField: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    minWidth: 80,
  },
  fieldValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  moreFields: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
