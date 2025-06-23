/**
 * Employees Screen
 * Professional employee management interface
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

interface Employee {
  id: number;
  name: string;
  work_email?: string;
  work_phone?: string;
  job_title?: string;
  department_id?: [number, string];
  parent_id?: [number, string]; // Manager field in hr.employee
  active: boolean;
  employee_type?: string;
}

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'managers' | 'departments'>('all');

  const filters = [
    { id: 'all', name: 'All', icon: 'people', count: employees.length },
    { id: 'active', name: 'Active', icon: 'check-circle', count: employees.filter(e => e.active).length },
    { id: 'managers', name: 'Managers', icon: 'supervisor-account', count: employees.filter(e => e.parent_id).length },
    { id: 'departments', name: 'By Dept', icon: 'business', count: new Set(employees.map(e => e.department_id?.[0])).size },
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const employeeData = await client.searchRead('hr.employee',
        [],
        ['id', 'name', 'work_email', 'work_phone', 'job_title', 'department_id', 'active'],
        { order: 'name asc', limit: 100 }
      );

      setEmployees(employeeData);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  const getFilteredEmployees = () => {
    let filtered = employees;

    // Apply filter
    switch (filter) {
      case 'active':
        filtered = filtered.filter(e => e.active);
        break;
      case 'managers':
        // Filter for employees with management roles (simplified)
        filtered = filtered.filter(e => e.job_title?.toLowerCase().includes('manager') || e.job_title?.toLowerCase().includes('director'));
        break;
      case 'departments':
        // Group by department - for now just show all
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(employee =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.work_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.department_id?.[1]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const renderEmployeeCard = (employee: Employee) => (
    <TouchableOpacity key={employee.id} style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={[styles.employeeAvatar, { backgroundColor: employee.active ? '#34C759' : '#999' }]}>
          <MaterialIcons name="person" size={24} color="#FFF" />
        </View>
        
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName} numberOfLines={1}>
            {employee.name}
          </Text>
          {employee.job_title && (
            <Text style={styles.employeeTitle} numberOfLines={1}>
              {employee.job_title}
            </Text>
          )}
          {employee.department_id && (
            <Text style={styles.employeeDepartment} numberOfLines={1}>
              {employee.department_id[1]}
            </Text>
          )}
          {employee.work_email && (
            <Text style={styles.employeeEmail} numberOfLines={1}>
              {employee.work_email}
            </Text>
          )}
        </View>

        <View style={styles.employeeMeta}>
          <View style={[styles.statusBadge, { backgroundColor: employee.active ? '#34C759' : '#999' }]}>
            <Text style={styles.statusText}>
              {employee.active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredEmployees = getFilteredEmployees();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
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

      {/* Employees List */}
      <ScrollView
        style={styles.employeesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredEmployees.map(renderEmployeeCard)}

        {filteredEmployees.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="badge" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No employees found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first employee to get started'}
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
    backgroundColor: '#FF6B35',
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
    color: '#FF6B35',
  },
  employeesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  employeeCard: {
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
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  employeeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 2,
  },
  employeeDepartment: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 12,
    color: '#999',
  },
  employeeMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
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
