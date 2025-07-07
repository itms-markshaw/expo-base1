/**
 * BC-C008_AttachmentRenderer - Enhanced attachment renderer with smooth UX
 * Component Reference: BC-C008
 * 
 * Provides smooth attachment rendering with progress tracking, caching, and proper image display
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
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import attachmentService, { AttachmentDownload, DownloadProgress } from '../services/BC-S007_AttachmentService';

interface AttachmentRendererProps {
  attachment: AttachmentDownload;
  style?: any;
  maxWidth?: number;
  maxHeight?: number;
  onPress?: () => void;
  onLongPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AttachmentRenderer({ 
  attachment, 
  style, 
  maxWidth = 150, 
  maxHeight = 150,
  onPress,
  onLongPress
}: AttachmentRendererProps) {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  const mimeCategory = attachmentService.getMimeTypeCategory(attachment.mimetype);
  const fileSize = attachmentService.formatFileSize(attachment.file_size);

  useEffect(() => {
    // Animate in when component mounts
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-download images for inline viewing
    if (mimeCategory === 'image') {
      handleAutoDownload();
    }
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

  const handleAutoDownload = async () => {
    if (isLoading || localPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const path = await attachmentService.downloadAttachment(
        attachment,
        (progress) => {
          setDownloadProgress(progress);
        }
      );
      
      setLocalPath(path);
      setDownloadProgress(null);
      console.log(`✅ Auto-downloaded image for inline viewing: ${attachment.filename}`);
      
    } catch (downloadError) {
      console.error('Auto-download failed:', downloadError);
      setError('Failed to load image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualDownload = async () => {
    if (isLoading) return;

    console.log('📎 Manual download requested:', {
      attachmentId: attachment.id,
      filename: attachment.filename,
      attachment
    });

    setIsLoading(true);
    setError(null);

    try {
      // Request permissions for saving to device
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to download files.');
        return;
      }

      const path = await attachmentService.downloadAttachment(
        attachment,
        (progress) => {
          setDownloadProgress(progress);
        }
      );
      
      setLocalPath(path);
      setDownloadProgress(null);

      // Save to media library for images
      if (mimeCategory === 'image') {
        const asset = await MediaLibrary.createAssetAsync(path);
        await MediaLibrary.createAlbumAsync('ExpoApp Downloads', asset, false);
        Alert.alert('Success', `Image saved to Photos: ${attachment.filename}`);
      } else {
        // For other files, show success message
        Alert.alert(
          'Success', 
          `File downloaded: ${attachment.filename}`,
          [
            { text: 'OK' },
            { text: 'Open', onPress: () => Linking.openURL(path) }
          ]
        );
      }
      
    } catch (downloadError) {
      console.error('Manual download failed:', downloadError);
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

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (localPath && mimeCategory === 'image') {
      // For images, just show they're loaded
      console.log('📸 Image pressed:', attachment.filename);
    } else if (!isLoading) {
      handleManualDownload();
    }
  };

  const handleLongPressAction = () => {
    if (onLongPress) {
      onLongPress();
    } else {
      // Show download options
      Alert.alert(
        'Attachment Options',
        `What would you like to do with "${attachment.filename}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Download', 
            onPress: () => handleManualDownload()
          },
          { 
            text: 'Open', 
            onPress: () => handlePress()
          },
        ]
      );
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
        <View style={[styles.container, { width: maxWidth, height: maxHeight }]}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="broken-image" size={40} color="#FF3B30" />
            <Text style={styles.errorText}>Failed to load</Text>
          </View>
          <View style={styles.filenameOverlay}>
            <Text style={styles.filenameText} numberOfLines={1}>
              {attachment.filename}
            </Text>
          </View>
        </View>
      );
    }

    // Show download progress for images
    if ((isLoading || downloadProgress) && mimeCategory === 'image') {
      return (
        <View style={[styles.container, { width: maxWidth, height: maxHeight }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>
              {Math.round((downloadProgress?.progress || 0) * 100)}%
            </Text>
          </View>
          <View style={styles.filenameOverlay}>
            <Text style={styles.filenameText} numberOfLines={1}>
              {attachment.filename}
            </Text>
          </View>
        </View>
      );
    }

    // Show downloaded image
    if (localPath && mimeCategory === 'image') {
      return (
        <View style={[styles.container, { width: maxWidth, height: maxHeight }]}>
          <Image 
            source={{ uri: localPath }}
            style={[styles.image, { width: maxWidth, height: maxHeight }]}
            resizeMode="cover"
            onError={() => {
              console.log(`❌ Failed to display downloaded image: ${attachment.filename}`);
              setError('Failed to display image');
              setImageLoaded(false);
            }}
            onLoad={() => {
              console.log(`✅ Successfully displayed downloaded image: ${attachment.filename}`);
              setImageLoaded(true);
            }}
          />
          <View style={styles.filenameOverlay}>
            <Text style={styles.filenameText} numberOfLines={1}>
              {attachment.filename}
            </Text>
          </View>
        </View>
      );
    }

    // Show file attachment button for non-images or non-downloaded files
    return (
      <View style={styles.fileAttachment}>
        {renderFileIcon()}
        <View style={styles.fileInfo}>
          <Text style={styles.filename} numberOfLines={2}>
            {attachment.filename}
          </Text>
          <Text style={styles.fileSize}>{fileSize}</Text>
        </View>
        {!isLoading && <MaterialIcons name="download" size={20} color="#007AFF" />}
        {isLoading && <ActivityIndicator size="small" color="#007AFF" />}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        { opacity: fadeAnimation },
        style
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPressAction}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  image: {
    borderRadius: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorText: {
    marginTop: 8,
    fontSize: 10,
    color: '#FF3B30',
    textAlign: 'center',
  },
  filenameOverlay: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  filenameText: {
    color: 'white',
    fontSize: 9,
    textAlign: 'center',
  },
  fileAttachment: {
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
});

export default AttachmentRenderer;
