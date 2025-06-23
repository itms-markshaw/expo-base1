/**
 * Sales Order Screen
 * Complete sales order management with sophisticated navigation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SalesOrderComponent from '../components/SalesOrderComponent';

export default function SalesOrderScreen() {

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sales Orders</Text>
          <Text style={styles.headerSubtitle}>Manage your sales pipeline</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="search" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="filter-list" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <MaterialIcons name="trending-up" size={16} color="#34C759" />
        <Text style={styles.breadcrumbText}>Sales</Text>
        <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
        <Text style={styles.breadcrumbText}>Orders</Text>
      </View>

      {/* Sales Order Component */}
      <SalesOrderComponent />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
