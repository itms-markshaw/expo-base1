/**
 * Production-Safe AutoSyncService
 * Fixed initialization issues that cause white screen in production
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncService } from '../../base/services/BaseSyncService';
import { offlineQueueService } from './OfflineQueueService';
import { useAppStore } from '../../../store';
import syncCoordinator from './SyncCoordinator';

export interface AutoSyncSettings {
  autoSyncOnLaunch: boolean;
  autoSyncOnForeground: boolean;
  autoSyncOnNetworkReconnect: boolean;
  backgroundSyncEnabled: boolean;
  backgroundSyncInterval: number; // minutes
  minSyncInterval: number; // minutes - minimum time between syncs
  wifiOnlySync: boolean; // Only sync on WiFi
  batteryOptimization: boolean; // Reduce sync frequency on low battery
  lowBatteryThreshold: number; // Battery percentage threshold (0-100)
}

class AutoSyncService {
  private appState: AppStateStatus = AppState.currentState;
  private isOnline = true;
  private lastSyncTime = 0;
  private lastSyncAttempt = 0;
  private backgroundSyncTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  private settings: AutoSyncSettings = {
    autoSyncOnLaunch: false, // DISABLED by default for production safety
    autoSyncOnForeground: false, // DISABLED by default for production safety
    autoSyncOnNetworkReconnect: false, // DISABLED by default for production safety
    backgroundSyncEnabled: false, // DISABLED by default for production safety
    backgroundSyncInterval: 30, // Increased to 30 minutes for battery life
    minSyncInterval: 10, // Increased to 10 minutes minimum between syncs
    wifiOnlySync: false,
    batteryOptimization: true,
    lowBatteryThreshold: 20
  };

  /**
   * PRODUCTION-SAFE Initialize auto sync service
   */
  async initialize(): Promise<void> {
    // Prevent multiple concurrent initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      return Promise.resolve();
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization with proper error handling
   */
  private async doInitialize(): Promise<void> {
    try {
      console.log('🔧 Production-safe AutoSync initialization starting...');

      // Load settings first (non-blocking)
      await this.loadSettings().catch(error => {
        console.warn('Settings load failed (using defaults):', error.message);
      });

      // Initialize offline queue service with timeout
      try {
        await Promise.race([
          offlineQueueService.initialize(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OfflineQueue init timeout')), 3000)
          )
        ]);
        console.log('✅ Offline queue service initialized');
      } catch (error) {
        console.warn('⚠️ Offline queue service failed (continuing):', error.message);
      }

      // Initialize sync coordinator with timeout
      try {
        await Promise.race([
          new Promise<void>((resolve) => {
            syncCoordinator.setSyncService(syncService);
            resolve();
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SyncCoordinator init timeout')), 2000)
          )
        ]);
        console.log('✅ Sync coordinator initialized');
      } catch (error) {
        console.warn('⚠️ Sync coordinator failed (continuing):', error.message);
      }

      // Set up listeners (non-blocking)
      this.setupListeners();

      // Load last sync time (non-blocking)
      await this.loadLastSyncTime().catch(error => {
        console.warn('Last sync time load failed:', error.message);
      });

      this.isInitialized = true;
      console.log('✅ Production-safe AutoSync service initialized');

      // DISABLED: Auto-sync on launch for production safety
      console.log('ℹ️ Auto-sync on launch is DISABLED for production safety');
      console.log('💡 Users can enable auto-sync in Settings > Sync Preferences');

    } catch (error) {
      console.error('❌ AutoSync service initialization failed:', error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Setup listeners with error handling
   */
  private setupListeners(): void {
    try {
      this.setupAppStateListener();
      this.setupNetworkListener();
    } catch (error) {
      console.warn('Failed to setup listeners:', error);
    }
  }

  /**
   * Set up app state change listener with error handling
   */
  private setupAppStateListener(): void {
    try {
      AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        console.log(`📱 App state changed: ${this.appState} -> ${nextAppState}`);

        try {
          if (this.appState === 'background' && nextAppState === 'active') {
            this.handleAppForeground().catch(error => {
              console.warn('App foreground handler failed:', error.message);
            });
          } else if (this.appState === 'active' && nextAppState === 'background') {
            this.handleAppBackground();
          }

          this.appState = nextAppState;
        } catch (error) {
          console.warn('App state change handler failed:', error);
        }
      });
    } catch (error) {
      console.warn('Failed to setup app state listener:', error);
    }
  }

  /**
   * Set up network connectivity listener with error handling
   */
  private setupNetworkListener(): void {
    try {
      NetInfo.addEventListener(state => {
        try {
          const wasOnline = this.isOnline;
          this.isOnline = state.isConnected ?? false;

          console.log(`🌐 Network state changed: ${wasOnline ? 'online' : 'offline'} -> ${this.isOnline ? 'online' : 'offline'}`);

          if (!wasOnline && this.isOnline) {
            this.handleNetworkReconnect().catch(error => {
              console.warn('Network reconnect handler failed:', error.message);
            });
          }
        } catch (error) {
          console.warn('Network state change handler failed:', error);
        }
      });
    } catch (error) {
      console.warn('Failed to setup network listener:', error);
    }
  }

  /**
   * Handle app coming to foreground with error handling
   */
  private async handleAppForeground(): Promise<void> {
    console.log('🔄 App came to foreground');

    // Only proceed if auto-sync on foreground is enabled
    if (!this.settings.autoSyncOnForeground) {
      console.log('ℹ️ Auto-sync on foreground is disabled');
      return;
    }

    try {
      // Process offline queue first (with timeout)
      try {
        await Promise.race([
          offlineQueueService.processQueue(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Queue processing timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.warn('Failed to process offline queue:', error.message);
      }

      // Trigger auto-sync if enabled
      await this.triggerAutoSync('foreground');

      // Resume background sync if enabled
      if (this.settings.backgroundSyncEnabled) {
        this.startBackgroundSync();
      }
    } catch (error) {
      console.warn('App foreground handling failed:', error.message);
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    console.log('📱 App went to background');
    this.stopBackgroundSync();
  }

  /**
   * Handle network reconnection with error handling
   */
  private async handleNetworkReconnect(): Promise<void> {
    console.log('🌐 Network reconnected');

    // Only proceed if auto-sync on network reconnect is enabled
    if (!this.settings.autoSyncOnNetworkReconnect) {
      console.log('ℹ️ Auto-sync on network reconnect is disabled');
      return;
    }

    try {
      // Process offline queue first (with timeout)
      try {
        await Promise.race([
          offlineQueueService.processQueue(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Queue processing timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.warn('Failed to process offline queue on reconnect:', error.message);
      }

      // Trigger auto-sync
      await this.triggerAutoSync('network_reconnect');
    } catch (error) {
      console.warn('Network reconnect handling failed:', error.message);
    }
  }

  /**
   * PRODUCTION-SAFE Trigger automatic sync with comprehensive checks
   */
  private async triggerAutoSync(trigger: string): Promise<void> {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    const minInterval = this.settings.minSyncInterval * 60 * 1000;

    // Rate limiting check
    if (timeSinceLastSync < minInterval) {
      console.log(`⏳ Skipping auto-sync (${trigger}) - too soon since last sync (${Math.round(timeSinceLastSync / 1000)}s ago)`);
      return;
    }

    // Connectivity check
    if (!this.isOnline) {
      console.log(`📴 Skipping auto-sync (${trigger}) - offline`);
      return;
    }

    // Authentication check with timeout
    let isAuthenticated = false;
    try {
      const storeState = await Promise.race([
        new Promise<any>((resolve) => {
          const state = useAppStore.getState();
          resolve(state);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Store access timeout')), 2000)
        )
      ]);
      isAuthenticated = storeState.isAuthenticated;
    } catch (error) {
      console.warn(`🔐 Cannot check auth state for auto-sync (${trigger}):`, error.message);
      return;
    }

    if (!isAuthenticated) {
      console.log(`🔐 Skipping auto-sync (${trigger}) - not authenticated`);
      return;
    }

    // WiFi check if required
    if (this.settings.wifiOnlySync) {
      try {
        const isWifi = await Promise.race([
          this.isOnWifi(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('WiFi check timeout')), 3000)
          )
        ]);
        
        if (!isWifi) {
          console.log(`📡 Skipping auto-sync (${trigger}) - WiFi required but not connected`);
          return;
        }
      } catch (error) {
        console.warn(`📡 WiFi check failed for auto-sync (${trigger}):`, error.message);
        return;
      }
    }

    // Battery optimization check
    if (this.settings.batteryOptimization) {
      try {
        const isLowBat = await Promise.race([
          this.isLowBattery(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Battery check timeout')), 2000)
          )
        ]);
        
        if (isLowBat) {
          console.log(`🔋 Skipping auto-sync (${trigger}) - low battery detected`);
          return;
        }
      } catch (error) {
        console.warn(`🔋 Battery check failed for auto-sync (${trigger}):`, error.message);
        // Continue anyway - don't block sync for battery check failures
      }
    }

    // Sync already running check
    try {
      const storeState = useAppStore.getState();
      if (storeState.syncStatus.isRunning) {
        console.log('⏳ Sync already in progress - skipping auto-sync');
        return;
      }
    } catch (error) {
      console.warn('Failed to check sync status:', error.message);
      return;
    }

    // Recent attempt check
    const timeSinceLastAttempt = now - (this.lastSyncAttempt || 0);
    if (timeSinceLastAttempt < 15000) { // 15 seconds
      console.log(`⏳ Recent sync attempt (${Math.round(timeSinceLastAttempt / 1000)}s ago) - skipping auto-sync`);
      return;
    }

    try {
      console.log(`🚀 Triggering production-safe auto-sync (${trigger})`);
      this.lastSyncAttempt = now;

      // Get selected models
      const { selectedModels } = useAppStore.getState();
      if (!selectedModels || selectedModels.length === 0) {
        console.log(`ℹ️ No models selected for sync - skipping auto-sync (${trigger})`);
        return;
      }

      // Use sync coordinator with fallback and timeout
      try {
        await Promise.race([
          syncCoordinator.requestSync(selectedModels, `auto-sync-${trigger}`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync request timeout')), 30000)
          )
        ]);
      } catch (coordinatorError: any) {
        console.log(`⚠️ Sync coordinator failed, using direct sync: ${coordinatorError.message}`);
        
        // Fallback to direct sync service with timeout
        await Promise.race([
          syncService.startSync(selectedModels),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Direct sync timeout')), 30000)
          )
        ]);
      }

      this.lastSyncTime = now;
      await this.saveLastSyncTime().catch(error => {
        console.warn('Failed to save last sync time:', error.message);
      });

      console.log(`✅ Production-safe auto-sync (${trigger}) completed`);

    } catch (error: any) {
      // Log with appropriate level based on error type
      if (error.message.includes('timeout') || 
          error.message.includes('network') || 
          error.message.includes('authentication') ||
          error.message.includes('XML-RPC')) {
        console.log(`⚠️ Auto-sync (${trigger}) failed: ${error.message} (this is normal during startup)`);
      } else {
        console.error(`❌ Auto-sync (${trigger}) failed:`, error.message);
      }
    }
  }

  /**
   * Production-safe background sync with error handling
   */
  private startBackgroundSync(): void {
    if (!this.settings.backgroundSyncEnabled) return;
    if (this.backgroundSyncTimer) return; // Already running

    try {
      const intervalMs = this.settings.backgroundSyncInterval * 60 * 1000;
      
      this.backgroundSyncTimer = setInterval(async () => {
        try {
          if (this.appState === 'active' && this.isOnline) {
            await this.triggerAutoSync('background');
          }
        } catch (error) {
          console.warn('Background sync failed:', error);
        }
      }, intervalMs);

      console.log(`⏰ Background sync started (${this.settings.backgroundSyncInterval} min intervals)`);
    } catch (error) {
      console.warn('Failed to start background sync:', error);
    }
  }

  /**
   * Stop background sync timer
   */
  private stopBackgroundSync(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
      console.log('⏹️ Background sync stopped');
    }
  }

  /**
   * Load settings with error handling
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('auto_sync_settings');
      if (settingsJson) {
        const savedSettings = JSON.parse(settingsJson);
        this.settings = { ...this.settings, ...savedSettings };
      }

      // Sync with app store settings
      const { syncSettings } = useAppStore.getState();
      this.settings = {
        ...this.settings,
        autoSyncOnLaunch: syncSettings.autoSync ?? this.settings.autoSyncOnLaunch,
        autoSyncOnForeground: syncSettings.autoSync ?? this.settings.autoSyncOnForeground,
        backgroundSyncEnabled: syncSettings.backgroundSync ?? this.settings.backgroundSyncEnabled,
      };

      console.log('📋 Production-safe auto-sync settings loaded:', this.settings);
    } catch (error) {
      console.warn('Failed to load auto-sync settings:', error);
    }
  }

  /**
   * Save settings with error handling
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('auto_sync_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save auto-sync settings:', error);
    }
  }

  /**
   * Load last sync time with error handling
   */
  private async loadLastSyncTime(): Promise<void> {
    try {
      const lastSyncStr = await AsyncStorage.getItem('last_auto_sync_time');
      if (lastSyncStr) {
        this.lastSyncTime = parseInt(lastSyncStr, 10);
      }
    } catch (error) {
      console.error('Failed to load last sync time:', error);
    }
  }

  /**
   * Save last sync time with error handling
   */
  private async saveLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_auto_sync_time', this.lastSyncTime.toString());
    } catch (error) {
      console.error('Failed to save last sync time:', error);
    }
  }

  /**
   * Check WiFi status with timeout
   */
  private async isOnWifi(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.type === 'wifi' && state.isConnected === true;
    } catch (error) {
      console.error('Failed to check WiFi status:', error);
      return false;
    }
  }

  /**
   * Check battery status (placeholder for future enhancement)
   */
  private async isLowBattery(): Promise<boolean> {
    try {
      // Battery level checking requires additional libraries
      // For now, return false (no battery optimization)
      return false;
    } catch (error) {
      console.error('Failed to check battery status:', error);
      return false;
    }
  }

  /**
   * Update settings with validation
   */
  async updateSettings(newSettings: Partial<AutoSyncSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();

      // Restart background sync with new settings
      if (this.settings.backgroundSyncEnabled && this.appState === 'active') {
        this.stopBackgroundSync();
        this.startBackgroundSync();
      } else if (!this.settings.backgroundSyncEnabled) {
        this.stopBackgroundSync();
      }

      console.log('⚙️ Production-safe auto-sync settings updated:', this.settings);
    } catch (error) {
      console.error('Failed to update auto-sync settings:', error);
      throw error;
    }
  }

  /**
   * Enable auto-sync features (for user-initiated actions)
   */
  async enableAutoSyncFeatures(): Promise<void> {
    console.log('✅ Enabling auto-sync features after user request');
    await this.updateSettings({
      autoSyncOnForeground: true,
      autoSyncOnNetworkReconnect: true,
      backgroundSyncEnabled: true
    });
  }

  /**
   * Get current settings
   */
  getSettings(): AutoSyncSettings {
    return { ...this.settings };
  }

  /**
   * Force sync now (manual override)
   */
  async forceSyncNow(): Promise<void> {
    try {
      console.log('🚀 Force sync triggered (manual override)');
      
      const { selectedModels, syncStatus } = useAppStore.getState();
      
      if (syncStatus.isRunning) {
        console.log('⏳ Sync already in progress');
        return;
      }

      // Force sync ignores rate limiting and other checks
      await Promise.race([
        syncService.startSync(selectedModels),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Force sync timeout')), 60000)
        )
      ]);

      this.lastSyncTime = Date.now();
      await this.saveLastSyncTime();
      
      console.log('✅ Force sync completed');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive sync status info
   */
  getSyncInfo(): {
    isOnline: boolean;
    appState: AppStateStatus;
    lastSyncTime: number;
    backgroundSyncActive: boolean;
    pendingQueueCount: number;
    isInitialized: boolean;
    settings: AutoSyncSettings;
  } {
    return {
      isOnline: this.isOnline,
      appState: this.appState,
      lastSyncTime: this.lastSyncTime,
      backgroundSyncActive: this.backgroundSyncTimer !== null,
      pendingQueueCount: offlineQueueService.getPendingCount(),
      isInitialized: this.isInitialized,
      settings: { ...this.settings }
    };
  }

  /**
   * Production-safe cleanup
   */
  cleanup(): void {
    try {
      this.stopBackgroundSync();
      
      try {
        offlineQueueService.stopRetryProcessor();
      } catch (error) {
        console.warn('Failed to stop retry processor:', error);
      }

      this.isInitialized = false;
      this.initializationPromise = null;
      
      console.log('🧹 Production-safe auto sync service cleaned up');
    } catch (error) {
      console.warn('Auto sync service cleanup failed:', error);
    }
  }

  /**
   * Health check for diagnostics
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      if (!this.isInitialized) {
        issues.push('Service not initialized');
        recommendations.push('Restart the app or check network connectivity');
      }

      if (!this.isOnline) {
        issues.push('Device is offline');
        recommendations.push('Check your internet connection');
      }

      const { isAuthenticated } = useAppStore.getState();
      if (!isAuthenticated) {
        issues.push('User not authenticated');
        recommendations.push('Log in to enable sync features');
      }

      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      if (timeSinceLastSync > 24 * 60 * 60 * 1000) { // 24 hours
        issues.push('No recent sync activity');
        recommendations.push('Manually trigger a sync or check sync settings');
      }

      if (this.settings.wifiOnlySync && !(await this.isOnWifi())) {
        issues.push('WiFi-only sync enabled but not on WiFi');
        recommendations.push('Connect to WiFi or disable WiFi-only sync');
      }

      const status = issues.length === 0 ? 'healthy' : 
                    issues.length <= 2 ? 'degraded' : 'unhealthy';

      return { status, issues, recommendations };

    } catch (error) {
      return {
        status: 'unhealthy',
        issues: ['Health check failed', error.message],
        recommendations: ['Restart the app']
      };
    }
  }
}

export const autoSyncService = new AutoSyncService();