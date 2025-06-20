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

// Development configuration override
export const DEV_CONFIG = {
  ...ODOO_CONFIG,
  baseURL: 'http://localhost:8069', // Local development server
  websocket: {
    ...ODOO_CONFIG.websocket,
    enabled: false // Disable WebSocket in dev if not available
  }
};

// Export default config based on environment
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
export default isDev ? DEV_CONFIG : ODOO_CONFIG;