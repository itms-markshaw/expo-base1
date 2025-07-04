/**
 * 951_TestingDashboard - CRUD Testing Screen
 * Screen Number: 951
 * Model: app.testing
 * Type: main
 *
 * Interface to run and view CRUD test results
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { crudTestingService } from '../services/CRUDTestingService';
import { testSync } from '../../../utils/testSync';
import { databaseService } from '../../base/services/BaseDatabaseService';
import { offlineQueueService } from '../../sync_management/services/OfflineQueueService';
import { authService } from '../../base/services/BaseAuthService';
import NetInfo from '@react-native-community/netinfo';
import ScreenBadge from '../../../components/ScreenBadge';

interface TestSuite {
  name: string;
  results: any[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

interface Contact {
  id?: number;
  name: string;
  email: string;
  phone: string;
  is_company: boolean;
}

export default function TestScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [isRunningConflictTests, setIsRunningConflictTests] = useState(false);
  const [conflictTestResults, setConflictTestResults] = useState<any>(null);
  const [isRunningIncrementalTest, setIsRunningIncrementalTest] = useState(false);

  // Offline sync testing state
  const [isOnline, setIsOnline] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [testContact, setTestContact] = useState<Contact>({
    name: 'Test Contact',
    email: 'test@example.com',
    phone: '+1234567890',
    is_company: false,
  });

  const handleRunTests = async () => {
    setIsRunning(true);
    setHasRun(false);
    
    try {
      console.log('🧪 Starting CRUD tests...');
      const results = await crudTestingService.runAllTests();
      setTestResults(results);
      setHasRun(true);
      
      const totalTests = results.reduce((sum, suite) => sum + suite.totalTests, 0);
      const passedTests = results.reduce((sum, suite) => sum + suite.passedTests, 0);
      const failedTests = results.reduce((sum, suite) => sum + suite.failedTests, 0);
      
      if (failedTests === 0) {
        Alert.alert(
          '🎉 All Tests Passed!',
          `Successfully completed ${totalTests} CRUD operations.\n\nYour Odoo integration is working perfectly!`
        );
      } else {
        Alert.alert(
          '⚠️ Some Tests Failed',
          `${passedTests}/${totalTests} tests passed.\n\nCheck the results below for details.`
        );
      }
    } catch (error) {
      Alert.alert('Test Error', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Offline sync testing functions
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    loadTestData();
    return unsubscribe;
  }, []);

  const loadTestData = async () => {
    try {
      await databaseService.initialize();

      // Load test contacts from local database
      const db = databaseService.getDatabase();
      if (db) {
        const result = await db.getAllAsync(`
          SELECT * FROM res_partner
          WHERE name LIKE 'Test Contact%' OR name LIKE '%Test Contact%'
          ORDER BY write_date DESC
          LIMIT 10
        `);

        const loadedContacts = result.map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email || '',
          phone: row.phone || '',
          is_company: row.is_company || false,
        }));

        setContacts(loadedContacts);
      }
    } catch (error) {
      console.error('Failed to load test data:', error);
    }
  };

  const createTestContact = async () => {
    try {
      if (isOnline) {
        // Create directly via API
        const client = authService.getClient();
        if (!client) {
          Alert.alert('Error', 'Not authenticated');
          return;
        }

        const contactId = await client.create('res.partner', {
          name: testContact.name,
          email: testContact.email,
          phone: testContact.phone,
          is_company: testContact.is_company,
        });

        Alert.alert('Success', 'Contact created successfully!');
        console.log('✅ Created contact:', contactId);
      } else {
        // Queue for offline sync
        await offlineQueueService.queueOperation(
          'create',
          'res.partner',
          {
            name: testContact.name,
            email: testContact.email,
            phone: testContact.phone,
            is_company: testContact.is_company,
          }
        );
        Alert.alert('Queued', 'Contact queued for sync when online!');
      }

      await loadTestData();
    } catch (error) {
      Alert.alert('Error', `Failed to create contact: ${error.message}`);
      console.error('Create contact error:', error);
    }
  };

  const updateTestContact = async (contact: Contact) => {
    try {
      const updatedData = {
        name: `${contact.name} (Modified ${new Date().toLocaleTimeString()})`,
      };

      if (isOnline) {
        // Update directly via API
        const client = authService.getClient();
        if (!client) {
          Alert.alert('Error', 'Not authenticated');
          return;
        }

        await client.update('res.partner', contact.id!, updatedData);
        Alert.alert('Success', 'Contact updated successfully!');
      } else {
        // Queue for offline sync
        await offlineQueueService.queueOperation(
          'update',
          'res.partner',
          updatedData,
          contact.id
        );
        Alert.alert('Queued', 'Update queued for sync when online!');
      }

      await loadTestData();
    } catch (error) {
      Alert.alert('Error', `Failed to update contact: ${error.message}`);
      console.error('Update contact error:', error);
    }
  };

  const handleRunConflictTests = async () => {
    setIsRunningConflictTests(true);

    try {
      console.log('🧪 Starting conflict resolution tests...');

      // Run all sync tests
      await testSync.runAllTests();

      // Get system status
      const systemStatus = await testSync.getSystemStatus();
      setConflictTestResults(systemStatus);

      Alert.alert(
        '🧪 Conflict Tests Complete',
        `Auto-sync: ${systemStatus.autoSync?.isOnline ? 'Online' : 'Offline'}\n` +
        `Conflicts: ${systemStatus.conflicts}\n` +
        `Queue: ${systemStatus.queueStatus.pending} pending, ${systemStatus.queueStatus.failed} failed`
      );

    } catch (error) {
      console.error('Conflict tests failed:', error);
      Alert.alert('Test Error', 'Failed to run conflict tests');
    } finally {
      setIsRunningConflictTests(false);
    }
  };

  const handleTestIncrementalSync = async () => {
    setIsRunningIncrementalTest(true);

    try {
      console.log('🧪 Testing incremental sync...');

      await testSync.testIncrementalSync();

      Alert.alert(
        '🔄 Incremental Sync Test Complete',
        'Check the console logs to see if incremental sync is working correctly. Look for "INCREMENTAL" vs "INITIAL SYNC" messages.'
      );

    } catch (error) {
      console.error('Incremental sync test failed:', error);
      Alert.alert('Test Error', 'Failed to run incremental sync test');
    } finally {
      setIsRunningIncrementalTest(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success: boolean) => {
    return success ? '#34C759' : '#FF3B30';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={951} />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CRUD Testing</Text>
          <Text style={styles.subtitle}>
            Test Create, Read, Update, Delete operations on Users and Contacts
          </Text>
        </View>

        {/* Run Tests Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.testButton, isRunning && styles.testButtonDisabled]}
            onPress={handleRunTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons name="play-arrow" size={20} color="#FFF" />
            )}
            <Text style={styles.testButtonText}>
              {isRunning ? 'Running Tests...' : 'Run CRUD Tests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.conflictTestButton, isRunningConflictTests && styles.testButtonDisabled]}
            onPress={handleRunConflictTests}
            disabled={isRunningConflictTests}
          >
            {isRunningConflictTests ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons name="merge-type" size={20} color="#FFF" />
            )}
            <Text style={styles.testButtonText}>
              {isRunningConflictTests ? 'Testing Conflicts...' : 'Test Conflict Resolution'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.incrementalTestButton, isRunningIncrementalTest && styles.testButtonDisabled]}
            onPress={handleTestIncrementalSync}
            disabled={isRunningIncrementalTest}
          >
            {isRunningIncrementalTest ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons name="sync" size={20} color="#FFF" />
            )}
            <Text style={styles.testButtonText}>
              {isRunningIncrementalTest ? 'Testing Incremental...' : 'Test Incremental Sync'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conflict Test Results */}
        {conflictTestResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>🧪 Conflict Resolution Test Results</Text>

            <View style={styles.conflictResultCard}>
              <Text style={styles.conflictResultTitle}>Auto-Sync Status</Text>
              <Text style={styles.conflictResultText}>
                Online: {conflictTestResults.autoSync?.isOnline ? '✅ Yes' : '❌ No'}{'\n'}
                App State: {conflictTestResults.autoSync?.appState || 'Unknown'}{'\n'}
                Background Sync: {conflictTestResults.autoSync?.backgroundSyncActive ? '✅ Active' : '❌ Inactive'}
              </Text>
            </View>

            <View style={styles.conflictResultCard}>
              <Text style={styles.conflictResultTitle}>Conflicts</Text>
              <Text style={styles.conflictResultText}>
                Pending Conflicts: {conflictTestResults.conflicts}
              </Text>
            </View>

            <View style={styles.conflictResultCard}>
              <Text style={styles.conflictResultTitle}>Offline Queue</Text>
              <Text style={styles.conflictResultText}>
                Pending: {conflictTestResults.queueStatus.pending}{'\n'}
                Failed: {conflictTestResults.queueStatus.failed}{'\n'}
                Total: {conflictTestResults.queueStatus.total}
              </Text>
            </View>

            <View style={styles.conflictResultCard}>
              <Text style={styles.conflictResultTitle}>Sync Status</Text>
              <Text style={styles.conflictResultText}>
                Running: {conflictTestResults.syncStatus?.isRunning ? '✅ Yes' : '❌ No'}{'\n'}
                Progress: {conflictTestResults.syncStatus?.progress || 0}%{'\n'}
                Records Synced: {conflictTestResults.syncStatus?.syncedRecords || 0}
              </Text>
            </View>
          </View>
        )}

        {/* Test Results */}
        {hasRun && testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            
            {testResults.map((suite, suiteIndex) => (
              <View key={suiteIndex} style={styles.suiteCard}>
                <View style={styles.suiteHeader}>
                  <Text style={styles.suiteName}>{suite.name}</Text>
                  <View style={styles.suiteStats}>
                    <Text style={[styles.statText, { color: '#34C759' }]}>
                      {suite.passedTests} ✅
                    </Text>
                    <Text style={[styles.statText, { color: '#FF3B30' }]}>
                      {suite.failedTests} ❌
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.suiteSummary}>
                  {suite.totalTests} tests • {suite.totalDuration}ms • {((suite.passedTests / suite.totalTests) * 100).toFixed(0)}% success
                </Text>

                {/* Individual Test Results */}
                <View style={styles.testsList}>
                  {suite.results.map((result, resultIndex) => (
                    <View key={resultIndex} style={styles.testItem}>
                      <View style={styles.testInfo}>
                        <Text style={styles.testOperation}>
                          {getStatusIcon(result.success)} {result.operation}
                        </Text>
                        <Text style={styles.testModel}>{result.model}</Text>
                      </View>
                      <View style={styles.testMeta}>
                        <Text style={styles.testDuration}>{result.duration}ms</Text>
                        {!result.success && (
                          <Text style={styles.testError} numberOfLines={2}>
                            {result.error}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Overall Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Overall Summary</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {testResults.reduce((sum, suite) => sum + suite.totalTests, 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Tests</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                    {testResults.reduce((sum, suite) => sum + suite.passedTests, 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Passed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                    {testResults.reduce((sum, suite) => sum + suite.failedTests, 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Failed</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {testResults.reduce((sum, suite) => sum + suite.totalDuration, 0)}ms
                  </Text>
                  <Text style={styles.summaryLabel}>Duration</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>What This Tests</Text>
          <Text style={styles.instructionsText}>
            • <Text style={styles.bold}>Users CRUD:</Text> Create, read, update, and delete test users{'\n'}
            • <Text style={styles.bold}>Contacts CRUD:</Text> Create, read, update, and delete test contacts{'\n'}
            • <Text style={styles.bold}>Conflict Resolution:</Text> Auto-sync, offline queue, and conflict detection{'\n'}
            • <Text style={styles.bold}>Incremental Sync:</Text> Tests if only modified records are synced{'\n'}
            • <Text style={styles.bold}>Error Handling:</Text> Proper error reporting and recovery{'\n'}
            • <Text style={styles.bold}>Performance:</Text> Response times for each operation
          </Text>
          
          <Text style={styles.warningText}>
            ⚠️ Note: This will create and delete test records in your Odoo database. Make sure you have appropriate permissions.
          </Text>
        </View>

        {/* Offline Sync Testing Panel */}
        <View style={styles.offlineTestingCard}>
          <View style={styles.offlineTestingHeader}>
            <MaterialIcons name="wifi-off" size={24} color="#2196F3" />
            <Text style={styles.offlineTestingTitle}>Offline Sync Testing</Text>
            <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]}>
              <Text style={styles.onlineIndicatorText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>

          {/* Create Test Contact */}
          <View style={styles.offlineSection}>
            <Text style={styles.offlineSectionTitle}>Create Test Contact</Text>
            <TextInput
              style={styles.offlineInput}
              placeholder="Name"
              value={testContact.name}
              onChangeText={(text) => setTestContact(prev => ({ ...prev, name: text }))}
            />
            <TextInput
              style={styles.offlineInput}
              placeholder="Email"
              value={testContact.email}
              onChangeText={(text) => setTestContact(prev => ({ ...prev, email: text }))}
            />
            <TextInput
              style={styles.offlineInput}
              placeholder="Phone"
              value={testContact.phone}
              onChangeText={(text) => setTestContact(prev => ({ ...prev, phone: text }))}
            />
            <TouchableOpacity style={styles.offlineCreateButton} onPress={createTestContact}>
              <MaterialIcons name="add" size={20} color="white" />
              <Text style={styles.offlineButtonText}>
                {isOnline ? 'Create Contact' : 'Queue Contact'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Test Contacts */}
          <View style={styles.offlineSection}>
            <Text style={styles.offlineSectionTitle}>Test Contacts ({contacts.length})</Text>
            {contacts.slice(0, 3).map((contact) => (
              <View key={contact.id} style={styles.offlineContactCard}>
                <View style={styles.offlineContactInfo}>
                  <Text style={styles.offlineContactName}>{contact.name}</Text>
                  <Text style={styles.offlineContactEmail}>{contact.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.offlineEditButton}
                  onPress={() => updateTestContact(contact)}
                >
                  <MaterialIcons name="edit" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Testing Instructions */}
          <View style={styles.offlineSection}>
            <Text style={styles.offlineSectionTitle}>📋 Testing Instructions</Text>
            <Text style={styles.offlineInstruction}>1. Turn off WiFi/cellular</Text>
            <Text style={styles.offlineInstruction}>2. Create or edit contacts</Text>
            <Text style={styles.offlineInstruction}>3. See operations queue up</Text>
            <Text style={styles.offlineInstruction}>4. Turn WiFi back on</Text>
            <Text style={styles.offlineInstruction}>5. Process queue to sync</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  testButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  conflictTestButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  conflictResultCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  conflictResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  conflictResultText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  incrementalTestButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  testButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  suiteCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suiteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suiteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  suiteStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  suiteSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  testsList: {
    gap: 8,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  testInfo: {
    flex: 1,
  },
  testOperation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  testModel: {
    fontSize: 12,
    color: '#666',
  },
  testMeta: {
    alignItems: 'flex-end',
  },
  testDuration: {
    fontSize: 12,
    color: '#666',
  },
  testError: {
    fontSize: 10,
    color: '#FF3B30',
    maxWidth: 120,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  // Offline testing styles
  offlineTestingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offlineTestingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  offlineTestingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  onlineIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineSection: {
    marginBottom: 20,
  },
  offlineSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  offlineInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  offlineCreateButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  offlineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  offlineContactInfo: {
    flex: 1,
  },
  offlineContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  offlineContactEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  offlineEditButton: {
    padding: 8,
  },
  offlineInstruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});
