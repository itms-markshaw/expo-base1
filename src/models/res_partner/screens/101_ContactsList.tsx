/**
 * 101_ContactsList - Main contacts list view
 * Screen Number: 101
 * Model: res.partner
 * Type: list
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseListView from '../../base/components/BaseListView';
import { contactService } from '../services/ContactService';
import { Contact, ContactFilters, CONTACT_TYPES } from '../types/Contact';
import ContactCard from '../components/ContactCard';
import ScreenBadge from '../../../components/ScreenBadge';

export default function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filters = [
    { id: 'customers', label: 'Customers', value: { type: 'customers' } },
    { id: 'suppliers', label: 'Suppliers', value: { type: 'suppliers' } },
    { id: 'companies', label: 'Companies', value: { type: 'companies' } },
    { id: 'individuals', label: 'Individuals', value: { type: 'individuals' } },
  ];

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const contactsData = await contactService.searchContacts({
        query: searchQuery,
        filters: getActiveFilters(),
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() || activeFilter !== 'all') {
      await loadContacts();
    }
  };

  const handleFilterChange = async (filterId: string) => {
    setActiveFilter(filterId);
    await loadContacts();
  };

  const handleContactPress = (contact: Contact) => {
    // Navigate to contact detail screen (102)
    console.log('Navigate to contact detail:', contact.id);
    // TODO: Implement navigation to 102_ContactDetail
  };

  const handleAddContact = () => {
    // Navigate to create contact screen (104)
    console.log('Navigate to create contact');
    // TODO: Implement navigation to 104_ContactCreate
  };

  const getActiveFilters = (): ContactFilters => {
    const filter = filters.find(f => f.id === activeFilter);
    return filter ? filter.value as ContactFilters : { type: 'all' };
  };

  const renderContactItem = (contact: Contact) => (
    <ContactCard
      contact={contact}
      onPress={() => handleContactPress(contact)}
    />
  );

  const getHeaderSubtitle = () => {
    const filterLabel = filters.find(f => f.id === activeFilter)?.label || 'All contacts';
    return `${filterLabel} • ${contacts.length} records`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <BaseListView
        data={contacts}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onItemPress={handleContactPress}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        renderItem={renderContactItem}
        headerTitle="Contacts"
        headerSubtitle={getHeaderSubtitle()}
        emptyStateIcon="people-outline"
        emptyStateTitle="No contacts found"
        emptyStateSubtext={
          searchQuery
            ? "Try adjusting your search terms"
            : "Add your first contact to get started"
        }
        showSearch={true}
        showFilters={true}
        showAddButton={true}
        onAddPress={handleAddContact}
      />
      <ScreenBadge screenNumber={101} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
