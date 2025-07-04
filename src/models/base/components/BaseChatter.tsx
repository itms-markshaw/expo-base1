/**
 * Base Chatter Component
 * Universal chatter component that works with any Odoo model
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BaseChatterService } from '../services/BaseChatterService';
import { BaseMessage, BaseActivity, BaseAttachment, ChatterConfig } from '../types/BaseChatter';

interface BaseChatterProps {
  modelName: string;
  recordId: number;
  readonly?: boolean;
  config?: Partial<ChatterConfig>;
}

export default function BaseChatter({
  modelName,
  recordId,
  readonly = false,
  config = {},
}: BaseChatterProps) {
  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [activities, setActivities] = useState<BaseActivity[]>([]);
  const [attachments, setAttachments] = useState<BaseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'activities' | 'attachments'>('messages');
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [posting, setPosting] = useState(false);

  const chatterConfig: ChatterConfig = {
    modelName,
    recordId,
    readonly,
    showFollowers: true,
    showActivities: true,
    showAttachments: true,
    allowInternalNotes: true,
    allowEmails: false,
    compactMode: false,
    ...config,
  };

  useEffect(() => {
    loadChatterData();
  }, [modelName, recordId]);

  const loadChatterData = async () => {
    setLoading(true);
    try {
      const [messagesData, activitiesData, attachmentsData] = await Promise.all([
        BaseChatterService.getMessages(modelName, recordId),
        chatterConfig.showActivities ? BaseChatterService.getActivities(modelName, recordId) : [],
        chatterConfig.showAttachments ? BaseChatterService.getAttachments(modelName, recordId) : [],
      ]);

      setMessages(messagesData);
      setActivities(activitiesData);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Failed to load chatter data:', error);
      Alert.alert('Error', 'Failed to load chatter data');
    } finally {
      setLoading(false);
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim() || posting) return;

    setPosting(true);
    try {
      await BaseChatterService.postMessage({
        modelName,
        recordId,
        messageType: isInternal ? 'comment' : 'comment',
        isInternal,
      });

      setNewMessage('');
      setIsInternal(false);
      await loadChatterData(); // Reload to show new message
    } catch (error) {
      console.error('Failed to post message:', error);
      Alert.alert('Error', 'Failed to post message');
    } finally {
      setPosting(false);
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
        onPress={() => setActiveTab('messages')}
      >
        <MaterialIcons name="message" size={20} color={activeTab === 'messages' ? '#007AFF' : '#8E8E93'} />
        <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
          Messages ({messages.length})
        </Text>
      </TouchableOpacity>

      {chatterConfig.showActivities && (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activities' && styles.activeTab]}
          onPress={() => setActiveTab('activities')}
        >
          <MaterialIcons name="event-note" size={20} color={activeTab === 'activities' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'activities' && styles.activeTabText]}>
            Activities ({activities.length})
          </Text>
        </TouchableOpacity>
      )}

      {chatterConfig.showAttachments && (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attachments' && styles.activeTab]}
          onPress={() => setActiveTab('attachments')}
        >
          <MaterialIcons name="attach-file" size={20} color={activeTab === 'attachments' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'attachments' && styles.activeTabText]}>
            Files ({attachments.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMessage = (message: BaseMessage) => (
    <View key={message.id} style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={styles.messageAuthor}>
          <View style={styles.authorAvatar}>
            <MaterialIcons name="person" size={16} color="#FFF" />
          </View>
          <View>
            <Text style={styles.authorName}>
              {Array.isArray(message.author_id) ? message.author_id[1] : 'Unknown'}
            </Text>
            <Text style={styles.messageDate}>
              {new Date(message.date).toLocaleDateString()} {new Date(message.date).toLocaleTimeString()}
            </Text>
          </View>
        </View>
        {message.is_internal && (
          <View style={styles.internalBadge}>
            <Text style={styles.internalBadgeText}>Internal</Text>
          </View>
        )}
      </View>
      <Text style={styles.messageBody}>{message.body.replace(/<[^>]*>/g, '')}</Text>
    </View>
  );

  const renderActivity = (activity: BaseActivity) => (
    <View key={activity.id} style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <MaterialIcons 
          name={activity.state === 'overdue' ? 'warning' : activity.state === 'today' ? 'today' : 'schedule'} 
          size={20} 
          color={activity.state === 'overdue' ? '#FF3B30' : activity.state === 'today' ? '#FF9500' : '#007AFF'} 
        />
        <View style={styles.activityInfo}>
          <Text style={styles.activitySummary}>{activity.summary}</Text>
          <Text style={styles.activityDetails}>
            {Array.isArray(activity.activity_type_id) ? activity.activity_type_id[1] : 'Activity'} • 
            Due: {new Date(activity.date_deadline).toLocaleDateString()}
          </Text>
        </View>
      </View>
      {activity.note && (
        <Text style={styles.activityNote}>{activity.note}</Text>
      )}
    </View>
  );

  const renderAttachment = (attachment: BaseAttachment) => (
    <View key={attachment.id} style={styles.attachmentCard}>
      <MaterialIcons name="attach-file" size={24} color="#007AFF" />
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentName}>{attachment.name}</Text>
        <Text style={styles.attachmentDetails}>
          {(attachment.file_size / 1024).toFixed(1)} KB • {new Date(attachment.create_date).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity style={styles.attachmentAction}>
        <MaterialIcons name="download" size={20} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const renderComposer = () => {
    if (readonly) return null;

    return (
      <View style={styles.composer}>
        <View style={styles.composerHeader}>
          <TouchableOpacity
            style={[styles.composerToggle, !isInternal && styles.activeComposerToggle]}
            onPress={() => setIsInternal(false)}
          >
            <Text style={[styles.composerToggleText, !isInternal && styles.activeComposerToggleText]}>
              Comment
            </Text>
          </TouchableOpacity>
          {chatterConfig.allowInternalNotes && (
            <TouchableOpacity
              style={[styles.composerToggle, isInternal && styles.activeComposerToggle]}
              onPress={() => setIsInternal(true)}
            >
              <Text style={[styles.composerToggleText, isInternal && styles.activeComposerToggleText]}>
                Internal Note
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.composerInput}>
          <TextInput
            style={styles.messageInput}
            placeholder={isInternal ? "Add an internal note..." : "Write a message..."}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || posting) && styles.sendButtonDisabled]}
            onPress={handlePostMessage}
            disabled={!newMessage.trim() || posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chatter...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'messages':
        return (
          <ScrollView style={styles.content}>
            {messages.length > 0 ? (
              messages.map(renderMessage)
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="message" size={48} color="#C7C7CC" />
                <Text style={styles.emptyText}>No messages yet</Text>
              </View>
            )}
          </ScrollView>
        );

      case 'activities':
        return (
          <ScrollView style={styles.content}>
            {activities.length > 0 ? (
              activities.map(renderActivity)
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-note" size={48} color="#C7C7CC" />
                <Text style={styles.emptyText}>No activities scheduled</Text>
              </View>
            )}
          </ScrollView>
        );

      case 'attachments':
        return (
          <ScrollView style={styles.content}>
            {attachments.length > 0 ? (
              attachments.map(renderAttachment)
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="attach-file" size={48} color="#C7C7CC" />
                <Text style={styles.emptyText}>No attachments</Text>
              </View>
            )}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderTabBar()}
      {renderContent()}
      {renderComposer()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#C7C7CC',
    marginTop: 12,
  },
  messageCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  messageAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  messageDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  internalBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  internalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  messageBody: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activitySummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  activityDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  activityNote: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
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
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  attachmentDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  attachmentAction: {
    padding: 8,
  },
  composer: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    padding: 16,
  },
  composerHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  composerToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  activeComposerToggle: {
    backgroundColor: '#007AFF',
  },
  composerToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeComposerToggleText: {
    color: '#FFF',
  },
  composerInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
});
