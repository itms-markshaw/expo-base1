import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../services/BaseAuthService';

interface User {
  id: number;
  name: string;
  email?: string;
  job_title?: string;
}

interface MentionPickerProps {
  visible: boolean;
  onSelectUser: (user: User) => void;
  searchQuery?: string;
  style?: any;
}

export default function MentionPicker({
  visible,
  onSelectUser,
  searchQuery = '',
  style
}: MentionPickerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      // Load HR employees for mentions
      const employees = await client.searchRead('hr.employee',
        [['active', '=', true]],
        ['name', 'work_email', 'user_id'],
        { limit: 100 }
      );

      // Also load regular users
      const regularUsers = await client.searchRead('res.users',
        [['active', '=', true], ['share', '=', false]],
        ['name', 'email', 'partner_id'],
        { limit: 100 }
      );

      // Combine and deduplicate users
      const allUsers: User[] = [];
      const seenIds = new Set<number>();

      // Add employees first (they have more complete info)
      employees.forEach(emp => {
        if (emp.user_id && !seenIds.has(emp.user_id[0])) {
          allUsers.push({
            id: emp.user_id[0],
            name: emp.name,
            email: emp.work_email || undefined
          });
          seenIds.add(emp.user_id[0]);
        }
      });

      // Add remaining users
      regularUsers.forEach(user => {
        if (!seenIds.has(user.id)) {
          allUsers.push({
            id: user.id,
            name: user.name,
            email: user.email || undefined
          });
          seenIds.add(user.id);
        }
      });

      // Sort by name
      allUsers.sort((a, b) => a.name.localeCompare(b.name));

      setUsers(allUsers);
    } catch (error) {
      console.error('❌ Failed to load users for mentions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users.slice(0, 5)); // Show top 5 when no search
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query))
    ).slice(0, 5); // Limit to 5 results

    setFilteredUsers(filtered);
  };

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleSelectUser(item)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.job_title && (
          <Text style={styles.userTitle}>{item.job_title}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!visible || filteredUsers.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.usersList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usersList: {
    maxHeight: 200,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  userTitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
