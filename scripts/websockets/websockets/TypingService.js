import odooWebSocketService from './OdooWebSocketService';

/**
 * Typing Service - Manages typing indicators and notifications
 * Handles real-time typing status with debouncing and optimization
 */
class TypingService {
  constructor() {
    this.typingUsers = new Map(); // channelId -> Set of typing user IDs
    this.typingListeners = new Map(); // event -> callbacks
    this.isInitialized = false;
    
    // Own typing state
    this.ownTypingState = new Map(); // channelId -> typing status
    this.typingTimeouts = new Map(); // channelId -> timeout ID
    this.sendTimeouts = new Map(); // channelId -> send timeout ID
    
    // Configuration
    this.typingTimeout = 3000; // 3 seconds until typing stops
    this.sendDebounceTime = 1000; // 1 second debounce for sending
    this.maxTypingDuration = 30000; // 30 seconds max typing duration
    
    // Performance tracking
    this.stats = {
      sent: 0,
      received: 0,
      errors: 0
    };
  }

/**
  * Initialize typing service
  */
 async initialize() {
   if (this.isInitialized) {
     console.log('⌨️ Typing service already initialized');
     return;
   }

   try {
     console.log('⌨️ Initializing Typing Service...');
     
     // Set up WebSocket event listeners
     this.setupWebSocketListeners();
     
     this.isInitialized = true;
     console.log('✅ Typing Service initialized');
     
     this.emit('initialized');
   } catch (error) {
     console.error('❌ Failed to initialize Typing Service:', error);
     throw error;
   }
 }

 /**
  * Set up WebSocket event listeners
  */
 setupWebSocketListeners() {
   // Listen for typing updates from other users
   odooWebSocketService.on('typingUpdate', (data) => {
     this.handleTypingUpdate(data);
   });

   // Listen for transient messages (often used for typing)
   odooWebSocketService.on('transientMessage', (data) => {
     this.handleTransientMessage(data);
   });

   // Clean up typing state on disconnect
   odooWebSocketService.on('disconnected', () => {
     console.log('⌨️ WebSocket disconnected - clearing typing state');
     this.clearAllTypingState();
   });

   // Re-establish typing state on reconnect
   odooWebSocketService.on('connected', () => {
     console.log('⌨️ WebSocket reconnected - restoring typing state');
     this.restoreTypingState();
   });
 }

 /**
  * Handle incoming typing update
  */
 handleTypingUpdate(data) {
   try {
     const { channel_id, partner_id, is_typing, user_name } = data;
     
     if (!channel_id || !partner_id) {
       console.warn('⚠️ Received invalid typing update:', data);
       return;
     }

     // Don't process own typing updates
     if (partner_id === odooWebSocketService.partnerId) {
       return;
     }

     const channelId = channel_id.toString();
     
     // Initialize typing set for channel if needed
     if (!this.typingUsers.has(channelId)) {
       this.typingUsers.set(channelId, new Set());
     }
     
     const typingSet = this.typingUsers.get(channelId);
     
     if (is_typing) {
       // User started typing
       typingSet.add(partner_id);
       
       // Set timeout to automatically remove typing status
       this.setTypingTimeout(channelId, partner_id);
       
       console.log(`⌨️ ${user_name || partner_id} started typing in channel ${channelId}`);
     } else {
       // User stopped typing
       typingSet.delete(partner_id);
       this.clearTypingTimeout(channelId, partner_id);
       
       console.log(`⌨️ ${user_name || partner_id} stopped typing in channel ${channelId}`);
     }
     
     this.stats.received++;
     
     // Emit typing change event
     this.emit('typingChanged', {
       channelId,
       partnerId: partner_id,
       isTyping: is_typing,
       userName: user_name,
       typingUsers: Array.from(typingSet),
       typingCount: typingSet.size
     });
     
     // Emit channel-specific event
     this.emit(`typing:${channelId}`, {
       partnerId: partner_id,
       isTyping: is_typing,
       userName: user_name,
       typingUsers: Array.from(typingSet),
       typingCount: typingSet.size
     });
     
   } catch (error) {
     console.error('❌ Error handling typing update:', error);
     this.stats.errors++;
   }
 }

 /**
  * Handle transient messages (may contain typing info)
  */
 handleTransientMessage(data) {
   // Some Odoo versions send typing as transient messages
   if (data.message_type === 'typing' || data.type === 'typing') {
     this.handleTypingUpdate(data);
   }
 }

 /**
  * Start typing in a channel
  */
 startTyping(channelId) {
   if (!channelId) {
     console.warn('⚠️ Cannot start typing - no channel ID provided');
     return;
   }

   const wsStatus = odooWebSocketService.getConnectionStatus();
   if (!wsStatus.isConnected) {
     console.log('⌨️ WebSocket not connected - cannot send typing notification');
     return;
   }

   const channelIdStr = channelId.toString();
   
   // Check if already typing in this channel
   if (this.ownTypingState.get(channelIdStr)) {
     // Extend typing duration
     this.extendTyping(channelIdStr);
     return;
   }

   // Clear any existing send timeout
   this.clearSendTimeout(channelIdStr);
   
   // Set debounced send
   const sendTimeout = setTimeout(() => {
     this.sendTypingNotification(channelIdStr, true);
   }, this.sendDebounceTime);
   
   this.sendTimeouts.set(channelIdStr, sendTimeout);
   
   console.log(`⌨️ Started typing in channel ${channelIdStr} (debounced)`);
 }

 /**
  * Stop typing in a channel
  */
 stopTyping(channelId) {
   if (!channelId) {
     console.warn('⚠️ Cannot stop typing - no channel ID provided');
     return;
   }

   const channelIdStr = channelId.toString();
   
   // Clear send timeout (prevent delayed start)
   this.clearSendTimeout(channelIdStr);
   
   // If we were typing, send stop notification
   if (this.ownTypingState.get(channelIdStr)) {
     this.sendTypingNotification(channelIdStr, false);
   }
   
   console.log(`⌨️ Stopped typing in channel ${channelIdStr}`);
 }

 /**
  * Extend typing duration (called when user continues typing)
  */
 extendTyping(channelId) {
   const channelIdStr = channelId.toString();
   
   // Clear existing timeout
   this.clearOwnTypingTimeout(channelIdStr);
   
   // Set new timeout
   this.setOwnTypingTimeout(channelIdStr);
 }

 /**
  * Send typing notification via WebSocket
  */
 sendTypingNotification(channelId, isTyping) {
   try {
     const wsStatus = odooWebSocketService.getConnectionStatus();
     if (!wsStatus.isConnected) {
       console.log('⌨️ Cannot send typing notification - WebSocket not connected');
       return;
     }

     const typingData = {
       channel_id: parseInt(channelId),
       partner_id: odooWebSocketService.partnerId,
       is_typing: isTyping
     };

     // Send via WebSocket
     odooWebSocketService.sendMessage('typing', typingData);
     
     // Update own state
     this.ownTypingState.set(channelId, isTyping);
     
     if (isTyping) {
       // Set timeout to auto-stop typing
       this.setOwnTypingTimeout(channelId);
     } else {
       // Clear timeout
       this.clearOwnTypingTimeout(channelId);
     }
     
     this.stats.sent++;
     
     console.log(`⌨️ Sent typing notification: ${isTyping} for channel ${channelId}`);
     
     // Emit own typing event
     this.emit('ownTypingChanged', {
       channelId,
       isTyping,
       timestamp: Date.now()
     });
     
   } catch (error) {
     console.error('❌ Failed to send typing notification:', error);
     this.stats.errors++;
   }
 }

 /**
  * Set timeout for own typing status
  */
 setOwnTypingTimeout(channelId) {
   this.clearOwnTypingTimeout(channelId);
   
   const timeout = setTimeout(() => {
     console.log(`⌨️ Auto-stopping typing for channel ${channelId} (timeout)`);
     this.sendTypingNotification(channelId, false);
   }, this.typingTimeout);
   
   this.typingTimeouts.set(`own_${channelId}`, timeout);
 }

 /**
  * Clear timeout for own typing status
  */
 clearOwnTypingTimeout(channelId) {
   const timeoutKey = `own_${channelId}`;
   const timeout = this.typingTimeouts.get(timeoutKey);
   
   if (timeout) {
     clearTimeout(timeout);
     this.typingTimeouts.delete(timeoutKey);
   }
 }

 /**
  * Set timeout for other user's typing status
  */
 setTypingTimeout(channelId, partnerId) {
   const timeoutKey = `${channelId}_${partnerId}`;
   
   // Clear existing timeout
   this.clearTypingTimeout(channelId, partnerId);
   
   // Set new timeout
   const timeout = setTimeout(() => {
     console.log(`⌨️ Auto-removing typing status for partner ${partnerId} in channel ${channelId}`);
     
     const typingSet = this.typingUsers.get(channelId);
     if (typingSet) {
       typingSet.delete(partnerId);
       
       // Emit typing change
       this.emit('typingChanged', {
         channelId,
         partnerId,
         isTyping: false,
         typingUsers: Array.from(typingSet),
         typingCount: typingSet.size
       });
     }
   }, this.typingTimeout * 2); // Give extra time for network delays
   
   this.typingTimeouts.set(timeoutKey, timeout);
 }

 /**
  * Clear timeout for other user's typing status
  */
 clearTypingTimeout(channelId, partnerId) {
   const timeoutKey = `${channelId}_${partnerId}`;
   const timeout = this.typingTimeouts.get(timeoutKey);
   
   if (timeout) {
     clearTimeout(timeout);
     this.typingTimeouts.delete(timeoutKey);
   }
 }

 /**
  * Clear send timeout
  */
 clearSendTimeout(channelId) {
   const timeout = this.sendTimeouts.get(channelId);
   if (timeout) {
     clearTimeout(timeout);
     this.sendTimeouts.delete(channelId);
   }
 }

 /**
  * Get typing users for a channel
  */
 getTypingUsers(channelId) {
   const channelIdStr = channelId.toString();
   const typingSet = this.typingUsers.get(channelIdStr);
   
   return typingSet ? Array.from(typingSet) : [];
 }

 /**
  * Get typing count for a channel
  */
 getTypingCount(channelId) {
   const typingUsers = this.getTypingUsers(channelId);
   return typingUsers.length;
 }

 /**
  * Check if user is typing in channel
  */
 isUserTyping(channelId, partnerId) {
   const channelIdStr = channelId.toString();
   const typingSet = this.typingUsers.get(channelIdStr);
   
   return typingSet ? typingSet.has(partnerId) : false;
 }

 /**
  * Check if current user is typing in channel
  */
 isOwnTyping(channelId) {
   const channelIdStr = channelId.toString();
   return this.ownTypingState.get(channelIdStr) || false;
 }

 /**
  * Get all typing status for all channels
  */
 getAllTypingStatus() {
   const allStatus = {};
   
   this.typingUsers.forEach((typingSet, channelId) => {
     allStatus[channelId] = {
       typingUsers: Array.from(typingSet),
       count: typingSet.size,
       ownTyping: this.isOwnTyping(channelId)
     };
   });
   
   return allStatus;
 }

 /**
  * Clear typing state for a specific channel
  */
 clearChannelTypingState(channelId) {
   const channelIdStr = channelId.toString();
   
   // Clear other users' typing state
   this.typingUsers.delete(channelIdStr);
   
   // Clear own typing state
   this.stopTyping(channelIdStr);
   
   // Clear timeouts
   this.clearOwnTypingTimeout(channelIdStr);
   this.clearSendTimeout(channelIdStr);
   
   // Clear other users' timeouts
   this.typingTimeouts.forEach((timeout, key) => {
     if (key.startsWith(channelIdStr)) {
       clearTimeout(timeout);
       this.typingTimeouts.delete(key);
     }
   });
   
   console.log(`⌨️ Cleared typing state for channel ${channelIdStr}`);
 }

 /**
  * Clear all typing state
  */
 clearAllTypingState() {
   // Clear all typing users
   this.typingUsers.clear();
   
   // Clear own typing state
   this.ownTypingState.clear();
   
   // Clear all timeouts
   this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
   this.typingTimeouts.clear();
   
   this.sendTimeouts.forEach(timeout => clearTimeout(timeout));
   this.sendTimeouts.clear();
   
   console.log('⌨️ Cleared all typing state');
   
   this.emit('allTypingCleared');
 }

 /**
  * Restore typing state after reconnection
  */
 restoreTypingState() {
   // Re-send typing notifications for channels where we were typing
   this.ownTypingState.forEach((isTyping, channelId) => {
     if (isTyping) {
       console.log(`⌨️ Restoring typing state for channel ${channelId}`);
       this.sendTypingNotification(channelId, true);
     }
   });
 }

 /**
  * Get typing statistics
  */
 getTypingStats() {
   return {
     ...this.stats,
     activeChannels: this.typingUsers.size,
     ownTypingChannels: Array.from(this.ownTypingState.entries())
       .filter(([_, isTyping]) => isTyping).length,
     activeTimeouts: this.typingTimeouts.size
   };
 }

 /**
  * Add event listener
  */
 on(event, callback) {
   if (!this.typingListeners.has(event)) {
     this.typingListeners.set(event, []);
   }
   this.typingListeners.get(event).push(callback);
 }

 /**
  * Remove event listener
  */
 off(event, callback) {
   if (this.typingListeners.has(event)) {
     const listeners = this.typingListeners.get(event);
     const index = listeners.indexOf(callback);
     if (index > -1) {
       listeners.splice(index, 1);
     }
   }
 }

 /**
  * Emit event to listeners
  */
 emit(event, data) {
   if (this.typingListeners.has(event)) {
     this.typingListeners.get(event).forEach(callback => {
       try {
         callback(data);
       } catch (error) {
         console.error(`Error in typing listener for ${event}:`, error);
       }
     });
   }
 }

 /**
  * Cleanup and disconnect
  */
 cleanup() {
   console.log('⌨️ Cleaning up Typing Service...');
   
   // Stop all typing
   this.ownTypingState.forEach((_, channelId) => {
     this.stopTyping(channelId);
   });
   
   // Clear all state
   this.clearAllTypingState();
   
   // Reset initialization
   this.isInitialized = false;
   
   this.emit('cleanup');
 }
}

// Create singleton instance
const typingService = new TypingService();

export default typingService;