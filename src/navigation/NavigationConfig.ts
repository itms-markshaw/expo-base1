/**
 * Navigation Configuration
 * Sophisticated navigation system with categories, permissions, and dynamic routing
 */

export interface NavigationItem {
  id: string;
  name: string;
  shortName?: string;
  icon: string;
  component?: string;
  route?: string;
  category: NavigationCategoryType;
  badge?: number | string;
  available: boolean;
  permissions?: string[];
  description?: string;
  color?: string;
  children?: NavigationItem[];
}

export type NavigationCategoryType =
  | 'dashboard'
  | 'sales'
  | 'operations'
  | 'mobile'
  | 'tools'
  | 'admin';

export interface NavigationCategoryConfig {
  id: NavigationCategoryType;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const navigationCategories: Record<NavigationCategoryType, NavigationCategoryConfig> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'dashboard',
    color: '#007AFF',
    description: 'Overview and key metrics'
  },
  sales: {
    id: 'sales',
    name: 'Sales',
    icon: 'trending-up',
    color: '#34C759',
    description: 'Sales management and CRM'
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    icon: 'settings',
    color: '#FF9500',
    description: 'Business operations and data'
  },
  mobile: {
    id: 'mobile',
    name: 'Mobile',
    icon: 'smartphone',
    color: '#9C27B0',
    description: 'Field service and mobile tools'
  },
  tools: {
    id: 'tools',
    name: 'Tools',
    icon: 'build',
    color: '#666',
    description: 'Utilities and integrations'
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    icon: 'admin-panel-settings',
    color: '#FF3B30',
    description: 'System administration'
  }
};

export const navigationItems: NavigationItem[] = [
  // Dashboard Category
  {
    id: 'home',
    name: 'Home',
    shortName: 'Home',
    icon: 'home',
    component: 'HomeScreen',
    category: 'dashboard',
    available: true,
    description: 'Main dashboard with overview',
    color: '#007AFF',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    shortName: 'Analytics',
    icon: 'analytics',
    component: 'AnalyticsScreen',
    category: 'dashboard',
    available: false,
    description: 'Business intelligence and reports',
    color: '#007AFF',
  },

  // Sales Category
  {
    id: 'sales-orders',
    name: 'Sales Orders',
    shortName: 'Orders',
    icon: 'shopping-cart',
    component: 'SalesOrderScreen',
    category: 'sales',
    available: true,
    description: 'Manage sales orders and quotations',
    color: '#34C759',
  },
  {
    id: 'customers',
    name: 'Customers',
    shortName: 'Customers',
    icon: 'people',
    component: 'CustomersScreen',
    category: 'sales',
    available: true,
    description: 'Customer relationship management',
    color: '#34C759',
  },
  {
    id: 'leads',
    name: 'Leads',
    shortName: 'Leads',
    icon: 'person-add',
    component: 'LeadsScreen',
    category: 'sales',
    available: true,
    description: 'Lead management and conversion',
    color: '#34C759',
  },
  {
    id: 'products',
    name: 'Products',
    shortName: 'Products',
    icon: 'inventory',
    component: 'ProductsScreen',
    category: 'sales',
    available: false,
    description: 'Product catalog and inventory',
    color: '#34C759',
  },

  // Operations Category

  {
    id: 'activities',
    name: 'Activities',
    shortName: 'Tasks',
    icon: 'event-note',
    component: 'ActivitiesScreen',
    category: 'operations',
    available: true,
    description: 'Task and activity management',
    color: '#FF9500',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    shortName: 'Calendar',
    icon: 'event',
    component: 'CalendarScreen',
    category: 'operations',
    available: true,
    description: 'Calendar integration and scheduling',
    color: '#FF9500',
  },
  {
    id: 'messages',
    name: 'Messages',
    shortName: 'Messages',
    icon: 'message',
    component: 'MessagesScreen',
    category: 'operations',
    available: true,
    description: 'Communications and notifications',
    color: '#007AFF',
  },
  {
    id: 'attachments',
    name: 'Attachments',
    shortName: 'Files',
    icon: 'attach-file',
    component: 'AttachmentsScreen',
    category: 'operations',
    available: true,
    description: 'Files and document management',
    color: '#34C759',
  },
  {
    id: 'projects',
    name: 'Projects',
    shortName: 'Projects',
    icon: 'folder',
    component: 'ProjectsScreen',
    category: 'operations',
    available: true,
    description: 'Project management and tracking',
    color: '#FF9500',
  },
  {
    id: 'helpdesk',
    name: 'Helpdesk',
    shortName: 'Helpdesk',
    icon: 'support',
    component: 'HelpdeskScreen',
    category: 'operations',
    available: true,
    description: 'Support tickets and customer service',
    color: '#FF6B35',
  },

  // Mobile Category
  {
    id: 'field-service',
    name: 'Field Service',
    shortName: 'Field',
    icon: 'location-on',
    component: 'MobileScreen',
    category: 'mobile',
    available: true,
    description: 'GPS tracking and field operations',
    color: '#9C27B0',
  },
  {
    id: 'camera',
    name: 'Documentation',
    shortName: 'Camera',
    icon: 'camera-alt',
    component: 'CameraScreen',
    category: 'mobile',
    available: true,
    description: 'Photo capture and documentation',
    color: '#9C27B0',
  },
  {
    id: 'barcode',
    name: 'Barcode Scanner',
    shortName: 'Scan',
    icon: 'qr-code-scanner',
    component: 'BarcodeScreen',
    category: 'mobile',
    available: false,
    description: 'Product and asset scanning',
    color: '#9C27B0',
  },
  {
    id: 'offline',
    name: 'Offline Mode',
    shortName: 'Offline',
    icon: 'cloud-off',
    component: 'OfflineScreen',
    category: 'mobile',
    available: false,
    description: 'Work without internet connection',
    color: '#9C27B0',
  },

  // Tools Category
  {
    id: 'sync',
    name: 'Sync Dashboard',
    shortName: 'Sync',
    icon: 'sync',
    component: 'SyncDashboard',
    category: 'tools',
    available: true,
    description: 'Offline sync management hub',
    color: '#666',
    children: [
      {
        id: 'sync-models',
        name: 'Model Selection',
        shortName: 'Models',
        icon: 'storage',
        component: 'ModelSelectionScreen',
        route: '/sync/models',
        category: 'tools',
        available: true,
        description: 'Choose which models to sync',
        color: '#666',
      },
      {
        id: 'sync-settings',
        name: 'Sync Settings',
        shortName: 'Settings',
        icon: 'settings',
        component: 'SyncSettingsScreen',
        route: '/sync/settings',
        category: 'tools',
        available: true,
        description: 'Configure sync preferences',
        color: '#666',
      },
      {
        id: 'sync-progress',
        name: 'Sync Progress',
        shortName: 'Progress',
        icon: 'hourglass-empty',
        component: 'SyncProgressScreen',
        route: '/sync/progress',
        category: 'tools',
        available: true,
        description: 'Real-time sync progress',
        color: '#666',
      },
      {
        id: 'sync-conflicts',
        name: 'Conflict Resolution',
        shortName: 'Conflicts',
        icon: 'warning',
        component: 'ConflictResolutionScreen',
        route: '/sync/conflicts',
        category: 'tools',
        available: true,
        description: 'Resolve data conflicts',
        color: '#FF9800',
      },
      {
        id: 'offline-queue',
        name: 'Offline Queue',
        shortName: 'Queue',
        icon: 'cloud-queue',
        component: 'OfflineQueueScreen',
        route: '/sync/queue',
        category: 'tools',
        available: true,
        description: 'Manage offline operations queue',
        color: '#2196F3',
      },
      {
        id: 'database-manager',
        name: 'Database Manager',
        shortName: 'Database',
        icon: 'storage',
        component: 'DatabaseManagerScreen',
        route: '/sync/database',
        category: 'tools',
        available: true,
        description: 'View and manage SQLite data',
        color: '#666',
      },
    ],
  },
  {
    id: 'data',
    name: 'Data',
    shortName: 'Data',
    icon: 'storage',
    component: 'DataScreen',
    category: 'tools',
    available: true,
    description: 'View and manage synced data',
    color: '#666',
  },
  {
    id: 'test',
    name: 'Testing',
    shortName: 'Test',
    icon: 'bug-report',
    component: 'TestScreen',
    category: 'tools',
    available: true,
    description: 'System testing and diagnostics',
    color: '#666',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    shortName: 'API',
    icon: 'api',
    component: 'IntegrationsScreen',
    category: 'tools',
    available: false,
    description: 'Third-party integrations',
    color: '#666',
  },
  {
    id: 'reports',
    name: 'Reports',
    shortName: 'Reports',
    icon: 'assessment',
    component: 'ReportsScreen',
    category: 'tools',
    available: false,
    description: 'Custom reports and exports',
    color: '#666',
  },

  // Admin Category
  {
    id: 'settings',
    name: 'Settings',
    shortName: 'Settings',
    icon: 'settings',
    component: 'SettingsScreen',
    category: 'admin',
    available: true,
    description: 'App configuration and preferences',
    color: '#FF3B30',
    permissions: ['admin'],
  },
  {
    id: 'users',
    name: 'User Management',
    shortName: 'Users',
    icon: 'manage-accounts',
    component: 'UsersScreen',
    category: 'admin',
    available: false,
    description: 'User accounts and permissions',
    color: '#FF3B30',
    permissions: ['admin'],
  },
  {
    id: 'logs',
    name: 'System Logs',
    shortName: 'Logs',
    icon: 'description',
    component: 'LogsScreen',
    category: 'admin',
    available: false,
    description: 'System logs and debugging',
    color: '#FF3B30',
    permissions: ['admin'],
  },
];

export class NavigationService {
  /**
   * Get navigation items by category
   */
  static getItemsByCategory(category: NavigationCategoryType): NavigationItem[] {
    return navigationItems.filter(item => item.category === category);
  }

  /**
   * Get available navigation items
   */
  static getAvailableItems(): NavigationItem[] {
    return navigationItems.filter(item => item.available);
  }

  /**
   * Get navigation item by ID
   */
  static getItemById(id: string): NavigationItem | undefined {
    return navigationItems.find(item => item.id === id);
  }

  /**
   * Get primary navigation items (for main tabs)
   */
  static getPrimaryItems(): NavigationItem[] {
    return [
      this.getItemById('home')!,
      this.getItemById('sales-orders')!,
      this.getItemById('data')!,
      this.getItemById('field-service')!,
      this.getItemById('calendar')!,
    ].filter(Boolean);
  }

  /**
   * Get secondary navigation items (for drawer/menu)
   */
  static getSecondaryItems(): NavigationItem[] {
    return navigationItems.filter(item => 
      item.available && !this.getPrimaryItems().includes(item)
    );
  }

  /**
   * Check if user has permission for navigation item
   */
  static hasPermission(item: NavigationItem, userPermissions: string[] = []): boolean {
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }
    return item.permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Get navigation items with badges/counts
   */
  static getItemsWithBadges(): NavigationItem[] {
    return navigationItems.filter(item => item.badge !== undefined);
  }

  /**
   * Update navigation item badge
   */
  static updateBadge(itemId: string, badge: number | string | undefined): void {
    const item = this.getItemById(itemId);
    if (item) {
      item.badge = badge;
    }
  }

  /**
   * Get navigation breadcrumb
   */
  static getBreadcrumb(itemId: string): string[] {
    const item = this.getItemById(itemId);
    if (!item) return [];

    const category = navigationCategories[item.category];
    return [category.name, item.name];
  }
}
