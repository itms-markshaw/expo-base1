/**
 * App Settings Service
 * Model: app.settings
 * Manages all application settings and preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, SettingsFormData, DEFAULT_SETTINGS } from '../types/AppSettings';

class AppSettingsService {
  private readonly STORAGE_KEY = 'app_settings';
  private cachedSettings: AppSettings | null = null;

  /**
   * Get current app settings
   */
  async getSettings(): Promise<AppSettings> {
    try {
      if (this.cachedSettings) {
        return this.cachedSettings;
      }

      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        this.cachedSettings = { ...DEFAULT_SETTINGS, ...settings } as AppSettings;
        return this.cachedSettings;
      }

      // Return default settings if none stored
      this.cachedSettings = {
        id: 1,
        ...DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0.0',
      } as AppSettings;

      await this.saveSettings(this.cachedSettings);
      return this.cachedSettings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        id: 1,
        ...DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0.0',
      } as AppSettings;
    }
  }

  /**
   * Update app settings
   */
  async updateSettings(updates: Partial<SettingsFormData>): Promise<AppSettings> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.saveSettings(updatedSettings);
      this.cachedSettings = updatedSettings;
      
      console.log('✅ Settings updated successfully');
      return updatedSettings;
    } catch (error) {
      console.error('❌ Failed to update settings:', error);
      throw new Error('Failed to update settings');
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<AppSettings> {
    try {
      const defaultSettings = {
        id: 1,
        ...DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0.0',
      } as AppSettings;

      await this.saveSettings(defaultSettings);
      this.cachedSettings = defaultSettings;
      
      console.log('✅ Settings reset to defaults');
      return defaultSettings;
    } catch (error) {
      console.error('❌ Failed to reset settings:', error);
      throw new Error('Failed to reset settings');
    }
  }

  /**
   * Get specific setting value
   */
  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Update specific setting
   */
  async updateSetting<K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ): Promise<AppSettings> {
    return this.updateSettings({ [key]: value } as Partial<SettingsFormData>);
  }

  /**
   * Toggle boolean setting
   */
  async toggleSetting(key: keyof AppSettings): Promise<AppSettings> {
    const currentValue = await this.getSetting(key);
    if (typeof currentValue === 'boolean') {
      return this.updateSetting(key, !currentValue as any);
    }
    throw new Error(`Setting ${key} is not a boolean`);
  }

  /**
   * Export settings for backup
   */
  async exportSettings(): Promise<string> {
    try {
      const settings = await this.getSettings();
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('❌ Failed to export settings:', error);
      throw new Error('Failed to export settings');
    }
  }

  /**
   * Import settings from backup
   */
  async importSettings(settingsJson: string): Promise<AppSettings> {
    try {
      const importedSettings = JSON.parse(settingsJson);
      
      // Validate imported settings
      if (!importedSettings || typeof importedSettings !== 'object') {
        throw new Error('Invalid settings format');
      }

      // Merge with defaults to ensure all required fields exist
      const validatedSettings = {
        ...DEFAULT_SETTINGS,
        ...importedSettings,
        id: 1, // Always use ID 1 for app settings
        updated_at: new Date().toISOString(),
      } as AppSettings;

      await this.saveSettings(validatedSettings);
      this.cachedSettings = validatedSettings;
      
      console.log('✅ Settings imported successfully');
      return validatedSettings;
    } catch (error) {
      console.error('❌ Failed to import settings:', error);
      throw new Error('Failed to import settings');
    }
  }

  /**
   * Clear all settings (for logout/reset)
   */
  async clearSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.cachedSettings = null;
      console.log('✅ Settings cleared');
    } catch (error) {
      console.error('❌ Failed to clear settings:', error);
      throw new Error('Failed to clear settings');
    }
  }

  /**
   * Get settings validation errors
   */
  validateSettings(settings: Partial<SettingsFormData>): string[] {
    const errors: string[] = [];

    // Validate server URL
    if (settings.serverUrl && !this.isValidUrl(settings.serverUrl)) {
      errors.push('Server URL must be a valid URL');
    }

    // Validate timeout values
    if (settings.apiTimeout && (settings.apiTimeout < 5 || settings.apiTimeout > 300)) {
      errors.push('API timeout must be between 5 and 300 seconds');
    }

    if (settings.maxRetries && (settings.maxRetries < 0 || settings.maxRetries > 10)) {
      errors.push('Max retries must be between 0 and 10');
    }

    if (settings.autoLockTimeout && settings.autoLockTimeout < -1) {
      errors.push('Auto lock timeout must be -1 (never) or positive number');
    }

    return errors;
  }

  /**
   * Private helper methods
   */
  private async saveSettings(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<Partial<AppSettings>> {
    const settings = await this.getSettings();
    
    switch (category) {
      case 'general':
        return {
          theme: settings.theme,
          language: settings.language,
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          timeFormat: settings.timeFormat,
          currency: settings.currency,
        };
      
      case 'notifications':
        return {
          pushNotifications: settings.pushNotifications,
          emailNotifications: settings.emailNotifications,
          activityReminders: settings.activityReminders,
          syncNotifications: settings.syncNotifications,
          soundEnabled: settings.soundEnabled,
          vibrationEnabled: settings.vibrationEnabled,
        };
      
      case 'privacy':
        return {
          shareAnalytics: settings.shareAnalytics,
          shareUsageData: settings.shareUsageData,
          allowCrashReports: settings.allowCrashReports,
          biometricAuth: settings.biometricAuth,
          autoLock: settings.autoLock,
          autoLockTimeout: settings.autoLockTimeout,
        };
      
      case 'sync':
        return {
          autoSync: settings.autoSync,
          syncFrequency: settings.syncFrequency,
          syncOnWifiOnly: settings.syncOnWifiOnly,
          backgroundSync: settings.backgroundSync,
          conflictResolution: settings.conflictResolution,
        };
      
      case 'developer':
        return {
          showScreenBadges: settings.showScreenBadges,
          debugMode: settings.debugMode,
          showPerformanceMetrics: settings.showPerformanceMetrics,
          enableBetaFeatures: settings.enableBetaFeatures,
          logLevel: settings.logLevel,
        };
      
      case 'server':
        return {
          serverUrl: settings.serverUrl,
          database: settings.database,
          username: settings.username,
          apiTimeout: settings.apiTimeout,
          maxRetries: settings.maxRetries,
        };
      
      default:
        return settings;
    }
  }
}

export const appSettingsService = new AppSettingsService();
