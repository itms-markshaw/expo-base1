/**
 * Mobile Features Screen - Zendesk Field Service Style
 * Clean, professional interface with compact navigation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import EmployeeCheckInComponent from '../components/EmployeeCheckInComponent';
import CameraDocumentationComponent from '../components/CameraDocumentationComponent';
import CompactGPSComponent from '../components/CompactGPSComponent';

const { width: screenWidth } = Dimensions.get('window');

type MobileFeature = 'checkin' | 'gps' | 'camera' | 'barcode' | 'offline';

export default function MobileScreen() {
  const [selectedFeature, setSelectedFeature] = useState<MobileFeature>('checkin');

  const mobileFeatures = [
    {
      id: 'checkin' as MobileFeature,
      name: 'Attendance',
      shortName: 'Check In',
      icon: 'access-time',
      color: '#34C759',
      available: true,
    },
    {
      id: 'gps' as MobileFeature,
      name: 'Location',
      shortName: 'GPS',
      icon: 'my-location',
      color: '#007AFF',
      available: true,
    },
    {
      id: 'camera' as MobileFeature,
      name: 'Camera',
      shortName: 'Photos',
      icon: 'photo-camera',
      color: '#FF9500',
      available: true,
    },
    {
      id: 'barcode' as MobileFeature,
      name: 'Scanner',
      shortName: 'Scan',
      icon: 'qr-code-scanner',
      color: '#9C27B0',
      available: false,
    },
    {
      id: 'offline' as MobileFeature,
      name: 'Offline',
      shortName: 'Sync',
      icon: 'cloud-off',
      color: '#666',
      available: false,
    },
  ];

  const renderFeatureContent = () => {
    switch (selectedFeature) {
      case 'checkin':
        return <EmployeeCheckInComponent />;
      
      case 'gps':
        return <CompactGPSComponent />;
      
      case 'camera':
        return (
          <CameraDocumentationComponent
            model="res.partner" // Default model, will be dynamic in real use
            recordId={1} // Default record, will be dynamic in real use
            recordName="Camera Documentation Demo"
          />
        );
      
      case 'barcode':
        return (
          <View style={styles.comingSoon}>
            <MaterialIcons name="qr-code-scanner" size={64} color="#9C27B0" />
            <Text style={styles.comingSoonTitle}>Barcode Scanner</Text>
            <Text style={styles.comingSoonText}>
              Scan barcodes and QR codes to quickly identify products,
              assets, and locations in your Odoo system.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>📱 QR code scanning</Text>
              <Text style={styles.featureItem}>📊 Barcode recognition</Text>
              <Text style={styles.featureItem}>📦 Inventory management</Text>
              <Text style={styles.featureItem}>🏷️ Asset tracking</Text>
            </View>
          </View>
        );
      
      case 'offline':
        return (
          <View style={styles.comingSoon}>
            <MaterialIcons name="cloud-off" size={64} color="#666" />
            <Text style={styles.comingSoonTitle}>Offline Mode</Text>
            <Text style={styles.comingSoonText}>
              Work seamlessly without internet connection.
              All data syncs automatically when connection is restored.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>💾 Offline data storage</Text>
              <Text style={styles.featureItem}>🔄 Automatic sync</Text>
              <Text style={styles.featureItem}>📱 Offline forms</Text>
              <Text style={styles.featureItem}>⚡ Background sync</Text>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Compact Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Field Service</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="notifications" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact Tab Bar */}
      <View style={styles.tabBar}>
        {mobileFeatures.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={[
              styles.tab,
              selectedFeature === feature.id && styles.tabActive,
              !feature.available && styles.tabDisabled,
            ]}
            onPress={() => feature.available && setSelectedFeature(feature.id)}
            disabled={!feature.available}
          >
            <MaterialIcons
              name={feature.icon as any}
              size={18}
              color={
                selectedFeature === feature.id
                  ? '#007AFF'
                  : feature.available
                    ? '#666'
                    : '#C7C7CC'
              }
            />
            <Text style={[
              styles.tabText,
              selectedFeature === feature.id && styles.tabTextActive,
              !feature.available && styles.tabTextDisabled,
            ]}>
              {feature.shortName}
            </Text>
            {!feature.available && <View style={styles.disabledDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Feature Content */}
      <View style={styles.content}>
        {renderFeatureContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabDisabled: {
    opacity: 0.5,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabTextDisabled: {
    color: '#C7C7CC',
  },
  disabledDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9500',
  },
  content: {
    flex: 1,
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  featureList: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
  featureItem: {
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
});
