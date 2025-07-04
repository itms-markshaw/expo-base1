/**
 * App Settings Types
 * Model: app.settings
 * Comprehensive settings management for the mobile app
 */

export interface AppSettings {
  id: number;
  
  // User Preferences
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  
  // Notification Settings
  pushNotifications: boolean;
  emailNotifications: boolean;
  activityReminders: boolean;
  syncNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  
  // Privacy Settings
  shareAnalytics: boolean;
  shareUsageData: boolean;
  allowCrashReports: boolean;
  biometricAuth: boolean;
  autoLock: boolean;
  autoLockTimeout: number; // minutes
  
  // Sync Preferences
  autoSync: boolean;
  syncFrequency: 'realtime' | '5min' | '15min' | '30min' | '1hour';
  syncOnWifiOnly: boolean;
  backgroundSync: boolean;
  conflictResolution: 'ask_user' | 'server_wins' | 'local_wins';
  
  // Developer Settings
  showScreenBadges: boolean;
  debugMode: boolean;
  showPerformanceMetrics: boolean;
  enableBetaFeatures: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // Server Settings
  serverUrl: string;
  database: string;
  username: string;
  apiTimeout: number; // seconds
  maxRetries: number;
  
  // App Behavior
  defaultScreen: string;
  showOnboarding: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  hapticFeedback: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
  version: string;
}

export interface SettingsFormData {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  currency?: string;
  pushNotifications?: boolean;
  emailNotifications?: boolean;
  activityReminders?: boolean;
  syncNotifications?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  shareAnalytics?: boolean;
  shareUsageData?: boolean;
  allowCrashReports?: boolean;
  biometricAuth?: boolean;
  autoLock?: boolean;
  autoLockTimeout?: number;
  autoSync?: boolean;
  syncFrequency?: 'realtime' | '5min' | '15min' | '30min' | '1hour';
  syncOnWifiOnly?: boolean;
  backgroundSync?: boolean;
  conflictResolution?: 'ask_user' | 'server_wins' | 'local_wins';
  showScreenBadges?: boolean;
  debugMode?: boolean;
  showPerformanceMetrics?: boolean;
  enableBetaFeatures?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  serverUrl?: string;
  database?: string;
  username?: string;
  apiTimeout?: number;
  maxRetries?: number;
  defaultScreen?: string;
  showOnboarding?: boolean;
  compactMode?: boolean;
  animationsEnabled?: boolean;
  hapticFeedback?: boolean;
}

export interface SettingsFilters {
  id: string;
  label: string;
  count?: number;
}

export const SETTINGS_CATEGORIES = [
  'general',
  'notifications',
  'privacy',
  'sync',
  'developer',
  'server',
  'appearance',
  'advanced'
] as const;

export type SettingsCategory = typeof SETTINGS_CATEGORIES[number];

export const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Auto', value: 'auto' },
];

export const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Chinese', value: 'zh' },
];

export const TIMEZONE_OPTIONS = [
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York', value: 'America/New_York' },
  { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Paris', value: 'Europe/Paris' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'Australia/Sydney', value: 'Australia/Sydney' },
];

export const DATE_FORMAT_OPTIONS = [
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
  { label: 'DD MMM YYYY', value: 'DD MMM YYYY' },
];

export const SYNC_FREQUENCY_OPTIONS = [
  { label: 'Real-time', value: 'realtime' },
  { label: 'Every 5 minutes', value: '5min' },
  { label: 'Every 15 minutes', value: '15min' },
  { label: 'Every 30 minutes', value: '30min' },
  { label: 'Every hour', value: '1hour' },
];

export const CONFLICT_RESOLUTION_OPTIONS = [
  { label: 'Ask user', value: 'ask_user' },
  { label: 'Server wins', value: 'server_wins' },
  { label: 'Local wins', value: 'local_wins' },
];

export const LOG_LEVEL_OPTIONS = [
  { label: 'Error only', value: 'error' },
  { label: 'Warnings', value: 'warn' },
  { label: 'Information', value: 'info' },
  { label: 'Debug', value: 'debug' },
];

export const AUTO_LOCK_TIMEOUT_OPTIONS = [
  { label: 'Immediately', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: 'Never', value: -1 },
];

// Default settings
export const DEFAULT_SETTINGS: Partial<AppSettings> = {
  theme: 'auto',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  pushNotifications: true,
  emailNotifications: true,
  activityReminders: true,
  syncNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
  shareAnalytics: false,
  shareUsageData: false,
  allowCrashReports: true,
  biometricAuth: false,
  autoLock: true,
  autoLockTimeout: 15,
  autoSync: true,
  syncFrequency: '15min',
  syncOnWifiOnly: false,
  backgroundSync: true,
  conflictResolution: 'ask_user',
  showScreenBadges: true, // Default to true for development
  debugMode: false,
  showPerformanceMetrics: false,
  enableBetaFeatures: false,
  logLevel: 'warn',
  apiTimeout: 30,
  maxRetries: 3,
  defaultScreen: 'Dashboard',
  showOnboarding: true,
  compactMode: false,
  animationsEnabled: true,
  hapticFeedback: true,
};
