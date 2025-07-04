/**
 * 651_HelpdeskTeamsList - Professional support team management
 * Screen Number: 651
 * Model: helpdesk.team
 * Type: list
 *
 * MIGRATED: From src/screens/HelpdeskTeamsScreen.tsx
 * Professional support team management
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
import ScreenBadge from '../../../components/ScreenBadge';

interface HelpdeskTeam {
  id: number;
  name: string;
  description?: string;
  user_id?: [number, string];
  member_ids?: number[];
  active: boolean;
  ticket_count?: number;
  color?: number;
  alias_name?: string;
  alias_domain?: string;
}

export default function HelpdeskTeamsScreen() {
  const [teams, setTeams] = useState<HelpdeskTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'managed' | 'member'>('all');

  const { showNavigationDrawer, showUniversalSearch } = useAppNavigation();

  const filters = [
    { id: 'all', name: 'All', icon: 'groups', count: teams.length },
    { id: 'active', name: 'Active', icon: 'check-circle', count: teams.filter(t => t.active).length },
    { id: 'managed', name: 'Managed', icon: 'supervisor-account', count: teams.filter(t => t.user_id).length },
    { id: 'member', name: 'Member', icon: 'person', count: teams.filter(t => t.member_ids && t.member_ids.length > 0).length },
  ];

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const teamData = await client.searchRead('helpdesk.team',
        [],
        ['id', 'name', 'description', 'user_id', 'member_ids', 'active', 'color', 'alias_name', 'alias_domain'],
        { order: 'name asc', limit: 100 }
      );

      setTeams(teamData);
    } catch (error) {
      console.error('Failed to load helpdesk teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTeams();
    setRefreshing(false);
  };

  const getFilteredTeams = () => {
    let filtered = teams;

    // Apply filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(t => t.active);
        break;
      case 'managed':
        filtered = filtered.filter(t => t.user_id);
        break;
      case 'member':
        filtered = filtered.filter(t => t.member_ids && t.member_ids.length > 0);
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.user_id?.[1]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getTeamColor = (colorIndex?: number) => {
    const colors = [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#9C27B0',
      '#00BCD4', '#4CAF50', '#FFC107', '#E91E63', '#673AB7'
    ];
    return colors[colorIndex || 0] || '#007AFF';
  };

  const renderTeamCard = (team: HelpdeskTeam) => (
    <TouchableOpacity key={team.id} style={styles.teamCard}>
      <View style={styles.teamHeader}>
        <View style={[styles.teamIcon, { backgroundColor: getTeamColor(team.color) + '15' }]}>
          <MaterialIcons 
            name="groups" 
            size={24} 
            color={getTeamColor(team.color)} 
          />
        </View>
        
        <View style={styles.teamInfo}>
          <Text style={styles.teamName} numberOfLines={1}>
            {team.name}
          </Text>
          {team.user_id && (
            <Text style={styles.teamManager} numberOfLines={1}>
              Manager: {team.user_id[1]}
            </Text>
          )}
          <Text style={styles.teamMembers}>
            {team.member_ids?.length || 0} members
          </Text>
        </View>

        <View style={styles.teamMeta}>
          {!team.active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
          <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
      </View>

      {team.description && (
        <Text style={styles.teamDescription} numberOfLines={2}>
          {team.description}
        </Text>
      )}

      <View style={styles.teamFooter}>
        {team.alias_name && (
          <View style={styles.emailInfo}>
            <MaterialIcons name="email" size={14} color="#666" />
            <Text style={styles.emailText}>
              {team.alias_name}@{team.alias_domain || 'company.com'}
            </Text>
          </View>
        )}
        
        <View style={styles.teamStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="support" size={14} color="#666" />
            <Text style={styles.statText}>{team.ticket_count || 0} tickets</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredTeams = getFilteredTeams();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={651} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Helpdesk Teams</Text>
          <Text style={styles.headerSubtitle}>Support team management</Text>
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
            placeholder="Search teams..."
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
              size={14}
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

      {/* Teams List */}
      <ScrollView
        style={styles.teamsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredTeams.map(renderTeamCard)}

        {filteredTeams.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="groups" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No teams found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No helpdesk teams available'}
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
    backgroundColor: '#AF52DE',
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
    color: '#AF52DE',
  },
  teamsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  teamCard: {
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
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teamIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  teamMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCountText: {
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
