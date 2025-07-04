/**
 * 906_AppearanceSettings - Theme and display preferences
 * Screen Number: 906
 * Model: app.settings
 * Type: detail
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../../store';
import ScreenBadge from '../../../components/ScreenBadge';

export default function AppearanceSettingsScreen({ navigation }: any) {
  const { showScreenBadges, toggleScreenBadges } = useAppStore();
  const [darkMode, setDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [selectedFontSize, setSelectedFontSize] = useState('medium');

  const themes = [
    { id: 'light', name: 'Light', icon: 'light-mode' },
    { id: 'dark', name: 'Dark', icon: 'dark-mode' },
    { id: 'system', name: 'System', icon: 'settings-brightness' },
  ];

  const fontSizes = [
    { id: 'small', name: 'Small' },
    { id: 'medium', name: 'Medium' },
    { id: 'large', name: 'Large' },
    { id: 'extra-large', name: 'Extra Large' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={906} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={styles.optionItem}
              onPress={() => setSelectedTheme(theme.id)}
            >
              <MaterialIcons name={theme.icon as any} size={24} color="#666" />
              <Text style={styles.optionText}>{theme.name}</Text>
              {selectedTheme === theme.id && (
                <MaterialIcons name="check" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Display Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Options</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="compress" size={24} color="#FF9500" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Compact Mode</Text>
                <Text style={styles.settingDescription}>Show more content on screen</Text>
              </View>
            </View>
            <Switch
              value={compactMode}
              onValueChange={setCompactMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={compactMode ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="animation" size={24} color="#5856D6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Animations</Text>
                <Text style={styles.settingDescription}>Enable smooth transitions</Text>
              </View>
            </View>
            <Switch
              value={animationsEnabled}
              onValueChange={setAnimationsEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={animationsEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="badge" size={24} color="#FF3B30" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Screen Badges</Text>
                <Text style={styles.settingDescription}>Show screen numbers for development</Text>
              </View>
            </View>
            <Switch
              value={showScreenBadges}
              onValueChange={toggleScreenBadges}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={showScreenBadges ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Font Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Size</Text>
          
          {fontSizes.map((fontSize) => (
            <TouchableOpacity
              key={fontSize.id}
              style={styles.optionItem}
              onPress={() => setSelectedFontSize(fontSize.id)}
            >
              <MaterialIcons name="text-fields" size={24} color="#666" />
              <Text style={styles.optionText}>{fontSize.name}</Text>
              {selectedFontSize === fontSize.id && (
                <MaterialIcons name="check" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Color Customization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customization</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="palette" size={24} color="#34C759" />
            <Text style={styles.actionText}>Accent Color</Text>
            <View style={[styles.colorPreview, { backgroundColor: '#007AFF' }]} />
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="wallpaper" size={24} color="#FF2D92" />
            <Text style={styles.actionText}>Background</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="refresh" size={24} color="#666" />
            <Text style={styles.actionText}>Reset to Defaults</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
});
