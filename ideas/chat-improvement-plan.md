# Chat App Enhancement Plan: Offline-First Multimedia Messaging

## Current State Analysis

### Strengths ✅
- **Solid Architecture**: Good separation of concerns with services, components, and screens
- **Real-time Foundation**: HTTP longpolling integration with fallback polling
- **Screen Numbering System**: Organized with channel (150s) numbering
- **Offline Awareness**: SQLite integration and cache-first approach
- **Basic Media Support**: Image picker and document picker integration

### Critical Gaps 🚨
- **Incomplete Offline Storage**: Messages not properly persisted to SQLite
- **No Media Optimization**: No compression, caching, or progressive loading
- **Missing Audio/Video**: No recording, playback, or streaming capabilities
- **Poor Sync Strategy**: No conflict resolution or message ordering
- **No Message Encryption**: Security concerns for sensitive communications
- **Limited Media Preview**: No inline image/video preview

## Recommended Expo Technologies

### Core Chat Infrastructure
```typescript
// Enhanced dependencies to add to package.json
{
  "expo-av": "~15.1.6",           // Audio/video recording and playback
  "expo-media-library": "~17.1.7", // Media management and caching
  "expo-image": "~2.1.7",         // Optimized image rendering
  "expo-crypto": "~14.1.4",       // Message encryption/hashing
  "expo-file-system": "~18.1.10", // File management and caching
  "expo-speech": "~13.1.5",       // Text-to-speech for accessibility
  "expo-haptics": "^14.1.4",      // Tactile feedback for interactions
  "expo-network": "~7.1.4",       // Network state monitoring
  "@react-native-async-storage/async-storage": "2.1.2", // Message queue storage
  "react-native-super-grid": "^6.0.1", // Efficient media grid rendering
  "react-native-video": "^6.4.5",  // Video playback with controls
  "react-native-sound": "^0.11.2", // Audio playback optimization
  "react-native-gesture-handler": "~2.24.0", // Swipe-to-reply gestures
}
```

### Media Management Stack
```typescript
// Expo-specific media configuration
export const MediaConfig = {
  image: {
    quality: 0.8,
    allowsEditing: true,
    aspect: [16, 9],
    maxWidth: 1920,
    maxHeight: 1080,
    exif: false, // Remove metadata for privacy
  },
  video: {
    quality: "high",
    maxDuration: 60, // 60 seconds max
    allowsEditing: true,
  },
  audio: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
  },
};
```

## Enhanced Architecture Design

### 1. Offline-First Message Storage

```typescript
// src/models/mail_message/services/OfflineMessageService.ts
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

export class OfflineMessageService {
  private db: SQLite.Database;
  
  async initialize() {
    this.db = await SQLite.openDatabaseAsync('chat_messages.db');
    
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        server_id INTEGER,
        channel_id INTEGER NOT NULL,
        author_id INTEGER,
        author_name TEXT,
        body TEXT,
        message_type TEXT DEFAULT 'text',
        timestamp INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'pending', -- pending, synced, failed
        local_media_path TEXT,
        server_media_url TEXT,
        media_type TEXT, -- image, video, audio, document
        media_size INTEGER,
        media_duration INTEGER, -- for audio/video
        reply_to_id TEXT,
        mentions TEXT, -- JSON array of user IDs
        reactions TEXT, -- JSON object of reactions
        edited_timestamp INTEGER,
        encryption_key TEXT,
        FOREIGN KEY (reply_to_id) REFERENCES messages(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_channel_timestamp ON messages(channel_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON messages(sync_status);
      CREATE INDEX IF NOT EXISTS idx_server_id ON messages(server_id);
    `);
  }
  
  async saveMessage(message: ChatMessage): Promise<string> {
    const localId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${message.channel_id}_${Date.now()}_${Math.random()}`
    );
    
    await this.db.runAsync(
      `INSERT INTO messages (
        id, server_id, channel_id, author_id, author_name, 
        body, message_type, timestamp, sync_status, media_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localId,
        message.server_id || null,
        message.channel_id,
        message.author_id,
        message.author_name,
        message.body,
        message.message_type || 'text',
        Date.now(),
        message.server_id ? 'synced' : 'pending',
        message.media_type || null
      ]
    );
    
    return localId;
  }
  
  async getChannelMessages(channelId: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
    const result = await this.db.getAllAsync(
      'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [channelId, limit, offset]
    );
    
    return result.reverse(); // Chronological order
  }
  
  async syncPendingMessages(): Promise<void> {
    const pendingMessages = await this.db.getAllAsync(
      'SELECT * FROM messages WHERE sync_status = "pending" ORDER BY timestamp ASC'
    );
    
    for (const message of pendingMessages) {
      try {
        const serverId = await this.uploadMessageToServer(message);
        await this.db.runAsync(
          'UPDATE messages SET server_id = ?, sync_status = "synced" WHERE id = ?',
          [serverId, message.id]
        );
      } catch (error) {
        await this.db.runAsync(
          'UPDATE messages SET sync_status = "failed" WHERE id = ?',
          [message.id]
        );
      }
    }
  }
}
```

### 2. Enhanced Media Service

```typescript
// src/models/mail_message/services/MediaMessageService.ts
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Audio from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';

export class MediaMessageService {
  private recordingInstance: Audio.Recording | null = null;
  private mediaCache = new Map<string, string>();
  
  // Image Handling
  async capturePhoto(): Promise<MediaMessage | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: MediaConfig.image.quality,
      allowsEditing: MediaConfig.image.allowsEditing,
      aspect: MediaConfig.image.aspect,
      exif: false, // Remove metadata for privacy
    });
    
    if (result.canceled || !result.assets[0]) return null;
    
    const asset = result.assets[0];
    
    // Compress and optimize
    const optimizedUri = await this.optimizeImage(asset.uri);
    
    // Generate thumbnail
    const thumbnailUri = await this.generateImageThumbnail(optimizedUri);
    
    return {
      uri: optimizedUri,
      thumbnailUri,
      type: 'image',
      mimeType: 'image/jpeg',
      size: asset.fileSize || 0,
      width: asset.width,
      height: asset.height,
    };
  }
  
  async pickImage(): Promise<MediaMessage | null> {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return null;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: MediaConfig.image.quality,
      allowsEditing: true,
      allowsMultipleSelection: true, // Allow multiple images
    });
    
    if (result.canceled || !result.assets[0]) return null;
    
    // Process multiple images
    const processedImages = await Promise.all(
      result.assets.map(async (asset) => {
        const optimizedUri = await this.optimizeImage(asset.uri);
        const thumbnailUri = await this.generateImageThumbnail(optimizedUri);
        
        return {
          uri: optimizedUri,
          thumbnailUri,
          type: 'image',
          mimeType: 'image/jpeg',
          size: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        };
      })
    );
    
    return processedImages[0]; // Return first for simplicity, extend for multiple
  }
  
  // Video Handling
  async captureVideo(): Promise<MediaMessage | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoQuality: ImagePicker.VideoQuality.High,
      videoMaxDuration: MediaConfig.video.maxDuration,
      allowsEditing: true,
    });
    
    if (result.canceled || !result.assets[0]) return null;
    
    const asset = result.assets[0];
    
    // Generate video thumbnail
    const thumbnailUri = await VideoThumbnails.getThumbnailAsync(asset.uri, {
      time: 1000, // 1 second
      quality: 0.8,
    });
    
    return {
      uri: asset.uri,
      thumbnailUri: thumbnailUri.uri,
      type: 'video',
      mimeType: 'video/mp4',
      size: asset.fileSize || 0,
      duration: asset.duration || 0,
      width: asset.width,
      height: asset.height,
    };
  }
  
  // Audio Recording
  async startAudioRecording(): Promise<boolean> {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return false;
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      this.recordingInstance = new Audio.Recording();
      await this.recordingInstance.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      await this.recordingInstance.startAsync();
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }
  
  async stopAudioRecording(): Promise<MediaMessage | null> {
    if (!this.recordingInstance) return null;
    
    try {
      await this.recordingInstance.stopAndUnloadAsync();
      const uri = this.recordingInstance.getURI();
      
      if (!uri) return null;
      
      // Get audio file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      // Generate waveform data (simplified)
      const waveform = await this.generateAudioWaveform(uri);
      
      this.recordingInstance = null;
      
      return {
        uri,
        type: 'audio',
        mimeType: 'audio/m4a',
        size: fileInfo.size || 0,
        duration: 0, // Would need to calculate
        waveform,
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }
  
  // Document Handling
  async pickDocument(): Promise<MediaMessage | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      if (result.canceled || !result.assets[0]) return null;
      
      const asset = result.assets[0];
      
      return {
        uri: asset.uri,
        type: 'document',
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
        name: asset.name,
      };
    } catch (error) {
      console.error('Failed to pick document:', error);
      return null;
    }
  }
  
  // Optimization Helpers
  private async optimizeImage(uri: string): Promise<string> {
    try {
      // Use expo-image for optimization
      const optimizedUri = `${FileSystem.cacheDirectory}optimized_${Date.now()}.jpg`;
      
      // This is a simplified version - you'd implement actual compression
      await FileSystem.copyAsync({ from: uri, to: optimizedUri });
      
      return optimizedUri;
    } catch (error) {
      return uri; // Return original if optimization fails
    }
  }
  
  private async generateImageThumbnail(uri: string): Promise<string> {
    // Generate thumbnail using expo-image-manipulator
    const thumbnailUri = `${FileSystem.cacheDirectory}thumb_${Date.now()}.jpg`;
    
    // Simplified - would use ImageManipulator for actual thumbnails
    await FileSystem.copyAsync({ from: uri, to: thumbnailUri });
    
    return thumbnailUri;
  }
  
  private async generateAudioWaveform(uri: string): Promise<number[]> {
    // Simplified waveform generation
    // In production, you'd analyze the audio file to generate actual waveform data
    return Array(50).fill(0).map(() => Math.random() * 100);
  }
  
  // Media Caching
  async cacheMedia(url: string): Promise<string> {
    if (this.mediaCache.has(url)) {
      return this.mediaCache.get(url)!;
    }
    
    try {
      const fileName = url.split('/').pop() || `cached_${Date.now()}`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, localUri);
      
      if (downloadResult.status === 200) {
        this.mediaCache.set(url, downloadResult.uri);
        return downloadResult.uri;
      }
    } catch (error) {
      console.error('Failed to cache media:', error);
    }
    
    return url; // Return original URL if caching fails
  }
}

interface MediaMessage {
  uri: string;
  thumbnailUri?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  name?: string;
  waveform?: number[];
}
```

### 3. Enhanced Message Components

```typescript
// src/models/mail_message/components/EnhancedMessageBubble.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface EnhancedMessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onLongPress: () => void;
  onImagePress: (uri: string) => void;
  onReplyPress: () => void;
}

export const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({
  message,
  isCurrentUser,
  onLongPress,
  onImagePress,
  onReplyPress,
}) => {
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  }, [onLongPress]);
  
  const playAudio = async () => {
    try {
      if (audioSound) {
        if (isPlaying) {
          await audioSound.pauseAsync();
          setIsPlaying(false);
        } else {
          await audioSound.playAsync();
          setIsPlaying(true);
        }
        return;
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: message.media?.uri },
        { shouldPlay: true, isLooping: false }
      );
      
      setAudioSound(sound);
      setIsPlaying(true);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
          }
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };
  
  const renderMediaContent = () => {
    if (!message.media) return null;
    
    switch (message.media.type) {
      case 'image':
        return (
          <TouchableOpacity
            onPress={() => onImagePress(message.media!.uri)}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri: message.media.uri }}
              style={styles.messageImage}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={200}
            />
            {message.media.size && (
              <Text style={styles.imageSizeLabel}>
                {this.formatFileSize(message.media.size)}
              </Text>
            )}
          </TouchableOpacity>
        );
        
      case 'video':
        return (
          <View style={styles.videoContainer}>
            <Image
              source={{ uri: message.media.thumbnailUri || message.media.uri }}
              style={styles.videoThumbnail}
              contentFit="cover"
            />
            <View style={styles.videoPlayButton}>
              <MaterialIcons name="play-arrow" size={32} color="#FFF" />
            </View>
            {message.media.duration && (
              <Text style={styles.videoDuration}>
                {this.formatDuration(message.media.duration)}
              </Text>
            )}
          </View>
        );
        
      case 'audio':
        return (
          <View style={styles.audioContainer}>
            <TouchableOpacity
              style={styles.audioPlayButton}
              onPress={playAudio}
            >
              <MaterialIcons
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
            
            <View style={styles.audioWaveform}>
              {message.media.waveform?.map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    { height: Math.max(2, height * 0.3) }
                  ]}
                />
              ))}
            </View>
            
            {message.media.duration && (
              <Text style={styles.audioDuration}>
                {this.formatDuration(playbackPosition || message.media.duration)}
              </Text>
            )}
          </View>
        );
        
      case 'document':
        return (
          <View style={styles.documentContainer}>
            <MaterialIcons name="description" size={32} color="#666" />
            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>
                {message.media.name}
              </Text>
              <Text style={styles.documentSize}>
                {this.formatFileSize(message.media.size)}
              </Text>
            </View>
            <MaterialIcons name="download" size={20} color="#007AFF" />
          </View>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Pressable
      onLongPress={handleLongPress}
      style={[
        styles.messageBubble,
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
      ]}
    >
      {/* Reply indicator */}
      {message.replyTo && (
        <View style={styles.replyContainer}>
          <View style={styles.replyLine} />
          <Text style={styles.replyText} numberOfLines={1}>
            {message.replyTo.author_name}: {message.replyTo.body}
          </Text>
        </View>
      )}
      
      {/* Media content */}
      {renderMediaContent()}
      
      {/* Text content */}
      {message.body && (
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserText : styles.otherUserText,
        ]}>
          {message.body}
        </Text>
      )}
      
      {/* Message metadata */}
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>
          {this.formatTime(message.date)}
        </Text>
        
        {isCurrentUser && (
          <View style={styles.messageStatus}>
            {message.sync_status === 'pending' && (
              <MaterialIcons name="schedule" size={12} color="#999" />
            )}
            {message.sync_status === 'synced' && (
              <MaterialIcons name="done" size={12} color="#007AFF" />
            )}
            {message.sync_status === 'failed' && (
              <MaterialIcons name="error" size={12} color="#FF3B30" />
            )}
          </View>
        )}
        
        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <View style={styles.reactionsContainer}>
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <View key={emoji} style={styles.reactionBubble}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={styles.reactionCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
};
```

## Integration Workflow

### 1. Installation & Setup

```bash
# Install new dependencies
npx expo install expo-av expo-media-library expo-image expo-crypto expo-speech expo-haptics

# Update existing dependencies
npx expo install expo-file-system@latest expo-image-picker@latest expo-document-picker@latest
```

### 2. Database Migration

```typescript
// src/models/mail_message/services/DatabaseMigration.ts
export class ChatDatabaseMigration {
  async migrateToV2(db: SQLite.Database) {
    // Add new columns for media support
    await db.execAsync(`
      ALTER TABLE messages ADD COLUMN media_type TEXT;
      ALTER TABLE messages ADD COLUMN media_size INTEGER;
      ALTER TABLE messages ADD COLUMN media_duration INTEGER;
      ALTER TABLE messages ADD COLUMN local_media_path TEXT;
      ALTER TABLE messages ADD COLUMN server_media_url TEXT;
      ALTER TABLE messages ADD COLUMN reply_to_id TEXT;
      ALTER TABLE messages ADD COLUMN mentions TEXT;
      ALTER TABLE messages ADD COLUMN reactions TEXT;
      ALTER TABLE messages ADD COLUMN encryption_key TEXT;
    `);
    
    // Create media cache table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS media_cache (
        id TEXT PRIMARY KEY,
        original_url TEXT NOT NULL,
        local_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        cached_at INTEGER,
        last_accessed INTEGER
      );
    `);
  }
}
```

### 3. Real-time Sync Enhancement

```typescript
// src/models/mail_message/services/RealTimeSyncService.ts
export class RealTimeSyncService {
  private syncQueue: MessageSyncQueue[] = [];
  private isOnline = true;
  
  async initializeRealTimeSync() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      
      if (this.isOnline) {
        this.processSyncQueue();
      }
    });
    
    // Background sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline) {
        this.syncPendingMessages();
      }
    }, 30000);
  }
  
  async queueMessage(message: ChatMessage): Promise<string> {
    // Save to SQLite immediately
    const localId = await offlineMessageService.saveMessage(message);
    
    // Add to sync queue
    this.syncQueue.push({
      localId,
      message,
      attempts: 0,
      timestamp: Date.now(),
    });
    
    // Try immediate sync if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
    
    return localId;
  }
  
  private async processSyncQueue() {
    const pending = this.syncQueue.filter(item => item.attempts < 3);
    
    for (const item of pending) {
      try {
        // Upload media first if present
        if (item.message.media) {
          const mediaUrl = await this.uploadMedia(item.message.media);
          item.message.media.serverUrl = mediaUrl;
        }
        
        // Send message to server
        const serverId = await this.sendMessageToServer(item.message);
        
        // Update local database
        await offlineMessageService.updateSyncStatus(item.localId, 'synced', serverId);
        
        // Remove from queue
        this.syncQueue = this.syncQueue.filter(q => q.localId !== item.localId);
        
      } catch (error) {
        item.attempts++;
        console.warn(`Sync attempt ${item.attempts} failed for message ${item.localId}`);
      }
    }
  }
}
```

## Security Enhancements

### End-to-End Encryption (Optional)

```typescript
// src/models/mail_message/services/EncryptionService.ts
import * as Crypto from 'expo-crypto';

export class MessageEncryptionService {
  async encryptMessage(message: string, channelId: number): Promise<string> {
    // Generate channel-specific encryption key
    const key = await this.getChannelKey(channelId);
    
    // Simple encryption using crypto
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}_${message}`
    );
    
    return encrypted;
  }
  
  async decryptMessage(encryptedMessage: string, channelId: number): Promise<string> {
    // Implement decryption logic
    return encryptedMessage; // Simplified
  }
  
  private async getChannelKey(channelId: number): Promise<string> {
    // Generate or retrieve channel-specific encryption key
    return `channel_${channelId}_key`;
  }
}
```

## Performance Optimizations

### 1. Media Compression & Caching
- Implement progressive JPEG loading
- Use WebP format for better compression
- Cache frequently accessed media
- Lazy load images outside viewport

### 2. Message Pagination
- Load messages in batches of 20-50
- Implement reverse infinite scroll
- Cache recent conversations

### 3. Background Sync
- Use Expo TaskManager for background message sync
- Implement exponential backoff for failed syncs
- Prioritize recent conversations

## Next Steps Implementation Order

1. **Phase 1**: Offline message storage (Week 1-2)
2. **Phase 2**: Enhanced media handling (Week 3-4)
3. **Phase 3**: Real-time sync optimization (Week 5-6)
4. **Phase 4**: Audio/video features (Week 7-8)
5. **Phase 5**: Advanced features & polish (Week 9-10)

## Immediate Action Items

### Critical Fixes (This Week)
1. **Fix SQLite Integration**
   ```typescript
   // Current issue: Messages not persisting properly
   // Fix: Implement proper message storage in ChatService
   
   // src/models/discuss_channel/services/ChatService.ts
   async sendMessage(channelId: number, body: string): Promise<boolean> {
     try {
       // 1. Save to SQLite first (offline-first)
       const localMessage = await offlineMessageService.saveMessage({
         channel_id: channelId,
         body,
         author_id: this.currentUserId,
         timestamp: Date.now(),
         sync_status: 'pending'
       });
       
       // 2. Update UI immediately
       this.emit('newMessage', { channelId, message: localMessage });
       
       // 3. Sync to server in background
       this.queueServerSync(localMessage);
       
       return true;
     } catch (error) {
       console.error('Failed to send message:', error);
       return false;
     }
   }
   ```

2. **Optimize Message Loading Performance**
   ```typescript
   // Current issue: Loading all messages at once
   // Fix: Implement pagination and caching
   
   async loadChannelMessages(channelId: number, limit = 20): Promise<ChatMessage[]> {
     // 1. Load from SQLite cache first
     const cachedMessages = await offlineMessageService.getChannelMessages(channelId, limit);
     
     if (cachedMessages.length > 0) {
       this.emit('messagesLoaded', { channelId, messages: cachedMessages });
     }
     
     // 2. Fetch fresh data in background
     this.backgroundRefresh(channelId, cachedMessages.length);
     
     return cachedMessages;
   }
   ```

3. **Fix Real-time Message Updates**
   ```typescript
   // Current issue: Duplicate messages and polling conflicts
   // Fix: Unified message handling
   
   private handleNewMessage(message: ChatMessage): void {
     // Deduplicate messages
     const existingMessages = this.channelMessages.get(message.res_id) || [];
     const exists = existingMessages.some(m => 
       m.id === message.id || (m.body === message.body && m.date === message.date)
     );
     
     if (!exists) {
       this.addMessageToChannel(message.res_id, message);
     }
   }
   ```

## Advanced Features Implementation

### 1. Voice Messages

```typescript
// src/models/mail_message/components/VoiceMessageRecorder.tsx
import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export const VoiceMessageRecorder: React.FC<{
  onRecordingComplete: (audioUri: string, duration: number) => void;
  onCancel: () => void;
}> = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
      });
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };
  
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        onRecordingComplete(uri, recordingDuration);
      }
      
      cleanup();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      cleanup();
    }
  };
  
  const cancelRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Failed to cancel recording:', error);
      }
    }
    
    cleanup();
    onCancel();
  };
  
  const cleanup = () => {
    setIsRecording(false);
    setRecording(null);
    setRecordingDuration(0);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <View style={styles.voiceRecorderContainer}>
      {!isRecording ? (
        <TouchableOpacity
          style={styles.recordButton}
          onPress={startRecording}
          onLongPress={startRecording}
        >
          <MaterialIcons name="mic" size={24} color="#FFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.recordingInterface}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelRecording}
          >
            <MaterialIcons name="close" size={20} color="#FF3B30" />
          </TouchableOpacity>
          
          <View style={styles.recordingIndicator}>
            <Animated.View
              style={[
                styles.recordingPulse,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <View style={styles.recordingDot} />
            </Animated.View>
            <Text style={styles.recordingDuration}>
              {formatDuration(recordingDuration)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.sendButton}
            onPress={stopRecording}
          >
            <MaterialIcons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

### 2. Message Reactions & Interactions

```typescript
// src/models/mail_message/components/MessageReactions.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const MessageReactions: React.FC<{
  messageId: string;
  existingReactions: Record<string, number>;
  onReactionAdd: (emoji: string) => void;
  onReactionRemove: (emoji: string) => void;
}> = ({ messageId, existingReactions, onReactionAdd, onReactionRemove }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  const handleReaction = async (emoji: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (existingReactions[emoji]) {
      onReactionRemove(emoji);
    } else {
      onReactionAdd(emoji);
    }
    
    setShowReactionPicker(false);
  };
  
  return (
    <View style={styles.reactionsContainer}>
      {/* Existing reactions */}
      {Object.entries(existingReactions).map(([emoji, count]) => (
        <TouchableOpacity
          key={emoji}
          style={styles.reactionBubble}
          onPress={() => handleReaction(emoji)}
        >
          <Text style={styles.reactionEmoji}>{emoji}</Text>
          <Text style={styles.reactionCount}>{count}</Text>
        </TouchableOpacity>
      ))}
      
      {/* Add reaction button */}
      <TouchableOpacity
        style={styles.addReactionButton}
        onPress={() => setShowReactionPicker(true)}
      >
        <Text style={styles.addReactionIcon}>+</Text>
      </TouchableOpacity>
      
      {/* Reaction picker modal */}
      <Modal
        visible={showReactionPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(false)}
      >
        <TouchableOpacity
          style={styles.reactionPickerOverlay}
          onPress={() => setShowReactionPicker(false)}
        >
          <View style={styles.reactionPicker}>
            {QUICK_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionOption}
                onPress={() => handleReaction(emoji)}
              >
                <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
```

### 3. Message Threading & Replies

```typescript
// src/models/mail_message/components/MessageThread.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const MessageThread: React.FC<{
  parentMessage: ChatMessage;
  replies: ChatMessage[];
  onReply: (parentId: string, content: string) => void;
  onClose: () => void;
}> = ({ parentMessage, replies, onReply, onClose }) => {
  const [replyText, setReplyText] = useState('');
  
  const handleSendReply = () => {
    if (replyText.trim()) {
      onReply(parentMessage.id, replyText.trim());
      setReplyText('');
    }
  };
  
  return (
    <View style={styles.threadContainer}>
      {/* Thread header */}
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.threadTitle}>Thread</Text>
        <Text style={styles.threadCount}>{replies.length} replies</Text>
      </View>
      
      {/* Parent message */}
      <View style={styles.parentMessageContainer}>
        <EnhancedMessageBubble
          message={parentMessage}
          isCurrentUser={false}
          onLongPress={() => {}}
          onImagePress={() => {}}
          onReplyPress={() => {}}
        />
      </View>
      
      {/* Replies */}
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.replyContainer}>
            <EnhancedMessageBubble
              message={item}
              isCurrentUser={item.author_id === getCurrentUserId()}
              onLongPress={() => {}}
              onImagePress={() => {}}
              onReplyPress={() => {}}
            />
          </View>
        )}
        style={styles.repliesList}
      />
      
      {/* Reply input */}
      <View style={styles.replyInputContainer}>
        <TextInput
          style={styles.replyInput}
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Reply to thread..."
          multiline
        />
        <TouchableOpacity
          style={[
            styles.replyButton,
            !replyText.trim() && styles.replyButtonDisabled
          ]}
          onPress={handleSendReply}
          disabled={!replyText.trim()}
        >
          <MaterialIcons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 4. Media Gallery & Preview

```typescript
// src/models/mail_message/components/MediaGallery.tsx
import React, { useState, useRef } from 'react';
import { View, FlatList, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MediaGallery: React.FC<{
  mediaItems: MediaMessage[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}> = ({ mediaItems, initialIndex = 0, visible, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const flatListRef = useRef<FlatList>(null);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));
  
  const handlePinchGesture = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      scale.value = event.nativeEvent.scale;
    } else if (event.nativeEvent.state === State.END) {
      if (scale.value < 1) {
        scale.value = 1;
      } else if (scale.value > 3) {
        scale.value = 3;
      }
    }
  };
  
  const renderMediaItem = ({ item, index }: { item: MediaMessage; index: number }) => {
    if (item.type === 'image') {
      return (
        <PinchGestureHandler onGestureEvent={handlePinchGesture}>
          <Animated.View style={[styles.mediaContainer, animatedStyle]}>
            <Image
              source={{ uri: item.uri }}
              style={styles.fullScreenImage}
              contentFit="contain"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
          </Animated.View>
        </PinchGestureHandler>
      );
    } else if (item.type === 'video') {
      return (
        <View style={styles.mediaContainer}>
          <Video
            source={{ uri: item.uri }}
            style={styles.fullScreenVideo}
            resizeMode="contain"
            shouldPlay={index === currentIndex}
            isLooping={false}
            useNativeControls
          />
        </View>
      );
    }
    return null;
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.galleryContainer}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
        
        {/* Media carousel */}
        <FlatList
          ref={flatListRef}
          data={mediaItems}
          renderItem={renderMediaItem}
          keyExtractor={(item, index) => `${item.uri}_${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
        
        {/* Media info */}
        <View style={styles.mediaInfo}>
          <Text style={styles.mediaCounter}>
            {currentIndex + 1} of {mediaItems.length}
          </Text>
          {mediaItems[currentIndex]?.name && (
            <Text style={styles.mediaName}>
              {mediaItems[currentIndex].name}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};
```

## Testing Strategy

### 1. Unit Tests for Core Services

```typescript
// src/models/mail_message/services/__tests__/OfflineMessageService.test.ts
import { OfflineMessageService } from '../OfflineMessageService';

describe('OfflineMessageService', () => {
  let service: OfflineMessageService;
  
  beforeEach(async () => {
    service = new OfflineMessageService();
    await service.initialize();
  });
  
  test('should save message offline', async () => {
    const message = {
      channel_id: 1,
      body: 'Test message',
      author_id: 123,
      author_name: 'Test User',
      timestamp: Date.now(),
    };
    
    const messageId = await service.saveMessage(message);
    expect(messageId).toBeTruthy();
    
    const savedMessages = await service.getChannelMessages(1);
    expect(savedMessages).toHaveLength(1);
    expect(savedMessages[0].body).toBe('Test message');
  });
  
  test('should handle media messages', async () => {
    const mediaMessage = {
      channel_id: 1,
      body: '',
      media: {
        uri: 'file://test.jpg',
        type: 'image',
        size: 1024,
      },
      author_id: 123,
      timestamp: Date.now(),
    };
    
    const messageId = await service.saveMessage(mediaMessage);
    const savedMessages = await service.getChannelMessages(1);
    
    expect(savedMessages[0].media).toBeTruthy();
    expect(savedMessages[0].media.type).toBe('image');
  });
});
```

### 2. Integration Tests

```typescript
// src/models/discuss_channel/__tests__/ChatIntegration.test.ts
describe('Chat Integration', () => {
  test('should sync offline messages when coming online', async () => {
    // 1. Send message while offline
    const messageId = await chatService.sendMessage(1, 'Offline message');
    
    // 2. Verify message is saved locally
    const localMessages = await offlineMessageService.getChannelMessages(1);
    expect(localMessages).toHaveLength(1);
    expect(localMessages[0].sync_status).toBe('pending');
    
    // 3. Simulate coming online
    await chatService.processSyncQueue();
    
    // 4. Verify message is synced
    const syncedMessages = await offlineMessageService.getChannelMessages(1);
    expect(syncedMessages[0].sync_status).toBe('synced');
  });
});
```

## Performance Monitoring

### 1. Message Loading Metrics

```typescript
// src/models/mail_message/services/PerformanceMonitor.ts
export class ChatPerformanceMonitor {
  private metrics = new Map<string, number>();
  
  startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}`;
    this.metrics.set(timerId, Date.now());
    return timerId;
  }
  
  endTimer(timerId: string): number {
    const startTime = this.metrics.get(timerId);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.metrics.delete(timerId);
    
    console.log(`⏱️ ${timerId.split('_')[0]}: ${duration}ms`);
    return duration;
  }
  
  async measureMessageLoad(channelId: number): Promise<void> {
    const timerId = this.startTimer('messageLoad');
    await chatService.loadChannelMessages(channelId);
    this.endTimer(timerId);
  }
}
```

### 2. Memory Usage Optimization

```typescript
// Implement message cleanup for memory management
export class MessageMemoryManager {
  private readonly MAX_MESSAGES_IN_MEMORY = 200;
  
  cleanupOldMessages(channelId: number): void {
    const messages = chatService.getChannelMessages(channelId);
    
    if (messages.length > this.MAX_MESSAGES_IN_MEMORY) {
      const recentMessages = messages.slice(-this.MAX_MESSAGES_IN_MEMORY);
      chatService.setChannelMessages(channelId, recentMessages);
    }
  }
}
```

## Security & Privacy

### 1. Message Encryption

```typescript
// src/models/mail_message/services/MessageSecurity.ts
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export class MessageSecurityService {
  async encryptMessage(message: string, channelId: number): Promise<string> {
    const key = await this.getOrCreateChannelKey(channelId);
    
    // Simple encryption for demo - use proper encryption in production
    const encrypted = btoa(message + key);
    return encrypted;
  }
  
  async decryptMessage(encryptedMessage: string, channelId: number): Promise<string> {
    const key = await this.getOrCreateChannelKey(channelId);
    
    try {
      const decrypted = atob(encryptedMessage).replace(key, '');
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return '[Encrypted Message]';
    }
  }
  
  private async getOrCreateChannelKey(channelId: number): Promise<string> {
    const keyName = `channel_key_${channelId}`;
    
    let key = await SecureStore.getItemAsync(keyName);
    if (!key) {
      key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${channelId}_${Date.now()}_${Math.random()}`
      );
      await SecureStore.setItemAsync(keyName, key);
    }
    
    return key;
  }
}
```

This comprehensive plan provides a solid foundation for building a robust, offline-first chat system with multimedia support. The phased approach ensures you can implement features incrementally while maintaining app stability.