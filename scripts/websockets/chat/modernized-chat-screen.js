import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import services and hooks
import { useChat } from '../../../hooks/useChat';
import { useChatContext } from '../../../contexts/ChatContext';
import { useTheme } from '../../../contexts/ThemeContext';
import chatHistoryService from '../../../services/chat/ChatHistoryService';
import EnhancedAttachmentPicker from '../../../components/chat/EnhancedAttachmentPicker';
import MessageBubble from '../../../components/chat/MessageBubble';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Modernized SimpleChatScreen - Full-width layout with enhanced features
 * Features: Smart history loading, modern attachments, emoji support, full-width UI
 */
const ModernizedSimpleChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { channelId, channelName } = route.params || {};

  // Enhanced chat integration
  const {
    messages: chatMessages,
    typingUsers,
    connectionState,
    sendMessage: chatSendMessage,
    startTyping,
    stopTyping,
    isInitialized: chatInitialized
  } = useChat(channelId, {
    autoJoin: true,
    enableTyping: true,
    enablePresence: true
  });

  // Global chat context
  const {
    getUnreadCount,
    markChannelAsRead
  } = useChatContext();

  // Local state
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // Refs
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);

  // Initialize chat history service
  useEffect(() => {
    const initHistoryService = async () => {
      try {
        await chatHistoryService.initialize();
        
        if (channelId) {
          console.log('📚 Loading initial history...');
          setIsLoadingHistory(true);
          
          const history = await chatHistoryService.loadInitialHistory(channelId, {
            loadSize: 100, // Load more initial messages
            forceRefresh: false
          });
          
          console.log(`📚 Loaded ${history.length} historical messages`);
        }
      } catch (error) {
        console.error('❌ Failed to initialize history service:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    initHistoryService();
  }, [channelId]);

  // Mark channel as read when entering
  useEffect(() => {
    if (channelId && chatInitialized) {
      markChannelAsRead(channelId);
    }
  }, [channelId, chatInitialized, markChannelAsRead]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages.length]);

  // Enhanced send message with attachment support
  const handleSendMessage = useCallback(async () => {
    if ((!messageText.trim() && attachments.length === 0) || sending) return;

    const messageToSend = messageText.trim();
    const attachmentsToSend = [...attachments];

    try {
      setSending(true);
      setMessageText('');
      setAttachments([]);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (chatInitialized) {
        // Use enhanced chat service
        await chatSendMessage(messageToSend, {
          attachments: attachmentsToSend.length > 0 ? attachmentsToSend : null
        });
        console.log('✅ Message sent via enhanced service');
      } else {
        // Fallback implementation would go here
        console.log('📱 Fallback message sending...');
      }

      // Auto-scroll to bottom using requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });

    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      // Restore content on failure
      setMessageText(messageToSend);
      setAttachments(attachmentsToSend);
    } finally {
      setSending(false);
    }
  }, [messageText, attachments, sending, chatInitialized, chatSendMessage]);

  // Enhanced load more with history service
  const handleLoadMore = useCallback(async () => {
    if (isLoadingHistory || !chatHistoryService.hasMoreHistory(channelId)) {
      return;
    }

    try {
      setIsLoadingHistory(true);
      console.log('📚 Loading more history...');

      const oldestMessage = chatMessages[chatMessages.length - 1];
      const moreMessages = await chatHistoryService.loadMoreHistory(channelId, {
        beforeMessageId: oldestMessage?.id,
        loadSize: 50
      });

      console.log(`📚 Loaded ${moreMessages.length} more historical messages`);
      
      if (moreMessages.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

    } catch (error) {
      console.error('❌ Failed to load more messages:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isLoadingHistory, channelId, chatMessages]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      
      if (chatInitialized) {
        // Reload recent messages
        await chatHistoryService.loadInitialHistory(channelId, {
          forceRefresh: true,
          loadSize: 50
        });
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [chatInitialized, channelId]);

  // Handle text input changes with typing indicators
  const handleTextChange = useCallback((text) => {
    setMessageText(text);
    
    if (chatInitialized) {
      if (text.trim()) {
        startTyping();
      } else {
        stopTyping();
      }
    }
  }, [chatInitialized, startTyping, stopTyping]);

  // Handle attachment selection
  const handleAttachmentSelected = useCallback(async (attachment) => {
    try {
      console.log('📎 Attachment selected:', attachment);
      
      // Add to attachments list
      setAttachments(prev => [...prev, {
        id: Date.now().toString(),
        ...attachment
      }]);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Could upload immediately and get URL, or upload when sending
      // For now, we'll upload when sending the message
      
    } catch (error) {
      console.error('❌ Failed to handle attachment:', error);
      Alert.alert('Error', 'Failed to process attachment');
    }
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Enhanced message rendering with full width
  const renderMessage = useCallback(({ item, index }) => {
    return (
      <MessageBubble
        message={item}
        previousMessage={chatMessages[index - 1]}
        nextMessage={chatMessages[index + 1]}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Handle message actions (copy, react, reply, etc.)
        }}
        onReaction={(emoji) => {
          // Handle message reactions
          console.log('React with:', emoji);
        }}
        onReply={() => {
          // Handle reply to message
          console.log('Reply to message:', item.id);
        }}
        style={styles.fullWidthMessage}
      />
    );
  }, [chatMessages]);

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!typingUsers || typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>
            {typingUsers.length === 1 
              ? `${typingUsers[0]} is typing` 
              : `${typingUsers.length} people are typing`}
          </Text>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.dot1]} />
            <View style={[styles.typingDot, styles.dot2]} />
            <View style={[styles.typingDot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  };

  // Render attachment previews
  const renderAttachmentPreviews = () => {
    if (attachments.length === 0) return null;

    return (
      <View style={styles.attachmentPreviewContainer}>
        <Text style={styles.attachmentPreviewTitle}>
          {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.attachmentPreviewList}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={styles.attachmentPreview}>
              <View style={styles.attachmentInfo}>
                <Ionicons 
                  name={
                    attachment.type === 'image' ? 'image' :
                    attachment.type === 'video' ? 'videocam' :
                    'document-text'
                  } 
                  size={16} 
                  color="#007AFF" 
                />
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeAttachment(attachment.id)}
                style={styles.removeAttachmentButton}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Navigation header with full customization
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={styles.headerContainer}
          onPress={() => {
            // Navigate to channel/user details
            console.log('Header pressed - show details');
          }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {channelName || `Chat ${channelId}`}
            </Text>
            <Text style={[styles.headerSubtitle, {
              color: connectionState === 'connected' ? '#34C759' : '#FF9500'
            }]}>
              {connectionState === 'connected' ? 'online' : 'connecting...'}
              {typingUsers && typingUsers.length > 0 && ' • typing...'}
            </Text>
          </View>
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: colors.primary,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
      headerTintColor: colors.onPrimary,
      headerLeft: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.onPrimary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          {getUnreadCount(channelId) > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{getUnreadCount(channelId)}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              // Search in chat
              console.log('Search in chat');
            }}
          >
            <Ionicons name="search" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, channelName, channelId, colors, connectionState, typingUsers, getUnreadCount]);

  // Loading state
  if (!chatInitialized || isLoadingHistory) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {!chatInitialized ? 'Initializing chat...' : 'Loading history...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Connection status bar */}
        {connectionState !== 'connected' && (
          <View style={[styles.statusBar, { backgroundColor: '#FF9500' }]}>
            <Text style={styles.statusText}>
              {connectionState === 'connecting' ? '🔄 Connecting...' :
               connectionState === 'reconnecting' ? '🔄 Reconnecting...' :
               '⚠️ Connection lost'}
            </Text>
          </View>
        )}

        {/* Messages List - Full Width */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => `message-${item.id || item.local_id}`}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListHeaderComponent={
            isLoadingHistory ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingMoreText, { color: colors.textSecondary }]}>
                  Loading older messages...
                </Text>
              </View>
            ) : null
          }
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />

        {/* Typing Indicator */}
        {renderTypingIndicator()}

        {/* Attachment Previews */}
        {renderAttachmentPreviews()}

        {/* Enhanced Input Bar - Full Width */}
        <View style={[styles.inputContainer, {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 16),
        }]}>
          {/* Left Actions */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAttachmentPicker(true);
            }}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Text Input Container */}
          <View style={[styles.textInputContainer, {
            backgroundColor: colors.background,
            borderColor: colors.border,
          }]}>
            <TextInput
              ref={textInputRef}
              style={[styles.textInput, { color: colors.text }]}
              value={messageText}
              onChangeText={handleTextChange}
              placeholder="Message..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={4000}
              editable={!sending && connectionState === 'connected'}
              textAlignVertical="center"
            />

            {/* Emoji Button */}
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Show emoji picker
                Alert.alert('Emoji Picker', 'Emoji picker coming soon!');
              }}
            >
              <Text style={styles.emojiButtonText}>😀</Text>
            </TouchableOpacity>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, {
              backgroundColor: (messageText.trim() || attachments.length > 0) && connectionState === 'connected'
                ? colors.primary 
                : colors.textSecondary,
            }]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() && attachments.length === 0 || sending || connectionState !== 'connected'}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {/* Enhanced Attachment Picker */}
        <EnhancedAttachmentPicker
          visible={showAttachmentPicker}
          onClose={() => setShowAttachmentPicker(false)}
          onAttachmentSelected={handleAttachmentSelected}
          onEmojiPress={() => {
            // Show emoji picker
            Alert.alert('Emoji Picker', 'Emoji picker integration!');
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  
  // Header styles
  headerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Status bar
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Messages list - Full width
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingVertical: 8,
    // Remove horizontal padding for full width
  },
  fullWidthMessage: {
    width: SCREEN_WIDTH,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
  },

  // Typing indicator
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },

  // Attachment previews
  attachmentPreviewContainer: {
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  attachmentPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  attachmentPreviewList: {
    gap: 8,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  attachmentName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  removeAttachmentButton: {
    padding: 4,
  },

  // Input container - Full width
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
    minHeight: 64,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 4,
    minHeight: 24,
    textAlignVertical: 'center',
  },
  emojiButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emojiButtonText: {
    fontSize: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default ModernizedSimpleChatScreen;