/**
 * User Detail Bottom Sheet Component
 * Shows detailed user information and actions
 */

import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { formatRelationalField } from '../utils/relationalFieldUtils';

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

interface UserDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserDetailBottomSheet({
  visible,
  onClose,
  user,
}: UserDetailBottomSheetProps) {
  // Bottom sheet refs and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []); // Start at 60%, expand to 90%

  // Handle visibility changes
  useEffect(() => {
    if (visible && user) {
      bottomSheetRef.current?.snapToIndex(0); // Open to first snap point (60%)
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, user]);

  // Bottom sheet callbacks
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const handleEmailPress = () => {
    if (user?.email) {
      Linking.openURL(`mailto:${user.email}`);
    }
  };

  const handleScheduleMeeting = () => {
    console.log('Schedule meeting with user:', user?.name);
    // TODO: Implement calendar integration
  };

  const handleAssignTask = () => {
    console.log('Assign task to user:', user?.name);
    // TODO: Implement task assignment
  };

  const handleAddNote = () => {
    console.log('Add note for user:', user?.name);
    // TODO: Implement note creation
  };

  if (!user) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Start closed
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
    >
      <BottomSheetView style={styles.bottomSheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>User Details</Text>
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.close()}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <BottomSheetScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: user.active ? '#007AFF' : '#999' }]}>
            <MaterialIcons name="person" size={32} color="#FFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userLogin}>@{user.login}</Text>
            {user.company_id && (
              <Text style={styles.company}>{formatRelationalField(user.company_id)}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: user.active ? '#34C759' : '#999' }]}>
              <Text style={styles.statusText}>
                {user.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Actions */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactActions}>
            {user.email && (
              <TouchableOpacity style={styles.contactButton} onPress={handleEmailPress}>
                <MaterialIcons name="email" size={20} color="#007AFF" />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.contactButton}>
              <MaterialIcons name="chat" size={20} color="#34C759" />
              <Text style={styles.contactButtonText}>Chatter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Information</Text>
          
          {user.email && (
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#666" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          )}
          
          {user.company_id && (
            <View style={styles.infoRow}>
              <MaterialIcons name="business" size={20} color="#666" />
              <Text style={styles.infoLabel}>Company</Text>
              <Text style={styles.infoValue}>{formatRelationalField(user.company_id)}</Text>
            </View>
          )}
          
          {user.tz && (
            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={20} color="#666" />
              <Text style={styles.infoLabel}>Timezone</Text>
              <Text style={styles.infoValue}>{user.tz}</Text>
            </View>
          )}
          
          {user.lang && (
            <View style={styles.infoRow}>
              <MaterialIcons name="language" size={20} color="#666" />
              <Text style={styles.infoLabel}>Language</Text>
              <Text style={styles.infoValue}>{user.lang}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color="#666" />
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>#{user.id}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleScheduleMeeting}>
            <MaterialIcons name="event" size={20} color="#FF9500" />
            <Text style={styles.actionText}>Schedule Meeting</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleAssignTask}>
            <MaterialIcons name="assignment" size={20} color="#FF9500" />
            <Text style={styles.actionText}>Assign Task</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleAddNote}>
            <MaterialIcons name="note-add" size={20} color="#34C759" />
            <Text style={styles.actionText}>Add Note</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#C7C7CC',
    width: 36,
    height: 4,
  },
  bottomSheetContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userLogin: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  contactSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  infoSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  actionsSection: {
    paddingVertical: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
});
