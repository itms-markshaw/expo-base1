/**
 * CRUD Testing Screen
 * Interface to run and view CRUD test results
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { crudTestingService } from '../services/crudTesting';

interface TestSuite {
  name: string;
  results: any[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

export default function TestScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [hasRun, setHasRun] = useState(false);

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

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success: boolean) => {
    return success ? '#34C759' : '#FF3B30';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CRUD Testing</Text>
          <Text style={styles.subtitle}>
            Test Create, Read, Update, Delete operations on Users and Contacts
          </Text>
        </View>

        {/* Run Tests Button */}
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
        </View>

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
            • <Text style={styles.bold}>Error Handling:</Text> Proper error reporting and recovery{'\n'}
            • <Text style={styles.bold}>Performance:</Text> Response times for each operation
          </Text>
          
          <Text style={styles.warningText}>
            ⚠️ Note: This will create and delete test records in your Odoo database. Make sure you have appropriate permissions.
          </Text>
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
});
