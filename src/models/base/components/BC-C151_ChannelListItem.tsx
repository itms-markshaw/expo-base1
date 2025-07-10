/**
 * BC-C151_ChannelListItem.tsx - Individual Channel List Item Component
 * 
 * Features:
 * - Channel avatar (circular for users, square for groups)
 * - Channel name and last message preview
 * - Unread count badge
 * - Last activity timestamp
 * - Swipe-to-hide functionality
 * - Optimized with React.memo for performance
 * 
 * Props:
 * - channel: ChatChannel data
 * - onPress: Callback when item is tapped
 * - onHide: Callback when hide action is triggered
 * - isCurrentUser: Whether this is the current user's channel
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { ChatChannel } from '../../discuss_channel/types/ChatTypes';

interface ChannelListItemProps {
  channel: ChatChannel;
  onPress: (channel: ChatChannel) => void;
  onHide: (channel: ChatChannel) => void;
  isCurrentUser?: boolean;
  showLastMessage?: boolean;
  showTimestamp?: boolean;
}

const ChannelListItem = memo(({
  channel,
  onPress,
  onHide,
  isCurrentUser = false,
  showLastMessage = true,
  showTimestamp = true,
}: ChannelListItemProps) => {

  const handlePress = () => {
    onPress(channel);
  };

  const handleHide = () => {
    Alert.alert(
      'Hide Channel',
      `Are you sure you want to hide "${channel.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Hide', 
          style: 'destructive',
          onPress: () => onHide(channel)
        }
      ]
    );
  };

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.hideAction}
      onPress={handleHide}
      activeOpacity={0.7}
    >
      <MaterialIcons name="visibility-off" size={24} color="#FFFFFF" />
      <Text style={styles.hideActionText}>Hide</Text>
    </TouchableOpacity>
  );

  const getChannelAvatar = () => {
    // For direct messages, show user avatar
    if (channel.channel_type === 'chat') {
      return (
        <View style={[styles.avatar, styles.userAvatar]}>
          <MaterialIcons name="person" size={24} color="#007AFF" />
        </View>
      );
    }
    
    // For group channels, show group avatar
    return (
      <View style={[styles.avatar, styles.groupAvatar]}>
        <MaterialIcons name="group" size={24} color="#34C759" />
      </View>
    );
  };

  const getChannelName = () => {
    if (!channel.name) return 'Unknown Channel';
    
    // For direct messages, clean up the name
    if (channel.channel_type === 'chat') {
      // Remove current user's name from DM channel names
      const names = channel.name.split(', ');
      if (names.length > 1) {
        // Return the other person's name (not current user)
        return names.find(name => !name.includes('Mark Shaw')) || names[0];
      }
    }
    
    return channel.name;
  };

  const getLastMessagePreview = () => {
    // TODO: Get actual last message from channel
    // For now, return placeholder
    if (channel.channel_type === 'chat') {
      return 'Tap to start chatting...';
    }
    return 'No messages yet';
  };

  const getTimestamp = () => {
    // TODO: Get actual last activity timestamp
    // For now, return placeholder
    return 'Now';
  };

  const getUnreadCount = () => {
    // TODO: Get actual unread count
    // For now, return 0
    return 0;
  };

  const formatChannelType = () => {
    if (channel.channel_type === 'chat') {
      return 'Direct message';
    }
    
    // For group channels, show member count if available
    const memberCount = channel.member_count || 0;
    return `Group chat • ${memberCount} member${memberCount !== 1 ? 's' : ''}`;
  };

  const unreadCount = getUnreadCount();

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {getChannelAvatar()}
        
        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.channelName} numberOfLines={1}>
              {getChannelName()}
            </Text>
            
            {showTimestamp && (
              <Text style={styles.timestamp}>
                {getTimestamp()}
              </Text>
            )}
          </View>
          
          <View style={styles.subtitle}>
            <Text style={styles.channelType} numberOfLines={1}>
              <MaterialIcons 
                name={channel.channel_type === 'chat' ? 'chat' : 'group'} 
                size={14} 
                color="#8E8E93" 
              />
              {' '}{formatChannelType()}
            </Text>
          </View>
          
          {showLastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {getLastMessagePreview()}
            </Text>
          )}
        </View>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
        
        {/* Chevron */}
        <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
      </TouchableOpacity>
    </Swipeable>
  );
});

ChannelListItem.displayName = 'ChannelListItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  avatar: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatar: {
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
  },
  groupAvatar: {
    borderRadius: 12,
    backgroundColor: '#E8F5E8',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  channelName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
  },
  subtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelType: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  lastMessage: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  hideAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 16,
  },
  hideActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default ChannelListItem;
