/**
 * Employee Detail Bottom Sheet Component
 * Shows detailed employee information and actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';

interface Employee {
  id: number;
  name: string;
  work_email?: string;
  work_phone?: string;
  job_title?: string;
  department_id?: [number, string];
  parent_id?: [number, string];
  active: boolean;
  employee_type?: string;
}

interface EmployeeDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export default function EmployeeDetailBottomSheet({
  visible,
  onClose,
  employee,
}: EmployeeDetailBottomSheetProps) {
  if (!employee) return null;

  const handleCall = () => {
    if (employee.work_phone) {
      Linking.openURL(`tel:${employee.work_phone}`);
    }
  };

  const handleEmail = () => {
    if (employee.work_email) {
      Linking.openURL(`mailto:${employee.work_email}`);
    }
  };

  const handleMessage = () => {
    if (employee.work_phone) {
      Linking.openURL(`sms:${employee.work_phone}`);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Employee Details"
      height={75}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Employee Header */}
        <View style={styles.employeeHeader}>
          <View style={[styles.avatar, { backgroundColor: employee.active ? '#34C759' : '#999' }]}>
            <MaterialIcons name="person" size={32} color="#FFF" />
          </View>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            {employee.job_title && (
              <Text style={styles.jobTitle}>{employee.job_title}</Text>
            )}
            {employee.department_id && (
              <Text style={styles.department}>{employee.department_id[1]}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: employee.active ? '#34C759' : '#999' }]}>
              <Text style={styles.statusText}>
                {employee.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.actionsGrid}>
            {employee.work_phone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <MaterialIcons name="phone" size={24} color="#34C759" />
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
            )}
            
            {employee.work_email && (
              <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
                <MaterialIcons name="email" size={24} color="#007AFF" />
                <Text style={styles.actionText}>Email</Text>
              </TouchableOpacity>
            )}
            
            {employee.work_phone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                <MaterialIcons name="message" size={24} color="#FF9500" />
                <Text style={styles.actionText}>Message</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="chat" size={24} color="#9C27B0" />
              <Text style={styles.actionText}>Chatter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Information</Text>
          
          {employee.work_email && (
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#666" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{employee.work_email}</Text>
            </View>
          )}
          
          {employee.work_phone && (
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color="#666" />
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{employee.work_phone}</Text>
            </View>
          )}
          
          {employee.department_id && (
            <View style={styles.infoRow}>
              <MaterialIcons name="business" size={20} color="#666" />
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{employee.department_id[1]}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color="#666" />
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>#{employee.id}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.quickAction}>
            <MaterialIcons name="event" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Schedule Meeting</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <MaterialIcons name="assignment" size={20} color="#FF9500" />
            <Text style={styles.quickActionText}>Assign Task</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <MaterialIcons name="note-add" size={20} color="#34C759" />
            <Text style={styles.quickActionText}>Add Note</Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    minWidth: 60,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  quickActionsSection: {
    marginBottom: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
});
