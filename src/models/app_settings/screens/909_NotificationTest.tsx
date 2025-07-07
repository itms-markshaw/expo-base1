/**
 * 909_NotificationTest - Push notification testing screen
 * Screen Number: 909
 * Model: app.settings
 * Type: test
 *
 * Development tool for testing push notifications
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// Import notification service with fallback
let notificationService: any = null;
try {
  notificationService = require('../../../services/NotificationService').notificationService;
} catch (error) {
  console.warn('⚠️ Using mock notification service');
  notificationService = require('../../../services/MockNotificationService').mockNotificationService;
}
import { syncService } from '../../base/services';
import ScreenBadge from '../../../components/ScreenBadge';

export default function NotificationTestScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('Test Notification');
  const [customBody, setCustomBody] = useState('This is a test notification from your app');

  useEffect(() => {
    loadNotificationInfo();
  }, []);

  const loadNotificationInfo = async () => {
    try {
      const token = notificationService.getPushToken();
      setPushToken(token);
    } catch (error) {
      console.error('Failed to load notification info:', error);
    }
  };

  const sendTestNotification = async (type: string, title: string, body: string, data?: any) => {
    try {
      setLoading(true);
      await notificationService.sendLocalNotification({
        type: type as any,
        title,
        body,
        priority: 'high',
        data,
      });
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
      console.error('Test notification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSyncTrigger = async () => {
    try {
      setLoading(true);
      Alert.alert('Info', 'Testing sync trigger - check console for logs');
      await syncService.syncModelFromNotification('res.partner');
    } catch (error) {
      Alert.alert('Error', 'Failed to test sync trigger');
      console.error('Sync trigger test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await notificationService.clearAllNotifications();
      Alert.alert('Success', 'All notifications cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear notifications');
    }
  };

  const testNotificationTypes = [
    {
      type: 'new_message',
      title: 'New Message',
      body: 'You have a new message from John Doe',
      icon: 'message',
      color: '#34C759',
      data: { modelName: 'mail.message', recordId: 123 }
    },
    {
      type: 'activity_reminder',
      title: 'Activity Reminder',
      body: 'Meeting with client in 15 minutes',
      icon: 'schedule',
      color: '#FF9500',
      data: { modelName: 'mail.activity', recordId: 456 }
    },
    {
      type: 'sync_complete',
      title: 'Sync Complete',
      body: 'Successfully synced 25 records',
      icon: 'sync',
      color: '#007AFF',
      data: { syncedRecords: 25, modelCount: 5 }
    },
    {
      type: 'conflict_detected',
      title: 'Conflict Detected',
      body: 'Data conflict in Contact record needs resolution',
      icon: 'warning',
      color: '#FF3B30',
      data: { modelName: 'res.partner', recordId: 789 }
    },
    {
      type: 'assignment',
      title: 'New Assignment',
      body: 'You have been assigned a new task',
      icon: 'assignment',
      color: '#5856D6',
      data: { modelName: 'project.task', recordId: 101 }
    },
    {
      type: 'status_change',
      title: 'Status Update',
      body: 'Sales order SO001 has been confirmed',
      icon: 'trending-up',
      color: '#30D158',
      data: { modelName: 'sale.order', recordId: 202 }
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={909} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Test</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Push Token Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Token Status</Text>
          <View style={styles.tokenCard}>
            <MaterialIcons 
              name={pushToken ? "check-circle" : "error"} 
              size={24} 
              color={pushToken ? "#34C759" : "#FF3B30"} 
            />
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenStatus}>
                {pushToken ? "Token Available" : "No Token"}
              </Text>
              {pushToken && (
                <Text style={styles.tokenText}>
                  {pushToken.substring(0, 40)}...
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Custom Notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Notification</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Notification title"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Body</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={customBody}
              onChangeText={setCustomBody}
              placeholder="Notification body"
              multiline
              numberOfLines={3}
            />
          </View>
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={() => sendTestNotification('sync_complete', customTitle, customBody)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Custom</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Predefined Test Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notification Types</Text>
          {testNotificationTypes.map((test, index) => (
            <TouchableOpacity
              key={index}
              style={styles.testItem}
              onPress={() => sendTestNotification(test.type, test.title, test.body, test.data)}
              disabled={loading}
            >
              <View style={[styles.testIcon, { backgroundColor: `${test.color}15` }]}>
                <MaterialIcons name={test.icon as any} size={24} color={test.color} />
              </View>
              <View style={styles.testInfo}>
                <Text style={styles.testTitle}>{test.title}</Text>
                <Text style={styles.testBody}>{test.body}</Text>
                <Text style={styles.testType}>Type: {test.type}</Text>
              </View>
              <MaterialIcons name="send" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Advanced Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Tests</Text>
          
          <TouchableOpacity 
            style={styles.advancedButton} 
            onPress={testSyncTrigger}
            disabled={loading}
          >
            <MaterialIcons name="sync" size={20} color="#007AFF" />
            <Text style={styles.advancedButtonText}>Test Sync Trigger</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.advancedButton} 
            onPress={clearAllNotifications}
            disabled={loading}
          >
            <MaterialIcons name="clear-all" size={20} color="#FF3B30" />
            <Text style={[styles.advancedButtonText, { color: '#FF3B30' }]}>Clear All Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Development Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development Info</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Notifications are sent locally for testing{'\n'}
              • Check device notification panel{'\n'}
              • Monitor console for sync triggers{'\n'}
              • Test different notification types{'\n'}
              • Verify navigation handling
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  tokenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tokenInfo: {
    marginLeft: 12,
    flex: 1,
  },
  tokenStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  testIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  testBody: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  testType: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  advancedButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});
