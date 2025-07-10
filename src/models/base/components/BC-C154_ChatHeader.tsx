/**
 * BC-C154_ChatHeader.tsx - Dynamic Chat Header Component
 * 
 * Features:
 * - Channel/user avatar display
 * - Channel name and status
 * - Connection status indicator
 * - Action buttons (call, video, settings)
 * - Back navigation
 * - Online/offline status
 * - Member count for group chats
 * 
 * Props:
 * - channel: Current channel data
 * - connectionStatus: Connection state
 * - onBackPress: Back navigation callback
 * - onCallPress: Audio call callback
 * - onVideoPress: Video call callback
 * - onSettingsPress: Settings callback
 * - showCallButtons: Whether to show call buttons
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ChatChannel } from '../../discuss_channel/types/ChatTypes';

interface ChatHeaderProps {
  channel: ChatChannel | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onBackPress: () => void;
  onCallPress?: () => void;
  onVideoPress?: () => void;
  onSettingsPress?: () => void;
  showCallButtons?: boolean;
  showSettingsButton?: boolean;
}

const ChatHeader = memo(({
  channel,
  connectionStatus,
  onBackPress,
  onCallPress,
  onVideoPress,
  onSettingsPress,
  showCallButtons = true,
  showSettingsButton = true,
}: ChatHeaderProps) => {

  const getChannelAvatar = () => {
    if (!channel) {
      return (
        <View style={[styles.avatar, styles.defaultAvatar]}>
          <MaterialIcons name="chat" size={20} color="#8E8E93" />
        </View>
      );
    }

    // For direct messages, show user avatar
    if (channel.channel_type === 'chat') {
      return (
        <View style={[styles.avatar, styles.userAvatar]}>
          <MaterialIcons name="person" size={20} color="#007AFF" />
        </View>
      );
    }
    
    // For group channels, show group avatar
    return (
      <View style={[styles.avatar, styles.groupAvatar]}>
        <MaterialIcons name="group" size={20} color="#34C759" />
      </View>
    );
  };

  const getChannelName = () => {
    if (!channel?.name) return 'Loading...';
    
    // For direct messages, clean up the name
    if (channel.channel_type === 'chat') {
      const names = channel.name.split(', ');
      if (names.length > 1) {
        // Return the other person's name (not current user)
        return names.find(name => !name.includes('Mark Shaw')) || names[0];
      }
    }
    
    return channel.name;
  };

  const getSubtitle = () => {
    if (!channel) return '';

    // Connection status
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (connectionStatus === 'disconnected') return 'Disconnected';

    // Channel-specific status
    if (channel.channel_type === 'chat') {
      return 'Online'; // Could be enhanced with actual user status
    }

    // Group channel member count
    const memberCount = channel.member_count || 0;
    return `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#34C759';
      case 'connecting': return '#FF9500';
      case 'disconnected': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const renderActionButtons = () => {
    const buttons = [];

    // Call buttons (only for direct messages)
    if (showCallButtons && channel?.channel_type === 'chat') {
      if (onCallPress) {
        buttons.push(
          <TouchableOpacity
            key="call"
            style={styles.actionButton}
            onPress={onCallPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="call" size={24} color="#007AFF" />
          </TouchableOpacity>
        );
      }

      if (onVideoPress) {
        buttons.push(
          <TouchableOpacity
            key="video"
            style={styles.actionButton}
            onPress={onVideoPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="videocam" size={24} color="#007AFF" />
          </TouchableOpacity>
        );
      }
    }

    // Settings button
    if (showSettingsButton && onSettingsPress) {
      buttons.push(
        <TouchableOpacity
          key="settings"
          style={styles.actionButton}
          onPress={onSettingsPress}
          activeOpacity={0.7}
        >
          <MaterialIcons name="more-vert" size={24} color="#007AFF" />
        </TouchableOpacity>
      );
    }

    return buttons;
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        {/* Avatar */}
        {getChannelAvatar()}

        {/* Channel info */}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={1}>
            {getChannelName()}
          </Text>
          
          <View style={styles.subtitleContainer}>
            {/* Connection status indicator */}
            <View style={[
              styles.statusDot,
              { backgroundColor: getConnectionStatusColor() }
            ]} />
            
            <Text style={styles.subtitle} numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          {renderActionButtons()}
        </View>
      </View>
    </>
  );
});

ChatHeader.displayName = 'ChatHeader';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    minHeight: 64,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  defaultAvatar: {
    backgroundColor: '#F2F2F7',
  },
  userAvatar: {
    backgroundColor: '#E3F2FD',
  },
  groupAvatar: {
    backgroundColor: '#E8F5E8',
  },
  channelInfo: {
    flex: 1,
    marginRight: 12,
  },
  channelName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default ChatHeader;
