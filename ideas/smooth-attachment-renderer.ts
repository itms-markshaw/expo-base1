/**
 * Smooth Attachment Renderer - Better UX for attachment downloads and viewing
 * Fixes the choppy experience you mentioned
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { Audio } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import enhancedAttachmentService, { AttachmentDownload, DownloadProgress } from '../services/EnhancedAttachmentService';

interface AttachmentRendererProps {
  attachment: AttachmentDownload;
  style?: any;
  maxWidth?: number;
  maxHeight?: number;
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AttachmentRenderer({ 
  attachment, 
  style, 
  maxWidth = SCREEN_WIDTH * 0.7, 
  maxHeight = 300,
  onPress 
}: AttachmentRendererProps) {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  const mimeCategory = enhancedAttachmentService.getMimeTypeCategory(attachment.mimetype);
  const fileSize = enhancedAttachmentService.formatFileSize(attachment.file_size);

  useEffect(() => {
    // Animate in when component mounts
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Animate progress bar
    if (downloadProgress) {
      Animated.timing(progressAnimation, {
        toValue: downloadProgress.progress,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [downloadProgress]);

  const handleDownload = async () => {
    if (isLoading || localPath) return;

    console.log('📎 Attachment pressed:', {
      attachmentId: attachment.id,
      filename: attachment.filename,
      attachment
    });

    setIsLoading(true);
    setError(null);

    try {
      const path = await enhancedAttachmentService.downloadAttachment(
        attachment,
        (progress) => {
          setDownloadProgress(progress);
        }
      );
      
      setLocalPath(path);
      setDownloadProgress(null);
      
      // Auto-open certain file types
      if (mimeCategory === 'image' || mimeCategory === 'video') {
        // Images and videos will render inline
      } else {
        // For documents, offer to open
        handleFileOpen(path);
      }
      
    } catch (downloadError) {
      console.error('Download failed:', downloadError);
      setError('Download failed. Please try again.');
      Alert.alert(
        'Download Failed',
        `Failed to download ${attachment.filename}. Please check your connection and try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileOpen = async (filePath: string) => {
    try {
      if (mimeCategory === 'document') {
        // Open document in system viewer
        await WebBrowser.openBrowserAsync(filePath);
      } else {
        // Share file for other types
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (localPath) {
      handleFileOpen(localPath);
    } else if (!isLoading) {
      handleDownload();
    }
  };

  const renderProgressBar = () => {
    if (!downloadProgress || downloadProgress.status === 'cached') return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(downloadProgress.progress * 100)}%
        </Text>
      </View>
    );
  };

  const renderFileIcon = () => {
    const iconMap = {
      image: 'image',
      video: 'video-library',
      audio: 'audio-track',
      document: 'description',
      other: 'attach-file',
    };

    return (
      <MaterialIcons 
        name={iconMap[mimeCategory] as any} 
        size={24} 
        color="#666" 
      />
    );
  };

  const renderContent = () => {
    // Show error state
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              handleDownload();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Show download progress
    if (isLoading || downloadProgress) {
      return (
        <View style={styles.downloadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.downloadingText}>
            {downloadProgress?.status === 'downloading' 
              ? `Downloading... ${Math.round((downloadProgress?.progress || 0) * 100)}%`
              : 'Preparing download...'
            }
          </Text>
          {renderProgressBar()}
        </View>
      );
    }

    // Show downloaded content
    if (localPath) {
      switch (mimeCategory) {
        case 'image':
          return (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: localPath }}
                style={[
                  styles.image,
                  { maxWidth, maxHeight }
                ]}
                resizeMode="contain"
                onError={() => setError('Failed to load image')}
              />
            </View>
          );

        case 'video':
          return (
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: localPath }}
                style={[
                  styles.video,
                  { maxWidth, maxHeight: Math.min(maxHeight, 200) }
                ]}
                useNativeControls
                resizeMode="contain"
                shouldPlay={false}
              />
            </View>
          );

        case 'audio':
          return (
            <AudioPlayer filePath={localPath} filename={attachment.filename} />
          );

        default:
          return (
            <View style={styles.documentPreview}>
              {renderFileIcon()}
              <View style={styles.documentInfo}>
                <Text style={styles.documentName} numberOfLines={2}>
                  {attachment.filename}
                </Text>
                <Text style={styles.documentSize}>{fileSize}</Text>
                <Text style={styles.documentAction}>Tap to open</Text>
              </View>
            </View>
          );
      }
    }

    // Show download button
    return (
      <View style={styles.downloadContainer}>
        {renderFileIcon()}
        <View style={styles.fileInfo}>
          <Text style={styles.filename} numberOfLines={2}>
            {attachment.filename}
          </Text>
          <Text style={styles.fileSize}>{fileSize}</Text>
        </View>
        <MaterialIcons name="download" size={20} color="#007AFF" />
      </View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnimation },
        style
      ]}
    >
      <TouchableOpacity 
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Audio Player Component
function AudioPlayer({ filePath, filename }: { filePath: string; filename: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playPauseAudio = async () => {
    try {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: filePath },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setDuration(status.durationMillis || null);
              setPosition(status.positionMillis || null);
              setIsPlaying(status.isPlaying);
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const formatTime = (millis: number | null) => {
    if (!millis) return '0:00';
    const seconds = Math.floor(millis / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.audioPlayer}>
      <TouchableOpacity 
        style={styles.playButton}
        onPress={playPauseAudio}
      >
        <MaterialIcons 
          name={isPlaying ? 'pause' : 'play-arrow'} 
          size={24} 
          color="#007AFF" 
        />
      </TouchableOpacity>
      
      <View style={styles.audioInfo}>
        <Text style={styles.audioFilename} numberOfLines={1}>
          {filename}
        </Text>
        <View style={styles.audioProgress}>
          <Text style={styles.audioTime}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  downloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  filename: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  downloadingText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#007AFF',
    minWidth: 40,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  retryText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  imageContainer: {
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 12,
  },
  videoContainer: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: {
    borderRadius: 12,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  documentAction: {
    fontSize: 12,
    color: '#007AFF',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  audioFilename: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  audioProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioTime: {
    fontSize: 12,
    color: '#666',
  },
});

export default AttachmentRenderer;