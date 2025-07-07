# BC Component Integration: Immediate Implementation Steps

## Week 1: Extend Your Existing BC Components

### 1. Enhance Your BaseWebSocketService (No New Component Needed)

```typescript
// Update: src/models/base/services/BaseWebSocketService.ts
// Add this offline queue functionality to your existing service

export class OdooWebSocketService {
  // Add these properties to your existing class
  private offlineMessageQueue: OfflineQueueItem[] = [];
  private syncInProgress = false;

  // Add this method to your existing initialize()
  async initialize(): Promise<boolean> {
    // ... your existing initialization code

    // Add offline message service initialization
    try {
      await offlineMessageService.initialize();
      console.log('✅ Offline message service ready');
    } catch (error) {
      console.warn('⚠️ Offline service failed, continuing with WebSocket only');
    }

    // Add offline queue processing
    this.setupOfflineSync();

    return true;
  }

  // Add these methods to your existing service
  private setupOfflineSync(): void {
    // Process queue when connected
    this.on('connect', () => {
      console.log('🔄 Connected - processing offline queue');
      this.processOfflineQueue();
    });

    // Periodic sync
    setInterval(() => {
      if (this.isWebsocketConnected() && this.offlineMessageQueue.length > 0) {
        this.processOfflineQueue();
      }
    }, 30000);
  }

  // Enhanced message sending with offline support
  async sendChatMessage(channelId: number, message: string): Promise<string> {
    const messageData = {
      channel_id: channelId,
      body: message.trim(),
      author_id: this.currentUID!,
      author_name: 'You',
      timestamp: Date.now(),
      sync_status: 'pending' as const
    };

    try {
      // 1. Save to SQLite immediately (offline-first)
      const localId = await offlineMessageService.saveMessage(messageData);
      
      // 2. Emit to UI immediately for instant feedback
      this.emit('newMessage', {
        ...messageData,
        id: localId,
        create_date: new Date().toISOString()
      });

      // 3. Queue for WebSocket sync
      this.queueForSync(localId, messageData);

      // 4. Try immediate send if connected
      if (this.isWebsocketConnected()) {
        this.processOfflineQueue();
      }

      return localId;
    } catch (error) {
      console.error('❌ Failed to save message offline:', error);
      throw error;
    }
  }

  private queueForSync(localId: string, messageData: any): void {
    this.offlineMessageQueue.push({
      localId,
      messageData,
      attempts: 0,
      timestamp: Date.now()
    });
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.syncInProgress || this.offlineMessageQueue.length === 0) return;
    
    this.syncInProgress = true;
    
    try {
      const itemsToProcess = [...this.offlineMessageQueue];
      
      for (const item of itemsToProcess) {
        try {
          // Send via your existing WebSocket mechanism
          await this.sendToServer({
            event_name: 'chat_message',
            data: {
              channel_id: item.messageData.channel_id,
              message: item.messageData.body
            }
          });

          // Update SQLite sync status
          await offlineMessageService.updateSyncStatus(item.localId, 'synced');
          
          // Remove from queue
          this.offlineMessageQueue = this.offlineMessageQueue.filter(
            queueItem => queueItem.localId !== item.localId
          );
          
          // Emit sync success
          this.emit('messageSynced', { localId: item.localId });
          
        } catch (error) {
          item.attempts++;
          if (item.attempts >= 3) {
            await offlineMessageService.updateSyncStatus(item.localId, 'failed');
            this.emit('messageFailed', { localId: item.localId, error });
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Add method to get offline queue status
  getOfflineStatus() {
    return {
      queueLength: this.offlineMessageQueue.length,
      syncInProgress: this.syncInProgress,
      isConnected: this.isWebsocketConnected()
    };
  }
}

interface OfflineQueueItem {
  localId: string;
  messageData: any;
  attempts: number;
  timestamp: number;
}
```

### 2. Update Your BC-C001_BaseChatter for Offline Support

```typescript
// Update: src/models/base/components/BC-C001_BaseChatter.tsx
// Add these imports and modifications to your existing component

import { webSocketService } from '../services/BaseWebSocketService';
import { offlineMessageService } from '../../mail_message/services/OfflineMessageService';

// Add these state variables to your existing component
const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected');
const [pendingSyncCount, setPendingSyncCount] = useState(0);
const [offlineMessages, setOfflineMessages] = useState<ChatterMessage[]>([]);

// Add this to your existing useEffect
useEffect(() => {
  loadChatterData();
  setupOfflineListeners(); // Add this line
}, [modelName, recordId]);

// Add this new function to your existing component
const setupOfflineListeners = () => {
  // Connection status updates
  webSocketService.on('worker_state_updated', (state: string) => {
    setConnectionStatus(state === 'CONNECTED' ? 'connected' : 'disconnected');
  });

  // New message updates
  webSocketService.on('newMessage', (message: ChatterMessage) => {
    if (message.res_id === recordId && message.model === modelName) {
      setMessages(prev => [...prev, message]);
    }
  });

  // Sync status updates
  webSocketService.on('messageSynced', ({ localId }: { localId: string }) => {
    updateMessageSyncStatus(localId, 'synced');
    updatePendingSyncCount();
  });

  webSocketService.on('messageFailed', ({ localId }: { localId: string }) => {
    updateMessageSyncStatus(localId, 'failed');
    updatePendingSyncCount();
  });

  // Update pending count
  updatePendingSyncCount();
};

// Add this function to load cached messages
const loadCachedMessages = async () => {
  try {
    console.log(`📱 Loading cached messages for ${modelName}:${recordId}`);
    
    // Load from SQLite first for instant UI
    const cachedMessages = await offlineMessageService.getChannelMessages(recordId);
    
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      console.log(`📱 Loaded ${cachedMessages.length} cached messages`);
    }
    
    // Load fresh data in background if connected
    if (webSocketService.isWebsocketConnected()) {
      // Your existing message loading logic here
      await loadChatterData();
    }
  } catch (error) {
    console.error('❌ Failed to load cached messages:', error);
  }
};

// Update your existing handleSendMessage function
const handleSendMessage = useCallback(async (message: string, type: string = 'comment') => {
  try {
    // Use WebSocket service with offline support
    const localId = await webSocketService.sendChatMessage(recordId, message);
    
    // Update pending sync count
    updatePendingSyncCount();
    
    // Call your existing onMessageSent callback
    onMessageSent?.({
      id: localId,
      body: message,
      create_date: new Date().toISOString(),
      message_type: type
    });
    
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    Alert.alert('Error', 'Message saved locally and will be sent when connection is restored.');
  }
}, [recordId, onMessageSent]);

// Add this helper function
const updatePendingSyncCount = async () => {
  try {
    const pendingMessages = await offlineMessageService.getPendingSyncMessages();
    setPendingSyncCount(pendingMessages.length);
  } catch (error) {
    console.error('Failed to get pending sync count:', error);
  }
};

const updateMessageSyncStatus = (localId: string, status: string) => {
  setMessages(prev => prev.map(msg => 
    msg.id === localId ? { ...msg, sync_status: status } : msg
  ));
};

// Add this to your existing render method, after your tabBar
const renderConnectionStatus = () => (
  <View style={styles.connectionStatus}>
    <View style={[
      styles.statusDot,
      { backgroundColor: connectionStatus === 'connected' ? '#34C759' : '#FF3B30' }
    ]} />
    <Text style={styles.statusText}>
      {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
      {pendingSyncCount > 0 && ` (${pendingSyncCount} pending)`}
    </Text>
  </View>
);

// Add these styles to your existing StyleSheet
const enhancedStyles = StyleSheet.create({
  ...styles, // Your existing styles
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});

// Update your return statement to include the connection status
return (
  <KeyboardAvoidingView
    style={[styles.container, { backgroundColor: theme.backgroundColor }]}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {/* Your existing Tab Bar */}
    {renderTabBar()}
    
    {/* Add Connection Status */}
    {renderConnectionStatus()}

    {/* Your existing Content Area */}
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primaryColor}
        />
      }
    >
      {/* Your existing tab content */}
    </ScrollView>

    {/* Your existing input area */}
  </KeyboardAvoidingView>
);
```

### 3. Enhance BC-C003_BaseMessageBubble for Offline Status

```typescript
// Update: src/models/base/components/BC-C003_BaseMessageBubble.tsx
// Add sync status support to your existing message bubble

// Add to your existing BaseMessageBubbleProps interface
export interface BaseMessageBubbleProps {
  message: ChatterMessage;
  isOwnMessage?: boolean;
  showAuthor?: boolean;
  showTimestamp?: boolean;
  enableReactions?: boolean;
  enableReplies?: boolean;
  enableAIAnalysis?: boolean;
  showSyncStatus?: boolean; // Add this
  onReply?: (message: ChatterMessage) => void;
  onReaction?: (messageId: number, emoji: string) => void;
  onAIAnalyze?: (message: ChatterMessage) => void;
  onRetry?: (message: ChatterMessage) => void; // Add this
  theme?: MessageBubbleTheme;
}

// Add to your existing ChatterMessage interface
export interface ChatterMessage {
  id: number | string;
  body: string;
  create_date: string;
  author_id?: [number, string];
  message_type?: string;
  parent_id?: number;
  reactions?: MessageReaction[];
  ai_analysis?: AIMessageAnalysis;
  attachments?: MessageAttachment[];
  sync_status?: 'pending' | 'synced' | 'failed'; // Add this
}

// Add this function to your existing component
const getSyncStatusIcon = () => {
  if (!showSyncStatus || !isOwnMessage) return null;
  
  switch (message.sync_status) {
    case 'pending':
      return <MaterialIcons name="schedule" size={12} color="#999" />;
    case 'synced':
      return <MaterialIcons name="done" size={12} color="#007AFF" />;
    case 'failed':
      return (
        <TouchableOpacity onPress={() => onRetry?.(message)}>
          <MaterialIcons name="error" size={12} color="#FF3B30" />
        </TouchableOpacity>
      );
    default:
      return null;
  }
};

// Update your existing message footer render
const renderMessageFooter = () => (
  <View style={styles.messageFooter}>
    <Text style={[styles.messageTime, { color: theme.timestampColor }]}>
      {formatTimestamp(message.create_date)}
    </Text>
    
    {/* Add sync status icon */}
    <View style={styles.syncStatus}>
      {getSyncStatusIcon()}
    </View>
  </View>
);

// Add to your existing styles
const syncStatusStyles = {
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  syncStatus: {
    marginLeft: 8,
  },
};
```

### 4. Create BC-C009_OfflineChatManager Component

```typescript
// Create: src/models/base/components/BC-C009_OfflineChatManager.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { webSocketService } from '../services/BaseWebSocketService';
import { offlineMessageService } from '../../mail_message/services/OfflineMessageService';

export interface OfflineChatManagerProps {
  visible: boolean;
  onRetryAll: () => void;
  onDismiss: () => void;
}

/**
 * BC-C009: Offline Chat Manager
 * Shows offline status and retry options
 */
export default function OfflineChatManager({
  visible,
  onRetryAll,
  onDismiss
}: OfflineChatManagerProps) {
  const [offlineStatus, setOfflineStatus] = useState({
    queueLength: 0,
    syncInProgress: false,
    isConnected: true
  });

  useEffect(() => {
    updateOfflineStatus();
    
    const interval = setInterval(updateOfflineStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateOfflineStatus = async () => {
    try {
      const status = webSocketService.getOfflineStatus();
      const pendingMessages = await offlineMessageService.getPendingSyncMessages();
      
      setOfflineStatus({
        queueLength: pendingMessages.length,
        syncInProgress: status.syncInProgress,
        isConnected: status.isConnected
      });
    } catch (error) {
      console.error('Failed to update offline status:', error);
    }
  };

  const handleRetryAll = async () => {
    try {
      await webSocketService.processOfflineQueue();
      onRetryAll();
    } catch (error) {
      console.error('Failed to retry messages:', error);
    }
  };

  if (!visible || (offlineStatus.isConnected && offlineStatus.queueLength === 0)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <MaterialIcons 
          name={offlineStatus.isConnected ? "sync" : "sync-disabled"} 
          size={16} 
          color="#666" 
        />
        <Text style={styles.statusText}>
          {offlineStatus.isConnected 
            ? `${offlineStatus.queueLength} messages pending sync`
            : `Offline - ${offlineStatus.queueLength} messages queued`
          }
        </Text>
        
        {offlineStatus.queueLength > 0 && (
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryAll}>
            <Text style={styles.retryText}>Retry All</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <MaterialIcons name="close" size={16} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAA7',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  retryText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});
```

### 5. Enhanced BC-C002_BaseChatInput Integration

```typescript
// Update: src/models/base/components/BC-C002_BaseChatInput.tsx
// Modify your existing handleSend function

// Update your existing handleSend callback
const handleSend = useCallback(async () => {
  if (message.trim()) {
    try {
      // Use the WebSocket service with offline support
      await webSocketService.sendChatMessage(recordId, message.trim());
      
      // Clear input
      setMessage('');
      setShowAISuggestions(false);
      setIsTypingState(false);
      onTyping(false);
      
      // Call your existing onSend callback for compatibility
      onSend(message.trim(), 'comment');
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Message is still saved locally, so don't show error to user
      // It will sync when connection is restored
      
      // Still clear the input
      setMessage('');
      setShowAISuggestions(false);
    }
  }
}, [message, recordId, onSend, onTyping]);
```

## Week 2: Add Media Support Components

### 6. Create BC-C010_MediaMessageBubble

```typescript
// Create: src/models/base/components/BC-C010_MediaMessageBubble.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';

export interface MediaMessageBubbleProps {
  message: ChatterMessage & {
    media?: {
      type: 'image' | 'video' | 'audio' | 'document';
      uri: string;
      thumbnailUri?: string;
      size?: number;
      duration?: number;
      name?: string;
    };
  };
  isOwnMessage: boolean;
  onMediaPress: (uri: string, type: string) => void;
  theme?: MessageBubbleTheme;
}

/**
 * BC-C010: Media Message Bubble
 * Handles images, videos, audio, and documents
 */
export default function MediaMessageBubble({
  message,
  isOwnMessage,
  onMediaPress,
  theme = DEFAULT_THEME
}: MediaMessageBubbleProps) {
  
  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMediaContent = () => {
    if (!message.media) return null;

    switch (message.media.type) {
      case 'image':
        return (
          <TouchableOpacity 
            onPress={() => onMediaPress(message.media!.uri, 'image')}
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
              <View style={styles.mediaInfo}>
                <Text style={styles.mediaSize}>
                  {formatFileSize(message.media.size)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );

      case 'video':
        return (
          <TouchableOpacity 
            onPress={() => onMediaPress(message.media!.uri, 'video')}
            style={styles.videoContainer}
          >
            <Image
              source={{ uri: message.media.thumbnailUri || message.media.uri }}
              style={styles.videoThumbnail}
              contentFit="cover"
            />
            <View style={styles.videoOverlay}>
              <MaterialIcons name="play-arrow" size={32} color="#FFF" />
            </View>
            {message.media.duration && (
              <View style={styles.videoDuration}>
                <Text style={styles.durationText}>
                  {formatDuration(message.media.duration)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );

      case 'document':
        return (
          <TouchableOpacity 
            onPress={() => onMediaPress(message.media!.uri, 'document')}
            style={styles.documentContainer}
          >
            <MaterialIcons name="description" size={32} color="#007AFF" />
            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>
                {message.media.name || 'Document'}
              </Text>
              {message.media.size && (
                <Text style={styles.documentSize}>
                  {formatFileSize(message.media.size)}
                </Text>
              )}
            </View>
            <MaterialIcons name="download" size={16} color="#666" />
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {renderMediaContent()}
      
      {message.body && (
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.body}
        </Text>
      )}
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
  mediaSize: {
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
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    gap: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownMessageText: {
    backgroundColor: '#007AFF',
    color: '#FFF',
  },
  otherMessageText: {
    backgroundColor: '#E5E5EA',
    color: '#000',
  },
});
```

### 7. Integration Example in Your Chat Screen

```typescript
// Update your existing chat screen (e.g., 151_ChatList.tsx)
import { OfflineChatManager } from '../../base/components/BC-C009_OfflineChatManager';
import { MediaMessageBubble } from '../../base/components/BC-C010_MediaMessageBubble';

// Add to your existing chat screen component
const [showOfflineManager, setShowOfflineManager] = useState(true);

// Update your renderMessage function
const renderMessage = ({ item, index }: { item: ChatterMessage; index: number }) => {
  // Check if message has media
  if (item.media) {
    return (
      <MediaMessageBubble
        message={item}
        isOwnMessage={item.author_id === currentUserId}
        onMediaPress={handleMediaPress}
        theme={messageTheme}
      />
    );
  }

  // Use your existing BC-C003_BaseMessageBubble
  return (
    <BaseMessageBubble
      message={item}
      isOwnMessage={item.author_id === currentUserId}
      showSyncStatus={true}
      onRetry={handleRetryMessage}
      // ... other existing props
    />
  );
};

// Add these handlers
const handleMediaPress = (uri: string, type: string) => {
  console.log(`Opening ${type} media:`, uri);
  // Implement media viewer
};

const handleRetryMessage = async (message: ChatterMessage) => {
  try {
    // Retry failed message
    await webSocketService.retryMessage(message.id);
  } catch (error) {
    console.error('Failed to retry message:', error);
  }
};

// Add to your return statement
return (
  <SafeAreaView style={styles.container}>
    {/* Your existing header */}
    
    {/* Add Offline Manager */}
    <OfflineChatManager
      visible={showOfflineManager}
      onRetryAll={() => webSocketService.processOfflineQueue()}
      onDismiss={() => setShowOfflineManager(false)}
    />

    {/* Your existing chat content */}
  </SafeAreaView>
);
```

## Testing Your Integration

### 1. Test Offline Messaging
```bash
# Turn off WiFi on device/simulator
# Send a message - should appear immediately with "pending" status
# Turn WiFi back on - message should sync and show "synced" status
```

### 2. Test Connection Recovery
```bash
# Force close app while offline with pending messages
# Reopen app - messages should still be there
# Connect to internet - messages should auto-sync
```

### 3. Debug Offline Status
```typescript
// Add this debug function to your chat screen
const debugOfflineStatus = async () => {
  const status = webSocketService.getOfflineStatus();
  const pending = await offlineMessageService.getPendingSyncMessages();
  
  console.log('🔍 Offline Status:', {
    connected: status.isConnected,
    queueLength: status.queueLength,
    pendingMessages: pending.length,
    syncInProgress: status.syncInProgress
  });
};

// Call this function periodically or add a debug button
```

This integration approach leverages your existing sophisticated BC component system while adding the offline-first capabilities that make your chat truly professional. Your AI features, WebSocket real-time communication, and modular architecture all remain intact while gaining powerful offline functionality.