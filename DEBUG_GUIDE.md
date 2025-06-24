# 🔧 Debug Guide: Real-time Chat Issues

## 🧪 Testing Steps

### 1. **Start Your React Native App**
Check for these key log messages:

```
🚀 Starting HTTP polling service (not port 8072)...
✅ Polling service marked as active, starting polling loop...
✅ HTTP polling service started successfully
🔄 Starting polling loop...
🔄 Polling cycle - Active: true, Channels: 0
```

### 2. **Open a Chat Channel**
When you select a channel, you should see:

```
📱 ChatService subscribing to channel: discuss.channel_101
📡 Longpolling service subscribing to: discuss.channel_101
📡 Current channels before: []
📡 Current channels after: [discuss.channel_101]
📡 Total subscribed channels: 1
🔄 Starting backup polling for channel 101
✅ Full subscription setup completed for channel 101
```

### 3. **Test the Debug Button**
**Tap the orange bug icon** in the chat header. You should see:

```
🔍 DEBUG BUTTON PRESSED!
=== CHAT DEBUG INFO ===
Selected channel: 101
UI messages count: 5
Service messages count: 5
Service status: { isInitialized: true, channelCount: 3, longpollingStatus: {...} }
Polling status: { isActive: true, channelCount: 1, ... }
=== END DEBUG INFO ===
```

### 4. **Send Message from Web Interface**
After sending a message from Odoo web, watch for:

```
🔄 Polling cycle - Active: true, Channels: 1
🔄 Polling channel 101 for messages > 210784
📨 Polling result for channel 101: 1 messages
📨 Found 1 new messages in channel 101!
📨 Message IDs: [210785]
📥 Processing message 210785: Your message here...
📤 Emitting generic "message" event
📤 Emitting "chatMessage" event for UI
🔄 ChatScreen received single new message for channel 101: 210785
🔄 Adding new message 210785 to UI
```

## 🚨 Troubleshooting

### If Debug Button Does Nothing:
- **Check console** - you should see "🔍 DEBUG BUTTON PRESSED!"
- **Try tapping refresh button** to verify touch is working
- **Check if TouchableOpacity is being rendered**

### If No Polling Logs:
- **Look for**: "Starting polling loop..."
- **If missing**: Polling service didn't start properly
- **Check auth**: Make sure authentication is working

### If Polling But No Messages Found:
- **Check**: "📨 Polling result for channel X: 0 messages"
- **Verify**: You're sending to the right channel ID
- **Check**: Last message ID tracking

### If Messages Found But UI Not Updating:
- **Look for**: "📤 Emitting 'chatMessage' event for UI"
- **Check**: "🔄 ChatScreen received single new message"
- **Verify**: Event listeners are properly set up

## 🎯 Quick Fixes

### Force Refresh Messages:
1. **Tap debug button** (orange bug icon)
2. **Check message counts** in console
3. **Automatic force refresh** should happen

### Manual Testing:
```javascript
// In React Native debugger console:
chatService.getStatus()
longpollingService.getStatus()
chatService.getChannelMessages(101)
```

## 🔍 Expected Timeline

From sending message in web to seeing in mobile:
1. **0 seconds**: Message sent in web interface
2. **0-1 seconds**: Polling detects new message
3. **1-2 seconds**: Message appears in mobile app

If this timeline isn't happening, the debug logs will show exactly where the issue is!
