/**
 * Sync Management Types
 * Model: sync.management
 * Comprehensive sync management and monitoring
 */

export interface SyncSession {
  id: string;
  type: 'manual' | 'automatic' | 'scheduled';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number; // milliseconds
  totalModels: number;
  processedModels: number;
  totalRecords: number;
  processedRecords: number;
  errors: SyncError[];
  conflicts: SyncConflict[];
  progress: number; // 0-100
  currentModel?: string;
  currentOperation?: string;
}

export interface SyncModel {
  name: string;
  displayName: string;
  enabled: boolean;
  lastSync?: string;
  recordCount: number;
  syncStrategy: 'all' | 'time_based' | 'incremental';
  timePeriod?: string;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  error?: string;
  conflicts: number;
  priority: number;
  category: string;
}

export interface SyncError {
  id: string;
  sessionId: string;
  model: string;
  recordId?: number;
  operation: 'create' | 'update' | 'delete' | 'read';
  error: string;
  details?: any;
  timestamp: string;
  resolved: boolean;
  resolution?: string;
}

export interface SyncConflict {
  id: string;
  sessionId: string;
  model: string;
  recordId: number;
  field: string;
  localValue: any;
  serverValue: any;
  resolution: 'pending' | 'local_wins' | 'server_wins' | 'manual';
  resolvedBy?: string;
  resolvedAt?: string;
  timestamp: string;
}

export interface SyncStatistics {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  totalRecordsSynced: number;
  averageSessionDuration: number;
  lastSuccessfulSync?: string;
  totalConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  totalErrors: number;
  resolvedErrors: number;
  syncFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  modelStatistics: {
    [modelName: string]: {
      recordCount: number;
      lastSync: string;
      errorCount: number;
      conflictCount: number;
    };
  };
}

export interface OfflineOperation {
  id: string;
  model: string;
  recordId?: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  error?: string;
  dependencies: string[]; // IDs of operations this depends on
}

export interface SyncConfiguration {
  globalSettings: {
    autoSync: boolean;
    syncFrequency: 'realtime' | '5min' | '15min' | '30min' | '1hour' | '6hour' | '12hour' | '24hour';
    backgroundSync: boolean;
    wifiOnly: boolean;
    conflictResolution: 'ask_user' | 'server_wins' | 'local_wins' | 'newest_wins';
    maxRetries: number;
    timeout: number; // seconds
    batchSize: number;
  };
  modelSettings: {
    [modelName: string]: {
      enabled: boolean;
      syncStrategy: 'all' | 'time_based' | 'incremental';
      timePeriod?: string;
      priority: number;
      conflictResolution?: 'ask_user' | 'server_wins' | 'local_wins' | 'newest_wins';
      customFilters?: any[];
    };
  };
  advancedSettings: {
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableMetrics: boolean;
    enableNotifications: boolean;
    enableAnalytics: boolean;
    maxLogSize: number; // MB
    maxQueueSize: number;
    enableCompression: boolean;
    enableEncryption: boolean;
  };
}

export interface SyncAnalytics {
  performance: {
    averageResponseTime: number;
    averageThroughput: number; // records per second
    peakThroughput: number;
    networkUsage: number; // MB
    batteryUsage: number; // percentage
    memoryUsage: number; // MB
  };
  reliability: {
    successRate: number; // percentage
    errorRate: number; // percentage
    retryRate: number; // percentage
    timeoutRate: number; // percentage
  };
  trends: {
    syncFrequency: Array<{ date: string; count: number }>;
    errorTrends: Array<{ date: string; errors: number }>;
    performanceTrends: Array<{ date: string; duration: number }>;
    dataTrends: Array<{ date: string; records: number }>;
  };
}

export interface DatabaseInfo {
  size: number; // bytes
  tableCount: number;
  recordCount: number;
  lastVacuum?: string;
  lastBackup?: string;
  integrity: 'good' | 'warning' | 'error';
  tables: {
    [tableName: string]: {
      recordCount: number;
      size: number;
      lastModified: string;
      indexes: number;
    };
  };
}

// Sync status colors
export const SYNC_STATUS_COLORS = {
  idle: '#8E8E93',
  pending: '#FF9500',
  running: '#007AFF',
  syncing: '#007AFF',
  completed: '#34C759',
  failed: '#FF3B30',
  error: '#FF3B30',
  cancelled: '#8E8E93',
  success: '#34C759',
};

// Sync strategies
export const SYNC_STRATEGIES = [
  { label: 'All Records', value: 'all', description: 'Sync all records regardless of date' },
  { label: 'Time-based', value: 'time_based', description: 'Sync records within time period' },
  { label: 'Incremental', value: 'incremental', description: 'Sync only changed records' },
];

// Time periods for time-based sync
export const TIME_PERIODS = [
  { label: '1 Day', value: '1day' },
  { label: '3 Days', value: '3days' },
  { label: '1 Week', value: '1week' },
  { label: '2 Weeks', value: '2weeks' },
  { label: '1 Month', value: '1month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
  { label: '1 Year', value: '1year' },
];

// Sync frequencies
export const SYNC_FREQUENCIES = [
  { label: 'Real-time', value: 'realtime', description: 'Sync immediately when changes occur' },
  { label: 'Every 5 minutes', value: '5min', description: 'Sync every 5 minutes' },
  { label: 'Every 15 minutes', value: '15min', description: 'Sync every 15 minutes' },
  { label: 'Every 30 minutes', value: '30min', description: 'Sync every 30 minutes' },
  { label: 'Every hour', value: '1hour', description: 'Sync every hour' },
  { label: 'Every 6 hours', value: '6hour', description: 'Sync every 6 hours' },
  { label: 'Every 12 hours', value: '12hour', description: 'Sync every 12 hours' },
  { label: 'Daily', value: '24hour', description: 'Sync once per day' },
];

// Conflict resolution strategies
export const CONFLICT_RESOLUTIONS = [
  { label: 'Ask User', value: 'ask_user', description: 'Prompt user to resolve conflicts' },
  { label: 'Server Wins', value: 'server_wins', description: 'Always use server data' },
  { label: 'Local Wins', value: 'local_wins', description: 'Always use local data' },
  { label: 'Newest Wins', value: 'newest_wins', description: 'Use most recently modified data' },
];

// Default sync configuration
export const DEFAULT_SYNC_CONFIG: SyncConfiguration = {
  globalSettings: {
    autoSync: true,
    syncFrequency: '15min',
    backgroundSync: true,
    wifiOnly: false,
    conflictResolution: 'ask_user',
    maxRetries: 3,
    timeout: 30,
    batchSize: 100,
  },
  modelSettings: {},
  advancedSettings: {
    enableLogging: true,
    logLevel: 'warn',
    enableMetrics: true,
    enableNotifications: true,
    enableAnalytics: false,
    maxLogSize: 10,
    maxQueueSize: 1000,
    enableCompression: true,
    enableEncryption: true,
  },
};
