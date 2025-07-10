/**
 * BC-H152_useChannelMessages.ts - Custom Hook for Channel Messages Management
 * 
 * Handles:
 * - Message loading for a specific channel
 * - Real-time message updates
 * - Pagination (load more messages)
 * - Optimistic message handling
 * - Message sending with retry logic
 * - Typing indicators
 * - Message status tracking
 * 
 * Usage:
 * const { 
 *   messages, 
 *   loading, 
 *   hasMore,
 *   sendMessage,
 *   loadMoreMessages,
 *   typingUsers 
 * } = useChannelMessages(channelId);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '../../discuss_channel/services/ChatService';
import { ChatMessage } from '../../discuss_channel/types/ChatTypes';

interface UseChannelMessagesReturn {
  // Data
  messages: ChatMessage[];
  
  // Loading states
  loading: boolean;
  loadingMore: boolean;
  hasMoreMessages: boolean;
  
  // Typing
  typingUsers: string[];
  
  // Actions
  sendMessage: (text: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  
  // Status
  error: string | null;
}

export function useChannelMessages(channelId: number): UseChannelMessagesReturn {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const isInitialized = useRef(false);
  const currentChannelId = useRef(channelId);
  const optimisticMessages = useRef<Map<number, ChatMessage>>(new Map());

  // Update channel ID when it changes
  useEffect(() => {
    if (currentChannelId.current !== channelId) {
      currentChannelId.current = channelId;
      isInitialized.current = false;
      
      // Reset state for new channel
      setMessages([]);
      setLoading(true);
      setLoadingMore(false);
      setHasMoreMessages(true);
      setTypingUsers([]);
      setError(null);
      optimisticMessages.current.clear();
    }
  }, [channelId]);

  // Initialize messages for channel
  useEffect(() => {
    if (!isInitialized.current && channelId) {
      initializeMessages();
      isInitialized.current = true;
    }

    return () => {
      cleanupEventListeners();
    };
  }, [channelId]);

  const initializeMessages = async () => {
    try {
      console.log(`📨 Hook: Initializing messages for channel ${channelId}`);
      
      // Setup event listeners
      setupEventListeners();
      
      // Load initial messages
      await loadMessages(true);
      
    } catch (error) {
      console.error('Failed to initialize messages:', error);
      setError('Failed to load messages. Please try again.');
    }
  };

  const setupEventListeners = () => {
    console.log(`🔗 Hook: Setting up message listeners for channel ${channelId}`);
    
    chatService.on('messagesLoaded', handleMessagesLoaded);
    chatService.on('newMessages', handleNewMessages);
    chatService.on('typingChanged', handleTypingChanged);
  };

  const cleanupEventListeners = () => {
    console.log(`🔗 Hook: Cleaning up message listeners for channel ${channelId}`);
    
    chatService.off('messagesLoaded', handleMessagesLoaded);
    chatService.off('newMessages', handleNewMessages);
    chatService.off('typingChanged', handleTypingChanged);
  };

  const handleMessagesLoaded = useCallback(({ channelId: loadedChannelId, messages: loadedMessages }: { channelId: number; messages: ChatMessage[] }) => {
    if (loadedChannelId === currentChannelId.current) {
      console.log(`📨 Hook: Loaded ${loadedMessages.length} messages for channel ${loadedChannelId}`);
      
      // Merge with optimistic messages
      const allMessages = mergeWithOptimisticMessages(loadedMessages);
      setMessages(allMessages);
      setHasMoreMessages(loadedMessages.length >= 50); // Assume more if we got a full batch
      setError(null);
    }
  }, []);

  const handleNewMessages = useCallback(({ channelId: messageChannelId, messages: newMessages }: { channelId: number; messages: ChatMessage[] }) => {
    if (messageChannelId === currentChannelId.current) {
      console.log(`📨 Hook: New messages for channel ${messageChannelId}:`, newMessages.length);
      
      setMessages(prevMessages => {
        // Remove optimistic messages that are now real
        newMessages.forEach(newMsg => {
          optimisticMessages.current.delete(newMsg.id);
        });

        // Merge new messages
        const existingIds = new Set(prevMessages.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        
        return [...prevMessages, ...uniqueNewMessages].sort((a, b) => a.id - b.id);
      });
    }
  }, []);

  const handleTypingChanged = useCallback(({ channelId: typingChannelId, users }: { channelId: number; users: string[] }) => {
    if (typingChannelId === currentChannelId.current) {
      setTypingUsers(users);
    }
  }, []);

  const mergeWithOptimisticMessages = (serverMessages: ChatMessage[]): ChatMessage[] => {
    const optimisticArray = Array.from(optimisticMessages.current.values());
    const allMessages = [...serverMessages, ...optimisticArray];
    
    // Sort by ID (optimistic messages have negative IDs)
    return allMessages.sort((a, b) => {
      if (a.id < 0 && b.id > 0) return 1; // Optimistic messages go to end
      if (a.id > 0 && b.id < 0) return -1;
      return a.id - b.id;
    });
  };

  const loadMessages = async (initial: boolean = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const offset = initial ? 0 : messages.filter(m => m.id > 0).length; // Only count real messages
      await chatService.loadChannelMessages(channelId, 50, offset);

    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages. Please try again.');
    } finally {
      if (initial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const optimisticId = -Date.now(); // Negative ID for optimistic messages
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      body: text.trim(),
      author_id: [0, 'You'], // Will be updated with real author
      date: new Date().toISOString(),
      message_type: 'comment',
      model: 'discuss.channel',
      res_id: channelId,
      channel_ids: [channelId],
      attachment_ids: [],
      is_optimistic: true,
    };

    try {
      // Add optimistic message
      optimisticMessages.current.set(optimisticId, optimisticMessage);
      setMessages(prev => mergeWithOptimisticMessages(prev));

      // Send to server
      await chatService.sendMessage(channelId, text.trim());

      console.log(`📨 Hook: Message sent successfully for channel ${channelId}`);

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Remove failed optimistic message
      optimisticMessages.current.delete(optimisticId);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      
      throw error; // Re-throw so UI can handle it
    }
  }, [channelId]);

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMoreMessages) return;
    
    console.log(`📨 Hook: Loading more messages for channel ${channelId}`);
    await loadMessages(false);
  }, [channelId, loadingMore, hasMoreMessages]);

  const refreshMessages = useCallback(async () => {
    console.log(`📨 Hook: Refreshing messages for channel ${channelId}`);
    optimisticMessages.current.clear();
    await loadMessages(true);
  }, [channelId]);

  return {
    // Data
    messages,
    
    // Loading states
    loading,
    loadingMore,
    hasMoreMessages,
    
    // Typing
    typingUsers,
    
    // Actions
    sendMessage,
    loadMoreMessages,
    refreshMessages,
    
    // Status
    error,
  };
}
