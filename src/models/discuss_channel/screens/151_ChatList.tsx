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
  Animated,
  Image,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// Conditional imports to prevent white screen if packages are missing
let FileSystem: any;
let MediaLibrary: any;
let Sharing: any;

try {
  FileSystem = require('expo-file-system');
  MediaLibrary = require('expo-media-library');
  Sharing = require('expo-sharing');
} catch (error) {
  console.warn('Some expo packages not available:', error);
}
import { databaseService } from '../../base/services/BaseDatabaseService';
import { syncService } from '../../base/services/BaseSyncService';
import { authService } from '../../base/services/BaseAuthService';
import { ODOO_CONFIG } from '../../../config/odoo';
import chatService, { ChatChannel, ChatMessage, TypingUser } from '../services/ChatService';
import { channelMemberService } from '../services/ChannelMemberService';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import { useNavigation } from '@react-navigation/native';
import { MessageBubble, MentionPicker } from '../../base/components';
import { ChannelMembersModal } from '../components';
import ScreenBadge from '../../../components/ScreenBadge';
import attachmentUploadService, { AttachmentUpload, UploadProgress } from '../../base/services/BC-S008_AttachmentUploadService';
import { callService } from '../../base/services/BC-S010_CallService';
import webRTCSignalingTestService from '../../base/services/BC-S013_WebRTCSignalingTest';
import realWebRTCService from '../../base/services/BC-S014_RealWebRTCService';
import webRTCDetector from '../../base/services/BC-S015_WebRTCDetector';
import IncomingCallModal from '../../base/components/BC-C009_IncomingCallModal';
import { longpollingService } from '../../base/services/BaseLongpollingService';
import webRTCService, { WebRTCCall } from '../services/WebRTCService';
import { IncomingWebRTCCallModal } from '../components/IncomingWebRTCCallModal';

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
  const { showNavigationDrawer } = useAppNavigation();
  const navigation = useNavigation();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [allChannels, setAllChannels] = useState<ChatChannel[]>([]); // Store all channels
  const [showClosedChannels, setShowClosedChannels] = useState(false); // Toggle for closed channels
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingFresh, setLoadingFresh] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallOffer, setIncomingCallOffer] = useState(null);
  const [showWebRTCCallModal, setShowWebRTCCallModal] = useState(false);
  const [incomingWebRTCCall, setIncomingWebRTCCall] = useState<WebRTCCall | null>(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const [selectedImageName, setSelectedImageName] = useState<string>('');

  // Use refs to access current values in event listeners
  const selectedChannelRef = useRef<ChatChannel | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Update refs when state changes
  useEffect(() => {
    selectedChannelRef.current = selectedChannel;
  }, [selectedChannel]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Re-filter channels when toggle state changes
  useEffect(() => {
    if (allChannels.length > 0) {
      filterChannelsByFoldState(allChannels).then(filteredChannels => {
        setChannels(filteredChannels);
      });
    }
  }, [showClosedChannels]);

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    initializeChat();
    setupChatListeners();

    return () => {
      // Cleanup ChatService listeners
      chatService.off('channelsLoaded', handleChannelsLoaded);
      chatService.off('messagesLoaded', handleMessagesLoaded);
      chatService.off('newMessages', handleNewMessages);
      chatService.off('connectionChanged', handleConnectionChanged);
      chatService.off('typingChanged', handleTypingChanged);

      // Cleanup CallService listeners
      callService.off('incomingCall', handleIncomingCall);
      callService.off('showIncomingCallModal', handleShowIncomingCallModal);
      callService.off('callStarted', handleCallStarted);
      callService.off('callAnswered', handleCallStarted);

      // Cleanup other listeners
      chatService.off('callInvitation', () => {});
    };
  }, []);

  const initializeChat = async () => {
    try {
      setLoading(true);
      const success = await chatService.initialize();
      if (success) {
        // Initialize call service
        await callService.initialize();

        const loadedChannels = chatService.getChannels();
        setChannels(loadedChannels);

        // AUTO-UNFOLD: Check for closed channels and unfold them automatically
        const closedChannels = loadedChannels.filter(ch => ch.fold_state === 'closed');
        if (closedChannels.length > 0) {
          console.log(`📱 🔧 Auto-unfolding ${closedChannels.length} closed channels...`);
          try {
            await chatService.unfoldAllClosedChannels();
            console.log(`📱 ✅ Auto-unfold completed`);
          } catch (error) {
            console.warn(`📱 ⚠️ Auto-unfold failed:`, error);
          }
        }

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

    // Setup call listeners with debugging
    const handleIncomingCallDebug = (callData: any) => {
      console.log('📞 INCOMING CALL received in UI:', callData);
      handleIncomingCall(callData);
    };

    callService.on('incomingCall', handleIncomingCallDebug);
    callService.on('showIncomingCallModal', handleShowIncomingCallModal);
    callService.on('callStarted', handleCallStarted);
    callService.on('callAnswered', handleCallStarted); // Handle answered calls the same way

    // REMOVED: Direct longpolling listener to prevent duplicate processing
    // The ChatService already handles longpolling messages, no need to listen here too

    // DISABLED: Automatic call invitation handling from chat messages
    // This was causing unwanted calls when opening chat threads with call history
    const handleChatCallInvitation = (invitation: any) => {
      console.log('📞 CALL INVITATION from chat message (DISABLED):', invitation);
      // Don't automatically handle call invitations from chat messages
      // Calls should only be initiated by explicit user action (pressing call buttons)
    };

    // Keep the listener for debugging but don't process invitations
    chatService.on('callInvitation', handleChatCallInvitation);

    // Setup WebRTC listeners
    webRTCService.on('incomingCall', (call: WebRTCCall) => {
      console.log('📞 Incoming WebRTC call:', call);
      setIncomingWebRTCCall(call);
      setShowWebRTCCallModal(true);
    });

    // Debug info updater
    const debugInterval = setInterval(() => {
      const chatStatus = chatService.getStatus();
      const longpollingStatus = longpollingService.getStatus();
      const callStatus = callService.getStatus();

      setDebugInfo(`
📡 Longpolling: ${longpollingStatus.isActive ? 'Active' : 'Inactive'}
📱 Channels: ${longpollingStatus.channelCount}
💬 Chat: ${chatStatus.isInitialized ? 'Ready' : 'Not Ready'}
📞 Calls: ${callStatus.isInitialized ? 'Ready' : 'Not Ready'}
      `.trim());
    }, 2000);

    // REMOVED: Individual message listener to prevent duplicates
    // The 'newMessages' listener below handles all message updates

    chatService.on('messagesUpdated', ({ channelId }) => {
      console.log(`🔄 Messages updated event for channel ${channelId}`);
      console.log(`🔄 Current selected channel: ${selectedChannelRef.current?.id}`);

      if (selectedChannelRef.current?.id === channelId) {
        // Only reload if we don't have messages or there's a significant difference
        const currentMessages = chatService.getChannelMessages(channelId);
        const currentUIMessages = messagesRef.current;

        console.log(`🔄 Service has ${currentMessages.length} messages, UI has ${currentUIMessages.length}`);

        // Only update if there's a significant difference (more than 1 message difference)
        // This prevents duplication from rapid updates
        if (Math.abs(currentMessages.length - currentUIMessages.length) > 1) {
          console.log(`🔄 Significant difference detected, updating UI with ${currentMessages.length} messages`);
          setMessages([...currentMessages]);
          setTimeout(scrollToBottom, 100);
        } else {
          console.log(`🔄 Minor difference, letting individual message events handle updates`);
        }
      }
    });
  };

  // Filter channels based on fold state
  const filterChannelsByFoldState = async (channelsToFilter: ChatChannel[]): Promise<ChatChannel[]> => {
    if (showClosedChannels) {
      // Show all channels
      return channelsToFilter;
    }

    try {
      // Get current user's channel memberships to check fold states
      const memberships = await channelMemberService.getCurrentUserMemberships();
      const closedChannelIds = new Set(
        memberships
          .filter(m => m.fold_state === 'closed')
          .map(m => m.channel_id)
      );

      // Filter out closed channels
      const visibleChannels = channelsToFilter.filter(channel => !closedChannelIds.has(channel.id));

      const hiddenCount = channelsToFilter.length - visibleChannels.length;
      if (hiddenCount > 0) {
        console.log(`📱 🔒 Hiding ${hiddenCount} closed channels (${visibleChannels.length} visible)`);
      }

      return visibleChannels;
    } catch (error) {
      console.warn('Failed to filter channels by fold state:', error);
      // If filtering fails, show all channels
      return channelsToFilter;
    }
  };

  const handleChannelsLoaded = async (loadedChannels: ChatChannel[]) => {
    console.log(`📱 ✅ Loaded ${loadedChannels.length} channels, filtering by fold state...`);

    // Store all channels
    setAllChannels(loadedChannels);

    // Filter channels based on fold state
    const filteredChannels = await filterChannelsByFoldState(loadedChannels);

    // If this is the first load (cache), hide main loading but show background refresh
    if (loading) {
      // First load: Cache data - display immediately
      setChannels(filteredChannels);
      setLoading(false);
      setLoadingFresh(true);
      console.log('📱 Cache loaded - UI ready, fetching fresh data...');
    } else {
      // Fresh data: Only update if significantly different to prevent flickering
      const currentChannels = channels;
      const isDifferent = filteredChannels.length !== currentChannels.length ||
                          filteredChannels.some(newCh => !currentChannels.find(oldCh => oldCh.id === newCh.id));

      if (isDifferent) {
        console.log(`📱 Fresh data different (${currentChannels.length} -> ${filteredChannels.length}), updating...`);
        setChannels(filteredChannels);
      } else {
        console.log('📱 Fresh data same as cache, no update needed');
      }
      
      setLoadingFresh(false);
      console.log('📱 Fresh data loaded - all done!');
    }
    // Don't auto-select - let user choose from list
  };

  const handleMessagesLoaded = ({ channelId, messages: loadedMessages }: { channelId: number; messages: ChatMessage[] }) => {
    console.log(`📨 handleMessagesLoaded for channel ${channelId}, selected: ${selectedChannelRef.current?.id}`);
    if (selectedChannelRef.current?.id === channelId) {
      console.log(`📨 Setting ${loadedMessages.length} loaded messages`);
      setMessages(loadedMessages);

      // Only auto-scroll if not during initial load
      if (!isInitialLoad) {
        scrollToBottom();
      }
    }
  };

  const handleNewMessages = ({ channelId, messages: newMessages }: { channelId: number; messages: ChatMessage[] }) => {
    console.log(`📨 handleNewMessages for channel ${channelId}, selected: ${selectedChannelRef.current?.id}`);

    // Handle messages for the selected channel OR if no channel is selected but we have messages for a channel
    const shouldProcessMessages = selectedChannelRef.current?.id === channelId ||
                                 (!selectedChannelRef.current && channels.some(c => c.id === channelId));

    if (shouldProcessMessages) {
      console.log(`🔄 ChatScreen received ${newMessages.length} new messages for channel ${channelId}`);

      // If no channel is selected but we're getting messages, auto-select the channel
      if (!selectedChannelRef.current && channels.length > 0) {
        const channel = channels.find(c => c.id === channelId);
        if (channel) {
          console.log(`🔄 Auto-selecting channel ${channelId} due to new messages`);
          setSelectedChannel(channel);
        }
      }

      setMessages(prev => {
        // IMMEDIATE OPTIMISTIC CLEANUP: Remove optimistic messages that match incoming real messages
        let filteredPrev = prev;

        for (const newMsg of newMessages) {
          // Remove any optimistic messages that match this real message
          const beforeCount = filteredPrev.length;
          filteredPrev = filteredPrev.filter(msg => {
            const isOptimistic = msg.id.toString().startsWith('temp_') || msg.id < 0;
            if (!isOptimistic) return true;

            // Check if this optimistic message matches the incoming real message
            const cleanOptimisticBody = msg.body.replace(/<[^>]*>/g, '').trim();
            const cleanRealBody = newMsg.body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]*>/g, '').trim();
            const sameContent = cleanOptimisticBody === cleanRealBody;

            if (sameContent) {
              console.log(`🗑️ UI: Immediately removing optimistic message "${cleanOptimisticBody}" for real message ${newMsg.id}`);
              return false;
            }
            return true;
          });

          if (filteredPrev.length !== beforeCount) {
            console.log(`🧹 UI: Removed ${beforeCount - filteredPrev.length} optimistic messages`);
          }
        }

        // Check for duplicate messages by ID
        const existingIds = new Set(filteredPrev.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

        if (uniqueNewMessages.length > 0) {
          console.log(`🔄 Adding ${uniqueNewMessages.length} unique new messages to UI`);
          const updated = [...filteredPrev, ...uniqueNewMessages];

          // Sort by date to maintain proper order
          updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // Limit to last 25 messages to prevent memory issues and respect UI limit
          const limitedMessages = updated.slice(-25);
          if (limitedMessages.length < updated.length) {
            console.log(`📨 Trimmed messages to last 25 (was ${updated.length})`);
          }

          // Only auto-scroll if not during initial load
          if (!isInitialLoad) {
            setTimeout(scrollToBottom, 100);
          }
          return limitedMessages;
        } else {
          console.log(`🔄 No new unique messages to add (${newMessages.length} messages were duplicates)`);
          // Still return the filtered messages (with optimistic ones removed)
          return filteredPrev;
        }
        return prev;
      });
    }
  };

  const handleConnectionChanged = (status: 'connected' | 'disconnected') => {
    setConnectionStatus(status);
  };

  const handleTypingChanged = ({ channelId, typingUsers: users }: { channelId: number; typingUsers: TypingUser[] }) => {
    if (selectedChannelRef.current?.id === channelId) {
      setTypingUsers(users);
    }
  };

  const selectChannel = async (channel: ChatChannel) => {
    // Save current messages as last rendered state before switching
    if (selectedChannelRef.current && messages.length > 0) {
      chatService.saveLastRenderedMessages(selectedChannelRef.current.id, messages);
      console.log('💾 Saved last rendered state for previous channel');
    }

    setSelectedChannel(channel);
    setTypingUsers([]);
    setHasMoreMessages(true);
    setShowLoadMore(false);

    // Subscribe to longpolling for real-time updates
    chatService.subscribeToChannel(channel.id);

    // INSTANT LOADING: Check for last rendered messages first
    const lastRendered = chatService.getLastRenderedMessages(channel.id);
    console.log(`📨 🔍 Checking for last rendered messages for channel ${channel.id}: found ${lastRendered.length}`);

    if (lastRendered.length > 0) {
      console.log('⚡ Displaying', lastRendered.length, 'last rendered messages INSTANTLY');
      setMessages(lastRendered);

      // NO SCROLLING ANIMATION - just set position instantly
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);

      console.log('⚡ INSTANT LOAD COMPLETE - messages displayed from cache');

      // Load fresh data in background silently (don't update UI immediately)
      setTimeout(async () => {
        try {
          console.log('🔄 Loading fresh data in background...');
          const freshMessages = await chatService.loadChannelMessages(channel.id, 25, 0);
          const limitedMessages = freshMessages.slice(-25);
          console.log('🔄 Background refresh complete, updating UI silently');
          setMessages(limitedMessages);

          // Check if we have fewer than 25 messages
          if (freshMessages.length < 25) {
            setHasMoreMessages(false);
          }
        } catch (error) {
          console.warn('⚠️ Background refresh failed:', error);
        }
      }, 1000); // Delay background refresh

      return;
    } else {
      console.log('📨 ⚠️ No last rendered messages found - proceeding with fresh load');
    }

    // Fresh load (first time or no cache)
    setMessages([]);
    setIsInitialLoad(true);

    const loadedMessages = await chatService.loadChannelMessages(channel.id, 25, 0);
    const limitedMessages = loadedMessages.slice(-25);
    setMessages(limitedMessages);

    // Check if we have fewer than 25 messages, meaning no more to load
    if (loadedMessages.length < 25) {
      setHasMoreMessages(false);
    }

    console.log(`📨 Loaded ${limitedMessages.length} messages for channel ${channel.id} (fresh load)`);

    // Mark initial load as complete and scroll to bottom once
    setIsInitialLoad(false);
    setTimeout(() => {
      scrollToBottom();
      console.log(`📨 Initial load complete - scrolled to bottom`);
    }, 100);
  };

  const loadMoreMessages = async () => {
    if (!selectedChannel || loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    try {
      const currentOffset = messages.length;
      const olderMessages = await chatService.loadChannelMessages(selectedChannel.id, 25, currentOffset);

      if (olderMessages.length > 0) {
        // Prepend older messages to existing ones
        setMessages(prev => [...olderMessages, ...prev]);

        // Check if we got fewer than 25 messages, meaning no more to load
        if (olderMessages.length < 25) {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
      setShowLoadMore(false); // Hide button after loading
    }
  };

  // Handle scroll events to show/hide load more button
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const scrollY = contentOffset.y;

    // Show load more button when user scrolls near the top (within 100px)
    const nearTop = scrollY < 100;

    if (nearTop && hasMoreMessages && !loadingMore && messages.length >= 25) {
      setShowLoadMore(true);
    } else {
      setShowLoadMore(false);
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

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    // Focus back to text input
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleAttachmentOptions = () => {
    setShowAttachmentOptions(!showAttachmentOptions);
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
      setUploadProgress({ progress: 0, bytesUploaded: 0, totalBytes: 0, status: 'uploading' });

      // Get file info
      const fileInfo = await attachmentUploadService.getFileInfo(asset.uri);

      // Create attachment upload object
      const attachment: AttachmentUpload = {
        uri: asset.uri,
        name: asset.name || `attachment_${Date.now()}`,
        type: asset.mimeType || asset.type || attachmentUploadService.getMimeTypeFromExtension(asset.name || ''),
        size: fileInfo.size
      };

      // Validate file
      const validation = attachmentUploadService.validateFile(attachment);
      if (!validation.valid) {
        Alert.alert('Upload Error', validation.error || 'Invalid file');
        return;
      }

      console.log(`📤 Uploading attachment: ${attachment.name} (${attachmentUploadService.formatFileSize(attachment.size || 0)})`);

      // Upload attachment with progress
      const success = await attachmentUploadService.sendMessageWithAttachment(
        selectedChannel.id,
        '', // Empty message text, let the service create the attachment message
        attachment,
        (progress) => {
          setUploadProgress(progress);
          console.log(`📤 Upload progress: ${Math.round(progress.progress * 100)}%`);
        }
      );

      if (success) {
        console.log('✅ Attachment uploaded and message sent successfully');
        setUploadProgress({ progress: 1, bytesUploaded: attachment.size || 0, totalBytes: attachment.size || 0, status: 'completed' });

        // Refresh messages to show the new attachment message
        if (selectedChannel) {
          const refreshedMessages = await chatService.loadChannelMessages(selectedChannel.id, 25);
          setMessages(refreshedMessages);
        }

        scrollToBottom();

        // Clear progress after a short delay
        setTimeout(() => setUploadProgress(null), 2000);
      } else {
        Alert.alert('Error', 'Failed to upload attachment');
        setUploadProgress(null);
      }
    } catch (error) {
      console.error('❌ Error uploading attachment:', error);
      Alert.alert('Upload Error', 'Failed to upload attachment. Please try again.');
      setUploadProgress(null);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAttachmentView = (attachmentId: number, filename: string, attachment: any) => {
    console.log('📎 Attachment pressed:', { attachmentId, filename, attachment });

    // Handle different attachment types
    if (attachment?.mimetype?.startsWith('image/')) {
      // Open image in full screen viewer
      const imageUri = attachment.url || attachment.uri || `${ODOO_CONFIG.url}/web/content/${attachmentId}`;
      setSelectedImageUri(imageUri);
      setSelectedImageName(filename);
      setShowImageViewer(true);
    } else {
      // Handle other file types - show download option
      Alert.alert(
        'Attachment',
        `${filename}\n\nWhat would you like to do?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download', onPress: () => downloadAttachment(attachmentId, filename, attachment) }
        ]
      );
    }
  };

  const handleAttachmentLongPress = (attachmentId: number, filename: string, attachment: any) => {
    console.log('📎 Attachment long pressed:', { attachmentId, filename, attachment });

    // Simplified - just show basic info for now
    Alert.alert('Attachment', `${filename}\n\nDownload feature temporarily disabled.`);
  };

  const downloadAttachment = async (attachmentId: number, filename: string, attachment: any) => {
    try {
      console.log('📥 Starting download for:', filename);

      // Check if required packages are available
      if (!FileSystem || !MediaLibrary || !Sharing) {
        Alert.alert('Feature not available', 'Download functionality is not available in this build.');
        return;
      }

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Media library permission is required to save files.');
        return;
      }

      // Get attachment URL
      const attachmentUrl = attachment.url || attachment.uri || `${ODOO_CONFIG.url}/web/content/${attachmentId}`;

      // Download to cache directory first
      const downloadResult = await FileSystem.downloadAsync(
        attachmentUrl,
        FileSystem.documentDirectory + filename
      );

      if (downloadResult.status === 200) {
        // For images, save to photo library
        if (attachment?.mimetype?.startsWith('image/')) {
          await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
          Alert.alert('Success', `Image saved to photo library: ${filename}`);
        } else {
          // For other files, use sharing
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri);
          } else {
            Alert.alert('Success', `File downloaded: ${filename}`);
          }
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      Alert.alert('Download Error', 'Failed to download attachment. Please try again.');
    }
  };

  // Call handlers
  const handleIncomingCall = (callOffer: any) => {
    console.log('📞 INCOMING CALL received in UI - showing modal:', callOffer);
    setIncomingCallOffer(callOffer);
    setShowIncomingCall(true);
  };

  const handleShowIncomingCallModal = (callOffer: any) => {
    setIncomingCallOffer(callOffer);
    setShowIncomingCall(true);
  };

  const handleCallStarted = (callSession: any) => {
    // Navigate to call screen - serialize dates to avoid navigation warnings
    const serializedCallSession = {
      ...callSession,
      startTime: callSession.startTime?.getTime() || Date.now(),
      endTime: callSession.endTime?.getTime() || null,
    };

    navigation.navigate('CallScreen', { callSession: serializedCallSession });
  };

  const handleAnswerCall = async () => {
    try {
      console.log('📞 Answering call:', incomingCallOffer);
      setShowIncomingCall(false);

      if (incomingCallOffer) {
        // Actually answer the call through CallService
        const success = await callService.answerCall(incomingCallOffer);
        if (success) {
          console.log('✅ Call answered successfully');
          // handleCallStarted will be triggered by the callAnswered event
        } else {
          console.error('❌ Failed to answer call');
          setIncomingCallOffer(null);
        }
      }
    } catch (error) {
      console.error('❌ Error answering call:', error);
      setIncomingCallOffer(null);
    }
  };

  const handleDeclineCall = () => {
    setShowIncomingCall(false);
    setIncomingCallOffer(null);
  };

  // WebRTC call handlers
  const handleAcceptWebRTCCall = async () => {
    if (!incomingWebRTCCall) return;

    try {
      setShowWebRTCCallModal(false);

      // Navigate to video call screen
      navigation.navigate('VideoCallScreen', {
        callId: incomingWebRTCCall.callId,
        isIncoming: true
      });

      // Answer the call
      await webRTCService.answerCall(incomingWebRTCCall.callId);

    } catch (error) {
      console.error('Failed to accept WebRTC call:', error);
      Alert.alert('Call Failed', 'Unable to answer the call.');
    }
  };

  const handleDeclineWebRTCCall = async () => {
    if (!incomingWebRTCCall) return;

    try {
      await webRTCService.endCall();
      setShowWebRTCCallModal(false);
      setIncomingWebRTCCall(null);
    } catch (error) {
      console.error('Failed to decline WebRTC call:', error);
      setShowWebRTCCallModal(false);
      setIncomingWebRTCCall(null);
    }
  };

  const handleStartAudioCall = async () => {
    if (!selectedChannel) {
      Alert.alert('No Channel Selected', 'Please select a channel to start a call.');
      return;
    }

    console.log(`📞 User initiated audio call for channel ${selectedChannel.id}`);

    try {
      const success = await callService.startCall(selectedChannel.id, selectedChannel.name, false);
      if (!success) {
        Alert.alert('Call Failed', 'Unable to start audio call. Please try again.');
      }
    } catch (error) {
      console.error('Audio call failed:', error);
      Alert.alert('Call Failed', 'Unable to start audio call. Please check your connection.');
    }
  };

  const handleStartVideoCall = async () => {
    if (!selectedChannel) {
      Alert.alert('No Channel Selected', 'Please select a channel to start a video call.');
      return;
    }

    console.log(`📞 User initiated video call for channel ${selectedChannel.id}`);

    try {
      // Try WebRTC first if available
      if (webRTCService.isAvailable()) {
        console.log('📞 Starting WebRTC video call');
        const callId = await callService.startWebRTCCall(selectedChannel.id, selectedChannel.name, 'video');

        // Navigate to video call screen
        navigation.navigate('VideoCallScreen' as never, {
          callId,
          isIncoming: false
        } as never);
      } else {
        // Fallback to chat-based calling
        console.log('📞 WebRTC not available, using chat-based calling');
        const success = await callService.startCall(selectedChannel.id, selectedChannel.name, true);
        if (!success) {
          Alert.alert('Call Failed', 'Unable to start video call. Please try again.');
        }
      }
    } catch (error) {
      console.error('Video call failed:', error);
      Alert.alert('Call Failed', 'Unable to start video call. Please check your connection.');
    }
  };

  // Phase 2: Test WebRTC Signaling (Expo Go compatible)
  const handleTestWebRTCSignaling = async () => {
    if (!selectedChannel) {
      Alert.alert('No Channel Selected', 'Please select a channel to test signaling.');
      return;
    }

    console.log(`🧪 Testing WebRTC signaling for channel ${selectedChannel.id}`);

    try {
      // Use a mock session ID for testing
      const mockSessionId = Date.now();
      const success = await webRTCSignalingTestService.runPhase2Test(selectedChannel.id, mockSessionId);

      if (success) {
        console.log('✅ Phase 2: WebRTC signaling test completed');
        Alert.alert('Phase 2 Success', 'WebRTC signaling test completed! Check the chat for signaling messages.');
      } else {
        console.log('❌ Phase 2: WebRTC signaling test failed');
        Alert.alert('Phase 2 Failed', 'WebRTC signaling test failed. Check the logs.');
      }
    } catch (error) {
      console.error('❌ WebRTC signaling test error:', error);
      Alert.alert('Test Error', 'WebRTC signaling test encountered an error.');
    }
  };

  // Phase 3 & 4: Test Real WebRTC with STUN servers (Development Build)
  const handleTestRealWebRTC = async () => {
    if (!selectedChannel) {
      Alert.alert('No Channel Selected', 'Please select a channel to test real WebRTC.');
      return;
    }

    console.log(`🚀 Testing real WebRTC with STUN servers for channel ${selectedChannel.id}`);

    try {
      // Use a mock session ID for testing
      const mockSessionId = Date.now();
      const callId = await realWebRTCService.startCall(selectedChannel.id, mockSessionId, 'audio');

      console.log('✅ Phase 3 & 4: Real WebRTC call started!');
      Alert.alert(
        'Phase 3 & 4 Success!',
        `Real WebRTC call started with Google STUN servers!\n\nCall ID: ${callId}\n\nCheck logs for STUN server activity and P2P connection status.`
      );

    } catch (error) {
      console.error('❌ Real WebRTC test error:', error);
      Alert.alert('WebRTC Error', `Real WebRTC test failed: ${error.message}`);
    }
  };

  // Toggle showing closed channels
  const handleToggleClosedChannels = async () => {
    try {
      const newShowClosed = !showClosedChannels;
      setShowClosedChannels(newShowClosed);

      // Re-filter channels with new setting
      const filteredChannels = await filterChannelsByFoldState(allChannels);
      setChannels(filteredChannels);

      if (newShowClosed) {
        console.log('📱 👁️ Now showing all channels (including closed)');
      } else {
        console.log('📱 🔒 Now hiding closed channels');
      }
    } catch (error) {
      console.error('Error toggling closed channels:', error);
    }
  };

  // Leave channel functionality - PERMANENT (syncs to Odoo)
  const handleLeaveChannel = async (channel: any) => {
    Alert.alert(
      'Leave Channel',
      `Are you sure you want to leave "${channel.name}"? This will remove you from the channel permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🚪 Leaving channel ${channel.id}: ${channel.name}`);

              // Step 1: Remove from Odoo server (permanent) - FIXED
              const client = chatService.getAuthenticatedClient();
              if (client) {
                try {
                  console.log('🔍 Getting current user partner ID...');
                  
                  // Get current user's partner ID with proper error handling
                  let partnerId;
                  try {
                    const authResult = await client.authenticate();
                    console.log(`👤 Current user ID: ${authResult.uid}`);
                    
                    const userData = await client.callModel('res.users', 'read', [authResult.uid], {
                      fields: ['partner_id']
                    });
                    console.log('👤 User data:', userData);
                    
                    // Handle different partner_id formats
                    if (userData && userData.length > 0) {
                      const partnerIdField = userData[0].partner_id;
                      if (Array.isArray(partnerIdField) && partnerIdField.length > 0) {
                        partnerId = partnerIdField[0];
                      } else if (typeof partnerIdField === 'number') {
                        partnerId = partnerIdField;
                      } else if (typeof partnerIdField === 'string') {
                        // Try to parse XML-RPC format
                        const match = partnerIdField.match(/<value><int>(\d+)<\/int>/);
                        if (match) {
                          partnerId = parseInt(match[1]);
                        }
                      }
                    }
                    
                    console.log(`👤 Parsed partner ID: ${partnerId}`);
                  } catch (userError) {
                    console.error('❌ Failed to get user partner ID:', userError);
                    throw userError;
                  }

                  if (!partnerId) {
                    throw new Error('Could not determine current user partner ID');
                  }

                  // Method 1: Try to leave channel using channel method (Odoo 18+)
                  try {
                    console.log(`🔄 Attempting to leave channel ${channel.id} using channel.leave method...`);
                    await client.callModel('discuss.channel', 'action_unfollow', [channel.id]);
                    console.log('✅ Successfully left channel using action_unfollow');
                  } catch (channelMethodError) {
                    console.log('⚠️ Channel method failed, trying member removal:', channelMethodError.message);
                    
                    // Method 2: Remove channel membership directly
                    try {
                      console.log(`🔍 Searching for channel membership for partner ${partnerId} in channel ${channel.id}...`);
                      const memberIds = await client.callModel('discuss.channel.member', 'search', [
                        [['channel_id', '=', channel.id], ['partner_id', '=', partnerId]]
                      ]);
                      
                      console.log(`📋 Found ${memberIds.length} memberships:`, memberIds);

                      if (memberIds.length > 0) {
                        console.log(`🗑️ Removing ${memberIds.length} channel memberships...`);
                        await client.callModel('discuss.channel.member', 'unlink', [memberIds]);
                        console.log('✅ Removed from Odoo channel membership via member removal');
                      } else {
                        console.log('⚠️ No channel membership found - user may not be a member');
                      }
                    } catch (memberError) {
                      console.error('❌ Member removal also failed:', memberError);
                      throw memberError;
                    }
                  }
                  
                } catch (odooError) {
                  console.error('❌ Failed to remove from Odoo server:', odooError);
                  Alert.alert(
                    'Server Error', 
                    `Failed to leave channel on server: ${odooError.message}\n\nThe channel will be removed locally, but you may still appear as a member on the server.`,
                    [
                      { text: 'Continue Anyway', onPress: () => {}, style: 'destructive' },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                  return; // Don't proceed with local removal if server fails
                }
              } else {
                console.warn('⚠️ No authenticated client - cannot remove from server');
                Alert.alert(
                  'Offline Mode',
                  'Cannot connect to server. The channel will be removed locally only.',
                  [
                    { text: 'Continue', onPress: () => {}, style: 'destructive' },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
                return;
              }

              // Step 2: Remove from local database
              console.log('🗑️ Removing from local database...');
              const db = databaseService.getDatabase();
              if (db) {
                try {
                  await db.runAsync('DELETE FROM discuss_channel WHERE id = ?', [channel.id]);
                  console.log('✅ Removed channel from local database');
                  
                  // Also remove related messages
                  await db.runAsync('DELETE FROM mail_message WHERE res_id = ? AND model = ?',
                    [channel.id, 'discuss.channel']);
                  console.log('✅ Removed related messages from local database');
                } catch (dbError) {
                  console.error('❌ Failed to remove from local database:', dbError);
                  // Continue anyway - UI removal is most important
                }
              }

              // Step 3: Remove from UI and internal state
              console.log('🎨 Removing from UI...');
              setChannels(prev => prev.filter(c => c.id !== channel.id));
              
              // Remove from ChatService internal state
              chatService.removeChannel(channel.id);

              // If this was the selected channel, clear selection
              if (selectedChannel?.id === channel.id) {
                setSelectedChannel(null);
                setMessages([]);
                console.log('✅ Cleared selected channel');
              }

              console.log('✅ Successfully left channel permanently');
              Alert.alert('Success', `Left channel "${channel.name}" successfully.`);

            } catch (error) {
              console.error('❌ Failed to leave channel:', error);
              Alert.alert('Error', `Failed to leave channel: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Clear all messages for dev testing - PERMANENT (syncs to Odoo)
  const handleClearAllMessages = async () => {
    if (!selectedChannel) return;

    Alert.alert(
      'Clear All Messages (DEV)',
      `⚠️ DEVELOPER TOOL ⚠️\n\nThis will PERMANENTLY delete ALL messages in "${selectedChannel.name}" from both local database AND Odoo server.\n\nThis action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CLEAR ALL',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🗑️ PERMANENT: Clearing all messages for channel ${selectedChannel.id}`);

              // Step 1: Get all message IDs (from UI and database)
              const db = databaseService.getDatabase();
              let messageIds: number[] = [];

              // Get message IDs from current UI state (these are definitely the messages we want to delete)
              const uiMessageIds = messages.map(msg => msg.id);
              console.log(`📋 Found ${uiMessageIds.length} messages in UI to delete`);

              if (db) {
                // Try multiple query patterns to find messages
                let messages: any[] = [];

                // Pattern 1: Standard res_id + model
                try {
                  messages = await db.getAllAsync(
                    'SELECT id FROM mail_message WHERE res_id = ? AND model = ?',
                    [selectedChannel.id, 'discuss.channel']
                  );
                  console.log(`📋 Pattern 1: Found ${messages.length} messages`);
                } catch (error) {
                  console.log('⚠️ Pattern 1 failed:', error);
                }

                // Pattern 2: Just res_id (if model field is missing)
                if (messages.length === 0) {
                  try {
                    messages = await db.getAllAsync(
                      'SELECT id FROM mail_message WHERE res_id = ?',
                      [selectedChannel.id]
                    );
                    console.log(`📋 Pattern 2: Found ${messages.length} messages`);
                  } catch (error) {
                    console.log('⚠️ Pattern 2 failed:', error);
                  }
                }

                // Pattern 3: Check all messages for this channel (debug)
                if (messages.length === 0) {
                  try {
                    const allMessages = await db.getAllAsync(
                      'SELECT id, res_id, model FROM mail_message LIMIT 10'
                    );
                    console.log('📋 Sample messages in database:', allMessages);

                    // Check what columns exist in the table
                    const tableInfo = await db.getAllAsync(
                      'PRAGMA table_info(mail_message)'
                    );
                    console.log('📋 mail_message table columns:', tableInfo.map((col: any) => col.name));

                    // Try to find messages for discuss.channel model with our channel ID
                    messages = await db.getAllAsync(
                      'SELECT id FROM mail_message WHERE model = ? AND res_id = ?',
                      ['discuss.channel', selectedChannel.id.toString()]
                    );
                    console.log(`📋 Pattern 3: Found ${messages.length} messages for discuss.channel`);
                  } catch (error) {
                    console.log('⚠️ Pattern 3 failed:', error);
                  }
                }

                const dbMessageIds = messages.map((msg: any) => msg.id);
                console.log(`📋 Found ${dbMessageIds.length} messages in database`);

                // Combine UI and database message IDs
                messageIds = [...new Set([...uiMessageIds, ...dbMessageIds])];
                console.log(`📋 Total unique message IDs to delete: ${messageIds.length}`);
              } else {
                // If no database access, use UI message IDs
                messageIds = uiMessageIds;
                console.log(`📋 Using ${messageIds.length} UI message IDs (no database access)`);
              }

              // Step 2: Delete from Odoo server (permanent)
              const client = chatService.getAuthenticatedClient();
              if (client && messageIds.length > 0) {
                try {
                  console.log(`🌐 Deleting ${messageIds.length} messages from Odoo server...`);
                  await client.callModel('mail.message', 'unlink', [messageIds]);
                  console.log('✅ Messages deleted from Odoo server');
                } catch (odooError: any) {
                  console.log('⚠️ Could not delete from Odoo (offline?):', odooError.message);
                }
              } else if (messageIds.length === 0) {
                console.log('⚠️ No message IDs found to delete from Odoo');
              }

              // Step 3: Delete from local database (use correct field types)
              if (db) {
                // Delete using the correct field types based on what we found
                let deletedCount = 0;

                // Pattern 1: Standard model + res_id (string)
                try {
                  const result1 = await db.runAsync(
                    'DELETE FROM mail_message WHERE model = ? AND res_id = ?',
                    ['discuss.channel', selectedChannel.id.toString()]
                  );
                  deletedCount += result1.changes || 0;
                  console.log(`🗑️ Deleted ${result1.changes || 0} messages (pattern 1)`);
                } catch (error) {
                  console.log('⚠️ Delete pattern 1 failed:', error);
                }

                // Pattern 2: res_id as integer
                try {
                  const result2 = await db.runAsync(
                    'DELETE FROM mail_message WHERE model = ? AND res_id = ?',
                    ['discuss.channel', selectedChannel.id]
                  );
                  deletedCount += result2.changes || 0;
                  console.log(`🗑️ Deleted ${result2.changes || 0} messages (pattern 2)`);
                } catch (error) {
                  console.log('⚠️ Delete pattern 2 failed:', error);
                }

                console.log(`✅ Total deleted ${deletedCount} messages from local database`);
              }

              // Step 4: Clear messages from UI
              setMessages([]);

              console.log('✅ All messages permanently cleared');
              Alert.alert('Success', `Permanently deleted ${messageIds.length} messages from both local database and Odoo server.`);

            } catch (error) {
              console.error('❌ Failed to clear messages:', error);
              Alert.alert('Error', 'Failed to clear messages. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const previousMessage = index > 0 ? messages[index - 1] : undefined;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;

    return (
      <MessageBubble
        message={item}
        previousMessage={previousMessage}
        nextMessage={nextMessage}
        currentUserId={currentUserId || undefined}
        currentUserPartnerId={chatService.getCurrentUserPartnerId() || undefined}
        onLongPress={() => {
          // Handle long press for message actions
          Alert.alert(
            'Message Options',
            'What would you like to do with this message?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Copy Text',
                onPress: () => {
                  // Copy message text to clipboard
                  console.log('Copy message text:', item.body);
                }
              },
              {
                text: 'Reply',
                onPress: () => {
                  // Set reply context
                  console.log('Reply to message:', item.id);
                }
              },
            ]
          );
        }}
        onAttachmentPress={handleAttachmentView}
        onAttachmentLongPress={handleAttachmentLongPress}
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

  if (loading && channels.length === 0) {
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={151} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (selectedChannel) {
              // Unsubscribe from longpolling when going back to list
              console.log(`📡 Unsubscribing from channel ${selectedChannel.id}`);
              chatService.unsubscribeFromChannel(selectedChannel.id);
              setSelectedChannel(null);
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>
              {selectedChannel ? selectedChannel.name : 'Chat'}
            </Text>
          </View>
          {selectedChannel && selectedChannel.channel_type === 'channel' && (
            <Text style={styles.headerSubtitle}>
              {selectedChannel.member_count || 0} members
            </Text>
          )}
          {/* WebRTC Mode Indicator */}
          <Text style={styles.webrtcModeIndicator}>
            {webRTCDetector.getModeDescription()}
          </Text>
        </View>

        {/* Toggle closed channels button - only show when no channel is selected */}
        {!selectedChannel && (
          <TouchableOpacity
            style={[styles.callButton, { backgroundColor: showClosedChannels ? '#FF9500' : '#34C759' }]}
            onPress={handleToggleClosedChannels}
          >
            <MaterialIcons
              name={showClosedChannels ? "visibility-off" : "visibility"}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>
        )}

        {/* Call buttons - only show when a channel is selected */}
        {selectedChannel && (
          <View style={styles.callButtons}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleStartAudioCall}
            >
              <MaterialIcons name="call" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleStartVideoCall}
            >
              <MaterialIcons name="videocam" size={24} color="#007AFF" />
            </TouchableOpacity>
            {/* Phase 2: WebRTC Signaling Test (always available) */}
            <TouchableOpacity
              style={[styles.callButton, { backgroundColor: '#FF9500' }]}
              onPress={handleTestWebRTCSignaling}
            >
              <MaterialIcons name="science" size={20} color="#FFF" />
            </TouchableOpacity>

            {/* Phase 3 & 4: Real WebRTC Test (only in development builds) */}
            {webRTCDetector.isAvailable() && (
              <TouchableOpacity
                style={[styles.callButton, { backgroundColor: '#34C759' }]}
                onPress={handleTestRealWebRTC}
              >
                <MaterialIcons name="rocket-launch" size={20} color="#FFF" />
              </TouchableOpacity>
            )}

            {/* Dev: Clear all messages */}
            <TouchableOpacity
              style={[styles.callButton, { backgroundColor: '#FF3B30' }]}
              onPress={handleClearAllMessages}
            >
              <MaterialIcons name="delete-sweep" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.profileButton}
          onPress={showNavigationDrawer}
        >
          <MaterialIcons name="account-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Chat List - Show all conversations when no channel is selected */}
      {!selectedChannel ? (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.leaveChannelButton}
                  onPress={() => handleLeaveChannel(item)}
                >
                  <MaterialIcons name="exit-to-app" size={24} color="#FFF" />
                  <Text style={styles.leaveChannelText}>Leave</Text>
                </TouchableOpacity>
              )}
            >
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
            </Swipeable>
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


          {/* Load More Messages Button - Only show when scrolled to top */}
          {showLoadMore && (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMoreMessages}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More Messages</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

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
              keyExtractor={(item) => `message-${item.id || Math.random()}`}
              renderItem={renderMessage}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onScroll={handleScroll}
              scrollEventThrottle={16}
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

          {/* Attachment Options Overlay */}
          {showAttachmentOptions && (
            <TouchableOpacity
              style={styles.attachmentOptionsOverlay}
              activeOpacity={1}
              onPress={() => setShowAttachmentOptions(false)}
            >
              <TouchableOpacity
                style={styles.attachmentOptionsContainer}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <TouchableOpacity
                  style={styles.attachmentOption}
                  onPress={() => {
                    setShowAttachmentOptions(false);
                    takePhoto();
                  }}
                >
                  <MaterialIcons name="camera-alt" size={24} color="#007AFF" />
                  <Text style={styles.attachmentOptionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.attachmentOption}
                  onPress={() => {
                    setShowAttachmentOptions(false);
                    pickImage();
                  }}
                >
                  <MaterialIcons name="photo-library" size={24} color="#007AFF" />
                  <Text style={styles.attachmentOptionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.attachmentOption}
                  onPress={() => {
                    setShowAttachmentOptions(false);
                    pickDocument();
                  }}
                >
                  <MaterialIcons name="insert-drive-file" size={24} color="#007AFF" />
                  <Text style={styles.attachmentOptionText}>Document</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <TouchableOpacity
              style={styles.emojiPickerOverlay}
              activeOpacity={1}
              onPress={() => setShowEmojiPicker(false)}
            >
              <TouchableOpacity
                style={styles.emojiPickerContainer}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.emojiGrid}>
                  {['😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🙏', '💪', '✨', '⭐'].map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.emojiButton}
                      onPress={() => handleEmojiSelect(emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Upload Progress */}
          {uploadProgress && (
            <View style={styles.uploadProgressContainer}>
              <View style={styles.uploadProgressBar}>
                <View
                  style={[
                    styles.uploadProgressFill,
                    { width: `${uploadProgress.progress * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.uploadProgressText}>
                {uploadProgress.status === 'uploading'
                  ? `Uploading... ${Math.round(uploadProgress.progress * 100)}%`
                  : uploadProgress.status === 'completed'
                  ? 'Upload complete!'
                  : 'Upload failed'
                }
              </Text>
            </View>
          )}

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={handleAttachmentOptions}
              disabled={sending}
            >
              <MaterialIcons name="add" size={20} color="#007AFF" />
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
              style={styles.emojiInputButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={sending}
            >
              <MaterialIcons name="emoji-emotions" size={20} color="#007AFF" />
            </TouchableOpacity>
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

      {/* Incoming Call Modal */}
      <IncomingCallModal
        visible={showIncomingCall}
        callOffer={incomingCallOffer}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
        onClose={() => setShowIncomingCall(false)}
      />

      {/* Incoming WebRTC Call Modal */}
      <IncomingWebRTCCallModal
        visible={showWebRTCCallModal}
        call={incomingWebRTCCall}
        onAccept={handleAcceptWebRTCCall}
        onDecline={handleDeclineWebRTCCall}
      />

      {/* Full Screen Image Viewer Modal */}
      {showImageViewer && (
        <View style={styles.imageViewerModal}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setShowImageViewer(false)}
          >
            <MaterialIcons name="close" size={30} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageViewerDownloadButton}
            onPress={() => {
              setShowImageViewer(false);
              // Extract attachment info from the selected image
              const attachmentId = selectedImageUri.match(/\/(\d+)$/)?.[1];
              if (attachmentId) {
                downloadAttachment(
                  parseInt(attachmentId),
                  selectedImageName,
                  { mimetype: 'image/jpeg', url: selectedImageUri }
                );
              }
            }}
          >
            <MaterialIcons name="download" size={24} color="#FFF" />
          </TouchableOpacity>

          <Image
            source={{ uri: selectedImageUri }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />

          <Text style={styles.imageViewerTitle}>{selectedImageName}</Text>
        </View>
      )}
    </SafeAreaView>
    </GestureHandlerRootView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
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
  // Attachment Options Overlay
  attachmentOptionsOverlay: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 70,
  },
  attachmentOptionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'space-around',
  },
  attachmentOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    minWidth: 80,
  },
  attachmentOptionText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500',
  },

  // Upload Progress
  uploadProgressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
  },
  uploadProgressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  uploadProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Emoji Picker
  emojiPickerOverlay: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 70,
  },
  emojiPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 200,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
  },
  emojiText: {
    fontSize: 24,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4, // Reduced from 8 to 4
    paddingBottom: Platform.OS === 'ios' ? 20 : 4, // Reduced iOS padding from 34 to 20, Android from 8 to 4
    backgroundColor: '#FFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    gap: 8,
    minHeight: Platform.OS === 'ios' ? 70 : 48, // Reduced minHeight
  },
  attachmentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2, // Reduced from 6 to 2
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced from 10 to 8
    fontSize: 16,
    maxHeight: 120,
    backgroundColor: '#F8F9FA',
    textAlignVertical: 'center',
  },
  emojiInputButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
  loadMoreContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Call button styles
  callButtons: {
    flexDirection: 'row',
    marginRight: 12,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },

  // Debug styles
  debugContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    margin: 8,
    borderRadius: 4,
  },
  debugText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  webrtcModeIndicator: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  leaveChannelButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    paddingHorizontal: 10,
  },
  leaveChannelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Image Viewer Modal Styles
  imageViewerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10000,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageViewerDownloadButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10000,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerTitle: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 8,
  },

});
