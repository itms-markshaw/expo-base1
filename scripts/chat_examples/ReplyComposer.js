import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../contexts/ThemeContext';

const ReplyComposer = ({
  replyToMessage,
  messageText,
  onMessageChange,
  onSend,
  onClearReply,
  onAttachmentPress,
  sending = false
}) => {
  const { colors } = useTheme();

  // Get reply preview text
  const getReplyPreviewText = (message) => {
    if (!message) return '';
    
    const text = message.cleanBody || message.body || '';
    // Strip HTML tags and limit to 50 characters
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    return cleanText.length > 50 ? `${cleanText.substring(0, 50)}...` : cleanText;
  };

  // Get author name for reply
  const getAuthorName = (message) => {
    if (!message) return 'Unknown';
    return message.authorName || message.author_id?.[1] || 'Unknown';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Reply Context */}
      {replyToMessage && (
        <View style={[styles.replyContext, { backgroundColor: colors.background }]}>
          <View style={styles.replyIndicator} />
          <View style={styles.replyContent}>
            <View style={styles.replyHeader}>
              <Icon name="reply" size={16} color={colors.primary} />
              <Text style={[styles.replyToText, { color: colors.primary }]}>
                Reply to {getAuthorName(replyToMessage)}
              </Text>
              <TouchableOpacity
                onPress={onClearReply}
                style={styles.clearReplyButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text 
              style={[styles.replyPreview, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {getReplyPreviewText(replyToMessage)}
            </Text>
          </View>
        </View>
      )}

      {/* Message Input */}
      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onAttachmentPress}
          style={[styles.attachmentButton, { backgroundColor: colors.background }]}
          disabled={sending}
        >
          <Icon name="paperclip" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={messageText}
          onChangeText={onMessageChange}
          placeholder="Message"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={4000}
          editable={!sending}
          textAlignVertical="top"
        />

        <TouchableOpacity
          onPress={onSend}
          style={[
            styles.sendButton,
            { 
              backgroundColor: messageText.trim() ? colors.primary : colors.background,
              opacity: sending ? 0.6 : 1
            }
          ]}
          disabled={!messageText.trim() || sending}
        >
          <Icon 
            name={sending ? "clock-outline" : "send"} 
            size={20} 
            color={messageText.trim() ? colors.onPrimary : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  replyContext: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  replyIndicator: {
    width: 3,
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
    marginRight: 12,
    alignSelf: 'stretch',
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyToText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  clearReplyButton: {
    padding: 4,
  },
  replyPreview: {
    fontSize: 14,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attachmentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default ReplyComposer;
