/**
 * 150_ChatDashboard - Main Chat Dashboard Screen
 * Screen Reference: 150
 * 
 * Perfect offline-first chat dashboard with modern UX:
 * - Offline-first message storage and sync
 * - Real-time messaging when online
 * - Rich media support (images, videos, audio, documents)
 * - Modern chat UI similar to professional messaging apps
 * - Comprehensive sync status and queue management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import ScreenBadge from '../../../components/ScreenBadge';

// Import our new BC components
import BC_C009_OfflineChatManager from '../../base/components/BC-C009_OfflineChatManager';
import BC_C010_MediaMessageBubble from '../../base/components/BC-C010_MediaMessageBubble';
import { offlineMessageService, OfflineMessage } from '../../mail_message/services/OfflineMessageService';

// Import existing chat services
import chatService, { ChatChannel, ChatMessage } from '../services/ChatService';

export interface ChatDashboardState {
  channels: ChatChannel[];
  selectedChannel: ChatChannel | null;
  messages: OfflineMessage[];
  loading: boolean;
  refreshing: boolean;
  connectionStatus: 'online' | 'offline' | 'syncing';
  showOfflineManager: boolean;
  currentView: 'list' | 'chat'; // Mobile navigation state
}

/**
 * 150: Chat Dashboard
 * 
 * Features:
 * - Offline-first architecture with SQLite storage
 * - Real-time sync when online
 * - Rich media message support
 * - Modern chat interface
 * - Comprehensive offline queue management
 * - Perfect mobile UX with smooth animations
 */
export default function ChatDashboard() {
  const { showNavigationDrawer, showUniversalSearch } = useAppNavigation();
  
  // Core state
  const [state, setState] = useState<ChatDashboardState>({
    channels: [],
    selectedChannel: null,
    messages: [],
    loading: true,
    refreshing: false,
    connectionStatus: 'online',
    showOfflineManager: true,
    currentView: 'list', // Start with channel list on mobile
  });

  const flatListRef = useRef<FlatList>(null);

  // Initialize services and load data
  useEffect(() => {
    initializeServices();
  }, []);

  // Initialize offline message service and chat service
  const initializeServices = async () => {
    try {
      console.log('🚀 Initializing Chat Dashboard...');
      
      // Initialize offline message service
      await offlineMessageService.initialize();
      
      // Initialize chat service
      await chatService.initialize();
      
      // Load channels
      await loadChannels();
      
      // Setup real-time listeners
      setupRealtimeListeners();
      
      setState(prev => ({ ...prev, loading: false }));
      console.log('✅ Chat Dashboard initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Chat Dashboard:', error);
      setState(prev => ({ ...prev, loading: false }));
      
      Alert.alert(
        'Initialization Error',
        'Failed to initialize chat services. Some features may not work properly.',
        [{ text: 'OK' }]
      );
    }
  };

  // Load chat channels
  const loadChannels = async () => {
    try {
      const channels = await chatService.getChannels();
      setState(prev => ({ ...prev, channels }));
      
      // Auto-select first channel if available
      if (channels.length > 0 && !state.selectedChannel) {
        selectChannel(channels[0]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  // Setup real-time listeners
  const setupRealtimeListeners = () => {
    // Connection status updates
    chatService.on('connectionStatusChanged', (status: string) => {
      setState(prev => ({ 
        ...prev, 
        connectionStatus: status as 'online' | 'offline' | 'syncing' 
      }));
    });

    // New message received
    chatService.on('messageReceived', (message: ChatMessage) => {
      handleNewMessage(message);
    });

    // Message sync status updates
    chatService.on('messageSynced', ({ localId }: { localId: string }) => {
      updateMessageSyncStatus(localId, 'synced');
    });

    chatService.on('messageFailed', ({ localId }: { localId: string }) => {
      updateMessageSyncStatus(localId, 'failed');
    });
  };

  // Handle new incoming message
  const handleNewMessage = useCallback(async (message: ChatMessage) => {
    if (!state.selectedChannel || message.res_id !== state.selectedChannel.id) {
      return;
    }

    // Clean up message body
    let cleanBody = message.body || '';
    cleanBody = cleanBody
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();

    // Extract author info properly
    let authorId = 0;
    let authorName = 'Unknown';

    if (Array.isArray(message.author_id) && message.author_id.length >= 2) {
      authorId = message.author_id[0];
      authorName = message.author_id[1];
    } else if (typeof message.author_id === 'number') {
      authorId = message.author_id;
      authorName = message.author_name || message.email_from || 'User';
    }

    // Save to offline storage
    const offlineMessage: Partial<OfflineMessage> = {
      server_id: message.id,
      channel_id: state.selectedChannel.id, // Use the selected channel ID
      author_id: authorId,
      author_name: authorName,
      body: cleanBody,
      message_type: 'text',
      timestamp: new Date(message.date).getTime(),
      sync_status: 'synced',
      create_date: message.date,
      write_date: message.date,
    };

    await offlineMessageService.saveMessage(offlineMessage);
    
    // Reload messages for current channel
    await loadChannelMessages(state.selectedChannel.id);
  }, [state.selectedChannel]);

  // Select a channel and load its messages
  const selectChannel = async (channel: ChatChannel) => {
    console.log('🎯 Selecting channel:', channel.name, 'ID:', channel.id);
    setState(prev => ({
      ...prev,
      selectedChannel: channel,
      loading: true,
      currentView: 'chat' // Switch to chat view on mobile
    }));
    console.log('📱 Switched to chat view, loading messages...');
    await loadChannelMessages(channel.id);
    setState(prev => ({ ...prev, loading: false }));
    console.log('✅ Channel selection complete');
  };

  // Load messages for a specific channel
  const loadChannelMessages = async (channelId: number) => {
    try {
      console.log('📨 Loading messages for channel ID:', channelId);
      // Load from offline storage first (instant UI)
      const offlineMessages = await offlineMessageService.getChannelMessages(channelId, 50);
      console.log('💾 Loaded', offlineMessages.length, 'offline messages');

      setState(prev => ({ ...prev, messages: offlineMessages }));

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Load fresh messages in background if online
      if (state.connectionStatus === 'online') {
        try {
          console.log('🌐 Loading fresh messages from server for channel:', channelId);
          const freshMessages = await chatService.loadChannelMessages(channelId);
          console.log('📥 Received', freshMessages.length, 'fresh messages from server');

          // Merge and save fresh messages
          for (const message of freshMessages) {
            console.log('💾 Saving message:', message.id, 'Body:', message.body?.substring(0, 50) + '...');

            // Decode HTML entities and clean up the message body
            let cleanBody = message.body || '';
            cleanBody = cleanBody
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .trim();

            // Extract author info properly
            let authorId = 0;
            let authorName = 'Unknown';

            if (Array.isArray(message.author_id) && message.author_id.length >= 2) {
              authorId = message.author_id[0];
              authorName = message.author_id[1];
            } else if (typeof message.author_id === 'number') {
              authorId = message.author_id;
              // Try to get name from other fields
              authorName = message.author_name || message.email_from || 'User';
            }

            console.log('👤 Processing author:', { authorId, authorName, raw: message.author_id });

            const offlineMessage: Partial<OfflineMessage> = {
              server_id: message.id,
              channel_id: channelId, // Use the channelId parameter instead of message.res_id
              author_id: authorId,
              author_name: authorName,
              body: cleanBody,
              message_type: 'text',
              timestamp: new Date(message.date).getTime(),
              sync_status: 'synced',
              create_date: message.date,
              write_date: message.date,
            };

            await offlineMessageService.saveMessage(offlineMessage);
          }

          // Reload from storage to get merged results
          const updatedMessages = await offlineMessageService.getChannelMessages(channelId, 50);
          console.log('🔄 Reloaded', updatedMessages.length, 'messages from storage after merge');

          // Update with fresh messages from server
          if (freshMessages.length > 0) {
            setState(prev => ({ ...prev, messages: updatedMessages }));
            console.log('✅ Updated UI with', updatedMessages.length, 'fresh messages');
          } else {
            console.log('📭 No fresh messages found on server for this channel');
          }
        } catch (error) {
          console.error('❌ Failed to load fresh messages:', error);
        }
      } else {
        console.log('📴 Offline - skipping fresh message load');
      }
    } catch (error) {
      console.error('Failed to load channel messages:', error);
    }
  };

  // Update message sync status
  const updateMessageSyncStatus = (localId: string, status: 'pending' | 'synced' | 'failed') => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === localId ? { ...msg, sync_status: status } : msg
      )
    }));
  };

  // Handle retry all offline messages
  const handleRetryAllMessages = async () => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'syncing' }));
      
      const pendingMessages = await offlineMessageService.getPendingSyncMessages();
      
      for (const message of pendingMessages) {
        try {
          // Attempt to send via chat service
          await chatService.sendMessage(message.channel_id, message.body);
          await offlineMessageService.updateSyncStatus(message.id, 'synced');
        } catch (error) {
          await offlineMessageService.updateSyncStatus(message.id, 'failed');
        }
      }
      
      setState(prev => ({ ...prev, connectionStatus: 'online' }));
      
      // Reload current channel messages
      if (state.selectedChannel) {
        await loadChannelMessages(state.selectedChannel.id);
      }
    } catch (error) {
      console.error('Failed to retry messages:', error);
      setState(prev => ({ ...prev, connectionStatus: 'offline' }));
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    
    try {
      await loadChannels();
      if (state.selectedChannel) {
        await loadChannelMessages(state.selectedChannel.id);
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setState(prev => ({ ...prev, refreshing: false }));
    }
  };

  // Handle media press
  const handleMediaPress = (uri: string, type: string) => {
    console.log(`Opening ${type} media:`, uri);
    // TODO: Implement media viewer
    Alert.alert('Media Viewer', `Opening ${type} media`);
  };

  // Handle retry single message
  const handleRetryMessage = async (message: OfflineMessage) => {
    try {
      await chatService.sendMessage(message.channel_id, message.body);
      await offlineMessageService.updateSyncStatus(message.id, 'synced');
      
      // Reload messages
      if (state.selectedChannel) {
        await loadChannelMessages(state.selectedChannel.id);
      }
    } catch (error) {
      console.error('Failed to retry message:', error);
      Alert.alert('Retry Failed', 'Could not send message. Please try again later.');
    }
  };

  // Render message item
  const renderMessage = ({ item }: { item: OfflineMessage }) => {
    console.log('🎨 Rendering message:', item.id, 'Author:', item.author_name, 'Body:', item.body?.substring(0, 30));

    // Get current user ID from chat service (which has proper user ID handling)
    const currentUserId = chatService.getCurrentUserId();
    const currentUserPartnerId = chatService.getCurrentUserPartnerId();

    // Check both user ID and partner ID for message ownership
    const isOwnMessage = item.author_id === currentUserId || item.author_id === currentUserPartnerId;

    console.log('👤 Current User ID:', currentUserId, 'Partner ID:', currentUserPartnerId, 'Message Author ID:', item.author_id, 'Is Own:', isOwnMessage);

    // Check if message has media
    if (item.media_type && item.media_type !== 'text') {
      return (
        <BC_C010_MediaMessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          onImagePress={handleMediaPress}
          onVideoPress={handleMediaPress}
          onDocumentPress={handleMediaPress}
          onAudioPress={handleMediaPress}
          showSyncStatus={true}
          onRetry={handleRetryMessage}
        />
      );
    }

    // Regular text message bubble
    return (
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Text style={styles.authorName}>{item.author_name}</Text>
        )}
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {item.body}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.create_date).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          {isOwnMessage && (
            <View style={styles.syncStatus}>
              {item.sync_status === 'pending' && (
                <MaterialIcons name="schedule" size={12} color="#999" />
              )}
              {item.sync_status === 'synced' && (
                <MaterialIcons name="done" size={12} color="#007AFF" />
              )}
              {item.sync_status === 'failed' && (
                <TouchableOpacity onPress={() => handleRetryMessage(item)}>
                  <MaterialIcons name="error" size={12} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render channel list item
  const renderChannelItem = ({ item }: { item: ChatChannel }) => (
    <TouchableOpacity
      style={[
        styles.channelItem,
        state.selectedChannel?.id === item.id && styles.selectedChannel
      ]}
      onPress={() => selectChannel(item)}
    >
      <View style={styles.channelAvatar}>
        <MaterialIcons 
          name={item.channel_type === 'channel' ? 'group' : 'person'} 
          size={24} 
          color="#FFF" 
        />
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.channelType}>
          {item.channel_type === 'channel' ? 'Group' : 'Direct'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Handle back navigation from chat to list
  const handleBackToList = () => {
    setState(prev => ({
      ...prev,
      currentView: 'list',
      selectedChannel: null
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {state.currentView === 'chat' && state.selectedChannel ? (
          // Chat header with back button
          <>
            <TouchableOpacity onPress={handleBackToList}>
              <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>

            <View style={styles.chatHeaderInfo}>
              <Text style={styles.title} numberOfLines={1}>
                {state.selectedChannel.name}
              </Text>
              <Text style={styles.subtitle}>
                {state.selectedChannel.channel_type === 'channel' ? 'Group Chat' : 'Direct Message'}
              </Text>
            </View>

            <TouchableOpacity onPress={showUniversalSearch}>
              <MaterialIcons name="search" size={24} color="#007AFF" />
            </TouchableOpacity>
          </>
        ) : (
          // List header
          <>
            <TouchableOpacity onPress={showNavigationDrawer}>
              <MaterialIcons name="menu" size={24} color="#007AFF" />
            </TouchableOpacity>

            <Text style={styles.title}>Chat</Text>

            <View style={styles.headerActions}>
              <TouchableOpacity onPress={showUniversalSearch}>
                <MaterialIcons name="search" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Offline Manager */}
      <BC_C009_OfflineChatManager
        visible={state.showOfflineManager}
        onRetryAll={handleRetryAllMessages}
        onDismiss={() => setState(prev => ({ ...prev, showOfflineManager: false }))}
        connectionStatus={state.connectionStatus}
      />

      {/* Mobile-First Content */}
      {state.currentView === 'list' ? (
        // Channel List View
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Conversations</Text>
          <FlatList
            data={state.channels}
            renderItem={renderChannelItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.channelList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={handleRefresh}
                tintColor="#007AFF"
              />
            }
          />
        </View>
      ) : (
        // Chat View
        state.selectedChannel && (
          <View style={styles.chatContainer}>
            {state.loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            ) : (
              <>
                {console.log('📋 FlatList data:', state.messages.length, 'messages')}
                <FlatList
                  ref={flatListRef}
                  data={state.messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
                {state.messages.length === 0 && (
                  <View style={styles.noMessagesContainer}>
                    <MaterialIcons name="chat-bubble-outline" size={64} color="#C7C7CC" />
                    <Text style={styles.noMessagesTitle}>No messages yet</Text>
                    <Text style={styles.noMessagesText}>
                      Start the conversation by sending a message
                    </Text>
                  </View>
                )}

                {/* Chat Input */}
                <View style={styles.chatInputContainer}>
                  <View style={styles.inputRow}>
                    <TouchableOpacity style={styles.attachButton}>
                      <MaterialIcons name="attach-file" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.messageInput}
                      placeholder="Type a message..."
                      placeholderTextColor="#8E8E93"
                      multiline
                      maxLength={1000}
                    />
                    <TouchableOpacity style={styles.emojiButton}>
                      <MaterialIcons name="emoji-emotions" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sendButton}>
                      <MaterialIcons name="send" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        )
      )}

      <ScreenBadge
        screenNumber="150"
        title="Chat Dashboard"
        subtitle="Offline-First Messaging"
      />
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  chatHeaderInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  channelList: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F8F9FA',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#FFFFFF',
  },
  selectedChannel: {
    backgroundColor: '#E3F2FD',
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  channelType: {
    fontSize: 12,
    color: '#666',
  },

  messagesList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    marginLeft: 50, // Push own messages to the right
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    marginRight: 50, // Push other messages to the left
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
    color: '#8E8E93',
  },
  syncStatus: {
    marginLeft: 8,
  },
  noChannelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  noChannelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  noChannelText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  noMessagesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 32,
  },
  noMessagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  noMessagesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatInputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  attachButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F8F9FA',
  },
  emojiButton: {
    padding: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
