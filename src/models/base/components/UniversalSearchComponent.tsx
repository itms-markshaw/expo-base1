/**
 * Universal Search Component
 * Search across all Odoo data, features, and content
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../services/BaseAuthService';
import { NavigationService, NavigationItem } from '../../../navigation/NavigationConfig';

const { width: screenWidth } = Dimensions.get('window');

interface SearchResult {
  id: string;
  type: 'record' | 'feature' | 'action';
  title: string;
  subtitle: string;
  description?: string;
  model?: string;
  recordId?: number;
  icon: string;
  color: string;
  onPress: () => void;
}

interface UniversalSearchProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (item: NavigationItem) => void;
  onRecordSelect?: (model: string, recordId: number) => void;
}

export default function UniversalSearchComponent({
  visible,
  onClose,
  onNavigate,
  onRecordSelect,
}: UniversalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'records' | 'features' | 'actions'>('all');

  const searchCategories = [
    { id: 'all', name: 'All', icon: 'search', color: '#666' },
    { id: 'records', name: 'Records', icon: 'description', color: '#007AFF' },
    { id: 'features', name: 'Features', icon: 'apps', color: '#34C759' },
    { id: 'actions', name: 'Actions', icon: 'flash-on', color: '#FF9500' },
  ];

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedCategory]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const results: SearchResult[] = [];

      // Search features and navigation items
      if (selectedCategory === 'all' || selectedCategory === 'features') {
        const navigationItems = NavigationService.getAvailableItems();
        const featureResults = navigationItems
          .filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(item => ({
            id: `feature_${item.id}`,
            type: 'feature' as const,
            title: item.name,
            subtitle: item.category.charAt(0).toUpperCase() + item.category.slice(1),
            description: item.description,
            icon: item.icon,
            color: item.color || '#666',
            onPress: () => {
              onNavigate?.(item);
              addToRecentSearches(searchQuery);
              onClose();
            },
          }));
        results.push(...featureResults);
      }

      // Search quick actions
      if (selectedCategory === 'all' || selectedCategory === 'actions') {
        const quickActions = [
          {
            id: 'action_new_order',
            title: 'Create Sales Order',
            subtitle: 'New sales order',
            description: 'Create a new sales order or quotation',
            icon: 'add-shopping-cart',
            color: '#34C759',
          },
          {
            id: 'action_new_activity',
            title: 'Schedule Activity',
            subtitle: 'New task',
            description: 'Schedule a new activity or task',
            icon: 'add-task',
            color: '#FF9500',
          },
          {
            id: 'action_take_photo',
            title: 'Take Photo',
            subtitle: 'Camera',
            description: 'Capture photo for documentation',
            icon: 'camera-alt',
            color: '#9C27B0',
          },
          {
            id: 'action_scan_barcode',
            title: 'Scan Barcode',
            subtitle: 'Scanner',
            description: 'Scan product or asset barcode',
            icon: 'qr-code-scanner',
            color: '#007AFF',
          },
        ];

        const actionResults = quickActions
          .filter(action =>
            action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            action.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(action => ({
            id: action.id,
            type: 'action' as const,
            title: action.title,
            subtitle: action.subtitle,
            description: action.description,
            icon: action.icon,
            color: action.color,
            onPress: () => {
              console.log('Execute action:', action.id);
              addToRecentSearches(searchQuery);
              onClose();
            },
          }));
        results.push(...actionResults);
      }

      // Search Odoo records
      if (selectedCategory === 'all' || selectedCategory === 'records') {
        await searchOdooRecords(results);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchOdooRecords = async (results: SearchResult[]) => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Search models to query
      const searchModels = [
        {
          model: 'res.partner',
          fields: ['id', 'name', 'email', 'phone'],
          icon: 'person',
          color: '#007AFF',
          type: 'Customer',
        },
        {
          model: 'sale.order',
          fields: ['id', 'name', 'partner_id', 'amount_total', 'state'],
          icon: 'shopping-cart',
          color: '#34C759',
          type: 'Sales Order',
        },
        {
          model: 'crm.lead',
          fields: ['id', 'name', 'partner_name', 'email_from', 'stage_id'],
          icon: 'trending-up',
          color: '#FF9500',
          type: 'Lead',
        },
        {
          model: 'mail.activity',
          fields: ['id', 'summary', 'res_name', 'date_deadline'],
          icon: 'event-note',
          color: '#9C27B0',
          type: 'Activity',
        },
      ];

      for (const searchModel of searchModels) {
        try {
          const records = await client.searchRead(
            searchModel.model,
            [['name', 'ilike', searchQuery]],
            searchModel.fields,
            { limit: 5 }
          );

          const recordResults = records.map(record => ({
            id: `record_${searchModel.model}_${record.id}`,
            type: 'record' as const,
            title: record.name || record.summary || `${searchModel.type} #${record.id}`,
            subtitle: searchModel.type,
            description: getRecordDescription(record, searchModel.model),
            model: searchModel.model,
            recordId: record.id,
            icon: searchModel.icon,
            color: searchModel.color,
            onPress: () => {
              onRecordSelect?.(searchModel.model, record.id);
              addToRecentSearches(searchQuery);
              onClose();
            },
          }));

          results.push(...recordResults);
        } catch (modelError) {
          console.warn(`Search failed for ${searchModel.model}:`, modelError.message);
        }
      }
    } catch (error) {
      console.error('Odoo record search failed:', error);
    }
  };

  const getRecordDescription = (record: any, model: string): string => {
    switch (model) {
      case 'res.partner':
        return record.email || record.phone || 'Contact';
      case 'sale.order':
        return `${record.partner_id?.[1] || 'Customer'} • $${record.amount_total?.toLocaleString() || '0'}`;
      case 'crm.lead':
        return record.partner_name || record.email_from || 'Lead';
      case 'mail.activity':
        return `${record.res_name || 'Activity'} • Due: ${record.date_deadline}`;
      default:
        return '';
    }
  };

  const addToRecentSearches = (query: string) => {
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 5);
      return updated;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderSearchResult = (result: SearchResult) => (
    <TouchableOpacity
      key={result.id}
      style={styles.searchResult}
      onPress={result.onPress}
    >
      <View style={[styles.resultIcon, { backgroundColor: result.color + '15' }]}>
        <MaterialIcons name={result.icon as any} size={20} color={result.color} />
      </View>
      
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {result.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {result.subtitle}
        </Text>
        {result.description && (
          <Text style={styles.resultDescription} numberOfLines={1}>
            {result.description}
          </Text>
        )}
      </View>

      <View style={styles.resultMeta}>
        <View style={[styles.typeBadge, { backgroundColor: result.color }]}>
          <Text style={styles.typeBadgeText}>
            {result.type.charAt(0).toUpperCase()}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search everything..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <MaterialIcons name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          {searchCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category.id as any)}
            >
              <MaterialIcons
                name={category.icon as any}
                size={16}
                color={selectedCategory === category.id ? '#FFF' : category.color}
              />
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Results */}
        <ScrollView style={styles.resultsContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtext}>
                Try different keywords or check spelling
              </Text>
            </View>
          )}

          {!loading && searchResults.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
              {searchResults.map(renderSearchResult)}
            </View>
          )}

          {searchQuery.length < 2 && recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              {recentSearches.map((query, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => setSearchQuery(query)}
                >
                  <MaterialIcons name="history" size={20} color="#666" />
                  <Text style={styles.recentText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchQuery.length < 2 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity style={styles.suggestionItem}>
                <MaterialIcons name="add-shopping-cart" size={20} color="#34C759" />
                <Text style={styles.suggestionText}>Create new sales order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionItem}>
                <MaterialIcons name="add-task" size={20} color="#FF9500" />
                <Text style={styles.suggestionText}>Schedule new activity</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestionItem}>
                <MaterialIcons name="camera-alt" size={20} color="#9C27B0" />
                <Text style={styles.suggestionText}>Take photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingTop: 50, // Account for status bar
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  categoryFilter: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  resultsSection: {
    padding: 16,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: 12,
    color: '#999',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFF',
  },
  recentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  recentText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  suggestionsSection: {
    padding: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
});
