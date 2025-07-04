/**
 * 602_HelpdeskTicketDetail - Zendesk-style ticket details
 * Screen Number: 602
 * Model: helpdesk.ticket
 * Type: detail
 *
 * MIGRATED: From src/screens/HelpdeskTicketDetailScreen.tsx
 * Zendesk-style ticket details with three-tab structure: Details, Messages, Attachments
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
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
import { authService } from '../../../services/auth';
import { formatRelationalField } from '../../../utils/relationalFieldUtils';
import ImprovedChatterComponent from '../../../components/ImprovedChatterComponent';
import HelpdeskWorkflowBottomSheet from '../../../components/HelpdeskWorkflowBottomSheet';
import ScreenBadge from '../../../components/ScreenBadge';

interface HelpdeskTicket {
  id: number;
  name: string;
  description?: string;
  partner_id?: [number, string];
  user_id?: [number, string];
  team_id?: [number, string];
  stage_id?: [number, string];
  priority: '0' | '1' | '2' | '3';
  kanban_state: 'normal' | 'blocked' | 'done';
  active: boolean;
  create_date: string;
  write_date: string;
  close_date?: string;

  [key: string]: any; // For dynamic fields
}

type TabType = 'details' | 'messages' | 'attachments';

export default function HelpdeskTicketDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { ticketId } = route.params as { ticketId: number };
  const screenWidth = Dimensions.get('window').width;

  const [ticket, setTicket] = useState<HelpdeskTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [showWorkflowSheet, setShowWorkflowSheet] = useState(false);
  const [workflowActions, setWorkflowActions] = useState<any[]>([]);

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  const loadTicketDetails = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      // Load ticket details with all available fields
      const ticketData = await client.searchRead('helpdesk.ticket',
        [['id', '=', ticketId]],
        [], // Load all fields
        { limit: 1 }
      );

      if (ticketData.length > 0) {
        setTicket(ticketData[0]);
        await loadWorkflowActions(ticketData[0]);
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error);
      Alert.alert('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowActions = async (ticketData: HelpdeskTicket) => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Load available stages for workflow actions
      const stages = await client.searchRead('helpdesk.stage',
        [],
        ['id', 'name', 'sequence'],
        { order: 'sequence asc' }
      );

      setWorkflowActions(stages);
    } catch (error) {
      console.error('Failed to load workflow actions:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTicketDetails();
    setRefreshing(false);
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case '0': return 'Low';
      case '1': return 'Normal';
      case '2': return 'High';
      case '3': return 'Urgent';
      default: return 'Normal';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '0': return '#34C759'; // Low - Green
      case '1': return '#007AFF'; // Normal - Blue
      case '2': return '#FF9500'; // High - Orange
      case '3': return '#FF3B30'; // Urgent - Red
      default: return '#007AFF';
    }
  };

  const getStatusColor = (kanbanState: string) => {
    switch (kanbanState) {
      case 'done': return '#34C759';
      case 'blocked': return '#FF3B30';
      default: return '#007AFF';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
        onPress={() => setActiveTab('details')}
      >
        <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
          Details
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
        onPress={() => setActiveTab('messages')}
      >
        <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
          Messages
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'attachments' && styles.activeTab]}
        onPress={() => setActiveTab('attachments')}
      >
        <Text style={[styles.tabText, activeTab === 'attachments' && styles.activeTabText]}>
          Attachments
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading ticket details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Ticket not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={602} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket Details</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'details' && (
          <View style={styles.detailsTab}>
            {/* Ticket Header */}
            <View style={styles.ticketHeader}>
              <View style={styles.ticketTitleRow}>
                <Text style={styles.ticketNumber}>Ticket #{ticket.id}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
                  <Text style={styles.priorityText}>{getPriorityLabel(ticket.priority)}</Text>
                </View>
              </View>
              <Text style={styles.ticketTitle}>{ticket.name}</Text>
            </View>

            {/* Ticket Details */}
            <View style={styles.detailsSection}>
              {ticket.partner_id && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="person" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{formatRelationalField(ticket.partner_id)}</Text>
                </View>
              )}

              {ticket.user_id && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="assignment-ind" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Assigned to:</Text>
                  <Text style={styles.detailValue}>{formatRelationalField(ticket.user_id)}</Text>
                </View>
              )}

              {ticket.team_id && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="group" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Team:</Text>
                  <Text style={styles.detailValue}>{formatRelationalField(ticket.team_id)}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <MaterialIcons name="schedule" size={20} color="#666" />
                <Text style={styles.detailLabel}>Created:</Text>
                <Text style={styles.detailValue}>{formatDateTime(ticket.create_date)}</Text>
              </View>

              {ticket.close_date && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="check-circle" size={20} color="#666" />
                  <Text style={styles.detailLabel}>Closed:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(ticket.close_date)}</Text>
                </View>
              )}
            </View>

            {/* Status Section */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <TouchableOpacity
                style={styles.workflowButton}
                onPress={() => setShowWorkflowSheet(true)}
              >
                <Text style={styles.workflowButtonText}>Change Status</Text>
                <MaterialIcons name="arrow-forward-ios" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* Description - FIXED: HTML rendering */}
            {ticket.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>Description</Text>
                <RenderHtml
                  contentWidth={screenWidth - 64}
                  source={{ html: ticket.description }}
                  tagsStyles={{
                    body: {
                      color: '#000',
                      fontSize: 14,
                      lineHeight: 20,
                      margin: 0,
                      padding: 0
                    },
                    p: {
                      marginBottom: 8,
                      color: '#000'
                    },
                    div: {
                      marginBottom: 4
                    },
                    strong: {
                      fontWeight: 'bold',
                      color: '#000'
                    },
                    b: {
                      fontWeight: 'bold',
                      color: '#000'
                    }
                  }}
                  defaultTextProps={{
                    style: { color: '#000' }
                  }}
                />
              </View>
            )}
          </View>
        )}

        {activeTab === 'messages' && ticket && (
          <View style={styles.messagesTab}>
            <ImprovedChatterComponent
              model="helpdesk.ticket"
              recordId={ticket.id}
              recordName={ticket.name}
            />
          </View>
        )}

        {activeTab === 'attachments' && (
          <View style={styles.attachmentsTab}>
            <View style={styles.emptyState}>
              <MaterialIcons name="attach-file" size={64} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No attachments yet</Text>
              <Text style={styles.emptyStateSubtext}>Attachments will appear here</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Workflow Bottom Sheet */}
      <HelpdeskWorkflowBottomSheet
        visible={showWorkflowSheet}
        onClose={() => setShowWorkflowSheet(false)}
        ticketId={ticket.id}
        currentStageId={ticket.stage_id ? ticket.stage_id[0] : undefined}
        workflowActions={workflowActions}
        onActionComplete={loadTicketDetails}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 60,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  detailsTab: {
    padding: 16,
  },
  ticketHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    lineHeight: 24,
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    marginLeft: 8,
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  workflowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  workflowButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  descriptionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  messagesTab: {
    flex: 1,
  },
  attachmentsTab: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
