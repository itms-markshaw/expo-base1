/**
 * Improved Chatter Component - HTML Rendering + Clickable @ Button
 * Features: Proper HTML display, clickable @ button, typing @ detection
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../models/base/services/BaseAuthService';
import WorkflowActionsComponent from './WorkflowActionsComponent';

const { width: screenWidth } = Dimensions.get('window');

interface ImprovedChatterProps {
  model: string;
  recordId: number;
  recordName?: string;
}

interface BasicMessage {
  id: number;
  body: string;
  create_date: string;
  author_id?: [number, string];
  message_type?: string;
}

interface Employee {
  id: number;
  name: string;
  work_email?: string;
  job_title?: string;
  user_id?: [number, string];
}

export default function ImprovedChatterComponent({ model, recordId, recordName }: ImprovedChatterProps) {
  const [messages, setMessages] = useState<BasicMessage[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Message states
  const [messageText, setMessageText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<BasicMessage | null>(null);

  // @mention states
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [isReplyMode, setIsReplyMode] = useState(false);

  // Bottom sheet states
  const [showMessageSheet, setShowMessageSheet] = useState(false);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [showWorkflowActions, setShowWorkflowActions] = useState(false);

  // Refs
  const messageInputRef = useRef<TextInput>(null);
  const replyInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [model, recordId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await loadMessages();
    } catch (error) {
      console.error('Failed to load chatter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Try with model field first
      try {
        const messages = await client.searchRead('mail.message', 
          [
            ['model', '=', model], 
            ['res_id', '=', recordId]
          ], 
          ['id', 'body', 'create_date', 'author_id', 'message_type'], 
          { 
            limit: 20, 
            order: 'create_date desc' 
          }
        );
        setMessages(messages);
      } catch (modelError) {
        // Fallback to res_model field
        const messages = await client.searchRead('mail.message', 
          [
            ['res_model', '=', model], 
            ['res_id', '=', recordId]
          ], 
          ['id', 'body', 'create_date', 'author_id'], 
          { 
            limit: 20, 
            order: 'create_date desc' 
          }
        );
        setMessages(messages);
      }
    } catch (error) {
      console.log('⚠️ Could not load messages:', error.message);
      setMessages([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const employees = await client.searchRead('hr.employee', 
        [['active', '=', true]], 
        ['id', 'name', 'work_email', 'job_title', 'user_id'], 
        { 
          limit: 100,
          order: 'name asc' 
        }
      );

      setEmployees(employees);
    } catch (error) {
      console.log('⚠️ Could not load employees:', error.message);
      setEmployees([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMessageTap = (message: BasicMessage) => {
    setSelectedMessage(message);
    setIsReplyMode(true);
    setShowMessageDetail(true);
  };

  // Handle @ button click
  const handleAtButtonPress = (isReply: boolean = false) => {
    const currentText = isReply ? replyText : messageText;
    const newText = currentText + '@';
    
    if (isReply) {
      setReplyText(newText);
      replyInputRef.current?.focus();
    } else {
      setMessageText(newText);
      messageInputRef.current?.focus();
    }
    
    // Trigger mention popup
    setMentionQuery('');
    setMentionStartIndex(newText.length - 1);
    setIsReplyMode(isReply);
    setFilteredEmployees(employees.slice(0, 5));
    setShowMentionPopup(true);
  };

  // Enhanced text change handler
  const handleTextChange = (text: string, isReply: boolean = false) => {
    if (isReply) {
      setReplyText(text);
    } else {
      setMessageText(text);
    }

    // Check for @ symbol
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by space
      const charBeforeAt = lastAtIndex > 0 ? text[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        // Extract query after @
        const afterAt = text.substring(lastAtIndex + 1);
        const spaceIndex = afterAt.indexOf(' ');
        const query = spaceIndex === -1 ? afterAt : afterAt.substring(0, spaceIndex);
        
        // Only show popup if we're still typing the mention
        if (spaceIndex === -1 || text.length === lastAtIndex + 1 + spaceIndex) {
          setMentionQuery(query.toLowerCase());
          setMentionStartIndex(lastAtIndex);
          setIsReplyMode(isReply);
          
          // Filter employees
          const filtered = employees.filter(emp => 
            emp.name.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 5);
          
          setFilteredEmployees(filtered);
          setShowMentionPopup(true);
          return;
        }
      }
    }
    
    // Hide popup if no @ or conditions not met
    setShowMentionPopup(false);
  };

  const handleMentionSelect = (employee: Employee) => {
    const currentText = isReplyMode ? replyText : messageText;
    
    // Replace the @query with @username
    const beforeMention = currentText.substring(0, mentionStartIndex);
    const afterMention = currentText.substring(mentionStartIndex + 1 + mentionQuery.length);
    const newText = `${beforeMention}@${employee.name} ${afterMention}`;
    
    if (isReplyMode) {
      setReplyText(newText);
      replyInputRef.current?.focus();
    } else {
      setMessageText(newText);
      messageInputRef.current?.focus();
    }
    
    setShowMentionPopup(false);
  };

  const handlePostMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Format message with HTML mentions
      let formattedMessage = formatMentions(messageText);

      await client.callModel(model, 'message_post', [recordId], {
        body: formattedMessage,
      });

      setMessageText('');
      setShowMessageSheet(false);
      await loadData();
      Alert.alert('Success', 'Message posted successfully');
    } catch (error) {
      console.error('Failed to post message:', error);
      Alert.alert('Error', 'Failed to post message');
    }
  };

  const handleReplyToMessage = async () => {
    if (!replyText.trim() || !selectedMessage) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Format reply with mentions
      let formattedReply = formatMentions(replyText);
      const originalPreview = stripHtml(selectedMessage.body).substring(0, 50);
      const replyBody = `<p><strong>Reply to:</strong> ${originalPreview}...</p><p>${formattedReply}</p>`;

      await client.callModel(model, 'message_post', [recordId], {
        body: replyBody,
      });

      setReplyText('');
      setShowMessageDetail(false);
      await loadData();
      Alert.alert('Success', 'Reply posted successfully');
    } catch (error) {
      console.error('Failed to post reply:', error);
      Alert.alert('Error', 'Failed to post reply');
    }
  };

  const formatMentions = (text: string): string => {
    let formattedText = text;
    
    // Find all @mentions and convert to HTML
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1];
      const employee = employees.find(emp => 
        emp.name.toLowerCase() === mentionName.toLowerCase()
      );
      
      if (employee && employee.user_id) {
        const htmlMention = `<a href="#" data-oe-model="res.users" data-oe-id="${employee.user_id[0]}">@${employee.name}</a>`;
        formattedText = formattedText.replace(`@${mentionName}`, htmlMention);
      }
    }
    
    return formattedText;
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const renderHtmlContent = (html: string) => {
    if (!html || typeof html !== 'string') {
      return 'No content';
    }

    // Handle the case where message body is showing as "a" - this might be a data issue
    if (html.trim() === 'a' || html.trim().length <= 2) {
      return 'Message content unavailable';
    }

    // Simple HTML to React Native conversion
    let content = html;

    // Handle HTML entities first
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
    content = content.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    content = content.replace(/<em>(.*?)<\/em>/g, '*$1*');
    content = content.replace(/<b>(.*?)<\/b>/g, '**$1**');
    content = content.replace(/<i>(.*?)<\/i>/g, '*$1*');

    // Handle @mentions - extract just the name
    content = content.replace(/<a[^>]*data-oe-model="res\.users"[^>]*>@([^<]+)<\/a>/g, '@$1');

    // Handle other links
    content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '$2 ($1)');

    // Remove any remaining HTML tags
    content = content.replace(/<[^>]*>/g, '');

    // Clean up extra whitespace
    content = content.replace(/\n\s*\n/g, '\n').trim();

    return content || 'No content available';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderMentionPopup = () => {
    if (!showMentionPopup || filteredEmployees.length === 0) return null;

    return (
      <View style={styles.mentionPopup}>
        <Text style={styles.mentionPopupTitle}>Select user to mention:</Text>
        <ScrollView style={styles.mentionList} keyboardShouldPersistTaps="handled">
          {filteredEmployees.map((employee) => (
            <TouchableOpacity
              key={employee.id}
              style={styles.mentionItem}
              onPress={() => handleMentionSelect(employee)}
            >
              <MaterialIcons name="person" size={20} color="#666" />
              <View style={styles.mentionInfo}>
                <Text style={styles.mentionName}>{employee.name}</Text>
                {employee.job_title && (
                  <Text style={styles.mentionTitle}>{employee.job_title}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {recordName || `${model}:${recordId}`}
        </Text>
        <Text style={styles.subtitle}>
          {messages.length} messages • Tap @ or type @ to mention users
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowMessageSheet(true)}
        >
          <MaterialIcons name="add-comment" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Add Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.workflowButton]}
          onPress={() => setShowWorkflowActions(true)}
        >
          <MaterialIcons name="settings" size={20} color="#FF9500" />
          <Text style={[styles.actionButtonText, styles.workflowButtonText]}>Actions</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Messages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Messages (Tap to reply)</Text>
          {messages.map((message) => (
            <TouchableOpacity
              key={message.id}
              style={styles.messageCard}
              onPress={() => handleMessageTap(message)}
            >
              <View style={styles.messageHeader}>
                <Text style={styles.messageAuthor}>
                  {message.author_id ? message.author_id[1] : 'System'}
                </Text>
                <View style={styles.messageActions}>
                  <Text style={styles.messageDate}>
                    {formatDateTime(message.create_date)}
                  </Text>
                  <MaterialIcons name="reply" size={16} color="#666" />
                </View>
              </View>
              <Text style={styles.messageBody} numberOfLines={3}>
                {renderHtmlContent(message.body)}
              </Text>
              {message.message_type && (
                <View style={styles.messageTypeBadge}>
                  <Text style={styles.messageTypeText}>{message.message_type}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="message" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Message Composer Modal */}
      <Modal
        visible={showMessageSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMessageSheet(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMessageSheet(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Message</Text>
            <TouchableOpacity onPress={handlePostMessage}>
              <Text style={styles.sendButton}>Send</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Message:</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                ref={messageInputRef}
                style={styles.textInput}
                placeholder="Type your message... Use @ to mention users"
                value={messageText}
                onChangeText={(text) => handleTextChange(text, false)}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              
              <TouchableOpacity
                style={styles.atButton}
                onPress={() => handleAtButtonPress(false)}
              >
                <Text style={styles.atButtonText}>@</Text>
              </TouchableOpacity>
            </View>
            
            {renderMentionPopup()}
          </View>
        </View>
      </Modal>

      {/* Reply Modal */}
      <Modal
        visible={showMessageDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMessageDetail(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMessageDetail(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Reply to Message</Text>
            <TouchableOpacity onPress={handleReplyToMessage}>
              <Text style={styles.sendButton}>Send Reply</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedMessage && (
              <>
                {/* Original Message with HTML rendering */}
                <View style={styles.originalMessage}>
                  <Text style={styles.originalMessageAuthor}>
                    {selectedMessage.author_id ? selectedMessage.author_id[1] : 'System'}
                  </Text>
                  <Text style={styles.originalMessageDate}>
                    {formatDateTime(selectedMessage.create_date)}
                  </Text>
                  <Text style={styles.originalMessageBody}>
                    {renderHtmlContent(selectedMessage.body)}
                  </Text>
                </View>

                {/* Reply Input */}
                <Text style={styles.inputLabel}>Your Reply:</Text>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={replyInputRef}
                    style={styles.textInput}
                    placeholder="Type your reply... Use @ to mention users"
                    value={replyText}
                    onChangeText={(text) => handleTextChange(text, true)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  
                  <TouchableOpacity
                    style={styles.atButton}
                    onPress={() => handleAtButtonPress(true)}
                  >
                    <Text style={styles.atButtonText}>@</Text>
                  </TouchableOpacity>
                </View>
                
                {renderMentionPopup()}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Workflow Actions Modal */}
      <Modal
        visible={showWorkflowActions}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkflowActions(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWorkflowActions(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Workflow Actions</Text>
            <View style={{ width: 60 }} />
          </View>

          <WorkflowActionsComponent
            model={model}
            recordId={recordId}
            recordName={recordName}
            onActionComplete={() => {
              setShowWorkflowActions(false);
              loadData(); // Refresh messages after workflow action
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  workflowButton: {
    backgroundColor: '#FF9500',
    marginLeft: 12,
  },
  workflowButtonText: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  messageCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  messageDate: {
    fontSize: 12,
    color: '#666',
  },
  messageBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messageTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E8',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  messageTypeText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  sendButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    paddingRight: 50,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  atButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  atButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  mentionPopup: {
    position: 'absolute',
    top: 160,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
    zIndex: 1000,
  },
  mentionPopupTitle: {
    fontSize: 12,
    color: '#666',
    padding: 12,
    paddingBottom: 8,
    fontWeight: '600',
  },
  mentionList: {
    maxHeight: 150,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mentionInfo: {
    marginLeft: 8,
    flex: 1,
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  mentionTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  originalMessage: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  originalMessageAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  originalMessageDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  originalMessageBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
