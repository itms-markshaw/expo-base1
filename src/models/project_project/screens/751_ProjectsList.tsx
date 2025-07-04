/**
 * 751_ProjectsList - Professional project management interface
 * Screen Number: 751
 * Model: project.project
 * Type: list
 *
 * MIGRATED: From src/screens/ProjectsScreen.tsx
 * Professional project management interface
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
import { authService } from '../../../services/auth';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import FilterBottomSheet from '../../../components/FilterBottomSheet';
import { formatRelationalField } from '../../../utils/relationalFieldUtils';
import ScreenBadge from '../../../components/ScreenBadge';

interface Project {
  id: number;
  name: string;
  description?: string;
  user_id?: [number, string];
  partner_id?: [number, string];
  date_start?: string;
  date?: string;
  state: 'template' | 'draft' | 'open' | 'cancelled' | 'pending' | 'close';
  privacy_visibility: 'portal' | 'employees' | 'followers';
  active: boolean;
  task_count?: number;
  task_ids?: number[];
}

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'open' | 'closed' | 'draft'>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const { showNavigationDrawer } = useAppNavigation();

  const filters = [
    { id: 'all', name: 'All', icon: 'folder', count: projects.length },
    { id: 'active', name: 'Active', icon: 'play-arrow', count: projects.filter(p => p.active).length },
    { id: 'inactive', name: 'Inactive', icon: 'folder-off', count: projects.filter(p => !p.active).length },
    { id: 'recent', name: 'Recent', icon: 'schedule', count: projects.length },
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const projectData = await client.searchRead('project.project',
        [],
        ['id', 'name', 'description', 'user_id', 'partner_id', 'date_start', 'date', 'privacy_visibility', 'active'],
        { order: 'create_date desc', limit: 100 }
      );

      setProjects(projectData);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const getFilteredProjects = () => {
    let filtered = projects;

    // Apply filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(p => p.active);
        break;
      case 'inactive':
        filtered = filtered.filter(p => !p.active);
        break;
      case 'recent':
        // Sort by most recent (assuming newer IDs are more recent)
        filtered = filtered.sort((a, b) => b.id - a.id);
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatRelationalField(project.user_id)?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };



  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'portal': return 'public';
      case 'employees': return 'business';
      case 'followers': return 'group';
      default: return 'visibility';
    }
  };

  const renderProjectCard = (project: Project) => (
    <TouchableOpacity key={project.id} style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={[styles.projectIcon, { backgroundColor: project.active ? '#34C759' + '15' : '#666' + '15' }]}>
          <MaterialIcons
            name={project.active ? 'folder-open' : 'folder'}
            size={24}
            color={project.active ? '#34C759' : '#666'}
          />
        </View>
        
        <View style={styles.projectInfo}>
          <Text style={styles.projectName} numberOfLines={1}>
            {project.name}
          </Text>
          {project.user_id && (
            <Text style={styles.projectManager} numberOfLines={1}>
              Manager: {formatRelationalField(project.user_id, 'Unassigned')}
            </Text>
          )}
          {project.partner_id && (
            <Text style={styles.projectCustomer} numberOfLines={1}>
              Customer: {formatRelationalField(project.partner_id, 'No Customer')}
            </Text>
          )}
        </View>

        <View style={styles.projectMeta}>
          <MaterialIcons
            name={getVisibilityIcon(project.privacy_visibility) as any}
            size={16}
            color="#666"
          />
          <View style={[styles.stateBadge, { backgroundColor: project.active ? '#34C759' : '#666' }]}>
            <Text style={styles.stateBadgeText}>{project.active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </View>

      {project.description && (
        <Text style={styles.projectDescription} numberOfLines={2}>
          {project.description}
        </Text>
      )}

      <View style={styles.projectFooter}>
        <View style={styles.projectDates}>
          {project.date_start && (
            <Text style={styles.dateText}>
              Started: {new Date(project.date_start).toLocaleDateString()}
            </Text>
          )}
          {project.date && (
            <Text style={styles.dateText}>
              Due: {new Date(project.date).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        <View style={styles.projectStats}>
          <View style={styles.taskCount}>
            <MaterialIcons name="assignment" size={14} color="#666" />
            <Text style={styles.taskCountText}>{project.task_count || 0} tasks</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredProjects = getFilteredProjects();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={751} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Projects</Text>
          <Text style={styles.headerSubtitle}>Project management</Text>
        </View>
        <View style={styles.headerActions}>
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
            placeholder="Search projects..."
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
          <Text style={styles.headerTitle}>Projects</Text>
          <Text style={styles.headerSubtitle}>
            {filter === 'all' ? 'All projects' :
             filter === 'active' ? 'Active projects' :
             filter === 'inactive' ? 'Inactive projects' :
             'Recent projects'} • {filteredProjects.length}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterSheet(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Projects List */}
      <ScrollView
        style={styles.projectsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredProjects.map(renderProjectCard)}

        {filteredProjects.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="folder" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No projects found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No projects available'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Projects"
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
  projectsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  projectCard: {
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
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  projectManager: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  projectCustomer: {
    fontSize: 13,
    color: '#666',
  },
  projectMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stateBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  projectDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  projectDates: {
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  projectStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskCountText: {
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
