/**
 * 401_UsersList - User management and administration interface
 * Screen Number: 401
 * Model: res.users
 * Type: list
 *
 * MIGRATED: From src/screens/UsersScreen.tsx
 * User management and administration interface
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
import FilterBottomSheet from '../../../components/FilterBottomSheet';
import UserDetailBottomSheet from '../../../components/UserDetailBottomSheet';
import ScreenBadge from '../../../components/ScreenBadge';

interface User {
  id: number;
  name: string;
  login: string;
  email?: string;
  active: boolean;
  partner_id?: [number, string];
  groups_id?: number[];
  company_id?: [number, string];
  tz?: string;
  lang?: string;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'admin'>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

  const filters = [
    { id: 'all', name: 'All Users', icon: 'people', count: users.length },
    { id: 'active', name: 'Active', icon: 'check-circle', count: users.filter(u => u.active).length },
    { id: 'inactive', name: 'Inactive', icon: 'cancel', count: users.filter(u => !u.active).length },
    { id: 'admin', name: 'Administrators', icon: 'admin-panel-settings', count: 0 }, // Would need to check groups
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const userData = await client.searchRead('res.users',
        [],
        ['id', 'name', 'login', 'email', 'active', 'partner_id', 'company_id', 'tz', 'lang'],
        { order: 'name asc', limit: 100 }
      );

      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const getFilteredUsers = () => {
    let filtered = users;

    // Apply filter
    if (filter === 'active') {
      filtered = filtered.filter(user => user.active);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(user => !user.active);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const renderUserCard = (user: User) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userCard}
      onPress={() => handleUserPress(user)}
    >
      <View style={styles.userHeader}>
        <View style={[styles.userAvatar, { backgroundColor: user.active ? '#007AFF' : '#999' }]}>
          <MaterialIcons name="person" size={24} color="#FFF" />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userLogin}>@{user.login}</Text>
          {user.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>

        <View style={styles.userMeta}>
          <View style={[styles.statusBadge, { backgroundColor: user.active ? '#34C759' : '#999' }]}>
            <Text style={styles.statusText}>
              {user.active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredUsers = getFilteredUsers();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={401} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Users</Text>
          <Text style={styles.headerSubtitle}>
            {filter === 'all' ? 'All users' :
             filter === 'active' ? 'Active users' :
             filter === 'inactive' ? 'Inactive users' :
             'Administrator users'} • {filteredUsers.length}
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
            <MaterialIcons name="person-add" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
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

      {/* Users List */}
      <ScrollView
        style={styles.usersList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredUsers.map(renderUserCard)}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="manage-accounts" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No users available'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Users"
        filters={filters}
        selectedFilter={filter}
        onFilterSelect={(filterId) => setFilter(filterId as any)}
      />

      {/* User Detail Bottom Sheet */}
      <UserDetailBottomSheet
        visible={showUserDetail}
        onClose={() => {
          setShowUserDetail(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
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
    marginTop: 12,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  userLogin: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  userMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
