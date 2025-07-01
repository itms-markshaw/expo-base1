/**
 * Helpdesk Screen
 * Professional ticket and support management
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
import { useAppNavigation } from '../components/AppNavigationProvider';
import FilterBottomSheet from '../components/FilterBottomSheet';
import { formatRelationalField } from '../utils/relationalFieldUtils';

interface HelpdeskTicket {
  id: number;
  name: string;
  description?: string;
  partner_id?: [number, string];
  user_id?: [number, string];
  team_id?: [number, string];
  stage_id?: [number, string];
  priority: '0' | '1' | '2' | '3';
  kanban_state: 'normal' | 'blocked' | 'done';
  active: boolean;
  create_date: string;
  write_date: string;
  close_date?: string;
}

export default function HelpdeskScreen() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent' | 'assigned' | 'closed'>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const { showNavigationDrawer, showUniversalSearch } = useAppNavigation();

  const filters = [
    { id: 'all', name: 'All', icon: 'support', count: tickets.length },
    { id: 'open', name: 'Open', icon: 'schedule', count: tickets.filter(t => t.active && t.kanban_state !== 'done').length },
    { id: 'urgent', name: 'Urgent', icon: 'priority-high', count: tickets.filter(t => t.priority === '3').length },
    { id: 'assigned', name: 'Assigned', icon: 'person', count: tickets.filter(t => t.user_id).length },
    { id: 'closed', name: 'Closed', icon: 'check-circle', count: tickets.filter(t => t.kanban_state === 'done').length },
  ];

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const ticketData = await client.searchRead('helpdesk.ticket',
        [],
        ['id', 'name', 'description', 'partner_id', 'user_id', 'team_id', 'stage_id', 'priority', 'kanban_state', 'active', 'create_date', 'write_date', 'close_date'],
        { order: 'create_date desc', limit: 100 }
      );

      setTickets(ticketData);
    } catch (error) {
      console.error('Failed to load helpdesk tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const getFilteredTickets = () => {
    let filtered = tickets;

    // Apply filter
    switch (filter) {
      case 'open':
        filtered = filtered.filter(t => t.active && t.kanban_state !== 'done');
        break;
      case 'urgent':
        filtered = filtered.filter(t => t.priority === '3');
        break;
      case 'assigned':
        filtered = filtered.filter(t => t.user_id);
        break;
      case 'closed':
        filtered = filtered.filter(t => t.kanban_state === 'done');
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(ticket =>
        ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatRelationalField(ticket.partner_id)?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '3': return '#FF3B30'; // High
      case '2': return '#FF9500'; // Medium
      case '1': return '#34C759'; // Low
      default: return '#666';     // Normal
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case '3': return 'priority-high';
      case '2': return 'remove';
      case '1': return 'keyboard-arrow-down';
      default: return 'remove';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case '3': return 'High';
      case '2': return 'Medium';
      case '1': return 'Low';
      default: return 'Normal';
    }
  };

  const getStatusColor = (kanbanState: string) => {
    switch (kanbanState) {
      case 'done': return '#34C759';
      case 'blocked': return '#FF3B30';
      default: return '#007AFF';
    }
  };

  const getStatusIcon = (kanbanState: string) => {
    switch (kanbanState) {
      case 'done': return 'check-circle';
      case 'blocked': return 'block';
      default: return 'schedule';
    }
  };

  const renderTicketCard = (ticket: HelpdeskTicket) => (
    <TouchableOpacity key={ticket.id} style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={[styles.statusIcon, { backgroundColor: getStatusColor(ticket.kanban_state) + '15' }]}>
          <MaterialIcons 
            name={getStatusIcon(ticket.kanban_state) as any} 
            size={20} 
            color={getStatusColor(ticket.kanban_state)} 
          />
        </View>
        
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketTitle} numberOfLines={1}>
            {ticket.name}
          </Text>
          {ticket.partner_id && (
            <Text style={styles.ticketCustomer} numberOfLines={1}>
              Customer: {formatRelationalField(ticket.partner_id)}
            </Text>
          )}
          {ticket.user_id && (
            <Text style={styles.ticketAssignee} numberOfLines={1}>
              Assigned: {formatRelationalField(ticket.user_id)}
            </Text>
          )}
        </View>

        <View style={styles.ticketMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
            <MaterialIcons 
              name={getPriorityIcon(ticket.priority) as any} 
              size={12} 
              color="#FFF" 
            />
            <Text style={styles.priorityText}>{getPriorityLabel(ticket.priority)}</Text>
          </View>
        </View>
      </View>

      {ticket.description && (
        <Text style={styles.ticketDescription} numberOfLines={2}>
          {ticket.description}
        </Text>
      )}

      <View style={styles.ticketFooter}>
        <Text style={styles.ticketDate}>
          Created: {new Date(ticket.create_date).toLocaleDateString()}
        </Text>
        {ticket.team_id && (
          <Text style={styles.ticketTeam}>
            Team: {formatRelationalField(ticket.team_id)}
          </Text>
        )}
        <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  const filteredTickets = getFilteredTickets();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Helpdesk</Text>
          <Text style={styles.headerSubtitle}>Support tickets and requests</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={showUniversalSearch}
          >
            <MaterialIcons name="search" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={showNavigationDrawer}
          >
            <MaterialIcons name="account-circle" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
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

      {/* Compact Header */}
      <View style={styles.compactHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Support Tickets</Text>
          <Text style={styles.headerSubtitle}>
            {filter === 'all' ? 'All tickets' :
             filter === 'open' ? 'Open tickets' :
             filter === 'urgent' ? 'Urgent tickets' :
             filter === 'assigned' ? 'Assigned tickets' :
             'Closed tickets'} • {filteredTickets.length}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterSheet(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tickets List */}
      <ScrollView
        style={styles.ticketsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredTickets.map(renderTicketCard)}

        {filteredTickets.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="support" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No support tickets available'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Tickets"
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
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
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
  headerLeft: {
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
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
  },
  profileButton: {
    padding: 4,
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
    backgroundColor: '#FF3B30',
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
    color: '#FF3B30',
  },
  ticketsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  ticketCard: {
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
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  ticketCustomer: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  ticketTeam: {
    fontSize: 13,
    color: '#666',
  },
  ticketMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  stageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  ticketDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  ticketDates: {
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  ticketStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageCountText: {
    fontSize: 11,
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
