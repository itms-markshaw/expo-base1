/**
 * Contacts Screen
 * Professional contact management interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../services/auth';

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  is_company: boolean;
  customer_rank: number;
  supplier_rank: number;
  category_id?: [number, string][];
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'customers' | 'suppliers' | 'companies'>('all');

  const filters = [
    { id: 'all', name: 'All', icon: 'people', count: contacts.length },
    { id: 'customers', name: 'Customers', icon: 'person', count: contacts.filter(c => c.customer_rank > 0).length },
    { id: 'suppliers', name: 'Suppliers', icon: 'business', count: contacts.filter(c => c.supplier_rank > 0).length },
    { id: 'companies', name: 'Companies', icon: 'domain', count: contacts.filter(c => c.is_company).length },
  ];

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const contactData = await client.searchRead('res.partner',
        [],
        ['id', 'name', 'email', 'phone', 'is_company', 'customer_rank', 'supplier_rank', 'category_id'],
        { order: 'name asc', limit: 100 }
      );

      setContacts(contactData);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const getFilteredContacts = () => {
    let filtered = contacts;

    // Apply filter
    switch (filter) {
      case 'customers':
        filtered = filtered.filter(c => c.customer_rank > 0);
        break;
      case 'suppliers':
        filtered = filtered.filter(c => c.supplier_rank > 0);
        break;
      case 'companies':
        filtered = filtered.filter(c => c.is_company);
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery)
      );
    }

    return filtered;
  };

  const renderContactCard = (contact: Contact) => (
    <TouchableOpacity key={contact.id} style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={[styles.contactAvatar, { backgroundColor: contact.is_company ? '#FF9500' : '#007AFF' }]}>
          <MaterialIcons 
            name={contact.is_company ? 'business' : 'person'} 
            size={24} 
            color="#FFF" 
          />
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>
            {contact.name}
          </Text>
          {contact.email && (
            <Text style={styles.contactEmail} numberOfLines={1}>
              {contact.email}
            </Text>
          )}
          {contact.phone && (
            <Text style={styles.contactPhone} numberOfLines={1}>
              {contact.phone}
            </Text>
          )}
        </View>

        <View style={styles.contactMeta}>
          {contact.customer_rank > 0 && (
            <View style={[styles.badge, { backgroundColor: '#34C759' }]}>
              <Text style={styles.badgeText}>Customer</Text>
            </View>
          )}
          {contact.supplier_rank > 0 && (
            <View style={[styles.badge, { backgroundColor: '#FF9500' }]}>
              <Text style={styles.badgeText}>Supplier</Text>
            </View>
          )}
          <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredContacts = getFilteredContacts();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <TouchableOpacity style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filterItem) => (
          <TouchableOpacity
            key={filterItem.id}
            style={[
              styles.filterTab,
              filter === filterItem.id && styles.filterTabActive
            ]}
            onPress={() => setFilter(filterItem.id as any)}
          >
            <MaterialIcons
              name={filterItem.icon as any}
              size={16}
              color={filter === filterItem.id ? '#FFF' : '#666'}
            />
            <Text style={[
              styles.filterTabText,
              filter === filterItem.id && styles.filterTabTextActive
            ]}>
              {filterItem.name}
            </Text>
            <View style={[
              styles.filterBadge,
              filter === filterItem.id && styles.filterBadgeActive
            ]}>
              <Text style={[
                styles.filterBadgeText,
                filter === filterItem.id && styles.filterBadgeTextActive
              ]}>
                {filterItem.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contacts List */}
      <ScrollView
        style={styles.contactsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredContacts.map(renderContactCard)}

        {filteredContacts.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="people-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No contacts found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first contact to get started'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  filterContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    gap: 4,
    minWidth: 70,
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  filterBadge: {
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#FFF',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#007AFF',
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  contactCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  contactMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
