/**
 * 152_ChatSettings - Chat and messaging settings screen
 * Screen Number: 152
 * Model: discuss.channel
 * Type: settings
 *
 * Comprehensive chat settings with notification preferences and channel options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import ScreenBadge from '../../../components/ScreenBadge';

interface ChatSettingsScreenProps {
  navigation: any;
  route?: any;
}

export default function ChatSettingsScreen({ navigation }: ChatSettingsScreenProps) {
  const [showClosedChannels, setShowClosedChannels] = useState(false);
  const [syncClosedChannels, setSyncClosedChannels] = useState(false);
  const [muteAllConversations, setMuteAllConversations] = useState(false);
  const [channelNotificationMode, setChannelNotificationMode] = useState<'all' | 'mentions' | 'nothing'>('mentions');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const showClosed = await AsyncStorage.getItem('chat_show_closed_channels');
      const syncClosed = await AsyncStorage.getItem('chat_sync_closed_channels');
      const muteAll = await AsyncStorage.getItem('chat_mute_all_conversations');
      const notificationMode = await AsyncStorage.getItem('chat_notification_mode');

      if (showClosed !== null) setShowClosedChannels(JSON.parse(showClosed));
      if (syncClosed !== null) setSyncClosedChannels(JSON.parse(syncClosed));
      if (muteAll !== null) setMuteAllConversations(JSON.parse(muteAll));
      if (notificationMode !== null) setChannelNotificationMode(notificationMode as any);
    } catch (error) {
      console.warn('Failed to load chat settings:', error);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save setting ${key}:`, error);
    }
  };

  const handleShowClosedChannelsChange = (value: boolean) => {
    setShowClosedChannels(value);
    saveSetting('chat_show_closed_channels', value);
  };

  const handleSyncClosedChannelsChange = (value: boolean) => {
    setSyncClosedChannels(value);
    saveSetting('chat_sync_closed_channels', value);
    console.log(`📱 ⚙️ Sync closed channels setting changed to: ${value}`);
  };

  const handleMuteAllChange = (value: boolean) => {
    setMuteAllConversations(value);
    saveSetting('chat_mute_all_conversations', value);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCannedResponses = () => {
    // TODO: Navigate to canned responses management
    console.log('Navigate to canned responses');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={152} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Channel Display Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channel Display</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Show Closed Channels</Text>
              <Text style={styles.settingDescription}>
                Display channels that have been closed or archived
              </Text>
            </View>
            <Switch
              value={showClosedChannels}
              onValueChange={handleShowClosedChannelsChange}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Sync Closed Channels</Text>
              <Text style={styles.settingDescription}>
                Download messages from closed/hidden channels (uses more data)
              </Text>
            </View>
            <Switch
              value={syncClosedChannels}
              onValueChange={handleSyncClosedChannelsChange}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Mute All Conversations</Text>
              <Text style={styles.settingDescription}>
                Prevent unread indicators and notifications from appearing
              </Text>
            </View>
            <Switch
              value={muteAllConversations}
              onValueChange={handleMuteAllChange}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Channel Notifications</Text>
              <Text style={styles.settingDescription}>
                Default notification setting for all channels
              </Text>
            </View>
          </View>
          
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={[styles.radioOption, channelNotificationMode === 'all' && styles.radioOptionSelected]}
              onPress={() => setChannelNotificationMode('all')}
            >
              <View style={[styles.radioButton, channelNotificationMode === 'all' && styles.radioButtonSelected]}>
                <View style={[styles.radioButtonInner, channelNotificationMode === 'all' && styles.radioButtonInnerSelected]} />
              </View>
              <Text style={styles.radioLabel}>All Messages</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioOption, channelNotificationMode === 'mentions' && styles.radioOptionSelected]}
              onPress={() => setChannelNotificationMode('mentions')}
            >
              <View style={[styles.radioButton, channelNotificationMode === 'mentions' && styles.radioButtonSelected]}>
                <View style={[styles.radioButtonInner, channelNotificationMode === 'mentions' && styles.radioButtonInnerSelected]} />
              </View>
              <Text style={styles.radioLabel}>Mentions Only</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioOption, channelNotificationMode === 'nothing' && styles.radioOptionSelected]}
              onPress={() => setChannelNotificationMode('nothing')}
            >
              <View style={[styles.radioButton, channelNotificationMode === 'nothing' && styles.radioButtonSelected]}>
                <View style={[styles.radioButtonInner, channelNotificationMode === 'nothing' && styles.radioButtonInnerSelected]} />
              </View>
              <Text style={styles.radioLabel}>Nothing</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Responses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Responses</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleCannedResponses}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Manage Canned Responses</Text>
              <Text style={styles.settingDescription}>
                Create and edit quick response templates
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40, // Balance the back button
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  radioGroup: {
    backgroundColor: '#F8F9FA',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  radioOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  radioButtonInnerSelected: {
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 16,
    color: '#000',
  },
});
