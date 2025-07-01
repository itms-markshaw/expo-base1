/**
 * Sales Order Screen
 * Complete sales order management with sophisticated navigation
 */

import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import SalesOrderComponent from '../components/SalesOrderComponent';

export default function SalesOrderScreen() {

  return (
    <SafeAreaView style={styles.container}>
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
});
