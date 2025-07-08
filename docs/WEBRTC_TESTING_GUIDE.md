# WebRTC Testing Guide - Phase 3 & 4

## 🎯 **Testing Overview**

You now have **4 phases** of WebRTC testing available in your development build:

### **✅ Phase 1: RTC Session Creation** (WORKING)
- **Status**: ✅ Complete
- **What it does**: Creates Odoo RTC sessions for web interface ringing
- **Test**: Use audio/video call buttons
- **Expected**: Odoo web shows incoming call notification

### **✅ Phase 2: WebRTC Signaling** (WORKING)
- **Status**: ✅ Complete  
- **What it does**: Tests SDP/ICE message exchange via Odoo
- **Test**: Tap orange 🧪 button in chat
- **Expected**: WebRTC signaling messages appear in chat

### **🚀 Phase 3: STUN Server Configuration** (NEW)
- **Status**: 🔄 Ready to test
- **What it does**: Real RTCPeerConnection with Google STUN servers
- **Test**: Tap green 🚀 button in chat
- **Expected**: ICE candidates generated via Google STUN servers

### **🚀 Phase 4: P2P Audio Connection** (NEW)
- **Status**: 🔄 Ready to test
- **What it does**: Real peer-to-peer audio streaming
- **Test**: Use audio call button (now uses real WebRTC)
- **Expected**: Actual audio transmission between devices

## 🧪 **How to Test Phase 3 & 4**

### **In Your Chat Interface:**

You'll see **4 buttons** next to the channel name:
1. **📞 Audio Call** - Now uses real WebRTC with STUN servers
2. **📹 Video Call** - Real WebRTC video (if supported)
3. **🧪 Orange Button** - Phase 2 signaling test
4. **🚀 Green Button** - Phase 3 & 4 real WebRTC test

### **Phase 3 Test (Green 🚀 Button):**

**What it tests:**
- RTCPeerConnection creation with Google STUN servers
- Local media access (microphone/camera)
- ICE candidate generation
- SDP offer creation

**Expected logs:**
```
🚀 Phase 4: Starting real WebRTC audio call...
🌐 Creating RTCPeerConnection with Google STUN servers...
📡 STUN servers configured: [stun:stun.l.google.com:19302, ...]
🎤 Requesting audio permissions...
✅ Local media stream obtained
📝 Creating SDP offer...
✅ Local description set
📡 SDP offer sent via Odoo signaling
🧊 ICE candidate generated via Google STUN: candidate:1 1 UDP...
🧊 ICE candidate sent via Odoo signaling
```

### **Phase 4 Test (Audio Call Button):**

**What it tests:**
- Complete WebRTC call flow
- RTC session + WebRTC peer connection
- Real audio streaming
- Two-way communication

**Expected logs:**
```
📞 Starting audio call in development build...
🎯 This creates real WebRTC P2P connection with Google STUN servers
📞 Phase 1: Creating RTC session...
✅ RTC session created: 182
📞 Phase 3 & 4: Starting real WebRTC call...
🎉 Real WebRTC call started with Google STUN servers!
🔗 ICE connection state: connecting
🔗 ICE connection state: connected
🎉 P2P connection established via STUN servers!
```

## 🌐 **Google STUN Servers Used**

Your app is configured with **5 Google STUN servers**:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`
- `stun:stun2.l.google.com:19302`
- `stun:stun3.l.google.com:19302`
- `stun:stun4.l.google.com:19302`

## 🔍 **What to Look For**

### **Success Indicators:**
- ✅ ICE candidates generated with Google STUN servers
- ✅ SDP offer/answer exchange via Odoo messages
- ✅ ICE connection state changes to "connected"
- ✅ Audio permissions granted
- ✅ Local and remote streams established

### **Troubleshooting:**
- **No ICE candidates**: Check network connectivity to Google STUN servers
- **Permission denied**: Grant microphone/camera permissions
- **Connection failed**: Check firewall/NAT configuration
- **No audio**: Verify audio device availability

## 🎉 **Success Criteria**

**Phase 3 Success:**
- RTCPeerConnection created with STUN servers
- ICE candidates generated and sent
- SDP offer created and transmitted

**Phase 4 Success:**
- Two-way audio connection established
- Real-time audio streaming works
- Call can be ended cleanly

## 🚀 **Next Steps After Success**

Once Phase 3 & 4 work:
1. **Multi-device testing** - Test between different devices
2. **Network testing** - Test on different networks (WiFi, cellular)
3. **Call quality optimization** - Adjust audio settings
4. **Video calling** - Enable video streams
5. **Production deployment** - Deploy to app stores

## 📱 **Development Build vs Expo Go**

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| RTC Sessions | ✅ | ✅ |
| WebRTC Signaling | ✅ | ✅ |
| STUN Servers | ❌ | ✅ |
| P2P Audio | ❌ | ✅ |
| Real WebRTC | ❌ | ✅ |

**Start testing Phase 3 & 4 now!** 🎯
