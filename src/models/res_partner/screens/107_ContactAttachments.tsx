/**
 * 107_ContactAttachments - Contact attachments view
 * Screen Number: 107
 * Model: res.partner
 * Type: attachments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BaseChatterService } from '../../base/services/BaseChatterService';
import { BaseAttachment } from '../../base/types/BaseChatter';
import { contactService } from '../services/ContactService';
import { Contact } from '../types/Contact';
import ScreenBadge from '../../../components/ScreenBadge';

interface ContactAttachmentsProps {
  contactId: number;
  onBack?: () => void;
  readonly?: boolean;
}

export default function ContactAttachments({
  contactId,
  onBack,
  readonly = false,
}: ContactAttachmentsProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [attachments, setAttachments] = useState<BaseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactData, attachmentsData] = await Promise.all([
        contactService.getContactDetail(contactId),
        BaseChatterService.getAttachments('res.partner', contactId),
      ]);
      
      setContact(contactData);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Failed to load contact attachments:', error);
      Alert.alert('Error', 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUploadAttachment = async () => {
    // In a real implementation, this would open a file picker
    Alert.alert(
      'Upload Attachment',
      'File upload functionality would be implemented here with react-native-document-picker or similar library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Upload',
          onPress: () => simulateUpload(),
        },
      ]
    );
  };

  const simulateUpload = async () => {
    setUploading(true);
    try {
      // Simulate file upload
      const mockFile = {
        name: `Contact_${contact?.name}_Document_${Date.now()}.pdf`,
        data: 'base64_encoded_file_data_here',
        mimetype: 'application/pdf',
      };

      const attachmentId = await BaseChatterService.uploadAttachment(
        'res.partner',
        contactId,
        mockFile
      );

      if (attachmentId) {
        Alert.alert('Success', 'File uploaded successfully');
        await loadData(); // Refresh the list
      } else {
        Alert.alert('Error', 'Failed to upload file');
      }
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachment: BaseAttachment) => {
    Alert.alert(
      'Delete Attachment',
      `Are you sure you want to delete "${attachment.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await BaseChatterService.deleteAttachment(attachment.id);
              if (success) {
                Alert.alert('Success', 'Attachment deleted successfully');
                await loadData(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to delete attachment');
              }
            } catch (error) {
              console.error('Failed to delete attachment:', error);
              Alert.alert('Error', 'Failed to delete attachment');
            }
          },
        },
      ]
    );
  };

  const handleDownloadAttachment = (attachment: BaseAttachment) => {
    // In a real implementation, this would download the file
    Alert.alert(
      'Download Attachment',
      `Download functionality for "${attachment.name}" would be implemented here.`,
      [{ text: 'OK' }]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string): string => {
    if (mimetype.includes('image')) return 'image';
    if (mimetype.includes('pdf')) return 'picture-as-pdf';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'description';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'table-chart';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'slideshow';
    if (mimetype.includes('video')) return 'video-file';
    if (mimetype.includes('audio')) return 'audio-file';
    return 'attach-file';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {contact?.name || 'Contact'} - Attachments
          </Text>
          <Text style={styles.headerSubtitle}>
            {attachments.length} file{attachments.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {!readonly && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUploadAttachment}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <MaterialIcons name="add" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAttachment = ({ item }: { item: BaseAttachment }) => (
    <View style={styles.attachmentCard}>
      <View style={styles.attachmentIcon}>
        <MaterialIcons 
          name={getFileIcon(item.mimetype) as any} 
          size={32} 
          color="#007AFF" 
        />
      </View>
      
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.attachmentDetails}>
          {formatFileSize(item.file_size)} • {new Date(item.create_date).toLocaleDateString()}
        </Text>
        <Text style={styles.attachmentAuthor}>
          Uploaded by {Array.isArray(item.create_uid) ? item.create_uid[1] : 'Unknown'}
        </Text>
      </View>
      
      <View style={styles.attachmentActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDownloadAttachment(item)}
        >
          <MaterialIcons name="download" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        {!readonly && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteAttachment(item)}
          >
            <MaterialIcons name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="attach-file" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No attachments</Text>
      <Text style={styles.emptySubtext}>
        {readonly 
          ? 'This contact has no attachments'
          : 'Upload files to share with this contact'
        }
      </Text>
      {!readonly && (
        <TouchableOpacity
          style={styles.emptyUploadButton}
          onPress={handleUploadAttachment}
        >
          <MaterialIcons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyUploadButtonText}>Upload First File</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading attachments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={attachments}
        renderItem={renderAttachment}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={attachments.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
          <ScreenBadge screenNumber={107} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  uploadButton: {
    padding: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  attachmentIcon: {
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  attachmentDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  attachmentAuthor: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  attachmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  emptyUploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
