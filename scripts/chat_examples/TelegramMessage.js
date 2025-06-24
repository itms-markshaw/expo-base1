import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import PresenceIndicator from '../../../components/PresenceIndicator';
import RenderHtml from 'react-native-render-html';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

const TelegramMessage = ({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  colors,
  onLongPress,
  onPress
}) => {
  const navigation = useNavigation();

  // Get attachment URLs
  const getImagePreviewUrl = (attachment) => {
    const baseUrl = 'https://itmsgroup.com.au';
    return `${baseUrl}/api/v2/image/${attachment.id}/256x256`;
  };

  const getFullImageUrl = (attachment) => {
    const baseUrl = 'https://itmsgroup.com.au';
    return `${baseUrl}/api/v2/image/${attachment.id}`;
  };

  // Handle attachment press
  const handleAttachmentPress = async (attachment) => {
    if (attachment.mimetype?.startsWith('image/')) {
      navigation.navigate('ExpoImageViewer', {
        attachmentId: attachment.id,
        attachmentInfo: attachment,
        title: attachment.name,
      });
    }
  };

  // Process message body for rich content
  const processMessageBody = (body) => {
    if (!body || !body.trim()) return null;

    // Clean up the HTML similar to helpdesk implementation
    return body
      // Remove problematic cid: image references
      .replace(/<img[^>]*src="cid:[^"]*"[^>]*>/gi, '<p style="color: #666; font-style: italic;">[Image attachment - view below]</p>')
      // Handle other problematic image sources
      .replace(/<img[^>]*src="[^"]*cid:[^"]*"[^>]*>/gi, '<p style="color: #666; font-style: italic;">[Image attachment - view below]</p>');
  };
  const getMessageStatus = () => {
    if (message.isOptimistic) {
      if (message.status === 'sending') {
        return <Icon name="clock-outline" size={12} color={colors.textSecondary} />;
      } else if (message.status === 'failed') {
        return <Icon name="alert-circle-outline" size={12} color={colors.error} />;
      }
    }

    // For sent messages, show delivery status (Telegram style)
    if (isOwn && !message.isOptimistic) {
      // Single check for sent, double check for read
      const isRead = message.is_read || message.read_by_all || false;
      if (isRead) {
        return (
          <View style={styles.readReceiptContainer}>
            <Icon name="check" size={12} color="#4CAF50" style={styles.checkIcon} />
            <Icon name="check" size={12} color="#4CAF50" style={styles.doubleCheckIcon} />
          </View>
        );
      } else {
        return <Icon name="check" size={12} color={colors.textSecondary} />;
      }
    }

    return null;
  };

  const getAvatarText = (name) => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatTime = (dateString) => {
    if (message.status === 'sending') return 'sending...';
    if (message.status === 'failed') return 'failed';

    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Use 24-hour format like Telegram
    });
  };

  return (
    <View style={styles.messageContainer}>
      {/* Timestamp (centered, if should show) */}
      {showTimestamp && (
        <View style={styles.timestampContainer}>
          <Text style={[styles.timestampText, { color: colors.textSecondary }]}>
            {new Date(message.create_date).toLocaleDateString() === new Date().toLocaleDateString()
              ? 'TODAY'
              : new Date(message.create_date).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric'
                }).toUpperCase()
            }
          </Text>
        </View>
      )}

      {isOwn ? (
        // Own message - right aligned, no avatar, blue bubble
        <View style={styles.ownMessageContainer}>
          <View style={styles.ownMessageContent}>
            <Text style={[styles.ownMessageTime, { color: colors.textSecondary }]}>
              {formatTime(message.create_date)}
            </Text>
            <TouchableOpacity
              style={[styles.ownMessageBubble, { backgroundColor: '#40C351' }]} // Telegram green
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
            >
              {/* Rich text content */}
              {processMessageBody(message.body) ? (
                <View style={styles.htmlContentWrapper}>
                  <RenderHtml
                    contentWidth={screenWidth * 0.7} // 70% of screen width for own messages
                    source={{ html: processMessageBody(message.body) }}
                    tagsStyles={{
                      body: { margin: 0, padding: 0 },
                      div: { margin: 0, padding: 0 },
                      span: { margin: 0, padding: 0 },
                      p: { margin: 0, padding: 0, marginBottom: 4 },
                      a: { color: '#0066CC' },
                      img: { maxWidth: '100%', height: 'auto' },
                      strong: { fontWeight: 'bold' },
                      em: { fontStyle: 'italic' },
                      ul: { marginLeft: 16 },
                      ol: { marginLeft: 16 },
                      li: { marginBottom: 2 }
                    }}
                    defaultTextProps={{
                      style: { fontSize: 16, color: '#000', lineHeight: 20 } // Black text on green background (Telegram style)
                    }}
                  />
                </View>
              ) : (
                <Text style={[styles.ownMessageText, { color: '#000' }]}>
                  {message.cleanBody || 'No content'}
                </Text>
              )}

              {/* Inline attachments for own messages */}
              {message.attachment_ids && message.attachment_ids.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {message.attachments?.filter(att => att.mimetype?.startsWith('image/')).map((attachment, index) => (
                    <TouchableOpacity
                      key={attachment.id || index}
                      style={styles.inlineImageContainer}
                      onPress={() => handleAttachmentPress(attachment)}
                    >
                      <Image
                        source={{
                          uri: getImagePreviewUrl(attachment)
                        }}
                        style={styles.inlineImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Read receipt for own messages */}
              <View style={styles.ownMessageFooter}>
                {getMessageStatus()}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Other message - left aligned, with avatar, grey bubble
        <View style={styles.otherMessageContainer}>
          {/* Author name and time */}
          {showAvatar && (
            <View style={styles.otherMessageHeader}>
              <Text style={[styles.otherAuthorName, { color: colors.text }]}>
                {message.authorName}
              </Text>
              <Text style={[styles.otherMessageTime, { color: colors.textSecondary }]}>
                {formatTime(message.create_date)}
              </Text>
            </View>
          )}

          <View style={styles.otherMessageContent}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                message.authorAvatar ? (
                  <Image
                    source={{ uri: message.authorAvatar }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
                      {getAvatarText(message.authorName)}
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.avatarSpacer} />
              )}
              {/* Presence indicator */}
              {showAvatar && message.author_id && (
                <View style={styles.presenceContainer}>
                  <PresenceIndicator
                    userId={message.author_id[0]}
                    size="small"
                  />
                </View>
              )}
            </View>

            {/* Message bubble */}
            <TouchableOpacity
              style={[styles.otherMessageBubble, { backgroundColor: '#F1F1F1' }]}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
            >
              {/* Rich text content */}
              {processMessageBody(message.body) ? (
                <View style={styles.htmlContentWrapper}>
                  <RenderHtml
                    contentWidth={screenWidth * 0.7} // 70% of screen width for other messages
                    source={{ html: processMessageBody(message.body) }}
                    tagsStyles={{
                      body: { margin: 0, padding: 0 },
                      div: { margin: 0, padding: 0 },
                      span: { margin: 0, padding: 0 },
                      p: { margin: 0, padding: 0, marginBottom: 4 },
                      a: { color: '#0066CC' },
                      img: { maxWidth: '100%', height: 'auto' },
                      strong: { fontWeight: 'bold' },
                      em: { fontStyle: 'italic' },
                      ul: { marginLeft: 16 },
                      ol: { marginLeft: 16 },
                      li: { marginBottom: 2 }
                    }}
                    defaultTextProps={{
                      style: { fontSize: 16, color: '#666', lineHeight: 20 }
                    }}
                  />
                </View>
              ) : (
                <Text style={[styles.otherMessageText, { color: '#666' }]}>
                  {message.cleanBody || 'No content'}
                </Text>
              )}

              {/* Inline attachments for other messages */}
              {message.attachment_ids && message.attachment_ids.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {message.attachments?.filter(att => att.mimetype?.startsWith('image/')).map((attachment, index) => (
                    <TouchableOpacity
                      key={attachment.id || index}
                      style={styles.inlineImageContainer}
                      onPress={() => handleAttachmentPress(attachment)}
                    >
                      <Image
                        source={{
                          uri: getImagePreviewUrl(attachment)
                        }}
                        style={styles.inlineImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },

  // Timestamp styles
  timestampContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Own message styles (right-aligned, no avatar)
  ownMessageContainer: {
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  ownMessageContent: {
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  ownMessageTime: {
    fontSize: 12,
    marginBottom: 4,
    marginRight: 8,
  },
  ownMessageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    minWidth: 60,
    maxWidth: '100%',
  },
  ownMessageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageFooter: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  // Other message styles (left-aligned, with avatar)
  otherMessageContainer: {
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  otherMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 48, // Space for avatar
  },
  otherAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  otherMessageTime: {
    fontSize: 12,
  },
  otherMessageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  otherMessageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    minWidth: 60,
    maxWidth: '100%',
    marginLeft: 8,
  },
  otherMessageText: {
    fontSize: 16,
    lineHeight: 20,
  },

  // Avatar styles
  avatarContainer: {
    position: 'relative',
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatarSpacer: {
    width: 32,
    height: 32,
  },
  presenceContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
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

  // Rich content styles
  htmlContentWrapper: {
    flex: 1,
  },

  // Attachment styles
  attachmentsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  inlineImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
});

export default TelegramMessage;
