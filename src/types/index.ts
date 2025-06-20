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
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}


