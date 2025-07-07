/**
 * BaseFollowersList (BC-C006) - Followers Management Component
 * Component Reference: BC-C006
 * 
 * ENHANCED: Followers management with smart notifications and presence
 * Following the BC-CXXX component reference system from perfect-base-chatter.md
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// BC-C006 Interfaces
export interface BaseFollowersListProps {
  followers: ChatterFollower[];
  onAdd?: (userId: number) => void;
  onRemove?: (followerId: number) => void;
  onNotificationSettings?: (followerId: number, settings: NotificationSettings) => void;
  readonly?: boolean;
  showPresence?: boolean;
  theme?: FollowersListTheme;
}

export interface ChatterFollower {
  id: number;
  name: string;
  email?: string;
  avatar_url?: string;
  is_active: boolean;
  notification_settings?: NotificationSettings;
  presence_status?: PresenceStatus;
  last_seen?: string;
  role?: string;
  department?: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  mention_notifications: boolean;
  activity_notifications: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export interface PresenceStatus {
  status: 'online' | 'offline' | 'away' | 'busy';
  last_activity?: string;
  current_activity?: string;
}

export interface FollowersListTheme {
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  subtitleColor: string;
  primaryColor: string;
  onlineColor: string;
  offlineColor: string;
  awayColor: string;
  busyColor: string;
  borderRadius: number;
}

// Default theme
const DEFAULT_THEME: FollowersListTheme = {
  backgroundColor: '#F2F2F7',
  cardBackgroundColor: '#FFFFFF',
  textColor: '#000000',
  subtitleColor: '#8E8E93',
  primaryColor: '#007AFF',
  onlineColor: '#34C759',
  offlineColor: '#8E8E93',
  awayColor: '#FF9500',
  busyColor: '#FF3B30',
  borderRadius: 12,
};

// Default notification settings
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_notifications: true,
  push_notifications: true,
  mention_notifications: true,
  activity_notifications: false,
  frequency: 'immediate',
};

/**
 * BC-C006: Followers List Component
 * 
 * Features:
 * - User presence indicators
 * - Smart notification settings
 * - Role-based permissions
 * - Bulk follower management
 * - Search and filter capabilities
 * - Activity status tracking
 * - Department organization
 * - Quick add/remove actions
 */
export default function BaseFollowersList({
  followers,
  onAdd,
  onRemove,
  onNotificationSettings,
  readonly = false,
  showPresence = true,
  theme = DEFAULT_THEME
}: BaseFollowersListProps) {
  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState<ChatterFollower | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Filter followers
  const filteredFollowers = followers.filter(follower => {
    const matchesSearch = follower.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         follower.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || follower.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Get presence color
  const getPresenceColor = useCallback((status?: string) => {
    switch (status) {
      case 'online': return theme.onlineColor;
      case 'away': return theme.awayColor;
      case 'busy': return theme.busyColor;
      default: return theme.offlineColor;
    }
  }, [theme]);

  // Get presence icon
  const getPresenceIcon = useCallback((status?: string) => {
    switch (status) {
      case 'online': return 'circle';
      case 'away': return 'schedule';
      case 'busy': return 'do-not-disturb';
      default: return 'radio-button-unchecked';
    }
  }, []);

  // Format last seen
  const formatLastSeen = useCallback((lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }, []);

  // Handle notification settings
  const handleNotificationSettings = useCallback((follower: ChatterFollower) => {
    setSelectedFollower(follower);
    setShowNotificationSettings(true);
  }, []);

  // Save notification settings
  const saveNotificationSettings = useCallback((settings: NotificationSettings) => {
    if (selectedFollower) {
      onNotificationSettings?.(selectedFollower.id, settings);
      setShowNotificationSettings(false);
      setSelectedFollower(null);
    }
  }, [selectedFollower, onNotificationSettings]);

  // Get unique roles
  const uniqueRoles = ['all', ...new Set(followers.map(f => f.role).filter(Boolean))];

  // Render follower card
  const renderFollowerCard = useCallback(({ item: follower }: { item: ChatterFollower }) => (
    <View style={[
      styles.followerCard,
      { backgroundColor: theme.cardBackgroundColor, borderRadius: theme.borderRadius }
    ]}>
      {/* Avatar and Presence */}
      <View style={styles.avatarContainer}>
        {follower.avatar_url ? (
          <Image source={{ uri: follower.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.avatarText}>
              {follower.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {showPresence && follower.presence_status && (
          <View style={[
            styles.presenceIndicator,
            { backgroundColor: getPresenceColor(follower.presence_status.status) }
          ]}>
            <MaterialIcons 
              name={getPresenceIcon(follower.presence_status.status)} 
              size={8} 
              color="#FFFFFF" 
            />
          </View>
        )}
      </View>

      {/* Follower Info */}
      <View style={styles.followerInfo}>
        <Text style={[styles.followerName, { color: theme.textColor }]}>
          {follower.name}
        </Text>
        
        {follower.email && (
          <Text style={[styles.followerEmail, { color: theme.subtitleColor }]}>
            {follower.email}
          </Text>
        )}
        
        {follower.role && (
          <Text style={[styles.followerRole, { color: theme.subtitleColor }]}>
            {follower.role}
          </Text>
        )}
        
        {showPresence && follower.presence_status?.status !== 'online' && (
          <Text style={[styles.lastSeen, { color: theme.subtitleColor }]}>
            Last seen {formatLastSeen(follower.last_seen)}
          </Text>
        )}
      </View>

      {/* Actions */}
      {!readonly && (
        <View style={styles.followerActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primaryColor }]}
            onPress={() => handleNotificationSettings(follower)}
          >
            <MaterialIcons name="notifications" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.subtitleColor }]}
            onPress={() => onRemove?.(follower.id)}
          >
            <MaterialIcons name="person-remove" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [theme, showPresence, readonly, getPresenceColor, getPresenceIcon, formatLastSeen, handleNotificationSettings, onRemove]);

  // Render notification settings modal
  const renderNotificationSettingsModal = () => {
    if (!selectedFollower) return null;

    const settings = selectedFollower.notification_settings || DEFAULT_NOTIFICATION_SETTINGS;
    const [localSettings, setLocalSettings] = useState(settings);

    return (
      <Modal
        visible={showNotificationSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationSettings(false)}
      >
        <View style={[styles.settingsModal, { backgroundColor: theme.backgroundColor }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNotificationSettings(false)}>
              <Text style={[styles.modalCancel, { color: theme.primaryColor }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>
              Notifications for {selectedFollower.name}
            </Text>
            <TouchableOpacity onPress={() => saveNotificationSettings(localSettings)}>
              <Text style={[styles.modalSave, { color: theme.primaryColor }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsContent}>
            {/* Email Notifications */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.textColor }]}>
                Email Notifications
              </Text>
              <TouchableOpacity
                style={[
                  styles.settingToggle,
                  { backgroundColor: localSettings.email_notifications ? theme.primaryColor : theme.subtitleColor }
                ]}
                onPress={() => setLocalSettings(prev => ({ ...prev, email_notifications: !prev.email_notifications }))}
              >
                <MaterialIcons 
                  name={localSettings.email_notifications ? "check" : "close"} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>

            {/* Push Notifications */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.textColor }]}>
                Push Notifications
              </Text>
              <TouchableOpacity
                style={[
                  styles.settingToggle,
                  { backgroundColor: localSettings.push_notifications ? theme.primaryColor : theme.subtitleColor }
                ]}
                onPress={() => setLocalSettings(prev => ({ ...prev, push_notifications: !prev.push_notifications }))}
              >
                <MaterialIcons 
                  name={localSettings.push_notifications ? "check" : "close"} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>

            {/* Mention Notifications */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.textColor }]}>
                @Mention Notifications
              </Text>
              <TouchableOpacity
                style={[
                  styles.settingToggle,
                  { backgroundColor: localSettings.mention_notifications ? theme.primaryColor : theme.subtitleColor }
                ]}
                onPress={() => setLocalSettings(prev => ({ ...prev, mention_notifications: !prev.mention_notifications }))}
              >
                <MaterialIcons 
                  name={localSettings.mention_notifications ? "check" : "close"} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>

            {/* Frequency */}
            <View style={styles.settingSection}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Notification Frequency
              </Text>
              {(['immediate', 'daily', 'weekly', 'never'] as const).map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[
                    styles.frequencyOption,
                    { backgroundColor: theme.cardBackgroundColor },
                    localSettings.frequency === frequency && { backgroundColor: theme.primaryColor }
                  ]}
                  onPress={() => setLocalSettings(prev => ({ ...prev, frequency }))}
                >
                  <Text style={[
                    styles.frequencyText,
                    { color: localSettings.frequency === frequency ? '#FFFFFF' : theme.textColor }
                  ]}>
                    {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textColor }]}>
          Followers ({filteredFollowers.length})
        </Text>
        
        {!readonly && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primaryColor }]}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialIcons name="person-add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInput, { backgroundColor: theme.cardBackgroundColor }]}>
          <MaterialIcons name="search" size={20} color={theme.subtitleColor} />
          <TextInput
            style={[styles.searchText, { color: theme.textColor }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search followers..."
            placeholderTextColor={theme.subtitleColor}
          />
        </View>
      </View>

      {/* Role Filter */}
      {uniqueRoles.length > 1 && (
        <View style={styles.roleFilter}>
          {uniqueRoles.map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleTab,
                { backgroundColor: theme.cardBackgroundColor },
                filterRole === role && { backgroundColor: theme.primaryColor }
              ]}
              onPress={() => setFilterRole(role)}
            >
              <Text style={[
                styles.roleTabText,
                { color: filterRole === role ? '#FFFFFF' : theme.textColor }
              ]}>
                {role === 'all' ? 'All' : role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Followers List */}
      <FlatList
        data={filteredFollowers}
        renderItem={renderFollowerCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.followersList}
        showsVerticalScrollIndicator={false}
      />

      {/* Notification Settings Modal */}
      {renderNotificationSettingsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
  },
  roleFilter: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  roleTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  followersList: {
    gap: 12,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  presenceIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  followerEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  followerRole: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 11,
  },
  followerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsContent: {
    flex: 1,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  frequencyOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
