// Simple, working types for our Odoo sync app

export interface OdooRecord {
  id: number;
  create_date?: string;
  write_date?: string;
  [key: string]: any; // Allow any additional fields
}

export interface OdooModel {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  recordCount?: number;
  syncType?: 'all' | 'time_based'; // Whether to sync all records or use time filtering
}

export interface SyncStatus {
  isRunning: boolean;
  progress: number;
  currentModel?: string;
  totalRecords: number;
  syncedRecords: number;
  errors: string[];
}

export interface User {
  id: number;
  name: string;
  login: string;
  email?: string;
  partner_id?: number; // Critical for chat/channel filtering
  company_id?: number; // Useful for multi-company setups
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export type TimePeriod = 'all' | '1day' | '3days' | '1week' | '2weeks' | '1month' | '3months' | '6months';

export interface SyncSettings {
  globalTimePeriod: TimePeriod;
  modelOverrides: { [modelName: string]: TimePeriod };
  modelSyncAllOverrides?: { [modelName: string]: boolean };
  autoSync?: boolean;
  conflictResolution?: 'ask_user' | 'server_wins' | 'keep_local';
  backgroundSync?: boolean;
}

export interface TimePeriodOption {
  value: TimePeriod;
  label: string;
  description: string;
  days?: number; // Number of days to go back, undefined for 'all'
}


