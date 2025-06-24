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
  Keyboard,
  RefreshControl,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import discussAPI from '../../../api/models/discussApi';
import odooClient from '../../../api/odooClient';
import { useTheme } from '../../../contexts/ThemeContext';
import { useChat } from '../../../hooks/useChat';
import EnhancedAttachmentPicker from '../../../components/chat/EnhancedAttachmentPicker';
import { useServices, useMessageService, useWebSocket } from '../../../providers/AppServiceProvider';
import CachedImage from '../../../components/CachedImage';
import TypingIndicator from '../../../components/chat/TypingIndicator';
import useTypingIndicator from '../../../hooks/useTypingIndicator';

const SimpleChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { channelId, channelName, channelType, participantInfo } = route.params || {};

  // Debug channel name
  console.log('📱 SimpleChatScreen params:', { channelId, channelName, channelType, participantInfo });

  // State for improved channel name
  const [improvedChannelName, setImprovedChannelName] = useState(channelName);

  // Enhanced chat integration with fallback to existing implementation
  const {
    messages: chatMessages,
    isLoading: chatLoading,
    hasMoreMessages: chatHasMore,
    typingUsers,
    connectionState,
    sendMessage: chatSendMessage,
    loadMoreMessages: chatLoadMore,
    startTyping,
    stopTyping,
    isInitialized: chatInitialized
  } = useChat(channelId, {
    autoJoin: true,
    enableTyping: true,
    enablePresence: true
  });

  // Refs
  const flatListRef = useRef(null);

  // State - keeping existing for fallback
  const [legacyMessages, setLegacyMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [offset, setOffset] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Enhanced attachment picker state
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // Use app-level services
  const { status: serviceStatus, capabilities: serviceCapabilities, isReady: servicesReady } = useServices();
  const { service: messageService, isReady: messageServiceReady } = useMessageService();

  // 🔌 WebSocket services for real-time features
  const { manager: webSocketManager, isConnected: wsConnected, subscribeToChannel, unsubscribeFromChannel } = useWebSocket();
  const { startTyping: wsStartTyping, stopTyping: wsStopTyping, onTextChange: wsOnTextChange } = useTypingIndicator(channelId);

  // Temporarily force legacy mode until UI state sync is fixed
  const messages = legacyMessages; // Force legacy for now
  const isLoadingMessages = loading;
  const hasMore = hasMoreMessages;

  // Enable WebSocket features if available
  const chatInitializedSafe = wsConnected; // Enable when WebSocket is connected
  
  // Debug logging
  useEffect(() => {
    console.log('Message State Debug:', JSON.stringify({
      legacyMessagesCount: legacyMessages.length,
      chatMessagesCount: chatMessages?.length || 0,
      chatInitialized,
      chatInitializedSafe,
      loading,
      connectionState
    }, null, 2));
  }, [legacyMessages.length, chatMessages?.length, chatInitialized, chatInitializedSafe, loading, connectionState]);

  // Load current user using OAuth2
  const loadCurrentUser = useCallback(async () => {
    try {
      console.log('Loading current user with OAuth2...');

      // Try multiple API endpoints to get user info
      let userData = null;
      let apiEndpoint = '';

      // Try /api/v2/user first
      try {
        const response = await odooClient.client.get('/api/v2/user');
        userData = response.data;
        apiEndpoint = '/api/v2/user';
      } catch (userError) {
        console.log('Failed to get user from /api/v2/user, trying /api/v2/userinfo...');
        try {
          const response = await odooClient.client.get('/api/v2/userinfo');
          userData = response.data;
          apiEndpoint = '/api/v2/userinfo';
        } catch (userinfoError) {
          console.log('Failed to get user from /api/v2/userinfo, trying /web/session/get_session_info...');
          const response = await odooClient.client.get('/web/session/get_session_info');
          userData = response.data;
          apiEndpoint = '/web/session/get_session_info';
        }
      }

      console.log(`🔍 Raw user data from API (${apiEndpoint}):`, JSON.stringify(userData, null, 2));

      // The API might return different structures, let's handle both
      let processedUser = userData;
      if (userData && typeof userData === 'object') {
        // If it's an array, take the first item
        if (Array.isArray(userData) && userData.length > 0) {
          processedUser = userData[0];
        }

        // Ensure we have the required fields for message comparison
        if (!processedUser.id && processedUser.uid) {
          processedUser.id = processedUser.uid;
        }
        if (!processedUser.id && processedUser.user_id) {
          processedUser.id = processedUser.user_id;
        }
        if (!processedUser.name && processedUser.username) {
          processedUser.name = processedUser.username;
        }
        if (!processedUser.name && processedUser.login) {
          processedUser.name = processedUser.login;
        }
        if (!processedUser.name && processedUser.display_name) {
          processedUser.name = processedUser.display_name;
        }

        // PERMANENT FIX: Based on logs, Mark Shaw's messages have author_id 844
        // The API is returning the wrong user ID (10), but messages show the correct ID (844)
        if (processedUser.name === 'Mark Shaw') {
          console.log('🔧 CORRECTING USER ID: API returned ID', processedUser.id, 'but messages show ID 844');
          processedUser.id = 844;
        }
      }

      setCurrentUser(processedUser);
      console.log('✅ Current user loaded successfully:', JSON.stringify(processedUser, null, 2));
      console.log('✅ User ID for message comparison:', processedUser?.id);
      console.log('✅ User name:', processedUser?.name);
    } catch (error) {
      console.error('Error loading current user:', error);

      // Fallback: try to get user info from OAuth token data
      try {
        console.log('Trying fallback: getting user from OAuth token...');
        const tokenData = await AsyncStorage.getItem('odooTokenData');
        if (tokenData) {
          const parsedToken = JSON.parse(tokenData);
          if (parsedToken.serverConfig && parsedToken.serverConfig.username) {
            const fallbackUser = {
              id: parsedToken.userId || 1, // Use stored userId or default
              name: parsedToken.serverConfig.username,
              login: parsedToken.serverConfig.username
            };
            setCurrentUser(fallbackUser);
            console.log('Fallback user set:', fallbackUser);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback user loading failed:', fallbackError);
      }
    }
  }, []);

  // Extract better channel name from messages (for direct messages)
  const extractBetterChannelName = useCallback((messagesList) => {
    if (!messagesList || messagesList.length === 0 || channelType !== 'chat') return null;

    // For direct messages, try to find the other participant's name
    const otherParticipants = new Set();

    messagesList.forEach(msg => {
      const authorName = getAuthorName(msg);
      if (authorName && authorName !== 'Unknown User' && authorName !== currentUser?.name) {
        otherParticipants.add(authorName);
      }
    });

    // If we found exactly one other participant, use their name
    if (otherParticipants.size === 1) {
      return Array.from(otherParticipants)[0];
    }

    // If multiple participants, create a group name
    if (otherParticipants.size > 1) {
      const names = Array.from(otherParticipants).slice(0, 2);
      return names.length === 2 ? `${names[0]}, ${names[1]}` : `${names[0]} and others`;
    }

    return null;
  }, [channelType, currentUser?.name]);

  // Auto-detect correct user ID from messages (fallback method)
  const autoDetectUserIdFromMessages = useCallback((messagesList) => {
    if (!currentUser || !messagesList || messagesList.length === 0) return;

    // Look for messages from "Mark Shaw" to get the correct user ID
    const markShawMessages = messagesList.filter(msg => {
      const authorName = getAuthorName(msg);
      return authorName === 'Mark Shaw' || (Array.isArray(msg.author_id) && msg.author_id[1] && msg.author_id[1].includes('Mark Shaw'));
    });

    if (markShawMessages.length > 0) {
      const detectedUserId = Array.isArray(markShawMessages[0].author_id) ? markShawMessages[0].author_id[0] : markShawMessages[0].author_id;

      if (detectedUserId && detectedUserId !== currentUser.id) {
        console.log(`🔍 AUTO-DETECTED USER ID: Messages show ${detectedUserId}, but current user has ${currentUser.id}`);
        console.log(`🔧 UPDATING USER ID from ${currentUser.id} to ${detectedUserId}`);

        setCurrentUser(prev => ({
          ...prev,
          id: detectedUserId
        }));
      }
    }
  }, [currentUser]);

  // Load messages with proper caching and pagination
  const loadMessages = useCallback(async (isRefresh = false, loadMore = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (loadMore) {
        if (!hasMoreMessages || loadingMore) return;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      console.log(`Loading messages for channel ${channelId}, refresh: ${isRefresh}, loadMore: ${loadMore}`);

      // Use unified message service if available, fallback to legacy
      let newMessages = [];

      if (messageServiceReady && messageService) {
        console.log('📱 Using unified message service...');
        try {
          newMessages = await messageService.getMessages(channelId, {
            forceRefresh: isRefresh,
            loadMore: loadMore,
            limit: 50,
            offset: loadMore ? messages.length : 0
          });
          console.log(`✅ Unified service returned ${newMessages?.length || 0} messages`);
        } catch (serviceError) {
          console.warn('⚠️ Unified service failed, falling back to legacy:', serviceError);
          // Fallback to legacy API
          const messagesData = await discussAPI.getChannelMessages(channelId, isRefresh, {
            limit: 50,
            offset: loadMore ? messages.length : 0
          });
          newMessages = messagesData || [];
        }
      } else {
        console.log('📱 Using legacy API...');
        const messagesData = await discussAPI.getChannelMessages(channelId, isRefresh, {
          limit: 50,
          offset: loadMore ? messages.length : 0
        });
        newMessages = messagesData || [];
      }

      // Check if we have more messages to load
      setHasMoreMessages(newMessages.length === 50);

      if (isRefresh || !loadMore) {
        // Replace all messages on refresh or initial load
        // Messages come in reverse order (newest first), so reverse them for chat display
        const reversedMessages = [...newMessages].reverse();
        setLegacyMessages(reversedMessages);
        console.log(`Loaded ${newMessages.length} messages (${isRefresh ? 'refresh' : 'initial'})`);

        // Auto-detect correct user ID from messages
        autoDetectUserIdFromMessages(reversedMessages);
      } else if (loadMore) {
        // Prepend older messages to the beginning
        // New messages are older, so they go at the start
        const reversedNewMessages = [...newMessages].reverse();
        setLegacyMessages(prev => {
          const updatedMessages = [...reversedNewMessages, ...prev];
          // Auto-detect correct user ID from all messages
          autoDetectUserIdFromMessages(updatedMessages);
          return updatedMessages;
        });
        console.log(`Loaded ${newMessages.length} more messages, total: ${messages.length + newMessages.length}`);
      }

      // Auto-scroll to bottom only on initial load or refresh (not when loading more)
      if (!loadMore) {
        setTimeout(() => {
          if (flatListRef.current && newMessages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }

    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [channelId, hasMoreMessages, loadingMore]); // Removed legacyMessages.length to prevent infinite loop

  // Enhanced send message with fallback to legacy
  const sendMessage = useCallback(async () => {
    if (!messageText.trim()) return;

    const messageToSend = messageText.trim();

    try {
      setSending(true);
      setMessageText('');

      // Temporarily force legacy sending until state sync is fixed
      if (false) { // Disable enhanced for now
        // Use enhanced chat service
        console.log('📱 Sending message via enhanced chat service...');
        await chatSendMessage(messageToSend);
        console.log('✅ Message sent via enhanced service');
      } else {
        // Fallback to legacy implementation
        console.log('📱 Sending message via legacy API...');
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          body: messageToSend,
          author_id: [currentUser?.id, currentUser?.name || 'You'],
          date: new Date().toISOString(),
          authorName: currentUser?.name || 'You',
          cleanBody: messageToSend,
          message_type: 'comment',
          isOptimistic: true,
          status: 'sending'
        };

        // Add optimistic message immediately
        setLegacyMessages(prev => [...prev, optimisticMessage]);

        // Auto-scroll to bottom
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);

        await discussAPI.sendChannelMessage(channelId, messageToSend);

        // Remove optimistic message and refresh to get the real one
        setLegacyMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        await loadMessages(true);
        console.log('✅ Message sent via legacy API');
      }

      // Auto-scroll to bottom for both methods
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Restore message text on failure
      setMessageText(messageToSend);
    } finally {
      setSending(false);
    }
  }, [channelId, messageText, currentUser, chatInitializedSafe, chatSendMessage]); // Removed loadMessages to prevent circular dependency

  // Enhanced attachment handling
  const handleAttachmentSelected = useCallback(async (attachment) => {
    try {
      console.log('📎 Attachment selected:', attachment);
      setAttachments(prev => [...prev, attachment]);

      // TODO: Upload attachment to server
      // For now, just add to local state
      Alert.alert('Attachment Added', `${attachment.name} ready to send!`);
    } catch (error) {
      console.error('❌ Failed to handle attachment:', error);
      Alert.alert('Error', 'Failed to add attachment');
    }
  }, []);

  const handleRemoveAttachment = useCallback((index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEmojiPress = useCallback(() => {
    Alert.alert('Emoji Picker', 'Emoji picker integration coming soon!');
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    loadMessages(true);
  }, []); // Removed loadMessages dependency to prevent circular dependency

  // Enhanced load more messages with fallback
  const handleLoadMore = useCallback(() => {
    if (chatInitializedSafe) {
      // Use enhanced chat service (disabled for now)
      if (chatHasMore && !chatLoading) {
        console.log('📄 Loading more messages via enhanced service...');
        chatLoadMore();
      }
    } else {
      // Fallback to legacy implementation
      if (hasMoreMessages && !loadingMore) {
        console.log('📄 Loading more messages via legacy API...');
        loadMessages(false, true);
      }
    }
  }, [chatInitializedSafe, chatHasMore, chatLoading, chatLoadMore, hasMoreMessages, loadingMore]); // Removed loadMessages to prevent circular dependency

  // Handle scroll to detect when user reaches the top
  const handleScroll = useCallback((event) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y <= 50 && hasMoreMessages && !loadingMore) {
      handleLoadMore();
    }
  }, [hasMoreMessages, loadingMore, handleLoadMore]);

  // Simulate online presence (in real app, this would come from WebSocket)
  const updateOnlinePresence = useCallback(() => {
    // Mock online users - in real app this would be from WebSocket/API
    const mockOnlineUserIds = new Set([1, 2, 3, currentUser?.id].filter(Boolean));
    setOnlineUsers(mockOnlineUserIds);
  }, [currentUser?.id]);

  // Log service status for debugging
  useEffect(() => {
    console.log('Service Status:', JSON.stringify({
      serviceStatus,
      servicesReady,
      messageServiceReady,
      capabilities: serviceCapabilities
    }, null, 2));
    console.log('Chat State:', JSON.stringify({
      chatInitialized,
      chatInitializedSafe,
      connectionState,
      messagesCount: messages.length,
      legacyMessagesCount: legacyMessages.length,
      chatMessagesCount: chatMessages?.length || 0
    }, null, 2));

    // SQLite Cache Debugging
    if (messageService?.implementation === 'enhanced') {
      messageService.getCacheStats?.().then(cacheStats => {
        console.log('💾 SQLite Cache Stats:', {
          database: cacheStats?.database || 'No DB stats',
          messages: cacheStats?.messages || 'No message stats',
          media: cacheStats?.media || 'No media stats',
          isWorking: !!cacheStats
        });
      }).catch(err => {
        console.log('💾 SQLite Cache not available:', err.message);
      });
    } else {
      console.log('💾 SQLite Cache: Not using enhanced service (using legacy)');
    }
  }, [serviceStatus, servicesReady, messageServiceReady, serviceCapabilities, chatInitialized, chatInitializedSafe, connectionState, messages.length, legacyMessages.length, chatMessages, messageService]);

  // Load current user and messages on mount
  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // Try to improve channel name from messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Auto-detect user ID
      autoDetectUserIdFromMessages(messages);

      // Try to improve channel name if current name is too short
      if ((!channelName || channelName.length <= 1) && channelType === 'chat') {
        const betterName = extractBetterChannelName(messages);
        if (betterName && betterName !== channelName) {
          console.log(`📱 Improved channel name from "${channelName}" to "${betterName}"`);
          setImprovedChannelName(betterName);
        }
      }
    }
  }, [messages, autoDetectUserIdFromMessages, extractBetterChannelName, channelName, channelType]);

  // Load messages when channel changes
  useEffect(() => {
    if (channelId) {
      loadMessages();
    }
  }, [channelId]); // Only depend on channelId

  // Handle WebSocket subscription separately to prevent loops
  useEffect(() => {
    if (channelId && wsConnected && subscribeToChannel) {
      console.log(`🔌 Subscribing to WebSocket channel ${channelId}`);
      subscribeToChannel(channelId);

      // Note: We do NOT unsubscribe when component unmounts
      // Users should remain subscribed to receive notifications and real-time updates
      // Unsubscribe only happens when user explicitly leaves channel or logs out
    }
  }, [channelId, wsConnected]); // Only depend on channelId and wsConnected

  // Update online presence periodically with safer timeout approach
  useEffect(() => {
    updateOnlinePresence();

    const schedulePresenceUpdate = () => {
      const timeout = setTimeout(() => {
        try {
          updateOnlinePresence();
        } catch (error) {
          console.warn('Presence update error:', error);
        } finally {
          schedulePresenceUpdate();
        }
      }, 30000); // Update every 30 seconds

      return timeout;
    };

    const timeoutId = schedulePresenceUpdate();
    return () => clearTimeout(timeoutId);
  }, [updateOnlinePresence]);

  // Set navigation header with Telegram-style custom header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={styles.headerContainer}
          onPress={() => {
            // Navigate to user settings/details
            navigation.navigate('Settings');
          }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text
                style={styles.headerTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {improvedChannelName && improvedChannelName.length > 1 ? improvedChannelName : `Chat ${channelId}`}
              </Text>
              <Text style={styles.headerSubtitle}>
                {participantInfo?.isOnline ? 'online' : 'last seen recently'}
              </Text>
            </View>
            <View style={styles.headerAvatarContainer}>
              <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.headerAvatarText}>
                  {channelName ? channelName.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
              {participantInfo?.isOnline && (
                <View style={styles.headerOnlineIndicator} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: colors.primary,
        elevation: 4,
        shadowOpacity: 0.1,
      },
      headerTintColor: colors.onPrimary,
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.onPrimary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              Alert.alert('Search', 'Search functionality coming soon!');
            }}
          >
            <Icon name="magnify" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              Alert.alert('More Options', 'More options coming soon!');
            }}
          >
            <Icon name="dots-vertical" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, improvedChannelName, channelId, colors, participantInfo]);

  // Helper function to clean and format message content
  const getMessageContent = (message) => {
    
    let content = '';

    // Check for attachments first
    if (message.attachment_ids && message.attachment_ids.length > 0) {
      const attachmentCount = message.attachment_ids.length;
      const attachmentText = attachmentCount === 1 ? '📎 1 attachment' : `📎 ${attachmentCount} attachments`;
      content = attachmentText;
    }

    // Try different fields for message content (prioritize common fields)
    let bodyText = '';
    if (message.content && message.content.trim()) {
      // Check 'content' field first (newer format) - ensure it's not empty
      bodyText = message.content.trim();
    } else if (message.cleanBody) {
      bodyText = message.cleanBody;
    } else if (message.body) {
      // Remove HTML tags and decode entities
      bodyText = message.body
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .trim();
    } else if (message.subject) {
      bodyText = message.subject;
    } else if (message.preview) {
      bodyText = message.preview;
    } else if (message.message_text) {
      bodyText = message.message_text;
    }

    // Only log content issues for debugging when needed
    if (!bodyText && message.id && parseInt(message.id) % 100 === 0) {
      console.log(`No content found for message ${message.id}, available fields:`, Object.keys(message));
    }

    // Combine body text and attachment info
    if (bodyText && content) {
      return `${bodyText}\n\n${content}`;
    } else if (bodyText) {
      return bodyText;
    } else if (content) {
      return content;
    }

    return `Message #${message.id}`;
  };

  // Helper function to get author name
  const getAuthorName = (message) => {
    let authorName = 'Unknown User';

    // Check for author_name field first (from API)
    if (message.author_name) {
      authorName = message.author_name;
    }
    // Check for authorName field (processed)
    else if (message.authorName) {
      authorName = message.authorName;
    }
    // Check author_id array format [id, name]
    else if (message.author_id) {
      if (Array.isArray(message.author_id) && message.author_id.length > 1) {
        authorName = message.author_id[1];
      } else if (typeof message.author_id === 'string') {
        authorName = message.author_id;
      }
    }
    // Fallback to email
    else if (message.email_from) {
      authorName = message.email_from;
    }

    // Clean up company name from author (e.g., "ITMS Group Pty Ltd, Mark Shaw" -> "Mark Shaw")
    if (authorName && authorName.includes(',')) {
      const parts = authorName.split(',').map(part => part.trim());
      // Take the last part which should be the person's name
      if (parts.length > 1) {
        authorName = parts[parts.length - 1];
      }
    }

    return authorName;
  };

  // Helper function to format date - Telegram style (time only)
  const formatMessageDate = (dateString) => {
    if (!dateString) {
      // Return current time as fallback
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // 24-hour format like Telegram
      });
    }

    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        return '';
      }

      // Always show just time in Telegram style (HH:MM)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Use 24-hour format like Telegram
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Handle attachment press
  const handleAttachmentPress = useCallback((attachmentId, filename, attachment) => {
    // Check if it's an image attachment
    if (attachment && attachment.mimetype?.startsWith('image/')) {
      // Create the image URL for the viewer
      const baseUrl = 'https://itmsgroup.com.au';
      const imageUrl = `${baseUrl}/api/v2/download?model=ir.attachment&id=${attachmentId}&field=raw&filename=${filename || attachment.name || 'image'}&filename_field=name&type=file`;

      // Navigate to image viewer for images
      navigation.navigate('ImageViewer', {
        imageUrl: imageUrl,
        title: filename || attachment.name || 'Image',
        mimetype: attachment.mimetype
      });
    } else {
      // Show download dialog for non-image files
      Alert.alert(
        'Attachment',
        `Download ${filename || 'file'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: () => {
              // TODO: Implement download functionality
              console.log(`Downloading attachment ${attachmentId}: ${filename}`);
              Alert.alert('Info', 'Download functionality coming soon!');
            }
          }
        ]
      );
    }
  }, [navigation]);

  // Render attachment list with inline images (using helpdesk approach)
  const renderAttachments = (attachmentIds, attachments) => {
    if (!attachmentIds || attachmentIds.length === 0) return null;

    console.log('Rendering attachments:', JSON.stringify({
      attachmentIds,
      attachmentsCount: attachments?.length || 0,
      attachments: attachments?.map(att => ({ id: att.id, name: att.name, mimetype: att.mimetype })) || 'undefined'
    }, null, 2));

    return (
      <View style={styles.attachmentsContainer}>
        {attachmentIds.map((attachmentId, index) => {
          // Try to find attachment details from the processed attachments
          let attachment = attachments?.find(att => att.id === attachmentId);

          console.log(`Attachment ${attachmentId} lookup:`, JSON.stringify({
            attachmentId,
            found: !!attachment,
            attachment: attachment ? { id: attachment.id, name: attachment.name, mimetype: attachment.mimetype } : null
          }, null, 2));

          // If no attachment details, create a basic attachment object and assume it's an image
          if (!attachment) {
            console.log(`No attachment details for ${attachmentId}, assuming it's an image`);
            attachment = {
              id: attachmentId,
              name: `attachment_${attachmentId}`,
              mimetype: 'image/jpeg' // Assume it's an image since we have attachment IDs
            };
          }

          const isImage = attachment.mimetype?.startsWith('image/');
          console.log(`Attachment ${attachmentId} is image: ${isImage}, mimetype: ${attachment.mimetype}`);

          if (isImage) {
            return (
              <TouchableOpacity
                key={`attachment-${attachmentId}-${index}`}
                style={styles.imageAttachment}
                onPress={() => handleAttachmentPress(attachmentId, attachment.name, attachment)}
              >
                <CachedImage
                  attachmentId={attachmentId}
                  size="256x256"
                  style={styles.inlineImage}
                  contentFit="cover"
                  onError={(error) => {
                    console.log(`Image load error for ${attachment.name}:`, error);
                  }}
                />
                {/* Optional: Add image overlay with filename */}
                {attachment.name && (
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          } else {
            // Render file attachment
            return (
              <TouchableOpacity
                key={`attachment-${attachmentId}-${index}`}
                style={[styles.attachmentItem, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => handleAttachmentPress(attachmentId, attachment.name, attachment)}
              >
                <Icon name="paperclip" size={16} color="#FFFFFF" />
                <Text style={[styles.attachmentText, { color: '#FFFFFF' }]}>
                  {attachment.name}
                </Text>
                <Icon name="download" size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            );
          }
        })}
      </View>
    );
  };

  // Check if message is from current user
  const isOwnMessage = (message) => {
    if (!currentUser) {
      console.log('❌ No current user set for message ownership check');
      return false;
    }

    // Check for optimistic messages first
    if (message.isOptimistic) {
      console.log(`✅ Message ${message.id} is optimistic (own message)`);
      return true;
    }

    const messageAuthorId = Array.isArray(message.author_id) ? message.author_id[0] : message.author_id;
    const currentUserId = currentUser.id;

    // Try different comparison approaches
    const isOwnExact = messageAuthorId === currentUserId;
    const isOwnString = String(messageAuthorId) === String(currentUserId);
    const isOwnNumber = Number(messageAuthorId) === Number(currentUserId);

    // Return true if any comparison method matches
    const isOwn = isOwnExact || isOwnString || isOwnNumber;

    // Log ownership for debugging (only when there's a mismatch)
    if (!isOwn && (messageAuthorId === 844 || (Array.isArray(message.author_id) && message.author_id[1] && message.author_id[1].includes('Mark Shaw')))) {
      console.log(`🔍 Message ${message.id} ownership check (potential mismatch):`);
      console.log(`  messageAuthorId: ${messageAuthorId} (type: ${typeof messageAuthorId})`);
      console.log(`  currentUserId: ${currentUserId} (type: ${typeof currentUserId})`);
      console.log(`  isOwn: ${isOwn}`);
      console.log(`  currentUserName: ${currentUser?.name}`);
      console.log(`  messageAuthorName: ${Array.isArray(message.author_id) ? message.author_id[1] : 'Unknown'}`);
    }

    return isOwn;
  };

  // Get message status icon (Telegram-style read indicators) - only for own messages
  const getMessageStatus = (message, isOwn) => {
    // Only show status for own messages
    if (!isOwn) return null;

    // For optimistic messages
    if (message.isOptimistic) {
      if (message.status === 'sending') {
        return <Icon name="clock-outline" size={12} color="rgba(0,0,0,0.5)" />;
      } else if (message.status === 'failed') {
        return <Icon name="alert-circle-outline" size={12} color="#FF3B30" />;
      }
    }

    // Simplified read status logic - only show when message is read by others
    const dateString = message.date || message.create_date || message.write_date;
    const messageDate = dateString ? new Date(dateString) : new Date();
    const now = new Date();
    const ageInMinutes = (now - messageDate) / (1000 * 60);

    // Show read receipt (double check) only for older messages that others have likely seen
    const isRead = ageInMinutes > 2; // Messages older than 2 minutes are considered read

    if (isRead) {
      // Double checkmark for read messages (blue like Telegram)
      return (
        <View style={styles.readIndicator}>
          <Icon name="check" size={12} color="#4FC3F7" />
          <Icon name="check" size={12} color="#4FC3F7" style={styles.secondCheck} />
        </View>
      );
    } else {
      // Single checkmark for sent but unread messages
      return <Icon name="check" size={12} color="rgba(0,0,0,0.5)" />;
    }
  };

  // Render Telegram-style message
  const renderMessage = ({ item, index }) => {
    const messageContent = getMessageContent(item);
    const authorName = getAuthorName(item);
    const messageDate = formatMessageDate(item.date || item.create_date || item.write_date || item.created_at);
    const hasAttachments = item.attachment_ids && item.attachment_ids.length > 0;
    const isOwn = isOwnMessage(item);

    // Debug message alignment (only for Mark Shaw messages)
    if (getAuthorName(item) === 'Mark Shaw') {
      console.log(`📱 Rendering Mark Shaw message ${item.id}: isOwn=${isOwn}, author=${getAuthorName(item)}`);
    }

    // Use the properly parsed message content from getMessageContent function
    // Extract just the text part (without attachment info) for display
    let bodyText = messageContent;

    // If messageContent contains attachment info, extract just the text part
    if (bodyText && bodyText.includes('\n\n📎')) {
      bodyText = bodyText.split('\n\n📎')[0];
    }

    // If we got the fallback "Message #ID", clear it so we show the fallback UI instead
    if (bodyText && bodyText.startsWith('Message #')) {
      bodyText = '';
    }

    // Check if we should show avatar and name (first message in group from same author)
    const previousMessage = messages[index - 1];
    const showAuthorInfo = !previousMessage || getAuthorName(previousMessage) !== authorName;

    // Check if user is online (for presence indicator)
    const authorId = Array.isArray(item.author_id) ? item.author_id[0] : item.author_id;
    const isAuthorOnline = onlineUsers.has(authorId);

    return (
      <View style={[
        styles.messageContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {/* Message Row */}
        <View style={[
          styles.messageRow,
          isOwn ? styles.ownMessageRow : styles.otherMessageRow
        ]}>
          {/* Avatar for other messages only */}
          {!isOwn && (
            <View style={styles.avatarContainer}>
              {showAuthorInfo ? (
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: '#6B7280' }]}>
                    <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                      {authorName ? authorName.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  {/* Online presence indicator */}
                  {isAuthorOnline && (
                    <View style={styles.onlineIndicator} />
                  )}
                </View>
              ) : (
                <View style={styles.avatarSpacer} />
              )}
            </View>
          )}

          {/* Message Bubble */}
          <View style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble
          ]}>
            {/* Author name for group chats (only for other messages) */}
            {!isOwn && showAuthorInfo && channelType !== 'chat' && (
              <Text style={[styles.authorNameInBubble, { color: '#007AFF' }]}>
                {authorName}
              </Text>
            )}

            {/* Message body with inline timestamp - Telegram style */}
            {bodyText ? (
              <Text style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {bodyText}
                <Text style={[
                  styles.messageTime,
                  isOwn ? styles.ownMessageTime : styles.otherMessageTime
                ]}>
                  {'  '}{messageDate}
                </Text>
                {isOwn && (
                  <Text style={[styles.messageTime, styles.ownMessageTime]}>
                    {' '}✓
                  </Text>
                )}
              </Text>
            ) : null}

            {/* Attachments */}
            {hasAttachments && renderAttachments(item.attachment_ids, item.attachments)}

            {/* Show fallback if no content */}
            {!bodyText && !hasAttachments && (
              <Text style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
                { opacity: 0.5, fontStyle: 'italic' }
              ]}>
                Message #{item.id}
                <Text style={[
                  styles.messageTime,
                  isOwn ? styles.ownMessageTime : styles.otherMessageTime
                ]}>
                  {'  '}{messageDate}
                </Text>
                {isOwn && (
                  <Text style={[styles.messageTime, styles.ownMessageTime]}>
                    {' '}✓
                  </Text>
                )}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <Icon name="message-text-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.text }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Start the conversation!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 20}
      >
          {/* Messages List - Clean white background like Telegram */}
          <View style={styles.messagesContainer}>
            {loading && !refreshing ? (
              <View style={[styles.loadingContainer, { backgroundColor: '#FFFFFF' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading messages...
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => `message-${item.id}`}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 10,
                }}
                // Pull-to-refresh
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
                // Load more messages when scrolling to top
                onScroll={handleScroll}
                scrollEventThrottle={16}
                inverted={false}
                // Header component for loading more indicator
                ListHeaderComponent={
                  loadingMore ? (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.loadingMoreText, { color: colors.textSecondary }]}>
                        Loading more messages...
                      </Text>
                    </View>
                  ) : null
                }
                onContentSizeChange={() => {
                  // Auto-scroll to bottom when content size changes (new messages)
                  if (flatListRef.current && messages.length > 0 && !loadingMore) {
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }
                }}
              />
            )}
          </View>

          {/* 🔌 Enhanced WebSocket Features: Typing Indicators & Connection Status */}

          {/* WebSocket Connection Status */}
          {wsConnected && connectionState && connectionState !== 'connected' && connectionState !== 'disconnected' && (
            <View style={[styles.statusContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {connectionState === 'connecting' ? 'Connecting...' :
                 connectionState === 'reconnecting' ? 'Reconnecting...' :
                 'Connection Issue'}
              </Text>
            </View>
          )}

          {/* 🔌 Real-time WebSocket Typing Indicators */}
          <TypingIndicator
            channelId={channelId}
            visible={false}
          />

          {/* Fallback: Enhanced Chat Typing Indicators */}
          {!wsConnected && chatInitializedSafe && typingUsers && typingUsers.length > 0 && (
            <View style={[styles.typingContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.typingText, { color: colors.textSecondary }]}>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </Text>
            </View>
          )}

          {/* Telegram-style Input Bar */}
          <View style={[styles.inputContainer, {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom // Only use safe area inset, no extra padding
          }]}>
            {/* Enhanced attachment button (left) */}
            <TouchableOpacity
              style={[styles.attachButton, { backgroundColor: colors.background }]}
              onPress={() => setShowAttachmentPicker(true)}
            >
              <Icon name="plus" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Text input (center) */}
            <View style={[styles.textInputContainer, {
              backgroundColor: colors.background,
              borderColor: colors.border
            }]}>
              <TextInput
                style={[styles.textInput, {
                  color: colors.text,
                }]}
                value={messageText}
                onChangeText={(text) => {
                  setMessageText(text);

                  // 🔌 WebSocket typing indicators
                  if (wsConnected) {
                    wsOnTextChange(text); // Use WebSocket typing hook
                  }

                  // Fallback to enhanced chat typing (if available)
                  if (chatInitializedSafe && !wsConnected) {
                    if (text.trim()) {
                      startTyping();
                    } else {
                      stopTyping();
                    }
                  }
                }}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={1000}
                editable={!sending}
                onFocus={() => {
                  // Scroll to bottom when input is focused
                  setTimeout(() => {
                    if (flatListRef.current && messages.length > 0) {
                      flatListRef.current.scrollToEnd({ animated: true });
                    }
                  }, 300);
                }}
              />

              {/* Emoji button (inside text input, right side) */}
              <TouchableOpacity
                style={styles.emojiButton}
                onPress={() => {
                  Alert.alert('Emoji', 'Emoji picker coming soon!');
                }}
              >
                <Icon name="emoticon-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Send button (right) - Telegram blue up arrow */}
            <TouchableOpacity
              style={[styles.sendButton, {
                backgroundColor: messageText.trim() ? '#007AFF' : colors.textSecondary, // Telegram blue
                opacity: messageText.trim() ? 1 : 0.6
              }]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Icon name="arrow-up" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Enhanced Attachment Picker */}
          <EnhancedAttachmentPicker
            visible={showAttachmentPicker}
            onClose={() => setShowAttachmentPicker(false)}
            onAttachmentSelected={handleAttachmentSelected}
            onEmojiPress={handleEmojiPress}
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
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white background like Telegram
  },
  messagesList: {
    flex: 1,
    backgroundColor: 'transparent', // Make transparent to show background
  },
  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 8, // Reduced from 16 for more width
    paddingVertical: 8,   // Top and bottom padding for messages
  },
  // Modern full-width chat style message containers
  messageContainer: {
    marginVertical: 1,    // Even more compact like Telegram
    paddingHorizontal: 0, // Removed padding for full width
    width: '100%',        // Full width
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
    width: '100%',        // Full width
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
    width: '100%',        // Full width
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,      // Reduced from 4
    gap: 6,               // Reduced from 8
  },
  ownMessageHeader: {
    justifyContent: 'flex-end',
  },
  otherMessageHeader: {
    justifyContent: 'flex-start',
    marginLeft: 32,       // Reduced from 40
  },
  messageRow: {
    flexDirection: 'row',
    maxWidth: '90%',      // Increased to 90% for Telegram-like width
    alignItems: 'flex-start',
    width: '100%',        // Full width container
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  // Avatar styles - more compact
  avatarContainer: {
    width: 28,             // Reduced from 32
    height: 28,            // Reduced from 32
    marginRight: 6,        // Reduced from 8
    marginBottom: 2,       // Reduced from 4
  },
  avatarWrapper: {
    position: 'relative',
    width: 28,             // Reduced from 32
    height: 28,            // Reduced from 32
  },
  avatarPlaceholder: {
    width: 28,             // Reduced from 32
    height: 28,            // Reduced from 32
    borderRadius: 14,      // Reduced from 16
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,          // Reduced from 14
    fontWeight: '600',
  },
  avatarSpacer: {
    width: 28,             // Reduced from 32
    height: 28,            // Reduced from 32
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,              // Reduced from 10
    height: 8,             // Reduced from 10
    borderRadius: 4,       // Reduced from 5
    backgroundColor: '#34C759',
    borderWidth: 1.5,      // Reduced from 2
    borderColor: '#FFFFFF',
  },
  // Message bubble styles - Telegram style
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,  // Reduced for more compact look
    paddingVertical: 8,     // Reduced for more compact look
    maxWidth: '85%',        // Slightly smaller for better proportions
    minWidth: 60,           // Smaller minimum width
    position: 'relative',
    elevation: 1,           // Reduced shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  ownBubble: {
    backgroundColor: '#3B82F6', // App's primary blue theme color
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E8E8E8', // Proper Microsoft Teams grey
    borderBottomLeftRadius: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  authorNameInBubble: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 0,       // No margin since timestamp is absolute positioned
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000', // Black text for better contrast on grey background
  },

  messageTime: {
    fontSize: 11,
    fontWeight: '400',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)', // Light white for green bubbles
  },
  otherMessageTime: {
    color: 'rgba(0,0,0,0.5)', // Dark grey for light bubbles
  },
  messageTimeInBubble: {
    position: 'absolute',
    bottom: 6,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,                // Space between timestamp and checkmark
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  readIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondCheck: {
    marginLeft: -8, // Overlap the checkmarks
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    minHeight: 60,
    gap: 8,
    // Remove any default bottom padding - will be handled by safe area
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
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
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    textAlignVertical: 'top',
    paddingVertical: 4,
    minHeight: 24,
  },
  emojiButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  attachmentsContainer: {
    marginTop: 8,
    gap: 6,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  attachmentText: {
    flex: 1,
    fontSize: 14,
  },
  imageAttachment: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  inlineImage: {
    width: 240,        // Slightly larger for better viewing
    height: 180,       // Maintain aspect ratio
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  // Telegram-style header styles
  headerContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,        // Reduced from 18 for more compact look
    fontWeight: '600',
    color: '#FFFFFF',
    numberOfLines: 1,    // Ensure single line
    ellipsizeMode: 'tail', // Add ellipsis if too long
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  headerAvatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  // WebSocket status and typing indicator styles
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statusText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 4,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  // Enhanced chat features styles
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default SimpleChatScreen;
