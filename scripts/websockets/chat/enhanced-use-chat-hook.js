// src/hooks/useChat.js - Enhanced with history management
import { useState, useEffect, useCallback, useRef } from 'react';
import chatManager from '../services/chat';
import chatHistoryService from '../services/chat/ChatHistoryService';

/**
 * Enhanced useChat Hook with intelligent history management
 * Provides seamless infinite scroll, smart caching, and progressive loading
 */
export const useChat = (channelId, options = {}) => {
  const {
    autoJoin = true,
    loadInitialMessages = true,
    enableTyping = true,
    enablePresence = true,
    pageSize = 50,
    historyPageSize = 30
  } = options;

  // Chat state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Real-time state
  const [typingUsers, setTypingUsers] = useState([]);
  const [presenceData, setPresenceData] = useState(new Map());
  const [connectionState, setConnectionState] = useState('disconnected');

  // Sync state
  const [syncStatus, setSyncStatus] = useState('idle');

  // Refs for cleanup and state management
  const eventListenersRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const channelIdRef = useRef(channelId);
  const lastMessageIdRef = useRef(null);

  // Update channel ref when channelId changes
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  /**
   * Initialize chat services with history support
   */
  const initializeChat = useCallback(async () => {
    try {
      console.log('🚀 Initializing enhanced chat with history...');
      
      // Initialize chat manager
      const chatSuccess = await chatManager.initialize();
      
      // Initialize history service
      const historySuccess = await chatHistoryService.initialize();
      
      if (chatSuccess && historySuccess) {
        setIsInitialized(true);
        console.log('✅ Enhanced chat initialized with history support');
        return true;
      } else {
        console.error('❌ Failed to initialize chat services');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Chat initialization error:', error);
      return false;
    }
  }, []);

  /**
   * Set up enhanced event listeners
   */
  const setupEventListeners = useCallback(() => {
    const listeners = [];

    // Connection state changes
    const onConnectionChanged = (state) => {
      setConnectionState(state);
    };
    chatManager.chat.on('connectionChanged', onConnectionChanged);
    listeners.push(['connectionChanged', onConnectionChanged]);

    // New messages with smart deduplication
    const onMessageAdded = (data) => {
      if (data.channelId === channelIdRef.current) {
        setMessages(prev => {
          // Smart deduplication and ordering
          const messageId = data.message.id || data.message.local_id;
          const existingIndex = prev.findIndex(m => 
            m.id === messageId || m.local_id === messageId
          );
          
          if (existingIndex !== -1) {
            // Update existing message
            const updatedMessages = [...prev];
            updatedMessages[existingIndex] = data.message;
            return updatedMessages;
          } else {
            // Add new message and maintain order (newest first for chat display)
            const newMessages = [data.message, ...prev];
            
            // Update last message ID for history loading
            if (data.message.id) {
              lastMessageIdRef.current = data.message.id;
            }
            
            return newMessages;
          }
        });
      }
    };
    chatManager.chat.on('messageAdded', onMessageAdded);
    listeners.push(['messageAdded', onMessageAdded]);

    // Message confirmations (optimistic -> real)
    const onMessageConfirmed = (data) => {
      if (data.channelId === channelIdRef.current) {
        setMessages(prev => prev.map(m => 
          m.local_id === data.localId 
            ? { ...m, id: data.serverId, is_optimistic: false, sync_status: 'synced' }
            : m
        ));
        
        // Update last message ID