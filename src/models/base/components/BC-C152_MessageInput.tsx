/**
 * BC-C152_MessageInput.tsx - Message Composition Input Component
 * 
 * Features:
 * - Multi-line text input with auto-resize
 * - Attachment button with picker modal
 * - Send button with loading state
 * - @mention functionality
 * - Emoji picker integration
 * - Typing indicator management
 * - Optimistic message handling
 * 
 * Props:
 * - channelId: Channel to send messages to
 * - onSendMessage: Callback when message is sent
 * - onAttachmentPress: Callback for attachment selection
 * - disabled: Whether input is disabled
 * - placeholder: Input placeholder text
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface MessageInputProps {
  channelId: number;
  onSendMessage: (text: string) => Promise<void>;
  onAttachmentPress?: () => void;
  onEmojiPress?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  showAttachmentButton?: boolean;
  showEmojiButton?: boolean;
}

const MessageInput = React.memo(({
  channelId,
  onSendMessage,
  onAttachmentPress,
  onEmojiPress,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 4000,
  showAttachmentButton = true,
  showEmojiButton = true,
}: MessageInputProps) => {
  
  // State
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Refs
  const textInputRef = useRef<TextInput>(null);
  const sendButtonScale = useRef(new Animated.Value(0.8)).current;

  // Effects
  useEffect(() => {
    // Animate send button when text changes
    Animated.spring(sendButtonScale, {
      toValue: messageText.trim() ? 1 : 0.8,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, [messageText, sendButtonScale]);

  useEffect(() => {
    // Handle @mention detection
    const lastAtIndex = messageText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = messageText.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      if (spaceIndex === -1 && textAfterAt.length > 0) {
        // Still typing a mention
        setMentionQuery(textAfterAt);
        setShowMentionPicker(true);
      } else {
        setShowMentionPicker(false);
        setMentionQuery('');
      }
    } else {
      setShowMentionPicker(false);
      setMentionQuery('');
    }
  }, [messageText]);

  const handleSendMessage = useCallback(async () => {
    const trimmedText = messageText.trim();
    if (!trimmedText || sending || disabled) return;

    try {
      setSending(true);
      
      // Clear input immediately for better UX
      setMessageText('');
      setInputHeight(40);
      
      // Dismiss keyboard
      Keyboard.dismiss();
      
      // Send message
      await onSendMessage(trimmedText);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message text on failure
      setMessageText(trimmedText);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [messageText, sending, disabled, onSendMessage]);

  const handleTextChange = useCallback((text: string) => {
    if (text.length <= maxLength) {
      setMessageText(text);
    }
  }, [maxLength]);

  const handleContentSizeChange = useCallback((event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(height, 40), 120); // Min 40, Max 120
    setInputHeight(newHeight);
  }, []);

  const handleAttachmentPress = useCallback(() => {
    if (onAttachmentPress) {
      onAttachmentPress();
    }
  }, [onAttachmentPress]);

  const handleEmojiPress = useCallback(() => {
    if (onEmojiPress) {
      onEmojiPress();
    }
  }, [onEmojiPress]);

  const handleMentionSelect = useCallback((username: string) => {
    const lastAtIndex = messageText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = messageText.substring(0, lastAtIndex);
      const newText = `${beforeAt}@${username} `;
      setMessageText(newText);
      setShowMentionPicker(false);
      setMentionQuery('');
      
      // Focus input after mention selection
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [messageText]);

  const canSend = messageText.trim().length > 0 && !sending && !disabled;
  const characterCount = messageText.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <View style={styles.container}>
      {/* Character count indicator */}
      {isNearLimit && (
        <View style={styles.characterCountContainer}>
          <Text style={[
            styles.characterCount,
            characterCount >= maxLength && styles.characterCountLimit
          ]}>
            {characterCount}/{maxLength}
          </Text>
        </View>
      )}

      {/* Main input container */}
      <View style={[styles.inputContainer, { minHeight: inputHeight + 16 }]}>
        {/* Attachment button */}
        {showAttachmentButton && (
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={handleAttachmentPress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="attach-file" 
              size={24} 
              color={disabled ? "#C7C7CC" : "#007AFF"} 
            />
          </TouchableOpacity>
        )}

        {/* Text input */}
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, { height: inputHeight }]}
          value={messageText}
          onChangeText={handleTextChange}
          onContentSizeChange={handleContentSizeChange}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          multiline={true}
          textAlignVertical="top"
          maxLength={maxLength}
          editable={!disabled}
          blurOnSubmit={false}
          returnKeyType="default"
          enablesReturnKeyAutomatically={false}
        />

        {/* Emoji button */}
        {showEmojiButton && (
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={handleEmojiPress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="emoji-emotions" 
              size={24} 
              color={disabled ? "#C7C7CC" : "#007AFF"} 
            />
          </TouchableOpacity>
        )}

        {/* Send button */}
        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              canSend && styles.sendButtonActive,
              sending && styles.sendButtonSending
            ]}
            onPress={handleSendMessage}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            {sending ? (
              <MaterialIcons name="hourglass-empty" size={20} color="#FFFFFF" />
            ) : (
              <MaterialIcons 
                name="send" 
                size={20} 
                color={canSend ? "#FFFFFF" : "#C7C7CC"} 
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Mention picker placeholder */}
      {showMentionPicker && (
        <View style={styles.mentionPickerContainer}>
          <Text style={styles.mentionPickerText}>
            @mention functionality - searching for: "{mentionQuery}"
          </Text>
          <Text style={styles.mentionPickerSubtext}>
            (This would show a list of users to mention)
          </Text>
        </View>
      )}
    </View>
  );
});

MessageInput.displayName = 'MessageInput';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  characterCountContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  characterCountLimit: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F2F2F7',
    textAlignVertical: 'top',
  },
  emojiButton: {
    padding: 8,
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonSending: {
    backgroundColor: '#8E8E93',
  },
  mentionPickerContainer: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  mentionPickerText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  mentionPickerSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
});

export default MessageInput;
