# Chat Enhancement Implementation Guide

## 🎯 **Immediate Fixes for Smooth Attachments**

### **Step 1: Install Required Dependencies**

```bash
# For enhanced attachments
npx expo install expo-file-system expo-web-browser expo-sharing expo-av

# For notifications (preparation for calls)
npx expo install expo-notifications expo-device expo-constants

# For future WebRTC calls
npx expo install react-native-webrtc
```

### **Step 2: Replace Attachment Handling**

Replace your current attachment handling in `151_ChatList.tsx`:

```typescript
// OLD: Basic attachment handling
import { AttachmentRenderer } from '../components/AttachmentRenderer';

// NEW: Enhanced smooth handling
import AttachmentRenderer from '../components/AttachmentRenderer';
import enhancedAttachmentService from '../services/EnhancedAttachmentService';

// In your message rendering:
{message.attachment_ids && message.attachment_ids.length > 0 && (
  <View style={styles.attachments}>
    {message.attachment_ids.map((attachmentId) => (
      <AttachmentRenderer
        key={attachmentId}
        attachment={{
          id: attachmentId,
          filename: 'Loading...', // You'd get this from attachment data
          mimetype: 'application/octet-stream',
          file_size: 0,
        }}
        maxWidth={SCREEN_WIDTH * 0.7}
        onPress={() => {
          // Handle attachment press
        }}
      />
    ))}
  </View>
)}
```

### **Step 3: Create Enhanced Services**

Create these new files in your services directory:

```
src/models/discuss_channel/services/
├── EnhancedAttachmentService.ts    # From artifact above
└── NotificationService.ts          # From artifact above

src/models/discuss_channel/components/
└── AttachmentRenderer.tsx          # From artifact above
```

## 🔔 **Setting Up Notifications Foundation**

### **Step 1: Configure app.json**

Add notification configuration to your `app.json`:

```json
{
  "expo": {
    "notifications": {
      "icon": "./assets/notification-icon.png",
      "color": "#007AFF",
      "sounds": [
        "./assets/sounds/call_ringtone.wav",
        "./assets/sounds/message_sound.wav",
        "./assets/sounds/mention_sound.wav"
      ]
    },
    "android": {
      "useNextNotificationsApi": true,
      "notification": {
        "icon": "./assets/notification-icon.png",
        "color": "#007AFF"
      }
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "UIBackgroundModes": ["audio", "voip"]
      }
    }
  }
}
```

### **Step 2: Initialize Notification Service**

Add to your main App.tsx or initialization flow:

```typescript
import notificationService from './src/models/discuss_channel/services/NotificationService';

// In your App component's useEffect
useEffect(() => {
  const initializeServices = async () => {
    // Initialize existing services
    await authService.initialize();
    await chatService.initialize();
    
    // NEW: Initialize notifications
    await notificationService.initialize();
    
    // Setup notification event handlers
    notificationService.on('incomingCall', (call) => {
      // Show incoming call modal
      setIncomingCall(call);
      setShowIncomingCallModal(true);
    });
    
    notificationService.on('chatNotificationTapped', ({ channelId }) => {
      // Navigate to chat channel
      navigation.navigate('Chat', { channelId });
    });
  };
  
  initializeServices();
}, []);
```

## 📞 **Preparing for Audio/Video Calls**

### **Step 1: Odoo Backend Preparation**

You'll need to add these to your Odoo instance:

#### **1. Custom Model for Call Management**
```python
# addons/discuss_calls/models/discuss_channel_call.py
from odoo import models, fields, api

class DiscussChannelCall(models.Model):
    _name = 'discuss.channel.call'
    _description = 'Channel Call'
    
    channel_id = fields.Many2one('discuss.channel', required=True)
    caller_id = fields.Many2one('res.users', required=True)
    call_type = fields.Selection([('audio', 'Audio'), ('video', 'Video')], required=True)
    status = fields.Selection([
        ('ringing', 'Ringing'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('declined', 'Declined'),
        ('missed', 'Missed')
    ], default='ringing')
    start_time = fields.Datetime()
    end_time = fields.Datetime()
    duration = fields.Integer()  # seconds
    
    @api.model
    def initiate_call(self, channel_id, call_type='audio'):
        call = self.create({
            'channel_id': channel_id,
            'caller_id': self.env.user.id,
            'call_type': call_type,
            'start_time': fields.Datetime.now()
        })
        
        # Send bus notification to channel members
        self.env['bus.bus'].sendmany([
            (f'discuss.channel_{channel_id}', {
                'type': 'call_invitation',
                'call_id': call.id,
                'caller_id': self.env.user.id,
                'caller_name': self.env.user.name,
                'call_type': call_type,
                'channel_id': channel_id
            })
        ])
        
        return call.id
```

#### **2. Push Notification Integration**
```python
# addons/discuss_calls/models/res_users.py
from odoo import models, fields
import requests

class ResUsers(models.Model):
    _inherit = 'res.users'
    
    expo_push_token = fields.Char('Expo Push Token')
    mobile_device_info = fields.Json('Mobile Device Info')
    
    def send_push_notification(self, title, body, data=None):
        if not self.expo_push_token:
            return False
            
        payload = {
            'to': self.expo_push_token,
            'title': title,
            'body': body,
            'data': data or {},
            'sound': 'default',
            'priority': 'high'
        }
        
        try:
            response = requests.post(
                'https://exp.host/--/api/v2/push/send',
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            return response.status_code == 200
        except Exception as e:
            _logger.error(f"Push notification failed: {e}")
            return False
```

### **Step 2: Call Service Foundation**

Create the basic call service structure:

```typescript
// src/models/discuss_channel/services/CallService.ts
import notificationService from './NotificationService';
import { authService } from '../../base/services/BaseAuthService';
import longpollingService from '../../base/services/BaseLongpollingService';

export interface Call {
  id: string;
  channelId: number;
  callerId: number;
  callerName: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'declined';
  startTime?: Date;
  endTime?: Date;
}

class CallService {
  private activeCall: Call | null = null;
  private eventListeners = new Map<string, Function[]>();

  async initialize(): Promise<void> {
    // Listen for call invitations via longpolling
    longpollingService.on('notification', (notification) => {
      if (notification.type === 'call_invitation') {
        this.handleCallInvitation(notification);
      }
    });
  }

  async initiateCall(channelId: number, callType: 'audio' | 'video' = 'audio'): Promise<string> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      // Call Odoo to initiate the call
      const callId = await client.callModel('discuss.channel.call', 'initiate_call', [], {
        channel_id: channelId,
        call_type: callType
      });

      console.log(`📞 Initiated ${callType} call in channel ${channelId}:`, callId);
      return callId;

    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      throw error;
    }
  }

  private handleCallInvitation(invitation: any): void {
    console.log('📞 Received call invitation:', invitation);

    // Show notification if app is in background
    notificationService.showIncomingCallNotification({
      id: invitation.call_id,
      callerId: invitation.caller_id,
      callerName: invitation.caller_name,
      channelId: invitation.channel_id,
      channelName: '', // You'd get this from channel data
      isVideo: invitation.call_type === 'video',
      timestamp: Date.now()
    });

    // Emit event for UI if app is active
    this.emit('incomingCall', {
      id: invitation.call_id,
      channelId: invitation.channel_id,
      callerId: invitation.caller_id,
      callerName: invitation.caller_name,
      callType: invitation.call_type,
      status: 'ringing'
    });
  }

  async acceptCall(callId: string): Promise<void> {
    // TODO: Implement WebRTC connection setup
    console.log('📞 Accepting call:', callId);
  }

  async declineCall(callId: string): Promise<void> {
    // TODO: Send decline notification to caller
    console.log('📞 Declining call:', callId);
  }

  // Event management
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }
}

export const callService = new CallService();
```

### **Step 3: Incoming Call Modal Component**

```typescript
// src/models/discuss_channel/components/IncomingCallModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { callService } from '../services/CallService';

interface IncomingCallModalProps {
  visible: boolean;
  call: Call | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ visible, call, onAccept, onDecline }: IncomingCallModalProps) {
  if (!call) return null;

  const handleAccept = () => {
    callService.acceptCall(call.id);
    onAccept();
  };

  const handleDecline = () => {
    callService.declineCall(call.id);
    onDecline();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.callCard}>
          <MaterialIcons 
            name={call.callType === 'video' ? 'videocam' : 'phone'} 
            size={60} 
            color="#007AFF" 
          />
          
          <Text style={styles.callerName}>{call.callerName}</Text>
          <Text style={styles.callType}>
            Incoming {call.callType} call
          </Text>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
            >
              <MaterialIcons name="call-end" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <MaterialIcons name="call" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    minWidth: 300,
  },
  callerName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  actions: {
    flexDirection: 'row',
    gap: 40,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
});
```

## 🚀 **Implementation Roadmap**

### **Phase 1: Immediate (This Week)**
1. ✅ **Replace attachment service** with enhanced version
2. ✅ **Update AttachmentRenderer** for smooth loading
3. ✅ **Set up notification foundation**
4. ✅ **Test attachment downloading improvements**

### **Phase 2: Notifications (Next Week)**
1. ✅ **Implement push notifications** for messages
2. ✅ **Add Odoo backend integration** for push tokens
3. ✅ **Test notification delivery** in background/foreground
4. ✅ **Add call notification foundation**

### **Phase 3: Basic Calling (Week 3-4)**
1. ✅ **Implement call invitation system** via Odoo bus
2. ✅ **Add incoming call modal** UI
3. ✅ **Set up WebRTC infrastructure**
4. ✅ **Test basic audio calling**

### **Phase 4: Advanced Features (Month 2)**
1. ✅ **Video calling support**
2. ✅ **Group calling**
3. ✅ **Call history and management**
4. ✅ **Advanced call controls** (mute, speaker, camera)

## 🔧 **Quick Testing Steps**

### **Test Enhanced Attachments:**
1. Send image/document from Odoo web
2. Observe smooth progress indicator in Expo app
3. Verify cached files don't re-download
4. Test different file types (image, video, audio, PDF)

### **Test Notifications:**
1. Background the Expo app
2. Send message from Odoo web
3. Verify push notification appears
4. Tap notification and verify navigation

### **Test Call Foundation:**
1. Add call button to chat interface
2. Test call invitation sending
3. Verify incoming call modal appears
4. Test accept/decline flow

This foundation provides a solid base for enterprise-grade chat with smooth attachments and prepares for full calling capabilities!