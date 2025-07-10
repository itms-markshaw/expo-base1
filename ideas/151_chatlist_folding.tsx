/**
   * 151_ChatList - Real-time messaging interface with Channel Management
   * Screen Number: 151
   * Model: discuss.channel
   * Type: list
   *
   * ENHANCED: Added unfold/reopen channel functionality and visibility management
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
  
  import { databaseService } from '../../base/services/BaseDatabaseService';
  import { syncService } from '../../base/services/BaseSyncService';
  import { authService } from '../../base/services/BaseAuthService';
  import { ODOO_CONFIG } from '../../../config/odoo';
  import chatService, { ChatChannel, ChatMessage, TypingUser } from '../services/ChatService';
  import channelMemberService, { FoldState } from '../services/ChannelMemberService';
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
  
  export default function ChatScreen() {
    const { showNavigationDrawer } = useAppNavigation();
    const navigation = useNavigation();
    const [channels, setChannels] = useState<ChatChannel[]>([]);
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
    const [channelFoldStates, setChannelFoldStates] = useState<Map<number, FoldState>>(new Map());
    const [showChannelActions, setShowChannelActions] = useState<number | null>(null);
  
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
  
          // Load channel fold states
          await loadChannelFoldStates();
  
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
  
    // Load channel fold states
    const loadChannelFoldStates = async () => {
      try {
        const memberships = await channelMemberService.getCurrentUserMemberships();
        const foldStateMap = new Map<number, FoldState>();
        
        memberships.forEach(member => {
          foldStateMap.set(member.channel_id, member.fold_state || 'open');
        });
        
        setChannelFoldStates(foldStateMap);
        console.log(`📁 Loaded fold states for ${foldStateMap.size} channels`);
      } catch (error) {
        console.error('❌ Failed to load channel fold states:', error);
      }
    };
  
    // Update channel fold state
    const updateChannelFoldState = async (channelId: number, foldState: FoldState) => {
      try {
        const success = await channelMemberService.updateChannelFoldState(channelId, foldState);
        if (success) {
          setChannelFoldStates(prev => new Map(prev.set(channelId, foldState)));
          console.log(`✅ Updated fold state for channel ${channelId} to \"${foldState}\"`);
          
          // Show success message
          Alert.alert(
            'Channel Updated',
            `Channel ${foldState === 'open' ? 'reopened' : foldState === 'folded' ? 'minimized' : 'hidden'} successfully.`
          );
        } else {
          Alert.alert('Error', 'Failed to update channel visibility. Please try again.');
        }
      } catch (error) {
        console.error('❌ Failed to update channel fold state:', error);
        Alert.alert('Error', 'Failed to update channel visibility. Please try again.');
      }
    };
  
    // Handle channel actions (unfold, fold, close)
    const handleChannelAction = (channelId: number, action: 'unfold' | 'fold' | 'close') => {
      let foldState: FoldState;
      let actionText: string;
      
      switch (action) {
        case 'unfold':
          foldState = 'open';
          actionText = 'reopen';
          break;
        case 'fold':
          foldState = 'folded';
          actionText = 'minimize';
          break;
        case 'close':
          foldState = 'closed';
          actionText = 'hide';
          break;
      }
      
      const channel = channels.find(c => c.id === channelId);
      const channelName = channel?.name || `Channel ${channelId}`;
      
      Alert.alert(
        'Update Channel Visibility',
        `Are you sure you want to ${actionText} \"${channelName}\"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
            onPress: () => updateChannelFoldState(channelId, foldState)
          }
        ]
      );
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
      callService.on('callAnswered', handleCallStarted);
  
      const handleChatCallInvitation = (invitation: any) => {
        console.log('📞 CALL INVITATION from chat message (DISABLED):', invitation);
      };
  
      chatService.on('callInvitation', handleChatCallInvitation);
  
      // Setup WebRTC listeners
      webRTCService.on('incomingCall', (call: WebRTCCall) => {
        console.log('📞 Incoming WebRTC call:', call);
        setIncomingWebRTCCall(call);
        setShowWebRTCCallModal(true);
      });
    };
  
    const handleChannelsLoaded = (loadedChannels: ChatChannel[]) => {
      console.log(`📱 ✅ Displaying ${loadedChannels.length} channels instantly`);
      
      if (loading) {
        setChannels(loadedChannels);
        setLoading(false);
        setLoadingFresh(true);
        console.log('📱 Cache loaded - UI ready, fetching fresh data...');
      } else {
        const currentChannels = channels;
        const isDifferent = loadedChannels.length !== currentChannels.length ||
                            loadedChannels.some(newCh => !currentChannels.find(oldCh => oldCh.id === newCh.id));
        
        if (isDifferent) {
          console.log(`📱 Fresh data different (${currentChannels.length} -> ${loadedChannels.length}), updating...`);
          setChannels(loadedChannels);
          loadChannelFoldStates();
        } else {
          console.log('📱 Fresh data same as cache, no update needed');
        }
        
        setLoadingFresh(false);
        console.log('📱 Fresh data loaded - all done!');
      }
    };
  
    const handleMessagesLoaded = ({ channelId, messages: loadedMessages }: { channelId: number; messages: ChatMessage[] }) => {
      console.log(`📨 handleMessagesLoaded for channel ${channelId}, selected: ${selectedChannelRef.current?.id}`);
      if (selectedChannelRef.current?.id === channelId) {
        console.log(`📨 Setting ${loadedMessages.length} loaded messages`);
        setMessages(loadedMessages);
  
        if (!isInitialLoad) {
          scrollToBottom();
        }
      }
    };
  
    const handleNewMessages = ({ channelId, messages: newMessages }: { channelId: number; messages: ChatMessage[] }) => {
      console.log(`📨 handleNewMessages for channel ${channelId}, selected: ${selectedChannelRef.current?.id}`);
  
      const shouldProcessMessages = selectedChannelRef.current?.id === channelId ||
                                   (!selectedChannelRef.current && channels.some(c => c.id === channelId));
  
      if (shouldProcessMessages) {
        console.log(`🔄 ChatScreen received ${newMessages.length} new messages for channel ${channelId}`);
  
        if (!selectedChannelRef.current && channels.length > 0) {
          const channel = channels.find(c => c.id === channelId);
          if (channel) {
            console.log(`🔄 Auto-selecting channel ${channelId} due to new messages`);
            setSelectedChannel(channel);
          }
        }
  
        setMessages(prev => {
          let filteredPrev = prev;
  
          for (const newMsg of newMessages) {
            const beforeCount = filteredPrev.length;
            filteredPrev = filteredPrev.filter(msg => {
              const isOptimistic = msg.id.toString().startsWith('temp_') || msg.id < 0;
              if (!isOptimistic) return true;
  
              const cleanOptimisticBody = msg.body.replace(/<[^>]*>/g, '').trim();
              const cleanRealBody = newMsg.body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]*>/g, '').trim();
              const sameContent = cleanOptimisticBody === cleanRealBody;
  
              if (sameContent) {
                console.log(`🗑️ UI: Immediately removing optimistic message \"${cleanOptimisticBody}\" for real message ${newMsg.id}`);
                return false;
              }
              return true;
            });
  
            if (filteredPrev.length !== beforeCount) {
              console.log(`🧹 UI: Removed ${beforeCount - filteredPrev.length} optimistic messages`);
            }
          }
  
          const existingIds = new Set(filteredPrev.map(m => m.id));
          const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
  
          if (uniqueNewMessages.length > 0) {
            console.log(`🔄 Adding ${uniqueNewMessages.length} unique new messages to UI`);
            const updated = [...filteredPrev, ...uniqueNewMessages];
  
            updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
            const limitedMessages = updated.slice(-25);
            if (limitedMessages.length < updated.length) {
              console.log(`📨 Trimmed messages to last 25 (was ${updated.length})`);
            }
  
            if (!isInitialLoad) {
              setTimeout(scrollToBottom, 100);
            }
            return limitedMessages;
          } else {
            console.log(`🔄 No new unique messages to add (${newMessages.length} messages were duplicates)`);
            return filteredPrev;
          }
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
      if (selectedChannelRef.current && messages.length > 0) {
        chatService.saveLastRenderedMessages(selectedChannelRef.current.id, messages);
        console.log('💾 Saved last rendered state for previous channel');
      }
  
      setSelectedChannel(channel);
      setTypingUsers([]);
      setHasMoreMessages(true);
      setShowLoadMore(false);
  
      chatService.subscribeToChannel(channel.id);
  
      const lastRendered = chatService.getLastRenderedMessages(channel.id);
      console.log(`📨 🔍 Checking for last rendered messages for channel ${channel.id}: found ${lastRendered.length}`);
  
      if (lastRendered.length > 0) {
        console.log('⚡ Displaying', lastRendered.length, 'last rendered messages INSTANTLY');
        setMessages(lastRendered);
  
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 50);
  
        console.log('⚡ INSTANT LOAD COMPLETE - messages displayed from cache');
  
        setTimeout(async () => {
          try {
            console.log('🔄 Loading fresh data in background...');
            const freshMessages = await chatService.loadChannelMessages(channel.id, 25, 0);
            const limitedMessages = freshMessages.slice(-25);
            console.log('🔄 Background refresh complete, updating UI silently');
            setMessages(limitedMessages);
  
            if (freshMessages.length < 25) {
              setHasMoreMessages(false);
            }
          } catch (error) {
            console.warn('⚠️ Background refresh failed:', error);
          }
        }, 1000);
  
        return;
      } else {
        console.log('📨 ⚠️ No last rendered messages found - proceeding with fresh load');
      }
  
      setMessages([]);
      setIsInitialLoad(true);
  
      const loadedMessages = await chatService.loadChannelMessages(channel.id, 25, 0);
      const limitedMessages = loadedMessages.slice(-25);
      setMessages(limitedMessages);
  
      if (loadedMessages.length < 25) {
        setHasMoreMessages(false);
      }
  
      console.log(`📨 Loaded ${limitedMessages.length} messages for channel ${channel.id} (fresh load)`);
  
      setIsInitialLoad(false);
      setTimeout(() => {
        scrollToBottom();
        console.log(`📨 Initial load complete - scrolled to bottom`);
      }, 100);
    };
  
    const scrollToBottom = () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

  const handleTextChange = (text: string) => {
    setMessageText(text);

    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';

      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        const spaceIndex = textAfterAt.indexOf(' ');
        const query = spaceIndex === -1 ? textAfterAt : textAfterAt.substring(0, spaceIndex);

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
      setShowMentionPicker(false);
    }

    if (selectedChannel) {
      chatService.startTyping(selectedChannel.id);
    }
  };

  const handleMentionUser = (user: { id: number; name: string; email?: string }) => {
    if (mentionStartIndex !== -1) {
      const beforeMention = messageText.substring(0, mentionStartIndex);
      const afterMention = messageText.substring(mentionStartIndex + 1 + mentionSearchQuery.length);
      const newText = `${beforeMention}@${user.name} ${afterMention}`;
      setMessageText(newText);

      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
    setShowMentionPicker(false);
    setMentionSearchQuery('');
    setMentionStartIndex(-1);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleAttachmentOptions = () => {
    setShowAttachmentOptions(!showAttachmentOptions);
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
          Alert.alert(
            'Message Options',
            'What would you like to do with this message?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Copy Text',
                onPress: () => {
                  console.log('Copy message text:', item.body);
                }
              },
              {
                text: 'Reply',
                onPress: () => {
                  console.log('Reply to message:', item.id);
                }
              },
            ]
          );
        }}
        onAttachmentPress={() => {}}
        onAttachmentLongPress={() => {}}
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
        <ActivityIndicator size=\"small\" color=\"#007AFF\" />
      </View>
    );
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
        const success = await callService.answerCall(incomingCallOffer);
        if (success) {
          console.log('✅ Call answered successfully');
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

  const handleAcceptWebRTCCall = async () => {
    if (!incomingWebRTCCall) return;

    try {
      setShowWebRTCCallModal(false);

      navigation.navigate('VideoCallScreen', {
        callId: incomingWebRTCCall.callId,
        isIncoming: true
      });

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
      if (webRTCService.isAvailable()) {
        console.log('📞 Starting WebRTC video call');
        const callId = await callService.startWebRTCCall(selectedChannel.id, selectedChannel.name, 'video');

        navigation.navigate('VideoCallScreen' as never, {
          callId,
          isIncoming: false
        } as never);
      } else {
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

  if (loading && channels.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size=\"large\" color=\"#007AFF\" />
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
              console.log(`📡 Unsubscribing from channel ${selectedChannel.id}`);
              chatService.unsubscribeFromChannel(selectedChannel.id);
              setSelectedChannel(null);
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name=\"arrow-back\" size={24} color=\"#007AFF\" />
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
          <Text style={styles.webrtcModeIndicator}>
            {webRTCDetector.getModeDescription()}
          </Text>
        </View>

        {/* Call buttons - only show when a channel is selected */}
        {selectedChannel && (
          <View style={styles.callButtons}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleStartAudioCall}
            >
              <MaterialIcons name=\"call\" size={24} color=\"#007AFF\" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleStartVideoCall}
            >
              <MaterialIcons name=\"videocam\" size={24} color=\"#007AFF\" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.profileButton}
          onPress={showNavigationDrawer}
        >
          <MaterialIcons name=\"account-circle\" size={32} color=\"#007AFF\" />
        </TouchableOpacity>
      </View>

      {/* Chat List - Show all conversations when no channel is selected */}
      {!selectedChannel ? (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => {
                const currentFoldState = channelFoldStates.get(item.id) || 'open';
                
                return (
                  <View style={styles.swipeActions}>
                    {/* Channel Visibility Actions */}
                    {currentFoldState === 'closed' && (
                      <TouchableOpacity
                        style={[styles.swipeActionButton, { backgroundColor: '#34C759' }]}
                        onPress={() => handleChannelAction(item.id, 'unfold')}
                      >
                        <MaterialIcons name=\"visibility\" size={20} color=\"#FFF\" />
                        <Text style={styles.swipeActionText}>Show</Text>
                      </TouchableOpacity>
                    )}
                    
                    {currentFoldState === 'open' && (
                      <TouchableOpacity
                        style={[styles.swipeActionButton, { backgroundColor: '#FF9500' }]}
                        onPress={() => handleChannelAction(item.id, 'fold')}
                      >
                        <MaterialIcons name=\"remove\" size={20} color=\"#FFF\" />
                        <Text style={styles.swipeActionText}>Minimize</Text>
                      </TouchableOpacity>
                    )}
                    
                    {currentFoldState !== 'closed' && (
                      <TouchableOpacity
                        style={[styles.swipeActionButton, { backgroundColor: '#8E8E93' }]}
                        onPress={() => handleChannelAction(item.id, 'close')}
                      >
                        <MaterialIcons name=\"visibility-off\" size={20} color=\"#FFF\" />
                        <Text style={styles.swipeActionText}>Hide</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Leave Channel Action */}
                    <TouchableOpacity
                      style={[styles.swipeActionButton, { backgroundColor: '#FF3B30' }]}
                      onPress={() => {}}
                    >
                      <MaterialIcons name=\"exit-to-app\" size={20} color=\"#FFF\" />
                      <Text style={styles.swipeActionText}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
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
                  <>
                    <MaterialIcons name=\"person\" size={24} color=\"#FFF\" />
                    <View style={styles.channelTypeIndicator}>
                      <MaterialIcons name=\"chat\" size={12} color=\"#007AFF\" />
                    </View>
                  </>
                ) : item.channel_type === 'channel' ? (
                  <>
                    <MaterialIcons name=\"group\" size={24} color=\"#FFF\" />
                    <View style={styles.channelTypeIndicator}>
                      <MaterialIcons name=\"groups\" size={12} color=\"#34C759\" />
                    </View>
                  </>
                ) : (
                  <MaterialIcons name=\"chat-bubble\" size={24} color=\"#FFF\" />
                )}
              </View>

              {/* Chat Info */}
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <View style={styles.chatTitleRow}>
                    <Text style={styles.chatName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {/* Channel visibility indicator */}
                    {(() => {
                      const foldState = channelFoldStates.get(item.id) || 'open';
                      if (foldState === 'closed') {
                        return (
                          <View style={styles.visibilityIndicator}>
                            <MaterialIcons name=\"visibility-off\" size={12} color=\"#8E8E93\" />
                          </View>
                        );
                      } else if (foldState === 'folded') {
                        return (
                          <View style={styles.visibilityIndicator}>
                            <MaterialIcons name=\"remove\" size={12} color=\"#FF9500\" />
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                  <Text style={styles.chatTime}>
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
                  {(() => {
                    const foldState = channelFoldStates.get(item.id) || 'open';
                    if (foldState === 'closed') {
                      return ' • Hidden';
                    } else if (foldState === 'folded') {
                      return ' • Minimized';
                    }
                    return '';
                  })()}
                </Text>
              </View>

              {/* Unread indicator */}
              <View style={styles.chatMeta}>
                <TouchableOpacity
                  style={styles.channelQuickAction}
                  onPress={() => {
                    const foldState = channelFoldStates.get(item.id) || 'open';
                    if (foldState === 'closed') {
                      handleChannelAction(item.id, 'unfold');
                    } else {
                      setShowChannelActions(showChannelActions === item.id ? null : item.id);
                    }
                  }}
                >
                  {(() => {
                    const foldState = channelFoldStates.get(item.id) || 'open';
                    if (foldState === 'closed') {
                      return <MaterialIcons name=\"visibility\" size={16} color=\"#34C759\" />;
                    }
                    return <MaterialIcons name=\"more-vert\" size={16} color=\"#C7C7CC\" />;
                  })()}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            
            {/* Channel Actions Menu */}
            {showChannelActions === item.id && (
              <View style={styles.channelActionsMenu}>
                {(() => {
                  const foldState = channelFoldStates.get(item.id) || 'open';
                  const actions = [];
                  
                  if (foldState === 'open') {
                    actions.push(
                      <TouchableOpacity
                        key=\"fold\"
                        style={styles.channelActionItem}
                        onPress={() => {
                          setShowChannelActions(null);
                          handleChannelAction(item.id, 'fold');
                        }}
                      >
                        <MaterialIcons name=\"remove\" size={18} color=\"#FF9500\" />
                        <Text style={styles.channelActionText}>Minimize</Text>
                      </TouchableOpacity>
                    );
                  }
                  
                  if (foldState !== 'closed') {
                    actions.push(
                      <TouchableOpacity
                        key=\"close\"
                        style={styles.channelActionItem}
                        onPress={() => {
                          setShowChannelActions(null);
                          handleChannelAction(item.id, 'close');
                        }}
                      >
                        <MaterialIcons name=\"visibility-off\" size={18} color=\"#8E8E93\" />
                        <Text style={styles.channelActionText}>Hide</Text>
                      </TouchableOpacity>
                    );
                  }
                  
                  return actions;
                })()}
              </View>
            )}
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
          {/* Messages - iMessage Style */}
          {messages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <MaterialIcons name=\"chat-bubble-outline\" size={48} color=\"#C7C7CC\" />
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
              showsVerticalScrollIndicator={false}
              inverted={false}
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

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={handleAttachmentOptions}
              disabled={sending}
            >
              <MaterialIcons name=\"add\" size={20} color=\"#007AFF\" />
            </TouchableOpacity>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={messageText}
              onChangeText={handleTextChange}
              placeholder=\"Type a message...\"
              placeholderTextColor=\"#999\"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={styles.emojiInputButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={sending}
            >
              <MaterialIcons name=\"emoji-emotions\" size={20} color=\"#007AFF\" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size=\"small\" color=\"#FFF\" />
              ) : (
                <MaterialIcons name=\"send\" size={20} color=\"#FFF\" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.noChannelContainer}>
          <MaterialIcons name=\"chat\" size={64} color=\"#C7C7CC\" />
          <Text style={styles.noChannelTitle}>No chat channels</Text>
          <Text style={styles.noChannelText}>
            Chat channels will appear here when available
          </Text>
        </View>
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
  profileButton: {
    padding: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webrtcModeIndicator: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
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
  groupChatAvatar: {
    backgroundColor: '#34C759',
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
  chatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  
  // Channel Visibility Indicators
  visibilityIndicator: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F8F9FA',
  },
  
  // Quick Actions
  channelQuickAction: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Channel Actions Menu
  channelActionsMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  channelActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  channelActionText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  
  // Swipe Actions
  swipeActions: {
    flexDirection: 'row',
    height: '100%',
  },
  swipeActionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    paddingHorizontal: 8,
  },
  swipeActionText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
    bottom: 70,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  mentionPickerStyle: {
    // Additional styles for the mention picker overlay
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
    paddingVertical: 4,
    paddingBottom: Platform.OS === 'ios' ? 20 : 4,
    backgroundColor: '#FFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
    gap: 8,
    minHeight: Platform.OS === 'ios' ? 70 : 48,
  },
  attachmentButton: {
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
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
});