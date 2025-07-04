/**
 * 521_MessagesList - Professional message and communication management
 * Screen Number: 521
 * Model: mail.message
 * Type: list
 *
 * MIGRATED: From src/screens/MessagesScreen.tsx
 * Professional message and communication management
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
import FilterBottomSheet from '../../../components/FilterBottomSheet';
import ScreenBadge from '../../../components/ScreenBadge';

import { formatRelationalField } from '../../../utils/relationalFieldUtils';

interface Message {
  id: number;
  subject?: string;
  body: string;
  date: string;
  author_id?: [number, string];
  email_from?: string;
  message_type: 'email' | 'comment' | 'notification';
  model?: string;
  res_id?: number;
  record_name?: string;
  attachment_ids?: number[];
}

export default function MessagesScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'emails' | 'comments' | 'notifications'>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const { showNavigationDrawer } = useAppNavigation();

  const filters = [
    { id: 'all', name: 'All', icon: 'message', count: messages.length },
    { id: 'emails', name: 'Emails', icon: 'email', count: messages.filter(m => m.message_type === 'email').length },
    { id: 'comments', name: 'Comments', icon: 'comment', count: messages.filter(m => m.message_type === 'comment').length },
    { id: 'notifications', name: 'Alerts', icon: 'notifications', count: messages.filter(m => m.message_type === 'notification').length },
  ];

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const messageData = await client.searchRead('mail.message',
        [],
        ['id', 'subject', 'body', 'date', 'author_id', 'email_from', 'message_type', 'model', 'res_id', 'record_name', 'attachment_ids'],
        { order: 'date desc', limit: 100 }
      );

      setMessages(messageData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const getFilteredMessages = () => {
    let filtered = messages;

    // Apply filter
    switch (filter) {
      case 'emails':
        filtered = filtered.filter(m => m.message_type === 'email');
        break;
      case 'comments':
        filtered = filtered.filter(m => m.message_type === 'comment');
        break;
      case 'notifications':
        filtered = filtered.filter(m => m.message_type === 'notification');
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(message =>
        message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.body?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.author_id?.[1]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'email': return '#007AFF';
      case 'comment': return '#34C759';
      case 'notification': return '#FF9500';
      default: return '#666';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return 'email';
      case 'comment': return 'comment';
      case 'notification': return 'notifications';
      default: return 'message';
    }
  };

  const renderMessageCard = (message: Message) => (
    <TouchableOpacity key={message.id} style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={[styles.messageTypeIcon, { backgroundColor: getMessageTypeColor(message.message_type) + '15' }]}>
          <MaterialIcons 
            name={getMessageTypeIcon(message.message_type) as any} 
            size={20} 
            color={getMessageTypeColor(message.message_type)} 
          />
        </View>
        
        <View style={styles.messageInfo}>
          <Text style={styles.messageSubject} numberOfLines={1}>
            {message.subject || 'No Subject'}
          </Text>
          <Text style={styles.messageAuthor} numberOfLines={1}>
            {formatRelationalField(message.author_id, message.email_from || 'System')}
          </Text>
          <Text style={styles.messageDate}>
            {new Date(message.date).toLocaleDateString()} {new Date(message.date).toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.messageMeta}>
          {message.attachment_ids && message.attachment_ids.length > 0 && (
            <View style={styles.attachmentBadge}>
              <MaterialIcons name="attach-file" size={14} color="#666" />
              <Text style={styles.attachmentCount}>{message.attachment_ids.length}</Text>
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: getMessageTypeColor(message.message_type) }]}>
            <Text style={styles.typeBadgeText}>{message.message_type}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.messageBody} numberOfLines={3}>
        {message.body?.replace(/<[^>]*>/g, '') || 'No content'}
      </Text>

      {message.record_name && (
        <View style={styles.messageContext}>
          <MaterialIcons name="link" size={14} color="#666" />
          <Text style={styles.contextText}>{message.record_name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const filteredMessages = getFilteredMessages();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={521} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>Communications & notifications</Text>
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
            placeholder="Search messages..."
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
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterSheet(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Summary */}
      <View style={styles.filterSummary}>
        <Text style={styles.filterSummaryText}>
          {filter === 'all' ? 'All messages' :
           filter === 'emails' ? 'Email messages' :
           filter === 'comments' ? 'Comments' :
           'Notifications'} • {filteredMessages.length}
        </Text>
      </View>

      {/* Messages List */}
      <ScrollView
        style={styles.messagesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredMessages.map(renderMessageCard)}

        {filteredMessages.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="message" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No messages found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No messages available'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Messages"
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterSummary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterSummaryText: {
    fontSize: 12,
    color: '#666',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginRight: 12,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
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
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  messageCard: {
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
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  messageTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageInfo: {
    flex: 1,
  },
  messageSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  messageAuthor: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  messageDate: {
    fontSize: 11,
    color: '#999',
  },
  messageMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  attachmentCount: {
    fontSize: 11,
    color: '#666',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  messageBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  messageContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  contextText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
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
