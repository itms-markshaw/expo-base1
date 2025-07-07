/**
 * Badge Detector Utility
 * Automatically detects screen features for enhanced badge system
 * Following bottomsheet-naming-and-badge-system.md specifications
 */

import { ScreenBadgeProps } from '../components/ScreenBadge';

// Screen registry for automatic detection
interface ScreenInfo {
  number: number;
  name: string;
  model: string;
  type: 'list' | 'detail' | 'create' | 'edit' | 'bottomsheet' | 'filter' | 'workflow';
  hasChatter?: boolean;
  hasSync?: boolean;
  hasAI?: boolean;
  hasRealtime?: boolean;
  components?: string[];
  services?: string[];
}

const SCREEN_REGISTRY: { [key: number]: ScreenInfo } = {
  // Contacts (res.partner) - 100 series
  101: {
    number: 101,
    name: 'ContactsList',
    model: 'res.partner',
    type: 'list',
    hasSync: true,
    hasAI: false,
    hasRealtime: false,
    components: ['BC-L001'],
    services: ['ContactService', 'SyncService']
  },
  102: {
    number: 102,
    name: 'ContactDetail',
    model: 'res.partner',
    type: 'detail',
    hasChatter: true,
    hasSync: true,
    hasAI: true,
    hasRealtime: true,
    components: ['BC-F001', 'BC-R001'],
    services: ['ContactService', 'ChatterService', 'SyncService']
  },
  103: {
    number: 103,
    name: 'ContactCreate',
    model: 'res.partner',
    type: 'create',
    hasSync: true,
    hasAI: true,
    components: ['BC-F001'],
    services: ['ContactService', 'SyncService']
  },
  104: {
    number: 104,
    name: 'ContactEdit',
    model: 'res.partner',
    type: 'edit',
    hasSync: true,
    hasAI: true,
    components: ['BC-F001'],
    services: ['ContactService', 'SyncService']
  },
  105: {
    number: 105,
    name: 'ContactBottomSheet',
    model: 'res.partner',
    type: 'bottomsheet',
    hasSync: true,
    components: ['BC-B001'],
    services: ['ContactService']
  },

  // Sales Orders (sale.order) - 200 series
  201: {
    number: 201,
    name: 'SalesOrdersList',
    model: 'sale.order',
    type: 'list',
    hasSync: true,
    hasAI: true,
    hasRealtime: false,
    components: ['BC-L001'],
    services: ['SalesOrderService', 'SyncService', 'GroqAIService']
  },
  202: {
    number: 202,
    name: 'SalesOrderDetail',
    model: 'sale.order',
    type: 'detail',
    hasChatter: true,
    hasSync: true,
    hasAI: true,
    hasRealtime: true,
    components: ['BC-F001', 'BC-C008'],
    services: ['SalesOrderService', 'ChatterService', 'SyncService', 'GroqAIService']
  },
  203: {
    number: 203,
    name: 'SalesOrderEdit',
    model: 'sale.order',
    type: 'edit',
    hasSync: true,
    hasAI: true,
    components: ['BC-F001'],
    services: ['SalesOrderService', 'SyncService']
  },
  204: {
    number: 204,
    name: 'SalesOrderCreate',
    model: 'sale.order',
    type: 'create',
    hasSync: true,
    hasAI: true,
    components: ['BC-F001'],
    services: ['SalesOrderService', 'SyncService']
  },
  205: {
    number: 205,
    name: 'SalesOrderBottomSheet',
    model: 'sale.order',
    type: 'bottomsheet',
    hasSync: true,
    components: ['BC-B001'],
    services: ['SalesOrderService']
  },
  206: {
    number: 206,
    name: 'SalesOrderChatter',
    model: 'sale.order',
    type: 'chatter',
    hasChatter: true,
    hasSync: true,
    hasAI: true,
    hasRealtime: true,
    components: ['BC-C008'],
    services: ['ChatterService', 'SyncService', 'GroqAIService']
  },

  // Add more screen registrations as needed...
};

/**
 * Badge Detector Class
 * Automatically detects screen features and generates badge configurations
 */
export class BadgeDetector {
  /**
   * Detect screen features and return badge configuration
   */
  static detectScreenFeatures(screenNumber: number): ScreenBadgeProps {
    const screenInfo = SCREEN_REGISTRY[screenNumber];
    if (!screenInfo) {
      // Return basic badge for unknown screens
      return { screenNumber };
    }

    return {
      screenNumber,
      components: this.detectComponents(screenInfo),
      services: this.detectServices(screenInfo),
      aiFeatures: this.detectAIFeatures(screenInfo),
      realTimeFeatures: this.detectRealTimeFeatures(screenInfo),
      offlineCapable: this.isOfflineCapable(screenInfo)
    };
  }

  /**
   * Detect which base components are used
   */
  private static detectComponents(screenInfo: ScreenInfo): string[] {
    const components = screenInfo.components || [];
    
    // Auto-detect based on screen type
    switch (screenInfo.type) {
      case 'list':
        if (!components.includes('BC-L001')) components.push('BC-L001');
        break;
      case 'detail':
      case 'create':
      case 'edit':
        if (!components.includes('BC-F001')) components.push('BC-F001');
        if (screenInfo.hasChatter && !components.includes('BC-R001')) {
          components.push('BC-R001');
        }
        break;
      case 'bottomsheet':
        if (!components.includes('BC-B001')) components.push('BC-B001');
        break;
      case 'filter':
        if (!components.includes('BC-S002')) components.push('BC-S002');
        break;
      case 'workflow':
        if (!components.includes('BC-W001')) components.push('BC-W001');
        break;
    }
    
    return components;
  }

  /**
   * Detect which services are used
   */
  private static detectServices(screenInfo: ScreenInfo): string[] {
    const services = screenInfo.services || [];
    
    // Auto-detect based on model
    const modelService = this.getModelServiceName(screenInfo.model);
    if (!services.includes(modelService)) {
      services.push(modelService);
    }
    
    // Add common services based on features
    if (screenInfo.hasChatter && !services.includes('ChatterService')) {
      services.push('ChatterService');
    }
    
    if (screenInfo.hasSync && !services.includes('SyncService')) {
      services.push('SyncService');
    }
    
    if (screenInfo.hasRealtime && !services.includes('WebSocketService')) {
      services.push('WebSocketService');
    }
    
    return services;
  }

  /**
   * Detect AI features - only show when explicitly enabled with AI components
   */
  private static detectAIFeatures(screenInfo: ScreenInfo): string[] {
    const aiFeatures: string[] = [];

    // Only show AI badge when screen has AI AND uses AI-specific components/services
    if (screenInfo.hasAI && (
      screenInfo.components?.includes('BC-C008') || // Universal Chatter
      screenInfo.components?.includes('BC-C007') || // AI Assistant
      screenInfo.services?.includes('GroqAIService')
    )) {
      switch (screenInfo.type) {
        case 'detail':
          aiFeatures.push('smart-replies', 'document-analysis');
          break;
        case 'create':
        case 'edit':
          aiFeatures.push('smart-completion', 'form-assistance');
          break;
        case 'list':
          aiFeatures.push('smart-search', 'insights');
          break;
      }

      if (screenInfo.hasChatter) {
        aiFeatures.push('groq-chat', 'voice-transcription');
      }
    }

    return aiFeatures;
  }

  /**
   * Detect real-time features
   */
  private static detectRealTimeFeatures(screenInfo: ScreenInfo): string[] {
    const realTimeFeatures: string[] = [];
    
    if (screenInfo.hasRealtime) {
      realTimeFeatures.push('websocket');
      
      if (screenInfo.hasChatter) {
        realTimeFeatures.push('typing-indicators', 'presence', 'live-messages');
      }
      
      if (screenInfo.type === 'list') {
        realTimeFeatures.push('live-updates');
      }
    }
    
    return realTimeFeatures;
  }

  /**
   * Check if screen has offline capability - only show when explicitly important
   */
  private static isOfflineCapable(screenInfo: ScreenInfo): boolean {
    // Only show offline badge for screens that specifically highlight offline features
    // or have complex offline functionality beyond basic sync
    return screenInfo.hasSync && (
      screenInfo.type === 'list' || // List screens benefit from offline browsing
      screenInfo.hasChatter ||      // Chatter screens have offline message queuing
      screenInfo.services?.includes('OfflineQueueService') // Explicit offline services
    );
  }

  /**
   * Get service name from model name
   */
  private static getModelServiceName(modelName: string): string {
    const parts = modelName.split('.');
    if (parts.length === 2) {
      // Convert snake_case to PascalCase
      const serviceName = parts[1]
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      return `${serviceName}Service`;
    }
    return 'UnknownService';
  }

  /**
   * Register a new screen for automatic detection
   */
  static registerScreen(screenInfo: ScreenInfo): void {
    SCREEN_REGISTRY[screenInfo.number] = screenInfo;
  }

  /**
   * Get all registered screens
   */
  static getAllScreens(): ScreenInfo[] {
    return Object.values(SCREEN_REGISTRY);
  }

  /**
   * Get screen info by number
   */
  static getScreenInfo(screenNumber: number): ScreenInfo | undefined {
    return SCREEN_REGISTRY[screenNumber];
  }

  /**
   * Get screens by model
   */
  static getScreensByModel(modelName: string): ScreenInfo[] {
    return Object.values(SCREEN_REGISTRY).filter(screen => screen.model === modelName);
  }

  /**
   * Get screens by type
   */
  static getScreensByType(type: ScreenInfo['type']): ScreenInfo[] {
    return Object.values(SCREEN_REGISTRY).filter(screen => screen.type === type);
  }
}

// Export screen registry for external use
export { SCREEN_REGISTRY };
export type { ScreenInfo };

// Helper function for easy badge detection
export function getScreenBadges(screenNumber: number): ScreenBadgeProps {
  return BadgeDetector.detectScreenFeatures(screenNumber);
}

// Helper function for component-specific badges
export function getComponentBadges(
  components: string[],
  services: string[] = [],
  options: Partial<ScreenBadgeProps> = {}
): ScreenBadgeProps {
  return {
    components,
    services,
    layout: 'minimal',
    ...options
  };
}

// Helper function for service-specific badges
export function getServiceBadges(
  services: string[],
  options: Partial<ScreenBadgeProps> = {}
): ScreenBadgeProps {
  return {
    services,
    layout: 'minimal',
    ...options
  };
}

// Helper functions for better badge labels
export function getComponentLabel(component: string): string {
  const componentLabels: { [key: string]: string } = {
    'BC-C001': 'Chatter',
    'BC-C002': 'Chat Input',
    'BC-C003': 'Messages',
    'BC-C004': 'Attachments',
    'BC-C005': 'Activities',
    'BC-C006': 'Followers',
    'BC-C007': 'AI Assistant',
    'BC-L001': 'List View',
    'BC-F001': 'Form View',
    'BC-S001': 'Bottom Sheet',
    'BC-S002': 'Filter Sheet',
    'BC-W001': 'Workflows',
    'BC-R001': 'Real-time',
    'BC-R002': 'WebSocket',
    'BC-B001': 'Actions',
    'BC-B002': 'Details'
  };
  return componentLabels[component] || component;
}

export function getServiceLabel(service: string): string {
  const serviceLabels: { [key: string]: string } = {
    'ContactService': 'Contacts',
    'ChatterService': 'Chat',
    'SyncService': 'Sync',
    'WebSocketService': 'Real-time',
    'SalesOrderService': 'Sales',
    'DetailService': 'Details',
    'AuthService': 'Auth',
    'DatabaseService': 'Database'
  };
  return serviceLabels[service] || service.replace('Service', '');
}
