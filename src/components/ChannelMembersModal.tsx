import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../models/base/services/BaseAuthService';

interface ChannelMember {
  id: number;
  name: string;
  email?: string;
  is_online?: boolean;
}

interface ChannelMembersModalProps {
  visible: boolean;
  onClose: () => void;
  channelId: number;
  channelName: string;
}

export default function ChannelMembersModal({
  visible,
  onClose,
  channelId,
  channelName
}: ChannelMembersModalProps) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && channelId) {
      loadChannelMembers();
    }
  }, [visible, channelId]);

  const loadChannelMembers = async () => {
    try {
      setLoading(true);
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      // Get channel details with member information
      const channels = await client.searchRead('discuss.channel',
        [['id', '=', channelId]],
        ['channel_member_ids', 'channel_type'],
        { limit: 1 }
      );

      if (channels.length === 0) {
        console.warn('Channel not found:', channelId);
        return;
      }

      const channel = channels[0];
      const memberIds = channel.channel_member_ids || [];

      if (memberIds.length === 0) {
        console.log('No members found for channel:', channelId);
        return;
      }

      // Get member details
      const channelMembers = await client.searchRead('discuss.channel.member',
        [['id', 'in', memberIds]],
        ['partner_id', 'is_pinned'],
        { limit: 100 }
      );

      // Get partner details for each member
      const partnerIds = channelMembers
        .map(member => Array.isArray(member.partner_id) ? member.partner_id[0] : member.partner_id)
        .filter(Boolean);

      if (partnerIds.length === 0) {
        console.log('No partner IDs found for channel members');
        return;
      }

      const partners = await client.searchRead('res.partner',
        [['id', 'in', partnerIds]],
        ['name', 'email', 'is_company'],
        { limit: 100 }
      );

      // Map partners to members
      const membersList: ChannelMember[] = partners
        .filter(partner => !partner.is_company) // Exclude companies
        .map(partner => ({
          id: partner.id,
          name: partner.name,
          email: partner.email || undefined,
          is_online: false // TODO: Add online status if available
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setMembers(membersList);
      console.log(`📱 Loaded ${membersList.length} members for channel ${channelId}`);

    } catch (error) {
      console.error('❌ Failed to load channel members:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMemberItem = ({ item }: { item: ChannelMember }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{item.name}</Text>
          {item.is_online && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        {item.email && (
          <Text style={styles.memberEmail}>{item.email}</Text>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{channelName}</Text>
            <Text style={styles.subtitle}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Members List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading members...</Text>
          </View>
        ) : (
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="group" size={48} color="#C7C7CC" />
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  closeButton: {
    padding: 4,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
