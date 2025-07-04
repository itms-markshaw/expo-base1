/**
 * 105_ContactBottomSheet - Contact quick actions bottom sheet
 * Screen Number: 105
 * Model: res.partner
 * Type: bottomsheet
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseBottomSheet from '../../base/components/BaseBottomSheet';
import { Contact } from '../types/Contact';
import { BottomSheetAction } from '../../base/types/BaseModel';
import ScreenBadge from '../../../components/ScreenBadge';

interface ContactBottomSheetProps {
  contact: Contact;
  visible: boolean;
  onClose: () => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  onChatter?: (contact: Contact) => void;
  onActivities?: (contact: Contact) => void;
  onAttachments?: (contact: Contact) => void;
}

export default function ContactBottomSheet({
  contact,
  visible,
  onClose,
  onEdit,
  onDelete,
  onChatter,
  onActivities,
  onAttachments,
}: ContactBottomSheetProps) {

  const handleCall = async () => {
    const phoneNumber = contact.phone || contact.mobile;
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This contact does not have a phone number');
      return;
    }

    const url = `tel:${phoneNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch (error) {
      console.error('Failed to make call:', error);
      Alert.alert('Error', 'Failed to make phone call');
    }
  };

  const handleEmail = async () => {
    if (!contact.email) {
      Alert.alert('No Email', 'This contact does not have an email address');
      return;
    }

    const url = `mailto:${contact.email}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Email is not supported on this device');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      Alert.alert('Error', 'Failed to open email');
    }
  };

  const handleWebsite = async () => {
    if (!contact.website) {
      Alert.alert('No Website', 'This contact does not have a website');
      return;
    }

    let url = contact.website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open website');
      }
    } catch (error) {
      console.error('Failed to open website:', error);
      Alert.alert('Error', 'Failed to open website');
    }
  };

  const getContactActions = (): BottomSheetAction<Contact>[] => {
    const actions: BottomSheetAction<Contact>[] = [];

    // Communication actions
    if (contact.phone || contact.mobile) {
      actions.push({
        id: 'call',
        label: 'Call',
        icon: 'phone',
        color: '#34C759',
        onPress: () => handleCall(),
      });
    }

    if (contact.email) {
      actions.push({
        id: 'email',
        label: 'Email',
        icon: 'email',
        color: '#007AFF',
        onPress: () => handleEmail(),
      });
    }

    if (contact.website) {
      actions.push({
        id: 'website',
        label: 'Website',
        icon: 'language',
        color: '#FF9500',
        onPress: () => handleWebsite(),
      });
    }

    // Chatter actions
    actions.push({
      id: 'chatter',
      label: 'Chatter',
      icon: 'message',
      color: '#007AFF',
      onPress: (contact) => onChatter?.(contact),
    });

    actions.push({
      id: 'activities',
      label: 'Activities',
      icon: 'event-note',
      color: '#FF9500',
      onPress: (contact) => onActivities?.(contact),
    });

    actions.push({
      id: 'attachments',
      label: 'Files',
      icon: 'attach-file',
      color: '#34C759',
      onPress: (contact) => onAttachments?.(contact),
    });

    // Management actions
    actions.push({
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      color: '#007AFF',
      onPress: (contact) => onEdit?.(contact),
    });

    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: '#FF3B30',
      onPress: (contact) => onDelete?.(contact),
    });

    return actions;
  };

  const formatRelationalField = (field: [number, string] | undefined, fallback: string = 'Not set') => {
    return Array.isArray(field) ? field[1] : fallback;
  };

  const getContactBadges = () => {
    const badges = [];
    if (contact.customer_rank > 0) badges.push('Customer');
    if (contact.supplier_rank > 0) badges.push('Supplier');
    if (contact.employee) badges.push('Employee');
    if (!contact.active) badges.push('Inactive');
    return badges;
  };

  const renderContactHeader = () => (
    <View style={styles.contactHeader}>
      <View style={styles.contactAvatar}>
        <MaterialIcons 
          name={contact.is_company ? 'business' : 'person'} 
          size={32} 
          color="#FFF" 
        />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        {contact.function && (
          <Text style={styles.contactFunction}>{contact.function}</Text>
        )}
        {contact.parent_id && !contact.is_company && (
          <Text style={styles.contactCompany}>
            {formatRelationalField(contact.parent_id)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderContactDetails = () => (
    <View style={styles.contactDetails}>
      <Text style={styles.sectionTitle}>Contact Details</Text>
      
      {contact.email && (
        <View style={styles.detailRow}>
          <MaterialIcons name="email" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{contact.email}</Text>
        </View>
      )}
      
      {contact.phone && (
        <View style={styles.detailRow}>
          <MaterialIcons name="phone" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{contact.phone}</Text>
        </View>
      )}
      
      {contact.mobile && (
        <View style={styles.detailRow}>
          <MaterialIcons name="smartphone" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{contact.mobile}</Text>
        </View>
      )}
      
      {contact.city && (
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>
            {contact.city}
            {contact.country_id && `, ${formatRelationalField(contact.country_id)}`}
          </Text>
        </View>
      )}

      {getContactBadges().length > 0 && (
        <View style={styles.badgesContainer}>
          {getContactBadges().map((badge, index) => (
            <View key={index} style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      )}
          <ScreenBadge screenNumber={105} />
    </View>
  );

  return (
    <BaseBottomSheet
      record={contact}
      visible={visible}
      onClose={onClose}
      actions={getContactActions()}
      title={contact.name}
      subtitle={contact.is_company ? 'Company' : 'Individual'}
      headerContent={renderContactHeader()}
      snapPoints={['30%', '60%', '90%']}
    >
      {renderContactDetails()}
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 16,
  },
  contactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  contactFunction: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 2,
  },
  contactCompany: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  contactDetails: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  badge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
});
