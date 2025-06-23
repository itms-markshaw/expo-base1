/**
 * Navigation Test Component
 * Quick test to verify navigation system is working
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationService, navigationCategories } from '../navigation/NavigationConfig';

export default function NavigationTest() {
  const allItems = NavigationService.getAvailableItems();
  const primaryItems = NavigationService.getPrimaryItems();
  const categories = Object.values(navigationCategories);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation System Test</Text>
      
      <Text style={styles.sectionTitle}>Categories ({categories.length})</Text>
      {categories.map((category) => (
        <Text key={category.id} style={styles.item}>
          • {category.name} - {category.description}
        </Text>
      ))}
      
      <Text style={styles.sectionTitle}>Primary Items ({primaryItems.length})</Text>
      {primaryItems.map((item) => (
        <Text key={item.id} style={styles.item}>
          • {item.name} ({item.category})
        </Text>
      ))}
      
      <Text style={styles.sectionTitle}>All Available Items ({allItems.length})</Text>
      {allItems.slice(0, 5).map((item) => (
        <Text key={item.id} style={styles.item}>
          • {item.name} - {item.description}
        </Text>
      ))}
      
      <Text style={styles.success}>✅ Navigation system working correctly!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 16,
    marginBottom: 8,
  },
  item: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  success: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 16,
    textAlign: 'center',
  },
});
