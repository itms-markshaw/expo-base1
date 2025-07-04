/**
 * 990_LoginScreen - User authentication screen
 * Screen Number: 990
 * Model: app.auth
 * Type: screen
 *
 * MIGRATED: From src/screens/LoginScreen.tsx
 * User authentication screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../../../store';
import { ODOO_CONFIG } from '../../../config/odoo';
import ScreenBadge from '../../../components/ScreenBadge';

export default function LoginScreen() {
  const { login, authLoading } = useAppStore();

  const handleLogin = async () => {
    try {
      await login();
      // Navigation will be handled by App.tsx based on auth state
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={990} />
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <MaterialIcons name="cloud" size={80} color="#007AFF" />
          <Text style={styles.appTitle}>Odoo Sync</Text>
          <Text style={styles.appSubtitle}>Connect to your Odoo server</Text>
        </View>

        {/* Server Info */}
        <View style={styles.serverInfo}>
          <Text style={styles.serverTitle}>Server Configuration</Text>
          
          <View style={styles.serverCard}>
            <View style={styles.serverRow}>
              <MaterialIcons name="language" size={20} color="#007AFF" />
              <View style={styles.serverText}>
                <Text style={styles.serverLabel}>Server URL</Text>
                <Text style={styles.serverValue}>{ODOO_CONFIG.baseURL}</Text>
              </View>
            </View>
            
            <View style={styles.serverRow}>
              <MaterialIcons name="storage" size={20} color="#007AFF" />
              <View style={styles.serverText}>
                <Text style={styles.serverLabel}>Database</Text>
                <Text style={styles.serverValue}>{ODOO_CONFIG.db}</Text>
              </View>
            </View>
            
            <View style={styles.serverRow}>
              <MaterialIcons name="person" size={20} color="#007AFF" />
              <View style={styles.serverText}>
                <Text style={styles.serverLabel}>Username</Text>
                <Text style={styles.serverValue}>{ODOO_CONFIG.username}</Text>
              </View>
            </View>
            
            <View style={styles.serverRow}>
              <MaterialIcons name="vpn-key" size={20} color="#007AFF" />
              <View style={styles.serverText}>
                <Text style={styles.serverLabel}>Authentication</Text>
                <Text style={styles.serverValue}>
                  {ODOO_CONFIG.apiKey ? 'API Key' : 'Password'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Login Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.loginButton, authLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons name="login" size={20} color="#FFF" />
            )}
            <Text style={styles.loginButtonText}>
              {authLoading ? 'Connecting...' : 'Connect to Odoo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            Make sure your Odoo server is accessible and your credentials are correct.
          </Text>
          <Text style={styles.helpText}>
            If you have 2FA enabled, you'll need to use an API key instead of your password.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  serverInfo: {
    marginBottom: 32,
  },
  serverTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  serverCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serverText: {
    marginLeft: 16,
    flex: 1,
  },
  serverLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  serverValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
