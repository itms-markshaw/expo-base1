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
import { useNavigation } from '@react-navigation/native';
import { MessageBubble, MentionPicker } from '../../base/components';
import { ChannelMembersModal } from '../components';
import ScreenBadge from '../../../components/ScreenBadge';
import attachmentUploadService, { AttachmentUpload, UploadProgress } from '../../base/services/BC-S008_AttachmentUploadService';
import { callService } from '../../base/services/BC-S010_CallService';
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
        // Initialize call service
        await callService.initialize();

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

    // Setup call listeners with debugging
    const handleIncomingCallDebug = (callData: any) => {
      console.log('📞 INCOMING CALL received in UI:', callData);
      handleIncomingCall(callData);
    };

    callService.on('incomingCall', handleIncomingCallDebug);
    callService.on('showIncomingCallModal', handleShowIncomingCallModal);
    callService.on('callStarted', handleCallStarted);

    // Debug: Log all longpolling events
    const handleLongpollingMessage = (message: any) => {
      console.log('🚌 Longpolling message in Chat UI:', message);
    };

    longpollingService.on('message', handleLongpollingMessage);

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

  const handleChannelsLoaded = (loadedChannels: ChatChannel[]) => {
    setChannels(loadedChannels);
    // Don't auto-select - let user choose from list
  };

  const handleMessagesLoaded = ({ channelId, messages: loadedMessages }: { channelId: number; messages: ChatMessage[] }) => {
    console.log(`📨 handleMessagesLoaded for channel ${channelId}, selected: ${selectedChannelRef.current?.id}`);
    if (selectedChannelRef.current?.id === channelId) {
      console.log(`📨 Setting ${loadedMessages.length} loaded messages`);
      setMessages(loadedMessages);
      scrollToBottom();
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
        // Check for duplicate messages by ID
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

        if (uniqueNewMessages.length > 0) {
          console.log(`🔄 Adding ${uniqueNewMessages.length} unique new messages to UI`);
          const updated = [...prev, ...uniqueNewMessages];

          // Sort by date to maintain proper order
          updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          setTimeout(scrollToBottom, 100);
          return updated;
        } else {
          console.log(`🔄 No new unique messages to add (${newMessages.length} messages were duplicates)`);
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
    setSelectedChannel(channel);
    setMessages([]);
    setTypingUsers([]);
    setHasMoreMessages(true);
    setShowLoadMore(false);

    // Subscribe to longpolling for real-time updates
    chatService.subscribeToChannel(channel.id);

    // Load initial 25 messages for this channel
    const loadedMessages = await chatService.loadChannelMessages(channel.id, 25);

    // Set messages directly as well as through the event listener
    setMessages(loadedMessages);

    // Check if we have fewer than 25 messages, meaning no more to load
    if (loadedMessages.length < 25) {
      setHasMoreMessages(false);
    }
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
      // You could implement a modal image viewer here
      Alert.alert('Image Attachment', `Opening ${filename}`, [
        { text: 'OK' }
      ]);
    } else {
      // Handle other file types
      Alert.alert('Attachment', `Opening ${filename}`, [
        { text: 'OK' }
      ]);
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

  const handleAnswerCall = () => {
    setShowIncomingCall(false);
    if (incomingCallOffer) {
      // Call service will handle the answer and trigger handleCallStarted
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
          <Text style={styles.headerTitle}>
            {selectedChannel ? selectedChannel.name : 'Chat'}
          </Text>
          {selectedChannel && selectedChannel.channel_type === 'channel' && (
            <Text style={styles.headerSubtitle}>
              {selectedChannel.member_count || 0} members
            </Text>
          )}
        </View>

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
              onContentSizeChange={scrollToBottom}
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

});
