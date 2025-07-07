/**
 * BC-C010_MediaMessageBubble - Rich Media Message Display
 * Component Reference: BC-C010
 * 
 * Universal component for displaying media messages:
 * - Images with progressive loading and optimization
 * - Videos with thumbnails and play controls
 * - Audio messages with waveform visualization
 * - Documents with preview and download options
 * - Smooth animations and modern UI
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { OfflineMessage, MediaAttachment } from '../../mail_message/services/OfflineMessageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_MEDIA_WIDTH = SCREEN_WIDTH * 0.7;

export interface MediaMessageBubbleProps {
  message: OfflineMessage;
  isOwnMessage: boolean;
  onImagePress: (uri: string, type: string) => void;
  onVideoPress: (uri: string) => void;
  onDocumentPress: (uri: string, name?: string) => void;
  onAudioPress: (uri: string) => void;
  theme?: MessageBubbleTheme;
  showSyncStatus?: boolean;
  onRetry?: (message: OfflineMessage) => void;
}

export interface MessageBubbleTheme {
  ownMessageBackground: string;
  otherMessageBackground: string;
  ownMessageText: string;
  otherMessageText: string;
  timestampColor: string;
  primaryColor: string;
  errorColor: string;
  successColor: string;
}

const DEFAULT_THEME: MessageBubbleTheme = {
  ownMessageBackground: '#007AFF',
  otherMessageBackground: '#E5E5EA',
  ownMessageText: '#FFFFFF',
  otherMessageText: '#000000',
  timestampColor: '#8E8E93',
  primaryColor: '#007AFF',
  errorColor: '#FF3B30',
  successColor: '#34C759',
};

/**
 * BC-C010: Media Message Bubble
 * 
 * Features:
 * - Progressive image loading with blur placeholders
 * - Video thumbnails with play overlay
 * - Audio waveform visualization
 * - Document preview with file info
 * - Sync status indicators
 * - Retry functionality for failed uploads
 * - Responsive design for different screen sizes
 */
export default function MediaMessageBubble({
  message,
  isOwnMessage,
  onImagePress,
  onVideoPress,
  onDocumentPress,
  onAudioPress,
  theme = DEFAULT_THEME,
  showSyncStatus = true,
  onRetry
}: MediaMessageBubbleProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Format file size for display
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Format duration for audio/video
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get media URI (prefer local path for offline support)
  const getMediaUri = useCallback((): string => {
    return message.local_media_path || message.server_media_url || '';
  }, [message]);

  // Handle retry for failed messages
  const handleRetry = useCallback(() => {
    if (onRetry && message.sync_status === 'failed') {
      onRetry(message);
    }
  }, [onRetry, message]);

  // Render sync status indicator
  const renderSyncStatus = () => {
    if (!showSyncStatus || !isOwnMessage) return null;

    const getStatusIcon = () => {
      switch (message.sync_status) {
        case 'pending':
          return <MaterialIcons name="schedule" size={12} color={theme.timestampColor} />;
        case 'synced':
          return <MaterialIcons name="done" size={12} color={theme.successColor} />;
        case 'failed':
          return (
            <TouchableOpacity onPress={handleRetry}>
              <MaterialIcons name="error" size={12} color={theme.errorColor} />
            </TouchableOpacity>
          );
        default:
          return null;
      }
    };

    return (
      <View style={styles.syncStatus}>
        {getStatusIcon()}
      </View>
    );
  };

  // Render image content
  const renderImageContent = () => {
    const mediaUri = getMediaUri();
    if (!mediaUri) return null;

    return (
      <TouchableOpacity
        onPress={() => onImagePress(mediaUri, 'image')}
        style={styles.imageContainer}
        disabled={isLoading}
      >
        <Image
          source={{ uri: mediaUri }}
          style={[
            styles.messageImage,
            { maxWidth: MAX_MEDIA_WIDTH }
          ]}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={200}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => setImageError(true)}
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <MaterialIcons name="image" size={24} color="#FFF" />
          </View>
        )}

        {/* Error overlay */}
        {imageError && (
          <View style={styles.errorOverlay}>
            <MaterialIcons name="broken-image" size={24} color="#FFF" />
            <Text style={styles.errorText}>Failed to load</Text>
          </View>
        )}

        {/* File size indicator */}
        {message.media_size && (
          <View style={styles.mediaInfo}>
            <Text style={styles.mediaSizeText}>
              {formatFileSize(message.media_size)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render video content
  const renderVideoContent = () => {
    const mediaUri = getMediaUri();
    if (!mediaUri) return null;

    return (
      <TouchableOpacity
        onPress={() => onVideoPress(mediaUri)}
        style={styles.videoContainer}
      >
        <Image
          source={{ uri: mediaUri }}
          style={[styles.videoThumbnail, { maxWidth: MAX_MEDIA_WIDTH }]}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        
        {/* Play button overlay */}
        <View style={styles.videoPlayOverlay}>
          <View style={styles.playButton}>
            <MaterialIcons name="play-arrow" size={32} color="#FFF" />
          </View>
        </View>

        {/* Duration indicator */}
        {message.media_duration && (
          <View style={styles.videoDuration}>
            <Text style={styles.durationText}>
              {formatDuration(message.media_duration)}
            </Text>
          </View>
        )}

        {/* File size */}
        {message.media_size && (
          <View style={styles.mediaInfo}>
            <Text style={styles.mediaSizeText}>
              {formatFileSize(message.media_size)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render audio content
  const renderAudioContent = () => {
    const mediaUri = getMediaUri();
    if (!mediaUri) return null;

    return (
      <TouchableOpacity
        onPress={() => onAudioPress(mediaUri)}
        style={[
          styles.audioContainer,
          { backgroundColor: isOwnMessage ? theme.ownMessageBackground : theme.otherMessageBackground }
        ]}
      >
        <View style={styles.audioPlayButton}>
          <MaterialIcons
            name="play-arrow"
            size={24}
            color={isOwnMessage ? theme.ownMessageText : theme.otherMessageText}
          />
        </View>

        <View style={styles.audioInfo}>
          <Text style={[
            styles.audioLabel,
            { color: isOwnMessage ? theme.ownMessageText : theme.otherMessageText }
          ]}>
            Voice Message
          </Text>
          {message.media_duration && (
            <Text style={[
              styles.audioDuration,
              { color: isOwnMessage ? theme.ownMessageText : theme.otherMessageText }
            ]}>
              {formatDuration(message.media_duration)}
            </Text>
          )}
        </View>

        <MaterialIcons
          name="mic"
          size={20}
          color={isOwnMessage ? theme.ownMessageText : theme.otherMessageText}
        />
      </TouchableOpacity>
    );
  };

  // Render document content
  const renderDocumentContent = () => {
    const mediaUri = getMediaUri();
    if (!mediaUri) return null;

    const fileName = message.body || 'Document';
    const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';

    return (
      <TouchableOpacity
        onPress={() => onDocumentPress(mediaUri, fileName)}
        style={styles.documentContainer}
      >
        <View style={styles.documentIcon}>
          <MaterialIcons name="description" size={32} color={theme.primaryColor} />
          <Text style={styles.fileExtension}>{fileExtension}</Text>
        </View>

        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={2}>
            {fileName}
          </Text>
          {message.media_size && (
            <Text style={styles.documentSize}>
              {formatFileSize(message.media_size)}
            </Text>
          )}
        </View>

        <MaterialIcons name="download" size={20} color={theme.primaryColor} />
      </TouchableOpacity>
    );
  };

  // Render media content based on type
  const renderMediaContent = () => {
    switch (message.media_type) {
      case 'image':
        return renderImageContent();
      case 'video':
        return renderVideoContent();
      case 'audio':
        return renderAudioContent();
      case 'document':
        return renderDocumentContent();
      default:
        return null;
    }
  };

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {/* Media content */}
      {renderMediaContent()}

      {/* Text content (if any) */}
      {message.body && message.media_type !== 'document' && (
        <Text style={[
          styles.messageText,
          {
            color: isOwnMessage ? theme.ownMessageText : theme.otherMessageText,
            backgroundColor: isOwnMessage ? theme.ownMessageBackground : theme.otherMessageBackground,
          }
        ]}>
          {message.body}
        </Text>
      )}

      {/* Message footer */}
      <View style={styles.messageFooter}>
        <Text style={[styles.timestamp, { color: theme.timestampColor }]}>
          {new Date(message.create_date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
        {renderSyncStatus()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginVertical: 2,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  mediaInfo: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaSizeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '500',
  },
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: 200,
    height: 150,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '500',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    maxWidth: 250,
    gap: 8,
  },
  audioPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfo: {
    flex: 1,
  },
  audioLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  audioDuration: {
    fontSize: 12,
    opacity: 0.8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    maxWidth: 280,
    gap: 12,
  },
  documentIcon: {
    position: 'relative',
    alignItems: 'center',
  },
  fileExtension: {
    position: 'absolute',
    bottom: 2,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    lineHeight: 18,
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '400',
  },
  syncStatus: {
    marginLeft: 8,
  },
});

// Export for BC component registry
export const BC_C010_MediaMessageBubble = MediaMessageBubble;
