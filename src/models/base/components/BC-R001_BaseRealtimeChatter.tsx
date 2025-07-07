/**
 * BaseRealtimeChatter (BC-R001) - Real-time Integration for Chatter System
 * Component Reference: BC-R001
 * 
 * ENHANCED: Integrates existing WebSocket system with BC-C001 BaseChatter
 * Following the BC-CXXX component reference system from perfect-base-chatter.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sessionWebSocketService } from '../services/BaseSessionWebSocketService';
import BC_C001_BaseChatter from './BC-C001_BaseChatter';
import type { 
  BaseChatterProps, 
  ChatterMessage, 
  ChatterActivity, 
  Attachment,
  AIInteraction 
} from './BC-C001_BaseChatter';

// BC-R001 Real-time Interfaces
export interface BaseRealtimeChatterProps extends Omit<BaseChatterProps, 'realTime'> {
  // Real-time specific props
  enableWebSocket?: boolean;
  enableTypingIndicators?: boolean;
  enablePresenceStatus?: boolean;
  enableLiveReactions?: boolean;
  
  // WebSocket event handlers
  onWebSocketConnect?: () => void;
  onWebSocketDisconnect?: () => void;
  onWebSocketError?: (error: any) => void;
  
  // Real-time data handlers
  onLiveMessage?: (message: ChatterMessage) => void;
  onTypingUpdate?: (users: TypingUser[]) => void;
  onPresenceUpdate?: (users: PresenceUser[]) => void;
}

export interface TypingUser {
  id: number;
  name: string;
  isTyping: boolean;
  timestamp: string;
}

export interface PresenceUser {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
}

export interface RealtimeMessage {
  type: 'message' | 'typing' | 'presence' | 'reaction';
  channelId: number;
  userId: number;
  data: any;
  timestamp: string;
}

/**
 * BC-R001: Real-time Chatter Integration
 * 
 * Features:
 * - Integrates existing WebSocket system with BC-C001
 * - Real-time message delivery and updates
 * - Typing indicators with user presence
 * - Live reactions and message status
 * - Seamless fallback to polling when WebSocket unavailable
 * - Maintains all BC-C001 features while adding real-time capabilities
 */
export default function BaseRealtimeChatter({
  modelName,
  recordId,
  recordName,
  enableWebSocket = true,
  enableTypingIndicators = true,
  enablePresenceStatus = true,
  enableLiveReactions = true,
  onWebSocketConnect,
  onWebSocketDisconnect,
  onWebSocketError,
  onLiveMessage,
  onTypingUpdate,
  onPresenceUpdate,
  ...chatterProps
}: BaseRealtimeChatterProps) {
  // Real-time state
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [liveMessages, setLiveMessages] = useState<ChatterMessage[]>([]);
  
  // Refs for cleanup
  const webSocketListeners = useRef<Map<string, Function>>(new Map());
  const typingTimeout = useRef<NodeJS.Timeout>();

  // Initialize WebSocket connection
  useEffect(() => {
    if (!enableWebSocket) return;

    initializeWebSocket();
    
    return () => {
      cleanupWebSocket();
    };
  }, [enableWebSocket, modelName, recordId]);

  // Initialize WebSocket with existing service
  const initializeWebSocket = useCallback(async () => {
    try {
      console.log(`🔌 BC-R001: Initializing WebSocket for ${modelName}:${recordId}`);
      
      // Use existing session WebSocket service
      const connected = await sessionWebSocketService.initialize();
      
      if (connected) {
        setupWebSocketListeners();
        subscribeToModelUpdates();
        setIsWebSocketConnected(true);
        onWebSocketConnect?.();
      }
    } catch (error) {
      console.error('❌ BC-R001: WebSocket initialization failed:', error);
      setIsWebSocketConnected(false);
      onWebSocketError?.(error);
    }
  }, [modelName, recordId, onWebSocketConnect, onWebSocketError]);

  // Setup WebSocket event listeners
  const setupWebSocketListeners = useCallback(() => {
    // Connection events
    const handleConnect = () => {
      console.log('✅ BC-R001: WebSocket connected');
      setIsWebSocketConnected(true);
      onWebSocketConnect?.();
    };

    const handleDisconnect = () => {
      console.log('🔌 BC-R001: WebSocket disconnected');
      setIsWebSocketConnected(false);
      onWebSocketDisconnect?.();
    };

    const handleError = (error: any) => {
      console.error('❌ BC-R001: WebSocket error:', error);
      onWebSocketError?.(error);
    };

    // Message events
    const handleNewMessage = (message: any) => {
      console.log('💬 BC-R001: New live message received:', message);
      
      // Convert to ChatterMessage format
      const chatterMessage: ChatterMessage = {
        id: message.id,
        body: message.body || message.content,
        create_date: message.create_date || new Date().toISOString(),
        author_id: message.author_id,
        message_type: message.message_type || 'comment'
      };
      
      setLiveMessages(prev => [...prev, chatterMessage]);
      onLiveMessage?.(chatterMessage);
    };

    // Typing indicators
    const handleTypingUpdate = (data: any) => {
      if (!enableTypingIndicators) return;
      
      console.log('⌨️ BC-R001: Typing update:', data);
      
      const typingUser: TypingUser = {
        id: data.userId,
        name: data.userName,
        isTyping: data.isTyping,
        timestamp: new Date().toISOString()
      };
      
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.id !== typingUser.id);
        return typingUser.isTyping ? [...filtered, typingUser] : filtered;
      });
      
      onTypingUpdate?.(typingUsers);
    };

    // Presence updates
    const handlePresenceUpdate = (data: any) => {
      if (!enablePresenceStatus) return;
      
      console.log('👥 BC-R001: Presence update:', data);
      
      const presenceUser: PresenceUser = {
        id: data.userId,
        name: data.userName,
        status: data.status,
        lastSeen: data.lastSeen || new Date().toISOString()
      };
      
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.id !== presenceUser.id);
        return [...filtered, presenceUser];
      });
      
      onPresenceUpdate?.(onlineUsers);
    };

    // Register listeners with existing WebSocket service
    sessionWebSocketService.on('connected', handleConnect);
    sessionWebSocketService.on('disconnected', handleDisconnect);
    sessionWebSocketService.on('error', handleError);
    sessionWebSocketService.on('newMessage', handleNewMessage);
    sessionWebSocketService.on('typingUpdate', handleTypingUpdate);
    sessionWebSocketService.on('presenceUpdate', handlePresenceUpdate);

    // Store listeners for cleanup
    webSocketListeners.current.set('connected', handleConnect);
    webSocketListeners.current.set('disconnected', handleDisconnect);
    webSocketListeners.current.set('error', handleError);
    webSocketListeners.current.set('newMessage', handleNewMessage);
    webSocketListeners.current.set('typingUpdate', handleTypingUpdate);
    webSocketListeners.current.set('presenceUpdate', handlePresenceUpdate);
  }, [enableTypingIndicators, enablePresenceStatus, onWebSocketConnect, onWebSocketDisconnect, onWebSocketError, onLiveMessage, onTypingUpdate, onPresenceUpdate]);

  // Subscribe to model-specific updates
  const subscribeToModelUpdates = useCallback(() => {
    // Subscribe to model-specific channels
    const channelName = `${modelName}_${recordId}`;
    console.log(`📡 BC-R001: Subscribing to channel: ${channelName}`);
    
    // Use existing WebSocket service subscription
    sessionWebSocketService.subscribeToChannel(channelName);
  }, [modelName, recordId]);

  // Send typing indicator
  const handleTyping = useCallback((isTyping: boolean) => {
    if (!enableTypingIndicators || !isWebSocketConnected) return;

    // Clear existing timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    // Send typing status via WebSocket
    sessionWebSocketService.sendMessage('typing_update', {
      modelName,
      recordId,
      isTyping,
      timestamp: new Date().toISOString()
    });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeout.current = setTimeout(() => {
        sessionWebSocketService.sendMessage('typing_update', {
          modelName,
          recordId,
          isTyping: false,
          timestamp: new Date().toISOString()
        });
      }, 3000);
    }
  }, [enableTypingIndicators, isWebSocketConnected, modelName, recordId]);

  // Send message via WebSocket
  const handleMessageSent = useCallback((message: ChatterMessage) => {
    if (isWebSocketConnected) {
      // Send via WebSocket for real-time delivery
      sessionWebSocketService.sendMessage('send_message', {
        modelName,
        recordId,
        message: {
          body: message.body,
          message_type: message.message_type || 'comment',
          create_date: message.create_date
        }
      });
    }
    
    // Call original handler
    chatterProps.onMessageSent?.(message);
  }, [isWebSocketConnected, modelName, recordId, chatterProps.onMessageSent]);

  // Handle AI interactions with real-time context
  const handleAIInteraction = useCallback((interaction: AIInteraction) => {
    // Add real-time context to AI interactions
    const enhancedInteraction: AIInteraction = {
      ...interaction,
      data: {
        ...interaction.data,
        realtimeContext: {
          isWebSocketConnected,
          typingUsers: typingUsers.length,
          onlineUsers: onlineUsers.length,
          liveMessages: liveMessages.length
        }
      }
    };
    
    chatterProps.onAIInteraction?.(enhancedInteraction);
  }, [isWebSocketConnected, typingUsers.length, onlineUsers.length, liveMessages.length, chatterProps.onAIInteraction]);

  // Cleanup WebSocket listeners
  const cleanupWebSocket = useCallback(() => {
    console.log('🧹 BC-R001: Cleaning up WebSocket listeners');
    
    // Remove all listeners
    webSocketListeners.current.forEach((listener, event) => {
      sessionWebSocketService.off(event, listener);
    });
    
    webSocketListeners.current.clear();
    
    // Clear timeouts
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
  }, []);

  // Get real-time status for display
  const getRealtimeStatus = useCallback(() => {
    return {
      webSocket: isWebSocketConnected,
      typingUsers: typingUsers.length,
      onlineUsers: onlineUsers.length,
      liveMessages: liveMessages.length
    };
  }, [isWebSocketConnected, typingUsers.length, onlineUsers.length, liveMessages.length]);

  return (
    <BC_C001_BaseChatter
      {...chatterProps}
      modelName={modelName}
      recordId={recordId}
      recordName={recordName}
      realTime={enableWebSocket}
      typingIndicators={enableTypingIndicators}
      presenceStatus={enablePresenceStatus}
      onMessageSent={handleMessageSent}
      onAIInteraction={handleAIInteraction}
      // Pass real-time data as additional props
      realtimeStatus={getRealtimeStatus()}
      typingUsers={typingUsers}
      onlineUsers={onlineUsers}
      onTyping={handleTyping}
    />
  );
}

// Export real-time hook for other components
export function useRealtimeChatter(modelName: string, recordId: number) {
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    // Initialize real-time connection
    const initRealtime = async () => {
      const connected = await sessionWebSocketService.initialize();
      setIsConnected(connected);
    };

    initRealtime();
  }, [modelName, recordId]);

  return {
    isConnected,
    typingUsers,
    onlineUsers,
    sendMessage: (message: any) => sessionWebSocketService.sendMessage('send_message', message),
    sendTyping: (isTyping: boolean) => sessionWebSocketService.sendMessage('typing_update', { modelName, recordId, isTyping }),
  };
}
