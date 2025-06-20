/**
 * Simple Zustand Store
 * Clean state management that actually works
 */

import { create } from 'zustand';
import { User, SyncStatus, OdooModel } from '../types';
import { authService } from '../services/auth';
import { syncService } from '../services/sync';
import { databaseService } from '../services/database';

interface AppStore {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  authLoading: boolean;

  // Sync state
  syncStatus: SyncStatus;
  availableModels: OdooModel[];
  selectedModels: string[];

  // Database state
  databaseStats: any;

  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  startSync: () => Promise<void>;
  cancelSync: () => Promise<void>;
  toggleModel: (modelName: string) => void;
  loadDatabaseStats: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  authLoading: false,
  syncStatus: {
    isRunning: false,
    progress: 0,
    totalRecords: 0,
    syncedRecords: 0,
    errors: [],
  },
  availableModels: syncService.getAvailableModels(),
  selectedModels: ['res.partner', 'res.users'],
  databaseStats: null,

  // Actions
  login: async () => {
    set({ authLoading: true });
    try {
      const result = await authService.login();
      if (result.success) {
        set({
          isAuthenticated: true,
          user: result.user || null,
          authLoading: false,
        });
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      set({ authLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({
      isAuthenticated: false,
      user: null,
      syncStatus: {
        isRunning: false,
        progress: 0,
        totalRecords: 0,
        syncedRecords: 0,
        errors: [],
      },
    });
  },

  checkAuth: async () => {
    set({ authLoading: true });
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const user = authService.getCurrentUser();
        set({
          isAuthenticated: true,
          user,
          authLoading: false,
        });
      } else {
        set({
          isAuthenticated: false,
          user: null,
          authLoading: false,
        });
      }
    } catch (error) {
      set({
        isAuthenticated: false,
        user: null,
        authLoading: false,
      });
    }
  },

  startSync: async () => {
    const { selectedModels } = get();
    
    // Set up sync status listener
    const unsubscribe = syncService.onStatusChange((status) => {
      set({ syncStatus: status });
    });

    try {
      await syncService.startSync(selectedModels);
      // Reload database stats after sync
      get().loadDatabaseStats();
    } finally {
      unsubscribe();
    }
  },

  cancelSync: async () => {
    await syncService.cancelSync();
  },

  toggleModel: (modelName: string) => {
    const { selectedModels } = get();
    const newSelected = selectedModels.includes(modelName)
      ? selectedModels.filter(m => m !== modelName)
      : [...selectedModels, modelName];
    
    set({ selectedModels: newSelected });
  },

  loadDatabaseStats: async () => {
    try {
      await databaseService.initialize();
      const stats = await databaseService.getStats();
      set({ databaseStats: stats });
    } catch (error) {
      console.error('Failed to load database stats:', error);
    }
  },
}));
