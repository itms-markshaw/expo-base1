/**
 * CRM Leads Screen
 * Professional lead management interface
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
import FilterBottomSheet from '../components/FilterBottomSheet';
import { formatRelationalField } from '../utils/relationalFieldUtils';

interface CRMLead {
  id: number;
  name: string;
  partner_name?: string;
  email_from?: string;
  phone?: string;
  stage_id: [number, string];
  user_id?: [number, string];
  team_id?: [number, string];
  expected_revenue: number;
  probability: number;
  date_deadline?: string;
  priority: '0' | '1' | '2' | '3';
  active: boolean;
}

export default function CRMLeadsScreen() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'qualified' | 'won' | 'lost'>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const filters = [
    { id: 'all', name: 'All', icon: 'trending-up', count: leads.length },
    { id: 'new', name: 'New', icon: 'fiber-new', count: leads.filter(l => formatRelationalField(l.stage_id)?.toLowerCase().includes('new')).length },
    { id: 'qualified', name: 'Qualified', icon: 'verified', count: leads.filter(l => formatRelationalField(l.stage_id)?.toLowerCase().includes('qualified')).length },
    { id: 'won', name: 'Won', icon: 'emoji-events', count: leads.filter(l => formatRelationalField(l.stage_id)?.toLowerCase().includes('won')).length },
  ];

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const leadData = await client.searchRead('crm.lead',
        [],
        ['id', 'name', 'partner_name', 'email_from', 'phone', 'stage_id', 'user_id', 'team_id', 'expected_revenue', 'probability', 'date_deadline', 'priority', 'active'],
        { order: 'create_date desc', limit: 100 }
      );

      setLeads(leadData);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  };

  const getFilteredLeads = () => {
    let filtered = leads;

    // Apply filter
    switch (filter) {
      case 'new':
        filtered = filtered.filter(l => formatRelationalField(l.stage_id)?.toLowerCase().includes('new'));
        break;
      case 'qualified':
        filtered = filtered.filter(l => formatRelationalField(l.stage_id)?.toLowerCase().includes('qualified'));
        break;
      case 'won':
        filtered = filtered.filter(l => formatRelationalField(l.stage_id)?.toLowerCase().includes('won'));
        break;
      case 'lost':
        filtered = filtered.filter(l => formatRelationalField(l.stage_id)?.toLowerCase().includes('lost'));
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email_from?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '3': return '#FF3B30'; // High
      case '2': return '#FF9500'; // Medium
      case '1': return '#34C759'; // Low
      default: return '#999';     // Normal
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case '3': return 'priority-high';
      case '2': return 'remove';
      case '1': return 'expand-more';
      default: return 'remove';
    }
  };

  const getStageColor = (stageName: string) => {
    const stage = stageName?.toLowerCase() || '';
    if (stage.includes('new')) return '#007AFF';
    if (stage.includes('qualified')) return '#FF9500';
    if (stage.includes('proposition')) return '#9C27B0';
    if (stage.includes('won')) return '#34C759';
    if (stage.includes('lost')) return '#FF3B30';
    return '#666';
  };

  const renderLeadCard = (lead: CRMLead) => (
    <TouchableOpacity key={lead.id} style={styles.leadCard}>
      <View style={styles.leadHeader}>
        <View style={styles.leadInfo}>
          <View style={styles.leadTitleRow}>
            <Text style={styles.leadName} numberOfLines={1}>
              {lead.name}
            </Text>
            {lead.priority !== '0' && (
              <MaterialIcons 
                name={getPriorityIcon(lead.priority) as any} 
                size={16} 
                color={getPriorityColor(lead.priority)} 
              />
            )}
          </View>
          
          {lead.partner_name && (
            <Text style={styles.leadPartner} numberOfLines={1}>
              {lead.partner_name}
            </Text>
          )}
          
          {lead.email_from && (
            <Text style={styles.leadEmail} numberOfLines={1}>
              {lead.email_from}
            </Text>
          )}
          
          <View style={styles.leadMeta}>
            <View style={[styles.stageBadge, { backgroundColor: getStageColor(formatRelationalField(lead.stage_id, 'New')) + '15' }]}>
              <Text style={[styles.stageText, { color: getStageColor(formatRelationalField(lead.stage_id, 'New')) }]}>
                {formatRelationalField(lead.stage_id, 'New')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.leadStats}>
          <Text style={styles.revenueLabel}>Expected</Text>
          <Text style={styles.revenueValue}>
            ${lead.expected_revenue?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.probabilityText}>
            {lead.probability}% chance
          </Text>
        </View>
      </View>

      <View style={styles.leadFooter}>
        {lead.user_id && (
          <View style={styles.assigneeInfo}>
            <MaterialIcons name="person" size={14} color="#666" />
            <Text style={styles.assigneeText}>{formatRelationalField(lead.user_id, 'Unassigned')}</Text>
          </View>
        )}
        
        {lead.date_deadline && (
          <View style={styles.deadlineInfo}>
            <MaterialIcons name="schedule" size={14} color="#666" />
            <Text style={styles.deadlineText}>
              {new Date(lead.date_deadline).toLocaleDateString()}
            </Text>
          </View>
        )}
        
        <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  const filteredLeads = getFilteredLeads();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>CRM Leads</Text>
          <Text style={styles.headerSubtitle}>
            {filter === 'all' ? 'All leads' :
             filter === 'new' ? 'New leads' :
             filter === 'qualified' ? 'Qualified leads' :
             filter === 'won' ? 'Won leads' :
             'Lost leads'} • {filteredLeads.length}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterSheet(true)}
          >
            <MaterialIcons name="filter-list" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton}>
            <MaterialIcons name="person-add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads..."
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

      {/* Leads List */}
      <ScrollView
        style={styles.leadsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredLeads.map(renderLeadCard)}

        {filteredLeads.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="trending-up" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No leads found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first lead to get started'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Leads"
        filters={filters}
        selectedFilter={filter}
        onFilterSelect={(filterId) => setFilter(filterId as any)}
      />
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
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

  leadsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  leadCard: {
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
  leadHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  leadPartner: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  leadEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  leadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '600',
  },
  leadStats: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  revenueLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 2,
  },
  probabilityText: {
    fontSize: 11,
    color: '#666',
  },
  leadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assigneeText: {
    fontSize: 12,
    color: '#666',
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
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
});
