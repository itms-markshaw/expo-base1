/**
 * 151_ChatList - Real-time messaging interface
 * Screen Number: 151
 * Model: discuss.channel
 * Type: list
 *
 * MIGRATED: From src/screens/ChatScreen.tsx
 * Real-time messaging interface with Odoo integration
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { databaseService } from '../../base/services/BaseDatabaseService';
import { syncService } from '../../base/services/BaseSyncService';
import chatService, { ChatChannel, ChatMessage, TypingUser } from '../services/ChatService';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import { MessageBubble, MentionPicker } from '../../base/components';
import { ChannelMembersModal } from '../components';
import ScreenBadge from '../../../components/ScreenBadge';

// Offline-first interfaces
interface OfflineChannel {
  id: number;
  name: string;
  channel_type: 'chat' | 'channel';
  description?: string;
  member_count?: number;
  last_message_date?: string;
  unread_count?: number;
}

interface OfflineMessage {
  id: number;
  server_id?: number;
  channel_id: number;
  author_id: number;
  author_name: string;
  body: string;
  message_type: 'text' | 'image' | 'file';
  timestamp: number;
  create_date: string;
  sync_status: 'pending' | 'synced' | 'failed';
}

// Removed unused SCREEN_WIDTH

export default function ChatScreen() {
  const { showNavigationDrawer, showUniversalSearch } = useAppNavigation();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    initializeChat();
    setupChatListeners();

    return () => {
      chatService.off('channelsLoaded', handleChannelsLoaded);
      chatService.off('messagesLoaded', handleMessagesLoaded);
      chatService.off('newMessages', handleNewMessages);
      chatService.off('connectionChanged', handleConnectionChanged);
      chatService.off('typingChanged', handleTypingChanged);
    };
  }, []);

  const initializeChat = async () => {
    try {
      setLoading(true);
      const success = await chatService.initialize();
      if (success) {
        const loadedChannels = chatService.getChannels();
        setChannels(loadedChannels);

        // Get current user ID for message bubbles from auth service
        try {
          const client = chatService.getAuthenticatedClient();
          if (client && client.uid) {
            setCurrentUserId(client.uid);
            console.log(`👤 Current user ID set to: ${client.uid}`);
          }
        } catch (error) {
          console.log('⚠️ Could not get current user ID:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupChatListeners = () => {
    console.log('🔗 Setting up ChatScreen event listeners');

    chatService.on('channelsLoaded', handleChannelsLoaded);
    chatService.on('messagesLoaded', handleMessagesLoaded);
    chatService.on('newMessages', handleNewMessages);
    chatService.on('connectionChanged', handleConnectionChanged);
    chatService.on('typingChanged', handleTypingChanged);

    // Also listen for individual message events
    chatService.on('newMessage', ({ channelId, message }) => {
      console.log(`📨 ChatScreen received single new message for channel ${channelId}:`, message.id);
      if (selectedChannel?.id === channelId) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id);
          if (!exists) {
            console.log(`🔄 Adding new message ${message.id} to UI`);
            const updated = [...prev, message];
            setTimeout(scrollToBottom, 100);
            return updated;
          }
          return prev;
        });
      }
    });

    chatService.on('messagesUpdated', ({ channelId }) => {
      console.log(`🔄 Messages updated event for channel ${channelId}`);
      if (selectedChannel?.id === channelId) {
        // Force reload messages from service
        const currentMessages = chatService.getChannelMessages(channelId);
        console.log(`🔄 Force updating UI with ${currentMessages.length} messages from service`);
        setMessages([...currentMessages]);
        setTimeout(scrollToBottom, 100);
      }
    });
  };

  const handleChannelsLoaded = (loadedChannels: ChatChannel[]) => {
    setChannels(loadedChannels);
    // Don't auto-select - let user choose from list
  };

  const handleMessagesLoaded = ({ channelId, messages: loadedMessages }: { channelId: number; messages: ChatMessage[] }) => {
    if (selectedChannel?.id === channelId) {
      setMessages(loadedMessages);
      scrollToBottom();
    }
  };

  const handleNewMessages = ({ channelId, messages: newMessages }: { channelId: number; messages: ChatMessage[] }) => {
    if (selectedChannel?.id === channelId) {
      console.log(`🔄 ChatScreen received ${newMessages.length} new messages for channel ${channelId}`);
      setMessages(prev => {
        // Check for duplicate messages by ID
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

        if (uniqueNewMessages.length > 0) {
          console.log(`🔄 Adding ${uniqueNewMessages.length} unique new messages to UI`);
          const updated = [...prev, ...uniqueNewMessages];
          setTimeout(scrollToBottom, 100);
          return updated;
        }
        return prev;
      });
    }
  };

  const handleConnectionChanged = (status: 'connected' | 'disconnected') => {
    setConnectionStatus(status);
  };

  const handleTypingChanged = ({ channelId, typingUsers: users }: { channelId: number; typingUsers: TypingUser[] }) => {
    if (selectedChannel?.id === channelId) {
      setTypingUsers(users);
    }
  };

  const selectChannel = async (channel: ChatChannel) => {
    console.log(`📱 Selecting channel: ${channel.name} (ID: ${channel.id})`);
    setSelectedChannel(channel);
    setMessages([]);
    setTypingUsers([]);

    // Subscribe to longpolling for real-time updates
    console.log(`📡 Subscribing to longpolling for channel ${channel.id}`);
    chatService.subscribeToChannel(channel.id);

    // Load messages for this channel
    console.log(`📨 Loading messages for channel ${channel.id}...`);
    const loadedMessages = await chatService.loadChannelMessages(channel.id);
    console.log(`📨 Loaded ${loadedMessages.length} messages for channel ${channel.id}`);

    // Set messages directly as well as through the event listener
    setMessages(loadedMessages);

    // If no messages loaded, add a test message to verify the UI is working
    if (loadedMessages.length === 0) {
      console.log('📨 No messages found, adding test message for UI verification');
      const testMessage = {
        id: 999999,
        body: 'Welcome to the chat! This is a test message to verify the interface is working.',
        author_id: [1, 'System'],
        date: new Date().toISOString(),
        message_type: 'comment',
        model: 'discuss.channel',
        res_id: channel.id,
        attachment_ids: [],
        partner_ids: []
      };
      setMessages([testMessage]);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChannel || sending) return;

    setSending(true);
    const success = await chatService.sendMessage(selectedChannel.id, messageText.trim());

    if (success) {
      setMessageText('');
      scrollToBottom();
    }

    setSending(false);
  };

  const handleReconnect = async () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    console.log('🔄 Manual reconnection triggered...');

    try {
      // Force reconnect WebSocket
      await chatService.initialize();
      console.log('✅ Reconnection successful');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
    }

    setIsReconnecting(false);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);

    // Check for @ mention trigger (using same logic as chatter components)
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';

      // Check if @ is at start or after space, and find next space
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        const spaceIndex = textAfterAt.indexOf(' ');
        const query = spaceIndex === -1 ? textAfterAt : textAfterAt.substring(0, spaceIndex);

        // Only show popup if we're still typing the mention
        if (spaceIndex === -1 || text.length === lastAtIndex + 1 + spaceIndex) {
          setMentionSearchQuery(query.toLowerCase());
          setMentionStartIndex(lastAtIndex);
          setShowMentionPicker(true);
        } else {
          setShowMentionPicker(false);
        }
      } else {
        setShowMentionPicker(false);
      }
    } else {
      // Hide popup if no @ or conditions not met
      setShowMentionPicker(false);
    }

    if (selectedChannel) {
      // Start typing indicator
      chatService.startTyping(selectedChannel.id);
    }
  };

  // scrollToBottom function already defined above

  const handleMentionUser = (user: { id: number; name: string; email?: string }) => {
    if (mentionStartIndex !== -1) {
      const beforeMention = messageText.substring(0, mentionStartIndex);
      const afterMention = messageText.substring(mentionStartIndex + 1 + mentionSearchQuery.length);
      const newText = `${beforeMention}@${user.name} ${afterMention}`;
      setMessageText(newText);

      // Focus back to text input
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
    setShowMentionPicker(false);
    setMentionSearchQuery('');
    setMentionStartIndex(-1);
  };

  const handleShowMembers = () => {
    if (selectedChannel?.channel_type === 'channel') {
      setShowMembersModal(true);
    }
  };

  // scrollToBottom already defined above

  // Mention functionality removed for offline-first simplicity

  // Channel members functionality removed for offline-first simplicity

  const handleAttachmentPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Choose Document'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          } else if (buttonIndex === 3) {
            pickDocument();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Attachment',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
          { text: 'Choose Document', onPress: pickDocument },
        ]
      );
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await sendAttachment(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required to choose images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await sendAttachment(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await sendAttachment(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const sendAttachment = async (asset: any) => {
    if (!selectedChannel) return;

    try {
      setSending(true);

      // Create a message with attachment info
      const attachmentMessage = `📎 ${asset.name || 'Attachment'} (${asset.type || 'file'})`;

      // For now, just send a text message indicating the attachment
      // In a full implementation, you would upload the file to Odoo first
      const success = await chatService.sendMessage(selectedChannel.id, attachmentMessage);

      if (success) {
        console.log('✅ Attachment message sent successfully');
        scrollToBottom();
      } else {
        Alert.alert('Error', 'Failed to send attachment');
      }
    } catch (error) {
      console.error('Error sending attachment:', error);
      Alert.alert('Error', 'Failed to send attachment');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const previousMessage = index > 0 ? messages[index - 1] : undefined;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;

    return (
      <MessageBubble
        message={item}
        previousMessage={previousMessage}
        nextMessage={nextMessage}
        currentUserId={currentUserId}
        currentUserPartnerId={chatService.getCurrentUserPartnerId()}
        onLongPress={() => {
          // Handle long press for message actions
          console.log('Long press on message:', item.id);
        }}
      />
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    const typingText = typingUsers.length === 1
      ? `${typingUsers[0].name} is typing...`
      : `${typingUsers.length} people are typing...`;

    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>{typingText}</Text>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  // Typing indicators removed for offline-first simplicity

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={151} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {selectedChannel && (
            <TouchableOpacity
              style={styles.backToListButton}
              onPress={() => {
                // Unsubscribe from longpolling when going back to list
                if (selectedChannel) {
                  console.log(`📡 Unsubscribing from channel ${selectedChannel.id}`);
                  chatService.unsubscribeFromChannel(selectedChannel.id);
                }
                setSelectedChannel(null);
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, selectedChannel && styles.headerTitleWithBack]}>
            {selectedChannel ? selectedChannel.name : 'Chat'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: connectionStatus === 'connected' ? '#34C759' : '#FF3B30' }
            ]} />
            <Text style={styles.statusText}>
              {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
            {connectionStatus === 'disconnected' && (
              <TouchableOpacity
                style={styles.reconnectButton}
                onPress={handleReconnect}
                disabled={isReconnecting}
              >
                {isReconnecting ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <MaterialIcons name="refresh" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={showUniversalSearch}
          >
            <MaterialIcons name="search" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={showNavigationDrawer}
          >
            <MaterialIcons name="account-circle" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List - Show all conversations when no channel is selected */}
      {!selectedChannel ? (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatListItem}
              onPress={() => selectChannel(item)}
            >
              {/* Avatar with Channel Type Icons */}
              <View style={[
                styles.chatAvatar,
                item.channel_type === 'channel' && styles.groupChatAvatar
              ]}>
                {item.channel_type === 'chat' ? (
                  // Direct Message Avatar
                  <>
                    <MaterialIcons name="person" size={24} color="#FFF" />
                    <View style={styles.channelTypeIndicator}>
                      <MaterialIcons name="chat" size={12} color="#007AFF" />
                    </View>
                  </>
                ) : item.channel_type === 'channel' ? (
                  // Group Channel Avatar
                  <>
                    <MaterialIcons name="group" size={24} color="#FFF" />
                    <View style={styles.channelTypeIndicator}>
                      <MaterialIcons name="groups" size={12} color="#34C759" />
                    </View>
                  </>
                ) : (
                  // Unknown channel type
                  <MaterialIcons name="chat-bubble" size={24} color="#FFF" />
                )}
              </View>

              {/* Chat Info */}
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.chatTime}>
                    {/* You can add last message time here */}
                    Now
                  </Text>
                </View>
                <Text style={styles.chatPreview} numberOfLines={2}>
                  {item.channel_type === 'chat'
                    ? `💬 Direct message`
                    : item.channel_type === 'channel'
                    ? `👥 Group chat • ${item.member_count || 0} members`
                    : `📢 ${item.channel_type || 'Channel'}`
                  }
                </Text>
              </View>

              {/* Unread indicator */}
              <View style={styles.chatMeta}>
                <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          )}
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
        />
      ) : selectedChannel ? (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >


          {/* Messages - iMessage Style */}
          {messages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <MaterialIcons name="chat-bubble-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyMessagesText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => `message-${item.id || item.local_id || Math.random()}`}
              renderItem={renderMessage}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={scrollToBottom}
              showsVerticalScrollIndicator={false}
              inverted={false} // Keep normal order for chat
            />
          )}

          {/* Typing Indicator */}
          {renderTypingIndicator()}

          {/* Mention Picker Overlay */}
          {showMentionPicker && (
            <View style={styles.mentionOverlay}>
              <MentionPicker
                visible={showMentionPicker}
                onSelectUser={handleMentionUser}
                searchQuery={mentionSearchQuery}
                style={styles.mentionPickerStyle}
              />
            </View>
          )}

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={handleAttachmentPress}
              disabled={sending}
            >
              <MaterialIcons name="attach-file" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={messageText}
              onChangeText={handleTextChange}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.noChannelContainer}>
          <MaterialIcons name="chat" size={64} color="#C7C7CC" />
          <Text style={styles.noChannelTitle}>No chat channels</Text>
          <Text style={styles.noChannelText}>
            Chat channels will appear here when available
          </Text>
        </View>
      )}

      {/* Channel Members Modal */}
      {selectedChannel && (
        <ChannelMembersModal
          visible={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToListButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerTitleWithBack: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  reconnectButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
  },
  profileButton: {
    padding: 4,
  },
  channelSelector: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
  },
  channelTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
  },
  channelTabActive: {
    backgroundColor: '#007AFF',
  },
  channelTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  channelTabTextActive: {
    color: '#FFF',
  },
  channelAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    position: 'relative',
  },
  channelAvatarText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  // Chat List Styles
  chatList: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  chatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  chatAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  groupChatAvatar: {
    backgroundColor: '#34C759', // Green for group chats
  },
  channelTypeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  chatTime: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  chatPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  chatMeta: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  clickableSubtitle: {
    color: '#007AFF',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageBubble: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  authorName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
  syncStatus: {
    marginLeft: 8,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  mentionOverlay: {
    position: 'absolute',
    bottom: 70, // Above input container
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  mentionPickerStyle: {
    // Additional styles for the mention picker overlay
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 8, // Safe area for iOS
    backgroundColor: '#FFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    gap: 8,
    minHeight: Platform.OS === 'ios' ? 90 : 56,
  },
  attachmentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    backgroundColor: '#F8F9FA',
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  noChannelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noChannelTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  noChannelText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },

});
