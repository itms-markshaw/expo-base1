/**
 * Compact GPS Tracking Component
 * Clean, professional GPS tracking interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { authService } from '../../base/services/BaseAuthService';

interface LocationLog {
  id: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  address: string;
  activity_type: string;
  accuracy: number;
}

export default function CompactGPSComponent() {
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    loadLocationLogs();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setCurrentLocation({
        ...location.coords,
        address: address[0] ? `${address[0].street || ''} ${address[0].city || ''}`.trim() : 'Unknown location',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const loadLocationLogs = async () => {
    try {
      // Mock location logs for demo
      const mockLogs: LocationLog[] = [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          latitude: -33.8688,
          longitude: 151.2093,
          address: 'Sydney Opera House, Sydney',
          activity_type: 'client_visit',
          accuracy: 5,
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          latitude: -33.8675,
          longitude: 151.2070,
          address: 'Circular Quay, Sydney',
          activity_type: 'field_service',
          accuracy: 8,
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          latitude: -33.8650,
          longitude: 151.2094,
          address: 'Royal Botanic Gardens, Sydney',
          activity_type: 'delivery',
          accuracy: 3,
        },
      ];

      setLocationLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load location logs:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getCurrentLocation(), loadLocationLogs()]);
    setRefreshing(false);
  };

  const logCurrentLocation = async (activityType: string) => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Log location activity
      await client.callModel('res.partner', 'message_post', [1], {
        body: `<p>📍 <strong>Location Logged:</strong> ${activityType}</p>
               <p><strong>Address:</strong> ${currentLocation.address}</p>
               <p><strong>Coordinates:</strong> ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}</p>
               <p><strong>Accuracy:</strong> ${currentLocation.accuracy?.toFixed(0)}m</p>
               <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`,
      });

      await loadLocationLogs();
    } catch (error) {
      console.error('Failed to log location:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'client_visit': return 'business';
      case 'field_service': return 'build';
      case 'delivery': return 'local-shipping';
      case 'check_in': return 'login';
      case 'check_out': return 'logout';
      default: return 'location-on';
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'client_visit': return '#007AFF';
      case 'field_service': return '#FF9500';
      case 'delivery': return '#34C759';
      case 'check_in': return '#34C759';
      case 'check_out': return '#FF3B30';
      default: return '#666';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Current Location Card */}
      <View style={styles.currentLocationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="my-location" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Current Location</Text>
          </View>
          <TouchableOpacity onPress={getCurrentLocation}>
            <MaterialIcons name="refresh" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {currentLocation ? (
          <View style={styles.locationInfo}>
            <Text style={styles.locationAddress}>{currentLocation.address}</Text>
            <Text style={styles.locationCoords}>
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
            <Text style={styles.locationAccuracy}>
              Accuracy: {currentLocation.accuracy?.toFixed(0) || 'Unknown'}m
            </Text>
          </View>
        ) : (
          <View style={styles.locationLoading}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Getting location...</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Log</Text>
        <View style={styles.actionGrid}>
          {[
            { type: 'client_visit', label: 'Client Visit', icon: 'business' },
            { type: 'field_service', label: 'Service', icon: 'build' },
            { type: 'delivery', label: 'Delivery', icon: 'local-shipping' },
            { type: 'check_in', label: 'Check In', icon: 'login' },
          ].map((action) => (
            <TouchableOpacity
              key={action.type}
              style={[
                styles.actionButton,
                { borderColor: getActivityColor(action.type) },
                loading && styles.actionButtonDisabled
              ]}
              onPress={() => logCurrentLocation(action.type)}
              disabled={loading || !currentLocation}
            >
              <MaterialIcons 
                name={action.icon as any} 
                size={18} 
                color={getActivityColor(action.type)} 
              />
              <Text style={[styles.actionButtonText, { color: getActivityColor(action.type) }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Locations</Text>
        {locationLogs.map((log) => (
          <View key={log.id} style={styles.historyItem}>
            <View style={[
              styles.historyIcon,
              { backgroundColor: getActivityColor(log.activity_type) + '15' }
            ]}>
              <MaterialIcons
                name={getActivityIcon(log.activity_type) as any}
                size={16}
                color={getActivityColor(log.activity_type)}
              />
            </View>
            
            <View style={styles.historyContent}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyActivity}>
                  {log.activity_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.historyTime}>{formatTime(log.timestamp)}</Text>
              </View>
              <Text style={styles.historyAddress} numberOfLines={1}>
                {log.address}
              </Text>
              <Text style={styles.historyCoords}>
                {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)} • {log.accuracy}m accuracy
              </Text>
            </View>
          </View>
        ))}

        {locationLogs.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="location-off" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>No location logs yet</Text>
            <Text style={styles.emptySubtext}>Use quick actions above to log your location</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  currentLocationCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  locationInfo: {
    gap: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  locationAccuracy: {
    fontSize: 11,
    color: '#999',
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  historySection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  historyActivity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  historyTime: {
    fontSize: 11,
    color: '#999',
  },
  historyAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  historyCoords: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});
