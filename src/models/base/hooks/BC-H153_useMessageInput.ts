/**
 * BC-H153_useMessageInput.ts - Custom Hook for Message Input Management
 * 
 * Handles:
 * - Message text state and validation
 * - @mention detection and user selection
 * - Typing indicator management
 * - Draft message persistence
 * - Input focus management
 * - Character count and limits
 * 
 * Usage:
 * const { 
 *   messageText,
 *   setMessageText,
 *   canSend,
 *   mentions,
 *   sendMessage,
 *   clearInput 
 * } = useMessageInput(channelId, onSendCallback);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MentionData {
  query: string;
  position: number;
  isActive: boolean;
}

interface UseMessageInputReturn {
  // Text state
  messageText: string;
  setMessageText: (text: string) => void;
  
  // Validation
  canSend: boolean;
  characterCount: number;
  isNearLimit: boolean;
  
  // Mentions
  mentionData: MentionData;
  insertMention: (username: string) => void;
  
  // Actions
  sendMessage: () => Promise<void>;
  clearInput: () => void;
  focusInput: () => void;
  
  // Typing
  startTyping: () => void;
  stopTyping: () => void;
  
  // Draft
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
}

export function useMessageInput(
  channelId: number,
  onSendMessage: (text: string) => Promise<void>,
  maxLength: number = 4000
): UseMessageInputReturn {
  
  // State
  const [messageText, setMessageText] = useState('');
  const [mentionData, setMentionData] = useState<MentionData>({
    query: '',
    position: -1,
    isActive: false,
  });

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const draftKeyRef = useRef(`message_draft_${channelId}`);

  // Update draft key when channel changes
  useEffect(() => {
    draftKeyRef.current = `message_draft_${channelId}`;
    loadDraft();
  }, [channelId]);

  // Handle mention detection
  useEffect(() => {
    detectMentions(messageText);
  }, [messageText]);

  // Auto-save draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (messageText.trim()) {
        saveDraft();
      }
    }, 1000); // Save draft after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [messageText]);

  const detectMentions = (text: string) => {
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      // No @ symbol found
      setMentionData({
        query: '',
        position: -1,
        isActive: false,
      });
      return;
    }

    const textAfterAt = text.substring(lastAtIndex + 1);
    const spaceIndex = textAfterAt.indexOf(' ');
    const newlineIndex = textAfterAt.indexOf('\n');
    
    // Find the first whitespace character
    const endIndex = Math.min(
      spaceIndex === -1 ? Infinity : spaceIndex,
      newlineIndex === -1 ? Infinity : newlineIndex
    );

    if (endIndex === Infinity && textAfterAt.length > 0) {
      // Still typing a mention
      setMentionData({
        query: textAfterAt,
        position: lastAtIndex,
        isActive: true,
      });
    } else {
      // Mention completed or cancelled
      setMentionData({
        query: '',
        position: -1,
        isActive: false,
      });
    }
  };

  const insertMention = useCallback((username: string) => {
    if (mentionData.position === -1) return;

    const beforeMention = messageText.substring(0, mentionData.position);
    const afterMention = messageText.substring(mentionData.position + mentionData.query.length + 1);
    
    const newText = `${beforeMention}@${username} ${afterMention}`;
    setMessageText(newText);
    
    // Clear mention state
    setMentionData({
      query: '',
      position: -1,
      isActive: false,
    });
  }, [messageText, mentionData]);

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      // TODO: Emit typing start event to chat service
      console.log(`⌨️ Started typing in channel ${channelId}`);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000); // Stop typing after 3 seconds of inactivity
  }, [channelId]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      // TODO: Emit typing stop event to chat service
      console.log(`⌨️ Stopped typing in channel ${channelId}`);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [channelId]);

  const sendMessage = useCallback(async () => {
    const trimmedText = messageText.trim();
    if (!trimmedText) return;

    try {
      // Stop typing indicator
      stopTyping();
      
      // Clear input immediately for better UX
      const textToSend = trimmedText;
      setMessageText('');
      
      // Clear draft
      await AsyncStorage.removeItem(draftKeyRef.current);
      
      // Send message
      await onSendMessage(textToSend);
      
    } catch (error) {
      // Restore message text on failure
      setMessageText(trimmedText);
      throw error;
    }
  }, [messageText, onSendMessage, stopTyping]);

  const clearInput = useCallback(() => {
    setMessageText('');
    setMentionData({
      query: '',
      position: -1,
      isActive: false,
    });
    stopTyping();
    
    // Clear draft
    AsyncStorage.removeItem(draftKeyRef.current).catch(console.warn);
  }, [stopTyping]);

  const focusInput = useCallback(() => {
    // This would be handled by the component using this hook
    // by maintaining a ref to the TextInput
  }, []);

  const saveDraft = useCallback(async () => {
    try {
      if (messageText.trim()) {
        await AsyncStorage.setItem(draftKeyRef.current, messageText);
      } else {
        await AsyncStorage.removeItem(draftKeyRef.current);
      }
    } catch (error) {
      console.warn('Failed to save message draft:', error);
    }
  }, [messageText]);

  const loadDraft = useCallback(async () => {
    try {
      const draft = await AsyncStorage.getItem(draftKeyRef.current);
      if (draft) {
        setMessageText(draft);
      }
    } catch (error) {
      console.warn('Failed to load message draft:', error);
    }
  }, []);

  // Handle text change with typing indicator
  const handleTextChange = useCallback((text: string) => {
    if (text.length <= maxLength) {
      setMessageText(text);
      
      // Manage typing indicator
      if (text.trim()) {
        startTyping();
      } else {
        stopTyping();
      }
    }
  }, [maxLength, startTyping, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  // Computed values
  const canSend = messageText.trim().length > 0;
  const characterCount = messageText.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return {
    // Text state
    messageText,
    setMessageText: handleTextChange,
    
    // Validation
    canSend,
    characterCount,
    isNearLimit,
    
    // Mentions
    mentionData,
    insertMention,
    
    // Actions
    sendMessage,
    clearInput,
    focusInput,
    
    // Typing
    startTyping,
    stopTyping,
    
    // Draft
    saveDraft,
    loadDraft,
  };
}
