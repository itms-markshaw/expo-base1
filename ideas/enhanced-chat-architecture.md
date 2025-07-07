# Enhanced Chat Architecture with Audio/Video Calls & Notifications

## 🎯 **Current State Analysis**

From your screenshot and logs, I can see:
- ✅ Real-time messaging is working 
- ✅ Attachment downloads are functional (XML-RPC based)
- ✅ File rendering (images, documents) is implemented
- ✅ Emoji support is working
- ⚠️ Attachment handling could be smoother
- ❌ No audio/video call support
- ❌ No push notifications system

## 🏗️ **Architecture Plan: Calls + Notifications**

### **1. Notification Infrastructure**
Before implementing calls, we need a robust notification system:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Expo Push     │────│  Notification    │────│   Call System   │
│   Notifications │    │     Service      │    │   (WebRTC)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         v                        v                        v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Background      │    │ Chat Message     │    │ Call UI         │
│ Call Handling   │    │ Notifications    │    │ Components      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **2. Component Structure**

```
src/models/discuss_channel/
├── services/
│   ├── ChatService.ts              # ✅ Working
│   ├── CallService.ts              # 🆕 WebRTC calls
│   ├── NotificationService.ts      # 🆕 Push notifications
│   └── AttachmentService.ts        # 🔧 Improved
├── components/
│   ├── ChatMessage.tsx             # ✅ Working
│   ├── AttachmentRenderer.tsx      # 🔧 Smooth rendering
│   ├── CallInterface.tsx           # 🆕 Video/audio calls
│   ├── IncomingCallModal.tsx       # 🆕 Call notifications
│   └── NotificationBanner.tsx      # 🆕 In-app notifications
└── screens/
    ├── 151_ChatList.tsx            # ✅ Working
    ├── 152_CallScreen.tsx          # 🆕 Active call UI
    └── 153_CallHistory.tsx         # 🆕 Call logs
```

## 🔧 **Implementation Plan**

### **Phase 1: Improve Attachment Handling**

#### Issues to Fix:
1. **Smooth loading states** - Add skeleton loaders
2. **Progressive downloads** - Show progress indicators  
3. **Better caching** - Avoid re-downloading
4. **Image optimization** - Compress large images
5. **Video/audio previews** - Native media players

### **Phase 2: Notification Infrastructure**

#### Setup Expo Notifications:
```bash
npx expo install expo-notifications expo-device expo-constants
```

#### Key Features:
- **Push notifications** for new messages when app is closed
- **In-app notifications** for calls, mentions, etc.
- **Background message handling**
- **Sound & vibration** for different notification types

### **Phase 3: WebRTC Call System**

#### Setup WebRTC:
```bash
npx expo install react-native-webrtc
```

#### Call Flow:
1. **Initiate Call** → Send call invitation via Odoo bus
2. **Receive Invitation** → Show incoming call notification
3. **Accept/Decline** → Establish WebRTC connection
4. **Active Call** → Video/audio streaming UI
5. **End Call** → Cleanup and call history

### **Phase 4: Integration with Odoo**

#### Odoo Side Requirements:
- **Call records** in `discuss.channel.call` model
- **Bus notifications** for call events
- **STUN/TURN servers** for WebRTC signaling

## 📋 **Detailed Implementation Steps**

### **Step 1: Enhanced Attachment Service**

```typescript
// AttachmentService.ts
class AttachmentService {
  private downloadCache = new Map<number, string>();
  private downloadPromises = new Map<number, Promise<string>>();
  
  async downloadAttachment(
    attachmentId: number, 
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Check cache first
    if (this.downloadCache.has(attachmentId)) {
      return this.downloadCache.get(attachmentId)!;
    }
    
    // Check if already downloading
    if (this.downloadPromises.has(attachmentId)) {
      return this.downloadPromises.get(attachmentId)!;
    }
    
    // Start download with progress tracking
    const downloadPromise = this.performDownload(attachmentId, filename, onProgress);
    this.downloadPromises.set(attachmentId, downloadPromise);
    
    try {
      const localPath = await downloadPromise;
      this.downloadCache.set(attachmentId, localPath);
      return localPath;
    } finally {
      this.downloadPromises.delete(attachmentId);
    }
  }
  
  private async performDownload(
    attachmentId: number, 
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Implementation with progress callbacks
    // Use FileSystem.downloadAsync for better progress tracking
  }
}
```

### **Step 2: Notification Service**

```typescript
// NotificationService.ts
import * as Notifications from 'expo-notifications';

class NotificationService {
  private expoPushToken: string | null = null;
  
  async initialize(): Promise<void> {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Get push token
    this.expoPushToken = await this.registerForPushNotifications();
    
    // Send token to Odoo backend
    await this.sendTokenToOdoo(this.expoPushToken);
  }
  
  async showIncomingCallNotification(call: CallInvitation): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📞 Incoming call from ${call.callerName}`,
        body: 'Tap to answer',
        sound: 'call_ringtone.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        data: { 
          type: 'incoming_call',
          callId: call.id,
          channelId: call.channelId 
        },
      },
      trigger: null, // Show immediately
    });
  }
  
  async showMessageNotification(message: ChatMessage): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.authorName,
        body: this.extractTextFromHTML(message.body),
        sound: 'message_sound.wav',
        data: { 
          type: 'chat_message',
          channelId: message.res_id 
        },
      },
      trigger: null,
    });
  }
}
```

### **Step 3: Call Service**

```typescript
// CallService.ts
import { RTCPeerConnection, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';

class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private eventListeners = new Map<string, Function[]>();
  
  async initializeCall(channelId: number, isVideo: boolean = false): Promise<void> {
    try {
      // Get user media
      this.localStream = await mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // Add TURN servers from Odoo config
        ],
      });
      
      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.emit('remoteStreamReceived', this.remoteStream);
      };
      
      // Send call invitation via Odoo bus
      await this.sendCallInvitation(channelId, isVideo);
      
    } catch (error) {
      console.error('Failed to initialize call:', error);
      throw error;
    }
  }
  
  async acceptCall(callInvitation: CallInvitation): Promise<void> {
    // Accept incoming call and establish connection
  }
  
  async declineCall(callInvitation: CallInvitation): Promise<void> {
    // Decline call and notify caller
  }
  
  async endCall(): Promise<void> {
    // Cleanup streams and connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.emit('callEnded');
  }
}
```

### **Step 4: Call UI Components**

```typescript
// IncomingCallModal.tsx
export function IncomingCallModal({ 
  visible, 
  call, 
  onAccept, 
  onDecline 
}: IncomingCallModalProps) {
  return (
    <Modal visible={visible} transparent>
      <View style={styles.overlay}>
        <View style={styles.callCard}>
          <Avatar source={{ uri: call.callerAvatar }} size={120} />
          <Text style={styles.callerName}>{call.callerName}</Text>
          <Text style={styles.callType}>
            {call.isVideo ? '📹 Video call' : '📞 Voice call'}
          </Text>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={onDecline}
            >
              <MaterialIcons name="call-end" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <MaterialIcons name="call" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// CallInterface.tsx
export function CallInterface({ 
  localStream, 
  remoteStream, 
  isVideo,
  onEndCall 
}: CallInterfaceProps) {
  return (
    <View style={styles.container}>
      {isVideo && (
        <>
          <RTCView 
            streamURL={remoteStream?.toURL()} 
            style={styles.remoteVideo}
          />
          <RTCView 
            streamURL={localStream?.toURL()} 
            style={styles.localVideo}
          />
        </>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.endCallButton}
          onPress={onEndCall}
        >
          <MaterialIcons name="call-end" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

## 🚀 **Quick Implementation Priority**

### **Immediate (Week 1)**
1. ✅ Fix attachment smooth loading with progress indicators
2. ✅ Implement notification service setup
3. ✅ Add basic call invitation UI

### **Short Term (Week 2-3)**  
1. ✅ WebRTC integration and basic audio calls
2. ✅ Push notification handling for incoming calls
3. ✅ Call history and management

### **Medium Term (Week 4-6)**
1. ✅ Video calling with camera controls
2. ✅ Advanced call features (mute, speaker, camera toggle)
3. ✅ Group calling support

## 🔔 **Notification Strategy**

### **Message Notifications**
- **In-app**: Banner notifications when app is active
- **Push**: When app is background/closed
- **Smart filtering**: Only notify for @mentions in groups

### **Call Notifications**
- **High priority**: Always show even in Do Not Disturb
- **Persistent**: Stay until answered/declined
- **Custom ringtone**: Different sounds for different call types
- **Fallback**: If WebRTC fails, fall back to regular phone call

### **Integration Points**
- **Odoo Bus Events**: Subscribe to call invitation events
- **Background App Refresh**: Handle calls when app is backgrounded  
- **Lock Screen**: Show call interface even when phone is locked

This architecture provides a solid foundation for enterprise-grade chat with calling capabilities while maintaining smooth performance and user experience.