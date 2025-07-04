/**
 * 551_AttachmentsList - Professional file and document management
 * Screen Number: 551
 * Model: ir.attachment
 * Type: list
 *
 * MIGRATED: From src/screens/AttachmentsScreen.tsx
 * Professional file and document management
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
import { BaseFilterSheet } from '../../base/components';
import ScreenBadge from '../../../components/ScreenBadge';

interface Attachment {
  id: number;
  name: string;
  description?: string;
  res_model?: string;
  res_id?: number;
  res_name?: string;
  type: 'binary' | 'url';
  url?: string;
  file_size?: number;
  mimetype?: string;
  create_date: string;
}

export default function AttachmentsScreen() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'images' | 'documents' | 'videos' | 'other'>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const { showNavigationDrawer } = useAppNavigation();

  const filters = [
    { id: 'all', name: 'All', icon: 'attach-file', count: attachments.length },
    { id: 'images', name: 'Images', icon: 'image', count: attachments.filter(a => a.mimetype?.startsWith('image/')).length },
    { id: 'documents', name: 'Docs', icon: 'description', count: attachments.filter(a => a.mimetype?.includes('pdf') || a.mimetype?.includes('document')).length },
    { id: 'videos', name: 'Videos', icon: 'videocam', count: attachments.filter(a => a.mimetype?.startsWith('video/')).length },
  ];

  useEffect(() => {
    loadAttachments();
  }, []);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const attachmentData = await client.searchRead('ir.attachment',
        [],
        ['id', 'name', 'description', 'res_model', 'res_id', 'res_name', 'type', 'url', 'file_size', 'mimetype', 'create_date'],
        { order: 'create_date desc', limit: 100 }
      );

      setAttachments(attachmentData);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAttachments();
    setRefreshing(false);
  };

  const getFilteredAttachments = () => {
    let filtered = attachments;

    // Apply filter
    switch (filter) {
      case 'images':
        filtered = filtered.filter(a => a.mimetype?.startsWith('image/'));
        break;
      case 'documents':
        filtered = filtered.filter(a => a.mimetype?.includes('pdf') || a.mimetype?.includes('document') || a.mimetype?.includes('text'));
        break;
      case 'videos':
        filtered = filtered.filter(a => a.mimetype?.startsWith('video/'));
        break;
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(attachment =>
        attachment.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attachment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attachment.res_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getFileIcon = (mimetype?: string) => {
    if (!mimetype) return 'insert-drive-file';
    
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'videocam';
    if (mimetype.startsWith('audio/')) return 'audiotrack';
    if (mimetype.includes('pdf')) return 'picture-as-pdf';
    if (mimetype.includes('document') || mimetype.includes('word')) return 'description';
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'table-chart';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'slideshow';
    if (mimetype.includes('zip') || mimetype.includes('archive')) return 'archive';
    
    return 'insert-drive-file';
  };

  const getFileColor = (mimetype?: string) => {
    if (!mimetype) return '#666';
    
    if (mimetype.startsWith('image/')) return '#34C759';
    if (mimetype.startsWith('video/')) return '#FF3B30';
    if (mimetype.startsWith('audio/')) return '#9C27B0';
    if (mimetype.includes('pdf')) return '#FF3B30';
    if (mimetype.includes('document') || mimetype.includes('word')) return '#007AFF';
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return '#34C759';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '#FF9500';
    
    return '#666';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderAttachmentCard = (attachment: Attachment) => (
    <TouchableOpacity key={attachment.id} style={styles.attachmentCard}>
      <View style={styles.attachmentHeader}>
        <View style={[styles.fileIcon, { backgroundColor: getFileColor(attachment.mimetype) + '15' }]}>
          <MaterialIcons 
            name={getFileIcon(attachment.mimetype) as any} 
            size={24} 
            color={getFileColor(attachment.mimetype)} 
          />
        </View>
        
        <View style={styles.attachmentInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {attachment.name || 'Unnamed file'}
          </Text>
          <Text style={styles.fileSize}>
            {formatFileSize(attachment.file_size)}
          </Text>
          <Text style={styles.fileDate}>
            {new Date(attachment.create_date).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.attachmentMeta}>
          <View style={[styles.typeBadge, { backgroundColor: getFileColor(attachment.mimetype) }]}>
            <Text style={styles.typeBadgeText}>
              {attachment.mimetype?.split('/')[1]?.toUpperCase() || 'FILE'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
        </View>
      </View>

      {attachment.description && (
        <Text style={styles.fileDescription} numberOfLines={2}>
          {attachment.description}
        </Text>
      )}

      {attachment.res_name && (
        <View style={styles.attachmentContext}>
          <MaterialIcons name="link" size={14} color="#666" />
          <Text style={styles.contextText}>
            {attachment.res_model}: {attachment.res_name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const filteredAttachments = getFilteredAttachments();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading attachments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={551} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Attachments</Text>
          <Text style={styles.headerSubtitle}>Files and documents</Text>
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
            placeholder="Search files..."
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
          <Text style={styles.headerTitle}>Attachments</Text>
          <Text style={styles.headerSubtitle}>
            {filter === 'all' ? 'All files' :
             filter === 'images' ? 'Images' :
             filter === 'documents' ? 'Documents' :
             filter === 'videos' ? 'Videos' :
             'Other files'} • {filteredAttachments.length}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterSheet(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Attachments List */}
      <ScrollView
        style={styles.attachmentsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredAttachments.map((attachment, index) => (
          <TouchableOpacity key={`attachment-${attachment.id}-${index}`} style={styles.attachmentCard}>
            <View style={styles.attachmentHeader}>
              <View style={[styles.fileIcon, { backgroundColor: getFileColor(attachment.mimetype) + '15' }]}>
                <MaterialIcons
                  name={getFileIcon(attachment.mimetype) as any}
                  size={24}
                  color={getFileColor(attachment.mimetype)}
                />
              </View>

              <View style={styles.attachmentInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {attachment.name || 'Unnamed file'}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(attachment.file_size)}
                </Text>
                <Text style={styles.fileDate}>
                  {new Date(attachment.create_date).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.attachmentMeta}>
                <View style={[styles.typeBadge, { backgroundColor: getFileColor(attachment.mimetype) }]}>
                  <Text style={styles.typeBadgeText}>
                    {attachment.mimetype?.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
              </View>
            </View>

            {attachment.description && (
              <Text style={styles.fileDescription} numberOfLines={2}>
                {attachment.description}
              </Text>
            )}

            {attachment.res_name && (
              <View style={styles.attachmentContext}>
                <MaterialIcons name="link" size={14} color="#666" />
                <Text style={styles.contextText}>
                  {attachment.res_model}: {attachment.res_name}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {filteredAttachments.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="attach-file" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No attachments found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No files available'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <BaseFilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Attachments"
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
    paddingVertical: 6,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    gap: 3,
    minWidth: 60,
  },
  filterTabActive: {
    backgroundColor: '#5856D6',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  filterBadge: {
    backgroundColor: '#E5E5E5',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 14,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#FFF',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#5856D6',
  },
  attachmentsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  attachmentCard: {
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
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attachmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  attachmentModel: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  attachmentDescription: {
    fontSize: 13,
    color: '#666',
  },
  attachmentMeta: {
    alignItems: 'flex-end',
    gap: 4,
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
  attachmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  attachmentDates: {
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  attachmentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
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
