/**
 * Modern Chat Message Bubble Component
 * Provides modern chat bubble interface with proper alignment and rich content
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { ODOO_CONFIG } from '../../../config/odoo';
import AttachmentRenderer from './BC-C008_AttachmentRenderer';
import { AttachmentDownload } from '../services/BC-S007_AttachmentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.75;

interface MessageBubbleProps {
  message: {
    id: string | number;
    body?: string;
    author_id: [number, string] | number;
    date: string;
    attachment_ids?: number[];
    attachments?: any[];
    is_discussion?: boolean;
    is_optimistic?: boolean;
    status?: 'sending' | 'sent' | 'failed';
  };
  previousMessage?: any;
  nextMessage?: any;
  currentUserId?: number;
  currentUserPartnerId?: number; // Add partner ID for proper message alignment
  onLongPress?: () => void;
  onAttachmentPress?: (attachmentId: number, filename: string, attachment: any) => void;
  onAttachmentLongPress?: (attachmentId: number, filename: string, attachment: any) => void;
}

export default function MessageBubble({
  message,
  previousMessage,
  nextMessage,
  currentUserId,
  currentUserPartnerId,
  onLongPress,
  onAttachmentPress,
}: MessageBubbleProps) {



  // Handle long press with attachment options
  const handleAttachmentLongPress = (attachmentId: number, filename: string, attachment: any) => {
    Alert.alert(
      'Attachment Options',
      `What would you like to do with "${filename}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => onAttachmentPress?.(attachmentId, filename, attachment)
        },
      ]
    );
  };

  // Determine if this is the current user's message
  let messageAuthorId: number | null = null;

  if (Array.isArray(message.author_id) && message.author_id.length > 0) {
    messageAuthorId = message.author_id[0];
  } else if (typeof message.author_id === 'number') {
    messageAuthorId = message.author_id;
  } else if (typeof message.author_id === 'string') {
    // Parse XML-RPC string format
    const match = message.author_id.match(/<value><int>(\d+)<\/int>/);
    if (match) {
      messageAuthorId = parseInt(match[1]);
    }
  }

  // Parse current user partner ID if it's a string
  let parsedCurrentUserPartnerId = currentUserPartnerId;
  if (typeof currentUserPartnerId === 'string') {
    const match = currentUserPartnerId.match(/<value><int>(\d+)<\/int>/);
    if (match) {
      parsedCurrentUserPartnerId = parseInt(match[1]);
    }
  }

  // Check if this is the current user's message
  // In Odoo, messages can be authored by partner_id but the user_id is different
  // We need to check both the user ID and partner ID
  const isOwnMessage = messageAuthorId === currentUserId || messageAuthorId === parsedCurrentUserPartnerId;

  // Debug logging for message alignment
  console.log(`💬 Message ${message.id} alignment check:`, {
    currentUserId,
    currentUserPartnerId,
    parsedCurrentUserPartnerId,
    author_id: message.author_id,
    messageAuthorId,
    isOwnMessage,
    authorType: typeof message.author_id
  });

  // Show avatar for other users (first message in group from same author)
  const showAvatar = !isOwnMessage && (!nextMessage ||
    (Array.isArray(nextMessage.author_id) ? nextMessage.author_id[0] : nextMessage.author_id) !== messageAuthorId);

  // Only show author name for group chats and only for the first message in a group from same author
  const showAuthor = false; // Disabled as per user request - no sender names on every message

  // Show timestamp (5 minutes gap or last message)
  const showTimestamp = !nextMessage ||
    new Date(message.date).getTime() - new Date(nextMessage.date).getTime() > 300000;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getAuthorName = () => {
    // Try processed author names first (from chat service)
    if ((message as any).cleanAuthorName) {
      return (message as any).cleanAuthorName;
    }

    if ((message as any).authorName) {
      return (message as any).authorName;
    }

    if ((message as any).author_name) {
      return (message as any).author_name;
    }

    if (Array.isArray(message.author_id) && message.author_id.length > 1) {
      let authorName = message.author_id[1];

      // Clean up company name from author (e.g., "ITMS Group Pty Ltd, Mark Shaw" -> "Mark Shaw")
      if (authorName && authorName.includes(',')) {
        const parts = authorName.split(',').map(part => part.trim());
        // Take the last part which should be the person's name
        if (parts.length > 1) {
          authorName = parts[parts.length - 1];
        }
      }

      return authorName;
    }

    if ((message as any).email_from) {
      return (message as any).email_from;
    }

    return 'Unknown User';
  };

  // Helper function to check if message has attachments
  const checkHasAttachments = (): boolean => {
    // Check enriched attachments first
    if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
      return true;
    }

    // Check XML-RPC format
    if (typeof message.attachment_ids === 'string' && message.attachment_ids.includes('<value><int>')) {
      return true;
    }

    // Check regular array format
    if (Array.isArray(message.attachment_ids) && message.attachment_ids.length > 0) {
      return true;
    }

    return false;
  };

  // Helper function to get attachment count
  const getAttachmentCount = (): number => {
    // Check enriched attachments first
    if (message.attachments && Array.isArray(message.attachments)) {
      return message.attachments.length;
    }

    // Check XML-RPC format
    if (typeof message.attachment_ids === 'string' && message.attachment_ids.includes('<value><int>')) {
      const matches = message.attachment_ids.match(/<value><int>(\d+)<\/int>/g);
      return matches ? matches.length : 0;
    }

    // Check regular array format
    if (Array.isArray(message.attachment_ids)) {
      return message.attachment_ids.length;
    }

    return 0;
  };

  // Process message body for rich content (similar to chat examples)
  const processMessageBody = (body: string) => {
    if (!body || !body.trim()) return null;

    // Check if the content has HTML tags
    const hasHtmlTags = /<[^>]+>/.test(body);

    if (!hasHtmlTags) {
      // If no HTML tags, return null to use plain text rendering
      return null;
    }

    // Clean up the HTML similar to helpdesk implementation
    let processedBody = body
      // Remove problematic cid: image references
      .replace(/<img[^>]*src="cid:[^"]*"[^>]*>/gi, '<p style="color: #666; font-style: italic;">[Image attachment - view below]</p>')
      // Handle other problematic image sources
      .replace(/<img[^>]*src="[^"]*cid:[^"]*"[^>]*>/gi, '<p style="color: #666; font-style: italic;">[Image attachment - view below]</p>')
      // Clean up empty paragraphs
      .replace(/<p[^>]*>\s*<\/p>/gi, '')
      // Ensure proper paragraph structure
      .replace(/^([^<])/gm, '<p>$1')
      .replace(/([^>])$/gm, '$1</p>');

    // If after processing we only have simple content, return null to use plain text
    const textContent = processedBody.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 50 && !processedBody.includes('<img') && !processedBody.includes('<a')) {
      return null;
    }

    return processedBody;
  };

  const stripHtml = (html: string) => {
    if (!html) return '';

    // First decode HTML entities
    let decoded = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Remove HTML tags
    decoded = decoded.replace(/<[^>]*>/g, '');

    // Clean up extra whitespace
    decoded = decoded.replace(/\s+/g, ' ').trim();

    return decoded;
  };

  const renderMessageContent = () => {
    const processedBody = processMessageBody(message.body || '');
    const plainText = stripHtml(message.body || '');

    // If we have rich HTML content, render it
    if (processedBody && processedBody.trim()) {
      return (
        <View style={styles.htmlContentWrapper}>
          <RenderHtml
            contentWidth={MAX_BUBBLE_WIDTH}
            source={{ html: processedBody }}
            tagsStyles={{
              body: { margin: 0, padding: 0 },
              div: { margin: 0, padding: 0 },
              span: { margin: 0, padding: 0 },
              p: { margin: 0, padding: 0, marginBottom: 4 },
              a: { color: isOwnMessage ? '#FFFFFF' : '#0066CC' },
              img: { maxWidth: '100%', height: 'auto' },
              strong: { fontWeight: 'bold' },
              em: { fontStyle: 'italic' },
              ul: { marginLeft: 16 },
              ol: { marginLeft: 16 },
              li: { marginBottom: 2 }
            }}
            defaultTextProps={{
              style: {
                fontSize: 16,
                color: isOwnMessage ? '#FFFFFF' : '#000000',
                lineHeight: 20
              }
            }}
          />
        </View>
      );
    }

    // Fallback to plain text
    if (plainText && plainText.trim()) {
      return (
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {plainText}
        </Text>
      );
    }

    // Show attachment info if no text content
    const hasAttachments = checkHasAttachments();
    if (hasAttachments) {
      const attachmentCount = getAttachmentCount();
      return (
        <View style={styles.attachmentContainer}>
          <MaterialIcons
            name="attach-file"
            size={20}
            color={isOwnMessage ? '#FFF' : '#007AFF'}
          />
          <Text style={[
            styles.attachmentText,
            { color: isOwnMessage ? '#FFF' : '#007AFF' }
          ]}>
            {attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderInlineAttachments = () => {
    // Parse attachment IDs from various formats
    let attachmentIds: number[] = [];

    // Handle XML-RPC format: "<array><data><value><int>53541</int>"
    if (typeof message.attachment_ids === 'string' && message.attachment_ids.includes('<value><int>')) {
      const matches = message.attachment_ids.match(/<value><int>(\d+)<\/int>/g);
      if (matches) {
        attachmentIds = matches.map((match: string) => {
          const idMatch = match.match(/<value><int>(\d+)<\/int>/);
          return idMatch ? parseInt(idMatch[1]) : null;
        }).filter(Boolean) as number[];
      }
    }
    // Handle regular array format
    else if (Array.isArray(message.attachment_ids)) {
      attachmentIds = message.attachment_ids;
    }

    // Also check if we have enriched attachments directly
    if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
      // Use attachment IDs from enriched attachments if we don't have them from attachment_ids
      if (attachmentIds.length === 0) {
        attachmentIds = message.attachments.map(att => att.id);
      }
    }

    if (attachmentIds.length === 0) {
      return null;
    }

    console.log(`🔗 Rendering attachments for message ${message.id}:`, {
      attachment_ids: message.attachment_ids,
      parsed_attachment_ids: attachmentIds,
      attachments: message.attachments
    });

    return (
      <View style={styles.attachmentsContainer}>
        {attachmentIds.map((attachmentId, index) => {
          // Try to find attachment details
          let attachment = message.attachments?.find(att => att.id === attachmentId);

          // If no attachment details, create a basic one
          if (!attachment) {
            console.log(`⚠️ No attachment details found for ID ${attachmentId}, creating default`);
            attachment = {
              id: attachmentId,
              name: `attachment_${attachmentId}`,
              mimetype: 'image/jpeg' // Assume image
            };
          } else {
            console.log(`✅ Found attachment details for ID ${attachmentId}:`, attachment);
          }

          const isImage = attachment.mimetype?.startsWith('image/');

          if (isImage) {
            // Use the working web/image endpoint that's showing success in logs
            const imageUrl = `${ODOO_CONFIG.baseURL}/web/image/${attachmentId}`;

            console.log(`🖼️ Loading image for attachment ${attachmentId}:`, imageUrl);
            console.log(`🖼️ Attachment details:`, attachment);

            // Convert to AttachmentDownload format
            const attachmentDownload: AttachmentDownload = {
              id: attachmentId,
              filename: attachment.name,
              mimetype: attachment.mimetype || 'image/jpeg',
              file_size: attachment.file_size || 0,
            };

            return (
              <AttachmentRenderer
                key={`attachment-${attachmentId}-${index}`}
                attachment={attachmentDownload}
                maxWidth={150}
                maxHeight={150}
                onPress={() => onAttachmentPress?.(attachmentId, attachment.name, attachment)}
                onLongPress={() => handleAttachmentLongPress(attachmentId, attachment.name, attachment)}
              />
            );
          } else {
            return (
              <TouchableOpacity
                key={`attachment-${attachmentId}-${index}`}
                style={styles.fileAttachment}
                onPress={() => onAttachmentPress?.(attachmentId, attachment.name, attachment)}
                onLongPress={() => handleAttachmentLongPress(attachmentId, attachment.name, attachment)}
              >
                <MaterialIcons name="insert-drive-file" size={16} color={isOwnMessage ? '#FFF' : '#007AFF'} />
                <Text style={[
                  styles.fileAttachmentText,
                  { color: isOwnMessage ? '#FFF' : '#007AFF' }
                ]}>
                  {attachment.name}
                </Text>
              </TouchableOpacity>
            );
          }
        })}
      </View>
    );
  };

  const getMessageStatus = () => {
    if (!isOwnMessage) return null;

    if (message.is_optimistic) {
      if (message.status === 'sending') {
        return <MaterialCommunityIcons name="clock-outline" size={12} color="rgba(255,255,255,0.7)" />;
      } else if (message.status === 'failed') {
        return <MaterialCommunityIcons name="alert-circle-outline" size={12} color="#FF3B30" />;
      }
    }

    // Show read receipt (double check for read messages)
    const isRead = message.is_discussion !== false;
    if (isRead) {
      return (
        <View style={styles.readReceiptContainer}>
          <MaterialCommunityIcons name="check" size={12} color="#4CAF50" style={styles.checkIcon} />
          <MaterialCommunityIcons name="check" size={12} color="#4CAF50" style={styles.doubleCheckIcon} />
        </View>
      );
    } else {
      return <MaterialCommunityIcons name="check" size={12} color="rgba(255,255,255,0.7)" />;
    }
  };

  // Don't render empty messages
  const content = stripHtml(message.body || '');
  const hasAttachments = checkHasAttachments();

  // Debug logging for message structure
  console.log(`🔍 Message ${message.id} structure:`, {
    body: message.body,
    content,
    hasAttachments,
    attachment_ids: message.attachment_ids,
    attachments: message.attachments,
    messageText: content
  });

  if (!content && !hasAttachments) {
    return null;
  }

  // Clean message text
  const messageText = stripHtml(message.body || '');

  // Don't render empty messages UNLESS there are attachments
  if (!messageText.trim() && !hasAttachments) {
    return null;
  }

  return (
    <View style={styles.messageContainer}>
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
      ]}>
        <View style={styles.messageContentContainer}>
          {/* Render message text if it exists and is not just attachment placeholder */}
          {messageText.trim() && !messageText.includes('Attachment (') && (
            <View style={styles.messageTextRow}>
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {messageText}
              </Text>
              <Text style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
              ]}>
                {' '}{formatTime(message.date)}
              </Text>
              {isOwnMessage && (
                <View style={styles.messageStatus}>
                  {getMessageStatus()}
                </View>
              )}
            </View>
          )}

          {/* Render attachments */}
          {renderInlineAttachments()}

          {/* If no text (or only attachment placeholder) but has attachments, still show timestamp */}
          {(!messageText.trim() || messageText.includes('Attachment (')) && hasAttachments && (
            <View style={styles.messageTextRow}>
              <Text style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
              ]}>
                {formatTime(message.date)}
              </Text>
              {isOwnMessage && (
                <View style={styles.messageStatus}>
                  {getMessageStatus()}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 16,
    width: '100%',
  },

  // Message bubble base
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '75%',
    minWidth: 80, // Increased minimum width for better readability
    alignSelf: 'flex-start', // Default to left alignment
  },

  // Message content container
  messageContentContainer: {
    flexDirection: 'column',
  },

  // Message text row with inline timestamp
  messageTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },

  // Message status container
  messageStatus: {
    marginLeft: 4,
    alignSelf: 'flex-end',
  },

  // Own message bubble (iOS blue, right-aligned)
  ownMessageBubble: {
    backgroundColor: '#007AFF', // iOS blue like app theme
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end', // Right align own messages
  },

  // Other message bubble (grey, left-aligned)
  otherMessageBubble: {
    backgroundColor: '#E5E5EA', // Light grey like iMessage
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start', // Left align other messages
  },

  // Message text
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    flex: 0, // Don't expand to fill space
  },
  ownMessageText: {
    color: '#FFFFFF', // White text for iOS blue bubbles
  },
  otherMessageText: {
    color: '#000000', // Black text for grey bubbles
  },

  // Message time
  messageTime: {
    fontSize: 11,
    marginLeft: 6, // Space between text and timestamp
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)', // Light white timestamp for iOS blue bubbles
  },
  otherMessageTime: {
    color: 'rgba(0,0,0,0.5)',
  },

  // Avatar styles
  avatarContainer: {
    position: 'relative',
    marginTop: 4,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  avatarSpacer: {
    width: 32,
    height: 32,
  },



  // Rich content styles
  htmlContentWrapper: {
    flex: 1,
  },

  // Attachment styles
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  fileAttachmentText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Read receipt styles
  readReceiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: -6,
  },
  doubleCheckIcon: {
    marginLeft: -6,
  },

  // Optimistic message styles
  optimisticBubble: {
    opacity: 0.7,
  },
});
