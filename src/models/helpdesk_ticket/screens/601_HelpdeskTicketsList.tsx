/**
 * 601_HelpdeskTicketsList - Professional ticket and support management
 * Screen Number: 601
 * Model: helpdesk.ticket
 * Type: list
 *
 * MIGRATED: From src/screens/HelpdeskScreen.tsx
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
import { authService } from '../../base/services/BaseAuthService';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import HelpdeskFilterBottomSheet from '../components/HelpdeskFilterBottomSheet';
import SavedFiltersBottomSheet from '../components/SavedFiltersBottomSheet';
import { formatRelationalField } from '../../../utils/relationalFieldUtils';
import ScreenBadge from '../../../components/ScreenBadge';
import { useNavigation } from '@react-navigation/native';

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
  sla_deadline?: string;
  sla_status?: 'on_time' | 'warning' | 'overdue';
  ticket_type?: string;
}

export default function HelpdeskScreen() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'my_tickets' | 'open' | 'urgent' | 'assigned' | 'closed' | 'new'>('open');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSavedFiltersSheet, setShowSavedFiltersSheet] = useState(false);
  const [favoriteTickets, setFavoriteTickets] = useState<Set<number>>(new Set());
  const [teams, setTeams] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState({
    stages: [] as string[],
    teams: [] as string[],
    assignees: [] as string[],
    types: [] as string[],
    priorities: [] as string[]
  });

  const { showNavigationDrawer, showUniversalSearch } = useAppNavigation();
  const navigation = useNavigation();



  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      // First check if helpdesk.ticket model exists
      try {
        const fields = await client.getFields('helpdesk.ticket');
        console.log('📋 Available helpdesk.ticket fields:', Object.keys(fields).slice(0, 10));
      } catch (fieldError) {
        console.error('❌ Helpdesk module may not be installed:', fieldError.message);
        // Try alternative approach - check if model exists
        try {
          const modelCheck = await client.searchRead('ir.model', [['model', '=', 'helpdesk.ticket']], ['id', 'name']);
          if (modelCheck.length === 0) {
            console.error('❌ helpdesk.ticket model not found in Odoo instance');
            setTickets([]);
            return;
          }
        } catch (modelError) {
          console.error('❌ Cannot verify helpdesk model existence:', modelError.message);
        }
      }

      // Start with minimal fields and add more as needed
      // FIXED: Load ONLY open tickets like the dashboard
      // First, let's get the closed stage names to exclude them
      let closedStages = [];
      try {
        const stageData = await client.searchRead('helpdesk.stage',
          [['fold', '=', true]], // Folded stages are typically closed
          ['name']
        );
        closedStages = stageData.map(stage => stage.name);
        console.log('🚫 Found closed stages:', closedStages);
      } catch (e) {
        console.warn('Could not load closed stages, using fallback');
        closedStages = ['Solved', 'Cancelled', 'Closed', 'Done'];
      }

      // FIXED: Load tickets with proper relational field names
      console.log('🔧 FIXED: Using proper XML-RPC field mapping...');
      const ticketData = await client.searchRead('helpdesk.ticket',
        [
          ['active', '=', true],
          // Exclude tickets in closed stages
          ...(closedStages.length > 0 ? [['stage_id.name', 'not in', closedStages]] : [])
        ],
        [
          'id', 'name', 'description',
          'partner_id',    // Will return [id, name] automatically
          'user_id',       // Will return [id, name] automatically
          'team_id',       // Will return [id, name] automatically
          'stage_id',      // Will return [id, name] automatically
          'partner_name', 'partner_email',
          'priority', 'kanban_state', 'active',
          'create_date', 'write_date', 'ticket_ref', 'color'
        ],
        { order: 'id desc', limit: 50 }
      );

      console.log('✅ FIXED: Loaded helpdesk tickets with proper field mapping:', ticketData.length);

      // FIXED: No complex parsing needed - XML-RPC should return proper [id, name] arrays
      if (ticketData.length > 0) {
        console.log('🔍 FIXED: Sample ticket data structure:', {
          id: ticketData[0].id,
          name: ticketData[0].name,
          stage_id: ticketData[0].stage_id,
          team_id: ticketData[0].team_id,
          user_id: ticketData[0].user_id,
          partner_id: ticketData[0].partner_id
        });
      }

      // Add mock SLA data for demonstration
      const ticketsWithSLA = ticketData.map((ticket, index) => {
        const now = new Date();
        const slaOptions = [
          { deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), status: 'on_time' }, // 2 days
          { deadline: new Date(now.getTime() + 4 * 60 * 60 * 1000), status: 'warning' }, // 4 hours
          { deadline: new Date(now.getTime() - 2 * 60 * 60 * 1000), status: 'overdue' }, // 2 hours ago
          null // No SLA
        ];

        const slaData = slaOptions[index % slaOptions.length];

        return {
          ...ticket,
          sla_deadline: slaData?.deadline?.toISOString(),
          sla_status: slaData?.status,
          ticket_type: ['Question', 'Issue', 'Billable', 'Contract'][index % 4]
        };
      });

      setTickets(ticketsWithSLA);

      // Load teams and stages for filtering
      await loadTeamsAndStages();
    } catch (error) {
      console.error('❌ Failed to load helpdesk tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamsAndStages = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Load teams
      const teamsData = await client.searchRead('helpdesk.team',
        [],
        ['id', 'name'],
        { order: 'name asc' }
      );
      setTeams(teamsData);

      // Load stages
      const stagesData = await client.searchRead('helpdesk.stage',
        [],
        ['id', 'name', 'sequence'],
        { order: 'sequence asc' }
      );
      setStages(stagesData);
    } catch (error) {
      console.error('Failed to load teams and stages:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const getFilteredTickets = () => {
    let filtered = tickets;

    console.log('🎯 Starting filter process with', tickets.length, 'tickets');
    console.log('🔧 Current advanced filters:', advancedFilters);

    // Apply favorites filter first
    if (showFavorites) {
      filtered = filtered.filter(ticket => favoriteTickets.has(ticket.id));
      console.log('⭐ After favorites filter:', filtered.length, 'tickets');
    }

    // Apply basic filter
    switch (filter) {
      case 'my_tickets':
        // FIXED: Filter for tickets assigned to current user
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.uid) {
          filtered = filtered.filter(t => t.user_id && t.user_id[0] === currentUser.uid);
          console.log('👤 FIXED: After my_tickets filter for user', currentUser.uid, ':', filtered.length, 'tickets');
        } else {
          console.warn('👤 No current user found for my_tickets filter');
          filtered = []; // No tickets if no user
        }
        break;
      case 'new':
        filtered = filtered.filter(t => t.stage_id && t.stage_id[1]?.toLowerCase().includes('new'));
        console.log('🆕 After new filter:', filtered.length, 'tickets');
        break;
      case 'open':
        filtered = filtered.filter(t => t.active && t.kanban_state !== 'done');
        console.log('📂 After open filter:', filtered.length, 'tickets');
        break;
      case 'urgent':
        filtered = filtered.filter(t => t.priority === '3');
        console.log('🚨 After urgent filter:', filtered.length, 'tickets');
        break;
      case 'assigned':
        filtered = filtered.filter(t => t.user_id);
        console.log('📋 After assigned filter:', filtered.length, 'tickets');
        break;
      case 'closed':
        filtered = filtered.filter(t => t.kanban_state === 'done');
        console.log('✅ After closed filter:', filtered.length, 'tickets');
        break;
    }

    // Check if any advanced filters are active
    const hasAdvancedFilters = Object.values(advancedFilters).some(arr => arr.length > 0);

    if (hasAdvancedFilters) {
      console.log('🔍 Applying advanced filters:', advancedFilters);
      console.log('📊 Tickets before advanced filtering:', filtered.length);

      // Show sample ticket data for debugging
      if (filtered.length > 0) {
        const sampleTicket = filtered[0];
        console.log('📋 Sample ticket structure:', {
          id: sampleTicket.id,
          name: sampleTicket.name,
          stage_id: sampleTicket.stage_id,
          team_id: sampleTicket.team_id,
          user_id: sampleTicket.user_id,
          priority: sampleTicket.priority
        });
      }

      if (advancedFilters.stages.length > 0) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(ticket => {
          const stageName = ticket.stage_id ? ticket.stage_id[1] : null;
          const matches = stageName && advancedFilters.stages.includes(stageName);
          return matches;
        });
        console.log(`📋 Stage filter: ${beforeCount} → ${filtered.length} tickets`);
      }

      if (advancedFilters.teams.length > 0 && !advancedFilters.teams.includes('All Teams')) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(ticket => {
          const teamName = ticket.team_id ? ticket.team_id[1] : null;
          const matches = teamName && advancedFilters.teams.includes(teamName);
          return matches;
        });
        console.log(`👥 Team filter: ${beforeCount} → ${filtered.length} tickets`);
      }

      if (advancedFilters.assignees.length > 0) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(ticket => {
          const assigneeName = ticket.user_id ? ticket.user_id[1] : null;
          const matches = assigneeName && advancedFilters.assignees.includes(assigneeName);
          return matches;
        });
        console.log(`👤 Assignee filter: ${beforeCount} → ${filtered.length} tickets`);
      }

      if (advancedFilters.priorities.length > 0) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(ticket => {
          const matches = advancedFilters.priorities.includes(ticket.priority);
          return matches;
        });
        console.log(`⭐ Priority filter: ${beforeCount} → ${filtered.length} tickets`);
      }

      console.log('📊 Final filtered tickets:', filtered.length);
    } else {
      console.log('⏭️ No advanced filters active, skipping advanced filtering');
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

  const toggleFavorite = (ticketId: number) => {
    setFavoriteTickets(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(ticketId)) {
        newFavorites.delete(ticketId);
      } else {
        newFavorites.add(ticketId);
      }
      return newFavorites;
    });
  };

  const handleTicketPress = (ticket: HelpdeskTicket) => {
    navigation.navigate('HelpdeskTicketDetail' as never, { ticketId: ticket.id } as never);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '3': return '#FF3B30'; // Urgent - Red
      case '2': return '#FF9500'; // High - Orange
      case '1': return '#007AFF'; // Normal - Blue
      case '0': return '#34C759'; // Low - Green
      default: return '#007AFF'; // Default - Blue
    }
  };

  const getSLAColor = (slaStatus?: string) => {
    switch (slaStatus) {
      case 'overdue': return '#FF3B30'; // Red
      case 'warning': return '#FF9500'; // Orange
      case 'on_time': return '#34C759'; // Green
      default: return '#C7C7CC'; // Gray
    }
  };

  const getSLAText = (slaStatus?: string) => {
    switch (slaStatus) {
      case 'overdue': return 'OVERDUE';
      case 'warning': return 'DUE SOON';
      case 'on_time': return 'ON TIME';
      default: return 'NO SLA';
    }
  };

  const formatSLATime = (deadline?: string) => {
    if (!deadline) return null;

    const now = new Date();
    const slaDate = new Date(deadline);
    const diffMs = slaDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      const overdueHours = Math.abs(diffHours % 24);
      if (overdueDays > 0) {
        return `${overdueDays}d overdue`;
      } else {
        return `${overdueHours}h overdue`;
      }
    } else if (diffDays > 0) {
      return `${diffDays}d left`;
    } else {
      return `${diffHours}h left`;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case '3': return 'priority-high';
      case '2': return 'trending-up';
      case '1': return 'remove';
      case '0': return 'trending-down';
      default: return 'remove';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case '3': return 'Urgent';
      case '2': return 'High';
      case '1': return 'Normal';
      case '0': return 'Low';
      default: return 'Normal';
    }
  };

  const renderPriorityStars = (priority: string) => {
    const starCount = parseInt(priority) || 1;
    const stars = [];
    for (let i = 0; i < 3; i++) {
      stars.push(
        <MaterialIcons
          key={i}
          name="star"
          size={12}
          color={i < starCount ? getPriorityColor(priority) : '#E5E5EA'}
        />
      );
    }
    return stars;
  };

  const stripHtml = (html: string) => {
    if (!html || typeof html !== 'string') return '';

    // Handle the case where content is showing as raw HTML
    let content = html;

    // Handle HTML entities
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&quot;/g, '"');

    // Convert common HTML tags to readable text
    content = content.replace(/<p[^>]*>/g, '');
    content = content.replace(/<\/p>/g, '\n');
    content = content.replace(/<br\s*\/?>/g, '\n');
    content = content.replace(/<div[^>]*>/g, '');
    content = content.replace(/<\/div>/g, '\n');
    content = content.replace(/<strong[^>]*>(.*?)<\/strong>/g, '$1');
    content = content.replace(/<b[^>]*>(.*?)<\/b>/g, '$1');
    content = content.replace(/<em[^>]*>(.*?)<\/em>/g, '$1');
    content = content.replace(/<i[^>]*>(.*?)<\/i>/g, '$1');

    // Remove any remaining HTML tags
    content = content.replace(/<[^>]*>/g, '');

    // Clean up extra whitespace
    content = content.replace(/\n\s*\n/g, '\n').trim();

    return content;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date') return 'Unknown';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
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
    <TouchableOpacity
      key={ticket.id}
      style={styles.ticketCard}
      onPress={() => handleTicketPress(ticket)}
    >
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
          <View style={styles.priorityContainer}>
            <View style={styles.priorityStars}>
              {renderPriorityStars(ticket.priority)}
            </View>
            <Text style={styles.priorityLabel}>{getPriorityLabel(ticket.priority)}</Text>
          </View>

          {/* SLA Badge */}
          {ticket.sla_deadline && (
            <View style={[styles.slaBadge, { backgroundColor: getSLAColor(ticket.sla_status) }]}>
              <Text style={styles.slaText}>{getSLAText(ticket.sla_status)}</Text>
              {formatSLATime(ticket.sla_deadline) && (
                <Text style={styles.slaTime}>{formatSLATime(ticket.sla_deadline)}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(ticket.id);
            }}
          >
            <MaterialIcons
              name={favoriteTickets.has(ticket.id) ? "star" : "star-border"}
              size={20}
              color={favoriteTickets.has(ticket.id) ? "#FFD700" : "#C7C7CC"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {ticket.description && (
        <Text style={styles.ticketDescription} numberOfLines={2}>
          {stripHtml(ticket.description)}
        </Text>
      )}

      <View style={styles.ticketFooter}>
        <Text style={styles.ticketDate}>
          Created: {formatDateTime(ticket.create_date)}
        </Text>
        <Text style={styles.ticketTeam}>
          {ticket.stage_id ? `Stage: ${formatRelationalField(ticket.stage_id)}` :
           ticket.team_id ? `Team: ${formatRelationalField(ticket.team_id)}` : 'No Stage'}
        </Text>
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
      <ScreenBadge screenNumber={601} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Helpdesk</Text>
          <Text style={styles.headerSubtitle}>
            {showFavorites ? 'Favorite tickets' :
             filter === 'all' ? 'All tickets' :
             filter === 'my_tickets' ? 'My tickets' :
             filter === 'new' ? 'New tickets' :
             filter === 'open' ? 'Open tickets' :
             filter === 'urgent' ? 'Urgent tickets' :
             filter === 'assigned' ? 'Assigned tickets' :
             'Closed tickets'} • {getFilteredTickets().length}
          </Text>
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

      {/* Search and Action Bar */}
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

        <View style={styles.actionButtons}>
          {/* My Tickets Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              filter === 'my_tickets' && styles.actionButtonActive
            ]}
            onPress={() => setFilter(filter === 'my_tickets' ? 'open' : 'my_tickets')}
          >
            <MaterialIcons
              name="person"
              size={18}
              color={filter === 'my_tickets' ? "#FFFFFF" : "#007AFF"}
            />
          </TouchableOpacity>

          {/* Favorites Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              showFavorites && styles.actionButtonActive
            ]}
            onPress={() => setShowFavorites(!showFavorites)}
          >
            <MaterialIcons
              name={showFavorites ? "star" : "star-border"}
              size={18}
              color={showFavorites ? "#FFFFFF" : "#007AFF"}
            />
          </TouchableOpacity>

          {/* Filter Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              (filter !== 'open' && filter !== 'my_tickets') && styles.actionButtonActive
            ]}
            onPress={() => setShowFilterSheet(true)}
          >
            <MaterialIcons
              name="filter-list"
              size={18}
              color={(filter !== 'open' && filter !== 'my_tickets') ? "#FFFFFF" : "#007AFF"}
            />
          </TouchableOpacity>

          {/* Saved Filters Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowSavedFiltersSheet(true)}
          >
            <MaterialIcons
              name="bookmark"
              size={18}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>
      </View>



      {/* Tickets List */}
      <ScrollView
        style={styles.ticketsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {getFilteredTickets().map(renderTicketCard)}

        {getFilteredTickets().length === 0 && (
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
      <HelpdeskFilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        onSaveFilter={(name, filters) => {
          console.log('Saving filter:', name, filters);
          // Could show a success message here
        }}
        onLoadFilter={(filters) => {
          setAdvancedFilters(filters);
          setShowFilterSheet(false);
        }}
      />

      {/* Saved Filters Bottom Sheet */}
      <SavedFiltersBottomSheet
        visible={showSavedFiltersSheet}
        onClose={() => setShowSavedFiltersSheet(false)}
        onSelectFilter={(filters) => {
          setAdvancedFilters(filters);
          console.log('Loaded saved filter:', filters);
        }}
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#007AFF',
  },
  favoriteButton: {
    padding: 4,
  },
  slaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 60,
  },
  slaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  slaTime: {
    fontSize: 9,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 1,
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
  priorityContainer: {
    alignItems: 'center',
    gap: 4,
  },
  priorityStars: {
    flexDirection: 'row',
    gap: 2,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
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
