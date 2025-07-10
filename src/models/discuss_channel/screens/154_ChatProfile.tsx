import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

interface ChannelSettings {
  id: number;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  isPublic: boolean;
  allowMessages: boolean;
  allowMediaMessages: boolean;
  allowPolls: boolean;
  allowWebPreviews: boolean;
  muteNotifications: boolean;
  showPreview: boolean;
  autoDeleteMessages: number; // 0 = off, 1 = 1 day, 7 = 1 week, 30 = 1 month
}

export default function ChatProfile() {
  const navigation = useNavigation();
  const route = useRoute();

  // Get channel data from route params or use default
  const [settings, setSettings] = useState<ChannelSettings>({
    id: 1,
    name: "ITMS Team Chat",
    description: "Main communication channel for the ITMS development team",
    avatar: "https://picsum.photos/150/150?random=1",
    memberCount: 47,
    isPublic: false,
    allowMessages: true,
    allowMediaMessages: true,
    allowPolls: true,
    allowWebPreviews: true,
    muteNotifications: false,
    showPreview: true,
    autoDeleteMessages: 0,
  });

  const handleSettingChange = (key: keyof ChannelSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // TODO: Save settings to backend
    Alert.alert("Settings Saved", "Channel settings have been updated successfully");
  };

  const handleLeaveChannel = () => {
    Alert.alert(
      "Leave Channel",
      "Are you sure you want to leave this channel?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive",
          onPress: () => {
            // TODO: Leave channel logic
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleDeleteChannel = () => {
    Alert.alert(
      "Delete Channel",
      "Are you sure you want to delete this channel? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            // TODO: Delete channel logic
            navigation.goBack();
          }
        }
      ]
    );
  };

  const getAutoDeleteText = (value: number) => {
    switch (value) {
      case 0: return "Off";
      case 1: return "1 Day";
      case 7: return "1 Week";
      case 30: return "1 Month";
      default: return "Off";
    }
  };

  const showAutoDeleteOptions = () => {
    Alert.alert(
      "Auto-Delete Messages",
      "Choose when messages should be automatically deleted",
      [
        { text: "Off", onPress: () => handleSettingChange('autoDeleteMessages', 0) },
        { text: "1 Day", onPress: () => handleSettingChange('autoDeleteMessages', 1) },
        { text: "1 Week", onPress: () => handleSettingChange('autoDeleteMessages', 7) },
        { text: "1 Month", onPress: () => handleSettingChange('autoDeleteMessages', 30) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Channel Settings</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveSettings}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Channel Info */}
        <View style={styles.channelInfoSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: settings.avatar }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialIcons name="camera-alt" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.channelDetails}>
            <Text style={styles.channelName}>{settings.name}</Text>
            {settings.description && (
              <Text style={styles.channelDescription}>{settings.description}</Text>
            )}
            <Text style={styles.memberCount}>{settings.memberCount} members</Text>
          </View>

          <TouchableOpacity style={styles.editButton}>
            <MaterialIcons name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Channel Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channel Type</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="public" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Public Channel</Text>
                <Text style={styles.settingDescription}>
                  Anyone can find and join this channel
                </Text>
              </View>
            </View>
            <Switch
              value={settings.isPublic}
              onValueChange={(value) => handleSettingChange('isPublic', value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="message" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Allow Messages</Text>
                <Text style={styles.settingDescription}>
                  Members can send text messages
                </Text>
              </View>
            </View>
            <Switch
              value={settings.allowMessages}
              onValueChange={(value) => handleSettingChange('allowMessages', value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="photo" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Allow Media Messages</Text>
                <Text style={styles.settingDescription}>
                  Members can send photos, videos, and files
                </Text>
              </View>
            </View>
            <Switch
              value={settings.allowMediaMessages}
              onValueChange={(value) => handleSettingChange('allowMediaMessages', value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="poll" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Allow Polls</Text>
                <Text style={styles.settingDescription}>
                  Members can create and vote on polls
                </Text>
              </View>
            </View>
            <Switch
              value={settings.allowPolls}
              onValueChange={(value) => handleSettingChange('allowPolls', value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="link" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Allow Web Previews</Text>
                <Text style={styles.settingDescription}>
                  Show previews for shared links
                </Text>
              </View>
            </View>
            <Switch
              value={settings.allowWebPreviews}
              onValueChange={(value) => handleSettingChange('allowWebPreviews', value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="notifications-off" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Mute Notifications</Text>
                <Text style={styles.settingDescription}>
                  Turn off all notifications for this channel
                </Text>
              </View>
            </View>
            <Switch
              value={settings.muteNotifications}
              onValueChange={(value) => handleSettingChange('muteNotifications', value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="visibility" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Show Preview</Text>
                <Text style={styles.settingDescription}>
                  Show message preview in notifications
                </Text>
              </View>
            </View>
            <Switch
              value={settings.showPreview}
              onValueChange={(value) => handleSettingChange('showPreview', value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Auto-Delete */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message Management</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={showAutoDeleteOptions}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="auto-delete" size={24} color="#007AFF" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Auto-Delete Messages</Text>
                <Text style={styles.settingDescription}>
                  Automatically delete messages after a period
                </Text>
              </View>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.settingValueText}>
                {getAutoDeleteText(settings.autoDeleteMessages)}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Channel Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channel Actions</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="share" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Share Channel</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="group" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Manage Members</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="history" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Export Chat History</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <TouchableOpacity style={styles.dangerItem} onPress={handleLeaveChannel}>
            <MaterialIcons name="exit-to-app" size={24} color="#FF3B30" />
            <Text style={styles.dangerText}>Leave Channel</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteChannel}>
            <MaterialIcons name="delete" size={24} color="#FF3B30" />
            <Text style={styles.dangerText}>Delete Channel</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  channelInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#007AFF',
  },
  editButton: {
    padding: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValueText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  dangerText: {
    fontSize: 16,
    color: '#FF3B30',
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});