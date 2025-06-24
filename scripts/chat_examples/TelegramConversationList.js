import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TelegramConversationItem = ({ 
  conversation, 
  onPress, 
  colors,
  currentUserId 
}) => {
  const isDirectMessage = conversation.channel_type === 'chat' || conversation.isDirectMessage;
  
  const getAvatarText = (name) => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatLastActivity = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = () => {
    if (conversation.lastMessage) {
      const message = conversation.lastMessage;
      const isOwn = message.author_id && message.author_id[0] === currentUserId;
      const prefix = isOwn ? 'You: ' : '';
      const content = message.cleanBody || message.body || 'Message';
      return `${prefix}${content}`.substring(0, 50) + (content.length > 50 ? '...' : '');
    }
    return conversation.subtitle || (isDirectMessage ? 'Direct message' : 'Channel');
  };

  return (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.surface }]}
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {conversation.avatar ? (
          <Image source={{ uri: conversation.avatar }} style={styles.avatar} />
        ) : (
          <View style={[
            styles.avatarPlaceholder,
            { backgroundColor: conversation.avatarColor || colors.primary }
          ]}>
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
              {getAvatarText(conversation.displayName || conversation.name)}
            </Text>
          </View>
        )}
        
        {/* Online indicator for direct messages */}
        {isDirectMessage && conversation.isOnline && (
          <View style={[styles.onlineIndicator, { backgroundColor: colors.success }]} />
        )}
        
        {/* Channel type indicator */}
        {!isDirectMessage && (
          <View style={[styles.channelIndicator, { backgroundColor: colors.background }]}>
            <Icon 
              name={conversation.public === 'public' ? 'pound' : 'lock'} 
              size={12} 
              color={colors.primary} 
            />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text 
            style={[styles.conversationName, { color: colors.text }]} 
            numberOfLines={1}
          >
            {conversation.displayName || conversation.name || `Chat ${conversation.id}`}
          </Text>
          
          <View style={styles.metaContainer}>
            {/* Last activity time */}
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatLastActivity(conversation.lastActivity || conversation.write_date)}
            </Text>
            
            {/* Unread badge */}
            {conversation.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.unreadText, { color: colors.onPrimary }]}>
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.messageRow}>
          <Text 
            style={[styles.lastMessage, { color: colors.textSecondary }]} 
            numberOfLines={1}
          >
            {getLastMessagePreview()}
          </Text>
          
          {/* Message status indicators */}
          <View style={styles.statusContainer}>
            {/* Muted indicator */}
            {conversation.isMuted && (
              <Icon name="volume-off" size={14} color={colors.textSecondary} />
            )}
            
            {/* Pinned indicator */}
            {conversation.isPinned && (
              <Icon name="pin" size={14} color={colors.primary} />
            )}
            
            {/* Verified/Bot indicators */}
            {conversation.isVerified && (
              <Icon name="check-decagram" size={14} color={colors.success} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TelegramConversationList = ({ 
  conversations, 
  onConversationPress, 
  colors,
  currentUserId,
  refreshing,
  onRefresh,
  ListEmptyComponent,
  ListHeaderComponent 
}) => {
  const renderConversation = ({ item }) => (
    <TelegramConversationItem
      conversation={item}
      onPress={onConversationPress}
      colors={colors}
      currentUserId={currentUserId}
    />
  );

  return (
    <FlatList
      data={conversations}
      renderItem={renderConversation}
      keyExtractor={(item) => `conversation-${item.id}`}
      style={[styles.list, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  channelIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  separator: {
    height: 1,
    marginLeft: 78,
  },
});

export default TelegramConversationList;
