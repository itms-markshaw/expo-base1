/**
 * Simple Zustand Store
 * Clean state management that actually works
 */

import { create } from 'zustand';
import { User, SyncStatus, OdooModel, SyncSettings, TimePeriod } from '../types';
import { authService } from '../models/base/services/BaseAuthService';
import { syncService } from '../models/base/services/BaseSyncService';
import { databaseService } from '../models/base/services/BaseDatabaseService';

interface AppStore {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  authLoading: boolean;

  // Sync state
  syncStatus: SyncStatus;
  availableModels: OdooModel[];
  selectedModels: string[];
  syncSettings: SyncSettings;

  // Database state
  databaseStats: any;

  // UI Settings
  showScreenBadges: boolean;

  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  startSync: () => Promise<void>;
  cancelSync: () => Promise<void>;
  toggleModel: (modelName: string) => void;
  updateSyncSettings: (settings: Partial<SyncSettings>) => void;
  updateModelTimePeriod: (modelName: string, timePeriod: TimePeriod) => void;
  updateModelSyncAllOverride: (modelName: string, syncAll: boolean) => void;
  loadDatabaseStats: () => Promise<void>;
  loadAvailableModels: () => Promise<void>;
  toggleScreenBadges: () => void;
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
  availableModels: [], // Will be loaded dynamically
  selectedModels: [
    'discuss.channel',
    'mail.message',
    // mail.thread removed - it's an abstract model, not directly accessible
    'res.partner',
    'sale.order',
    'crm.lead',
    'hr.employee',
    'mail.activity',
    'ir.attachment',
    'calendar.event',
    'res.users',
    'product.product',
    'product.template',
    'account.move',
    'stock.picking',      // Deliveries - now included
    'project.project',
    'project.task',
    'helpdesk.ticket',
    'helpdesk.team'
  ],
  syncSettings: syncService.getSyncSettings(),
  databaseStats: null,

  // UI Settings - Default to true for development
  showScreenBadges: true,

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

  updateSyncSettings: (settings: Partial<SyncSettings>) => {
    const { syncSettings } = get();
    const newSettings = { ...syncSettings, ...settings };
    set({ syncSettings: newSettings });
    syncService.updateSyncSettings(newSettings);
  },

  updateModelTimePeriod: (modelName: string, timePeriod: TimePeriod) => {
    const { syncSettings } = get();
    const newOverrides = { ...syncSettings.modelOverrides, [modelName]: timePeriod };
    const newSettings = { ...syncSettings, modelOverrides: newOverrides };
    set({ syncSettings: newSettings });
    syncService.updateSyncSettings(newSettings);
  },

  updateModelSyncAllOverride: (modelName: string, syncAll: boolean) => {
    const { syncSettings } = get();
    const newOverrides = {
      ...(syncSettings.modelSyncAllOverrides || {}), // Safety check
      [modelName]: syncAll
    };
    const newSettings = {
      ...syncSettings,
      modelSyncAllOverrides: newOverrides
    };
    set({ syncSettings: newSettings });
    syncService.updateSyncSettings(newSettings);
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

  loadAvailableModels: async () => {
    try {
      console.log('🔍 Loading available models from Odoo server...');
      const models = await syncService.discoverAvailableModels();

      // Update selected models to only include accessible ones
      const accessibleModelNames = models.map(m => m.name);
      const currentSelected = get().selectedModels;
      const validSelected = currentSelected.filter(name => accessibleModelNames.includes(name));

      set({
        availableModels: models,
        selectedModels: validSelected.length > 0 ? validSelected : models.filter(m => m.enabled).map(m => m.name)
      });

      console.log(`✅ Loaded ${models.length} available models`);
    } catch (error) {
      console.error('❌ Failed to load available models:', error);
      // Keep existing models if loading fails
    }
  },

  // Toggle screen badges visibility
  toggleScreenBadges: () => {
    set((state) => ({
      showScreenBadges: !state.showScreenBadges
    }));
  },
}));
