/**
 * AutoSyncService - Auto Sync Service
 * Model-specific service for sync.management
 *
 * MIGRATED: From src/services/autoSync.ts
 * Handles automatic synchronization based on app state changes and network connectivity
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncService } from '../../base/services/BaseSyncService';
import { offlineQueueService } from './OfflineQueueService';
import { useAppStore } from '../../../store';

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
  private backgroundSyncTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  
  private settings: AutoSyncSettings = {
    autoSyncOnLaunch: true,
    autoSyncOnForeground: true,
    autoSyncOnNetworkReconnect: true,
    backgroundSyncEnabled: true,
    backgroundSyncInterval: 15, // 15 minutes
    minSyncInterval: 5, // 5 minutes minimum between syncs
    wifiOnlySync: false, // Allow sync on any connection
    batteryOptimization: true, // Enable battery optimization
    lowBatteryThreshold: 20 // 20% battery threshold
  };

  /**
   * Initialize auto sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize offline queue service
      await offlineQueueService.initialize();

      // Set up app state listener
      this.setupAppStateListener();

      // Set up network state listener
      this.setupNetworkListener();

      // Load settings from AsyncStorage and store
      await this.loadSettings();
      await this.loadLastSyncTime();

      // Auto-sync on launch if enabled
      if (this.settings.autoSyncOnLaunch) {
        setTimeout(() => this.triggerAutoSync('launch'), 2000); // Delay to let app fully load
      }

      this.isInitialized = true;
      console.log('✅ Auto sync service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize auto sync service:', error);
      throw error;
    }
  }

  /**
   * Set up app state change listener
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`📱 App state changed: ${this.appState} -> ${nextAppState}`);

      if (this.appState === 'background' && nextAppState === 'active') {
        // App came to foreground
        this.handleAppForeground();
      } else if (this.appState === 'active' && nextAppState === 'background') {
        // App went to background
        this.handleAppBackground();
      }

      this.appState = nextAppState;
    });
  }

  /**
   * Set up network connectivity listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`🌐 Network state changed: ${wasOnline ? 'online' : 'offline'} -> ${this.isOnline ? 'online' : 'offline'}`);

      if (!wasOnline && this.isOnline) {
        // Network reconnected
        this.handleNetworkReconnect();
      }
    });
  }

  /**
   * Handle app coming to foreground
   */
  private async handleAppForeground(): Promise<void> {
    console.log('🔄 App came to foreground');

    // Process offline queue first
    try {
      await offlineQueueService.processQueue();
    } catch (error) {
      console.warn('Failed to process offline queue:', error);
    }

    // Auto-sync if enabled
    if (this.settings.autoSyncOnForeground) {
      await this.triggerAutoSync('foreground');
    }

    // Resume background sync if enabled
    if (this.settings.backgroundSyncEnabled) {
      this.startBackgroundSync();
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    console.log('📱 App went to background');

    // Stop background sync when app is not active
    this.stopBackgroundSync();
  }

  /**
   * Handle network reconnection
   */
  private async handleNetworkReconnect(): Promise<void> {
    console.log('🌐 Network reconnected');

    // Process offline queue first
    try {
      await offlineQueueService.processQueue();
    } catch (error) {
      console.warn('Failed to process offline queue on reconnect:', error);
    }

    // Auto-sync if enabled
    if (this.settings.autoSyncOnNetworkReconnect) {
      await this.triggerAutoSync('network_reconnect');
    }
  }

  /**
   * Trigger automatic sync with rate limiting
   */
  private async triggerAutoSync(trigger: string): Promise<void> {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    const minInterval = this.settings.minSyncInterval * 60 * 1000; // Convert to milliseconds

    if (timeSinceLastSync < minInterval) {
      console.log(`⏳ Skipping auto-sync (${trigger}) - too soon since last sync (${Math.round(timeSinceLastSync / 1000)}s ago)`);
      return;
    }

    if (!this.isOnline) {
      console.log(`📴 Skipping auto-sync (${trigger}) - offline`);
      return;
    }

    // Check network preferences (WiFi only)
    if (this.settings.wifiOnlySync && !(await this.isOnWifi())) {
      console.log(`📡 Skipping auto-sync (${trigger}) - WiFi required but not connected`);
      return;
    }

    // Check battery optimization
    if (this.settings.batteryOptimization && (await this.isLowBattery())) {
      console.log(`🔋 Skipping auto-sync (${trigger}) - low battery detected`);
      return;
    }

    try {
      console.log(`🚀 Triggering auto-sync (${trigger})`);
      
      // Get selected models from store
      const { selectedModels, syncStatus } = useAppStore.getState();
      
      // Don't start if sync is already running
      if (syncStatus.isRunning) {
        console.log('⏳ Sync already in progress - skipping auto-sync');
        return;
      }

      // Start sync
      await syncService.startSync(selectedModels);
      this.lastSyncTime = now;
      await this.saveLastSyncTime();
      
      console.log(`✅ Auto-sync (${trigger}) completed`);
    } catch (error) {
      console.error(`❌ Auto-sync (${trigger}) failed:`, error);
    }
  }

  /**
   * Start background sync timer
   */
  private startBackgroundSync(): void {
    if (!this.settings.backgroundSyncEnabled) return;
    if (this.backgroundSyncTimer) return; // Already running

    const intervalMs = this.settings.backgroundSyncInterval * 60 * 1000;
    
    this.backgroundSyncTimer = setInterval(async () => {
      if (this.appState === 'active' && this.isOnline) {
        await this.triggerAutoSync('background');
      }
    }, intervalMs);

    console.log(`⏰ Background sync started (${this.settings.backgroundSyncInterval} min intervals)`);
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
   * Load settings from AsyncStorage
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('auto_sync_settings');
      if (settingsJson) {
        const savedSettings = JSON.parse(settingsJson);
        this.settings = { ...this.settings, ...savedSettings };
      }

      // Also sync with app store settings
      const { syncSettings } = useAppStore.getState();
      this.settings = {
        ...this.settings,
        autoSyncOnLaunch: syncSettings.autoSync ?? this.settings.autoSyncOnLaunch,
        autoSyncOnForeground: syncSettings.autoSync ?? this.settings.autoSyncOnForeground,
        backgroundSyncEnabled: syncSettings.backgroundSync ?? this.settings.backgroundSyncEnabled,
      };

      console.log('📋 Auto-sync settings loaded:', this.settings);
    } catch (error) {
      console.warn('Failed to load auto-sync settings:', error);
    }
  }

  /**
   * Save settings to AsyncStorage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('auto_sync_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save auto-sync settings:', error);
    }
  }

  /**
   * Load last sync time from AsyncStorage
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
   * Save last sync time to AsyncStorage
   */
  private async saveLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_auto_sync_time', this.lastSyncTime.toString());
    } catch (error) {
      console.error('Failed to save last sync time:', error);
    }
  }

  /**
   * Check if device is connected to WiFi
   */
  private async isOnWifi(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.type === 'wifi' && state.isConnected === true;
    } catch (error) {
      console.error('Failed to check WiFi status:', error);
      return false; // Assume not on WiFi if check fails
    }
  }

  /**
   * Check if device battery is low
   */
  private async isLowBattery(): Promise<boolean> {
    try {
      // Note: Battery level checking requires expo-battery or react-native-device-info
      // For now, we'll return false (no battery optimization)
      // This can be enhanced later with proper battery level detection
      return false;
    } catch (error) {
      console.error('Failed to check battery status:', error);
      return false;
    }
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: Partial<AutoSyncSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };

    // Save to AsyncStorage
    await this.saveSettings();

    // Restart background sync with new settings
    if (this.settings.backgroundSyncEnabled && this.appState === 'active') {
      this.stopBackgroundSync();
      this.startBackgroundSync();
    } else if (!this.settings.backgroundSyncEnabled) {
      this.stopBackgroundSync();
    }

    console.log('⚙️ Auto-sync settings updated:', this.settings);
  }

  /**
   * Get current settings
   */
  getSettings(): AutoSyncSettings {
    return { ...this.settings };
  }

  /**
   * Force sync now (ignoring rate limiting)
   */
  async forceSyncNow(): Promise<void> {
    try {
      console.log('🚀 Force sync triggered');
      
      const { selectedModels, syncStatus } = useAppStore.getState();
      
      if (syncStatus.isRunning) {
        console.log('⏳ Sync already in progress');
        return;
      }

      await syncService.startSync(selectedModels);
      this.lastSyncTime = Date.now();
      await this.saveLastSyncTime();
      
      console.log('✅ Force sync completed');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status info
   */
  getSyncInfo(): {
    isOnline: boolean;
    appState: AppStateStatus;
    lastSyncTime: number;
    backgroundSyncActive: boolean;
    pendingQueueCount: number;
  } {
    return {
      isOnline: this.isOnline,
      appState: this.appState,
      lastSyncTime: this.lastSyncTime,
      backgroundSyncActive: this.backgroundSyncTimer !== null,
      pendingQueueCount: offlineQueueService.getPendingCount()
    };
  }

  /**
   * Cleanup and stop all timers
   */
  cleanup(): void {
    this.stopBackgroundSync();
    offlineQueueService.stopRetryProcessor();
    console.log('🧹 Auto sync service cleaned up');
  }
}

export const autoSyncService = new AutoSyncService();
