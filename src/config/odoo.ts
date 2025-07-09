// Odoo Configuration for ExoMobile
export const ODOO_CONFIG = {
  baseURL: 'https://itmsgroup.com.au',
  db: 'ITMS_v17_3_backup_2025_02_17_08_15',
  
  // OAuth2 credentials
  username: 'mark.shaw@itmsgroup.com.au',
  password: 'hTempTWxeCFYWVswzMcv',
  clientId: 'GTZmuj6gqZduLrdaPCaiaWEQJrn2eWGhhyVwFgSr',
  clientSecret: 'EExqnTlEAYcZ9b6mnP2DYooRkWSnlTISB0PRZObM',

  // XML-RPC API Key (for 2FA users)
  apiKey: 'ea186501b420d9b656eecf026f04f74a975db27c', // Replace with your actual 40-character API key
  
  // WebSocket configuration
  websocket: {
    enabled: true,
    port: 8072,
    protocols: ['chat', 'notification'],
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    timeout: 10000
  },
  
  // API configuration
  api: {
    version: 'v2',
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // Chat configuration
  chat: {
    maxMessagesPerLoad: 50,
    typingTimeout: 3000,
    presenceUpdateInterval: 60000,
    messageRetentionDays: 30
  },
  
  // Features configuration
  features: {
    realTimeMessaging: true,
    typingIndicators: true,
    presenceStatus: true,
    fileSharing: true,
    messageReactions: false,
    messageThreads: false,
    voiceMessages: false
  },
  
  // Notification configuration
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    badge: true
  }
};

// Since both development and production use the same server,
// we can just export the same config for both environments
console.log('🌐 Using Odoo server: https://itmsgroup.com.au');
console.log(`🔧 Environment: ${typeof __DEV__ !== 'undefined' && __DEV__ ? 'Development' : 'Production'}`);

// Export the same config for all environments
export default ODOO_CONFIG;