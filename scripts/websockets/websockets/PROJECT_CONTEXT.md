# Project Context: Odoo 18 WebSocket Implementation

## 🏢 Client Information

**Company**: ITMS Group Pty Ltd
**Domain**: itmsgroup.com.au
**System**: Odoo 18 Enterprise Edition
**Database**: ITMS_v17_3_backup_2025_02_17_08_15

## 📱 Application Details

**Project**: ExoMobile - React Native mobile app for Odoo
**Location**: `/Users/markshaw/Desktop/git/exomobile/`
**Purpose**: Real-time messaging and presence system
**Framework**: React Native with Expo

## 🎯 Project Goals

### Primary Objectives
1. **Real-time messaging** between users
2. **Presence indicators** (online/offline status)
3. **Push notifications** for new messages
4. **Typing indicators** for active conversations
5. **WebSocket-based** communication with Odoo 18

### Business Requirements
- Mobile app users need instant messaging
- Integration with existing Odoo user system
- Reliable connection handling
- Efficient battery usage
- Offline message queuing

## 🔧 Technical Environment

### Server Setup
- **Odoo Version**: 18.0+e (Enterprise)
- **Server URL**: https://itmsgroup.com.au
- **Current Proxy**: nginx (migrating to Cloudflare)
- **Database**: PostgreSQL
- **Authentication**: Session-based + OAuth2 capability

### Mobile App Stack
- **Framework**: React Native + Expo
- **State Management**: React Context + AsyncStorage
- **WebSocket**: Native WebSocket API
- **Authentication**: Custom XML-RPC service

## 📊 Current Architecture

### Authentication Flow
```
Mobile App → Session Login → Get Cookies → WebSocket Connection
```

### Message Flow (Planned)
```
User → Mobile App → WebSocket → Odoo Bus → Other Users
```

### Data Structure
```javascript
// Odoo 18 WebSocket Protocol
{
  event_name: "subscribe",
  data: {
    channels: ["bus.bus", "mail.message"],
    last: 0
  }
}
```

## 🔍 Discovery Process

### What We Learned
1. **Odoo 18 uses event-based WebSocket protocol** (not JSON-RPC over WebSocket)
2. **Bus module is required** for WebSocket functionality
3. **Session authentication works** for WebSocket connections
4. **WebSocket endpoint is `/websocket`** (not `/longpolling/websocket`)
5. **Connection succeeds** but closes due to missing bus module

### Key Breakthroughs
- Found actual Odoo 18 WebSocket worker code in browser DevTools
- Identified correct protocol structure
- Achieved successful WebSocket connection
- Created production-ready service architecture

## 🚨 Known Issues

### Current Blocker
**Bus Module Not Installed**: The primary issue preventing full functionality

### Symptoms
- WebSocket connects successfully
- Immediate close with "OUTDATED_VERSION" reason
- No WebSocket worker found in web interface
- No bus-related JavaScript loaded

### Root Cause
Odoo bus module provides:
- WebSocket worker scripts
- Real-time notification system
- Channel management
- Presence tracking

## 🛠️ Infrastructure Changes

### Proxy Migration
**From**: nginx reverse proxy
**To**: Cloudflare proxy

**Implications**:
- WebSocket connection limits (100 on free plan)
- Different timeout behaviors
- Additional security filtering
- Potential latency changes

### Required Cloudflare Configuration
- Enable WebSockets in dashboard
- SSL/TLS: Full (strict) mode
- Orange cloud (proxied) for WebSocket domain
- Appropriate page rules for WebSocket endpoints

## 👥 Team Context

### Previous Attempts
- Multiple authentication methods tried (OAuth2, XML-RPC, session)
- Various WebSocket endpoints tested
- Different protocol approaches attempted
- Session management challenges overcome

### Current Status
- Authentication: ✅ Solved
- WebSocket Connection: ✅ Working
- Protocol: ✅ Identified
- Bus Module: ❌ Missing (only remaining issue)

## 📈 Progress Timeline

1. **Authentication Issues** - Resolved with session-based approach
2. **WebSocket Protocol** - Discovered through DevTools analysis
3. **Connection Success** - Achieved with correct endpoint and headers
4. **Bus Module Discovery** - Identified as final requirement
5. **Production Code** - Created full implementation ready for deployment

## 🎯 Success Criteria

### Minimum Viable Product
- [ ] Bus module installed
- [ ] WebSocket maintains connection
- [ ] Basic message sending/receiving
- [ ] User presence detection

### Full Implementation
- [ ] Real-time chat interface
- [ ] Push notification integration
- [ ] Typing indicators
- [ ] Offline message queuing
- [ ] Multi-channel support

## 🔮 Future Considerations

### Scalability
- Connection pooling for multiple users
- Message history synchronization
- Bandwidth optimization
- Battery life optimization

### Features
- File sharing through WebSocket
- Voice message support
- Video call integration
- Screen sharing capabilities

## 📞 Stakeholder Information

### Technical Contacts
- **Developer**: Mark Shaw (mark.shaw@itmsgroup.com.au)
- **System**: Odoo 18 admin access required for bus module installation

### Business Contacts
- **Company**: ITMS Group
- **Domain**: itmsgroup.com.au
- **Industry**: IT Services

This context should help any AI understand the full scope, current status, and next steps for the WebSocket implementation.