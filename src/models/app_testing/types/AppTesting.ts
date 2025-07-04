/**
 * App Testing Types
 * Model: app.testing
 * Comprehensive testing and diagnostics for the mobile app
 */

export interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number; // milliseconds
  error?: string;
  details?: any;
  timestamp: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  tests: TestResult[];
  status: 'pending' | 'running' | 'completed';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration?: number;
  timestamp: string;
}

export interface DiagnosticInfo {
  id: string;
  category: string;
  name: string;
  value: string | number | boolean;
  status: 'good' | 'warning' | 'error';
  description?: string;
  recommendation?: string;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface NetworkTest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: 'pending' | 'running' | 'success' | 'failed';
  responseTime?: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

export interface DatabaseTest {
  id: string;
  operation: 'read' | 'write' | 'delete' | 'query';
  table: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration?: number;
  recordCount?: number;
  error?: string;
  timestamp: string;
}

export interface SyncTest {
  id: string;
  model: string;
  operation: 'full_sync' | 'incremental_sync' | 'conflict_resolution';
  status: 'pending' | 'running' | 'success' | 'failed';
  recordsProcessed?: number;
  duration?: number;
  error?: string;
  timestamp: string;
}

export interface SecurityTest {
  id: string;
  name: string;
  category: 'authentication' | 'authorization' | 'encryption' | 'data_protection';
  status: 'pending' | 'running' | 'passed' | 'failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  result?: string;
  recommendation?: string;
  timestamp: string;
}

export const TEST_CATEGORIES = [
  'database',
  'network',
  'sync',
  'performance',
  'security',
  'ui',
  'integration',
  'unit'
] as const;

export type TestCategory = typeof TEST_CATEGORIES[number];

export interface TestConfig {
  category: TestCategory;
  enabled: boolean;
  timeout: number; // seconds
  retries: number;
  parallel: boolean;
  skipOnFailure: boolean;
}

export interface TestingSession {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  suites: TestSuite[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  config: TestConfig[];
}

// Default test configurations
export const DEFAULT_TEST_CONFIGS: TestConfig[] = [
  {
    category: 'database',
    enabled: true,
    timeout: 30,
    retries: 2,
    parallel: false,
    skipOnFailure: false,
  },
  {
    category: 'network',
    enabled: true,
    timeout: 15,
    retries: 3,
    parallel: true,
    skipOnFailure: false,
  },
  {
    category: 'sync',
    enabled: true,
    timeout: 60,
    retries: 1,
    parallel: false,
    skipOnFailure: true,
  },
  {
    category: 'performance',
    enabled: true,
    timeout: 45,
    retries: 1,
    parallel: true,
    skipOnFailure: false,
  },
  {
    category: 'security',
    enabled: true,
    timeout: 20,
    retries: 1,
    parallel: false,
    skipOnFailure: false,
  },
  {
    category: 'ui',
    enabled: false, // Disabled by default as it requires manual interaction
    timeout: 30,
    retries: 1,
    parallel: false,
    skipOnFailure: true,
  },
  {
    category: 'integration',
    enabled: true,
    timeout: 90,
    retries: 1,
    parallel: false,
    skipOnFailure: true,
  },
  {
    category: 'unit',
    enabled: true,
    timeout: 10,
    retries: 0,
    parallel: true,
    skipOnFailure: false,
  },
];

// Test status colors
export const TEST_STATUS_COLORS = {
  pending: '#8E8E93',
  running: '#007AFF',
  passed: '#34C759',
  failed: '#FF3B30',
  skipped: '#FF9500',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  good: '#34C759',
  critical: '#FF3B30',
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  apiResponseTime: 2000, // ms
  databaseQueryTime: 1000, // ms
  syncTime: 30000, // ms
  memoryUsage: 512, // MB
  cpuUsage: 80, // percentage
  batteryDrain: 10, // percentage per hour
  networkLatency: 500, // ms
  appStartTime: 3000, // ms
};

// Network endpoints for testing
export const TEST_ENDPOINTS = [
  {
    name: 'Authentication',
    url: '/web/session/authenticate',
    method: 'POST' as const,
    critical: true,
  },
  {
    name: 'User Info',
    url: '/web/session/get_session_info',
    method: 'GET' as const,
    critical: true,
  },
  {
    name: 'Models List',
    url: '/web/dataset/search_read',
    method: 'POST' as const,
    critical: false,
  },
  {
    name: 'Sync Status',
    url: '/web/dataset/call_kw',
    method: 'POST' as const,
    critical: false,
  },
];

// Database tables for testing
export const TEST_TABLES = [
  'contacts',
  'sales_orders',
  'activities',
  'messages',
  'attachments',
  'sync_queue',
  'sync_conflicts',
  'app_settings',
];

// Security test definitions
export const SECURITY_TESTS = [
  {
    id: 'auth_token_validation',
    name: 'Authentication Token Validation',
    category: 'authentication' as const,
    severity: 'high' as const,
    description: 'Verify authentication tokens are properly validated',
  },
  {
    id: 'data_encryption',
    name: 'Data Encryption at Rest',
    category: 'encryption' as const,
    severity: 'critical' as const,
    description: 'Ensure sensitive data is encrypted in local storage',
  },
  {
    id: 'network_security',
    name: 'Network Communication Security',
    category: 'data_protection' as const,
    severity: 'high' as const,
    description: 'Verify all network communication uses HTTPS',
  },
  {
    id: 'permission_checks',
    name: 'Permission Validation',
    category: 'authorization' as const,
    severity: 'medium' as const,
    description: 'Validate user permissions are properly enforced',
  },
];
