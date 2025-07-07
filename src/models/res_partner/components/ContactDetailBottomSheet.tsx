/**
 * ContactDetailBottomSheet - Contact detailed view bottom sheet
 * Component Reference: Contact-B-Detail
 * 
 * Following bottomsheet-naming-and-badge-system.md specifications
 * Specialized component for detailed contact information display
 */

import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import ScreenBadge, { getComponentBadges } from '../../../components/ScreenBadge';
import { Contact } from '../types/Contact';

interface ContactDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onChatter?: (contact: Contact) => void;
  onCall?: (contact: Contact) => void;
  onEmail?: (contact: Contact) => void;
}

/**
 * ContactDetailBottomSheet Component
 * 
 * Features:
 * - Comprehensive contact information display
 * - Contact photo and company logo
 * - Address and location information
 * - Communication preferences
 * - Tags and categories
 * - Related contacts and companies
 * - Quick action buttons
 */
export default function ContactDetailBottomSheet({
  visible,
  onClose,
  contact,
  onEdit,
  onChatter,
  onCall,
  onEmail
}: ContactDetailBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%', '95%'], []);

  // Format address
  const getFormattedAddress = () => {
    const parts = [
      contact.street,
      contact.street2,
      contact.city,
      contact.state_id?.[1],
      contact.zip,
      contact.country_id?.[1]
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Get contact type info
  const getContactTypeInfo = () => {
    if (contact.is_company) {
      return { type: 'Company', icon: 'business', color: '#007AFF' };
    }
    if (contact.supplier_rank > 0) {
      return { type: 'Supplier', icon: 'local-shipping', color: '#FF9500' };
    }
    if (contact.customer_rank > 0) {
      return { type: 'Customer', icon: 'person', color: '#34C759' };
    }
    return { type: 'Contact', icon: 'person', color: '#8E8E93' };
  };

  const contactTypeInfo = getContactTypeInfo();

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={visible ? 0 : -1}
        snapPoints={snapPoints}
        onChange={(index) => index === -1 && onClose()}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {contact.image_1920 ? (
                <Image source={{ uri: contact.image_1920 }} style={styles.contactImage} />
              ) : (
                <View style={[styles.contactImagePlaceholder, { backgroundColor: contactTypeInfo.color }]}>
                  <MaterialIcons name={contactTypeInfo.icon} size={32} color="#FFFFFF" />
                </View>
              )}
              
              <View style={styles.headerInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                {contact.function && (
                  <Text style={styles.contactFunction}>{contact.function}</Text>
                )}
                <View style={styles.contactTypeBadge}>
                  <MaterialIcons name={contactTypeInfo.icon} size={14} color={contactTypeInfo.color} />
                  <Text style={[styles.contactTypeText, { color: contactTypeInfo.color }]}>
                    {contactTypeInfo.type}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              {contact.phone && onCall && (
                <TouchableOpacity style={styles.quickActionButton} onPress={() => onCall(contact)}>
                  <MaterialIcons name="phone" size={20} color="#34C759" />
                </TouchableOpacity>
              )}
              {contact.email && onEmail && (
                <TouchableOpacity style={styles.quickActionButton} onPress={() => onEmail(contact)}>
                  <MaterialIcons name="email" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}
              {onChatter && (
                <TouchableOpacity style={styles.quickActionButton} onPress={() => onChatter(contact)}>
                  <MaterialIcons name="chat" size={20} color="#FF9500" />
                </TouchableOpacity>
              )}
              {onEdit && (
                <TouchableOpacity style={styles.quickActionButton} onPress={() => onEdit(contact)}>
                  <MaterialIcons name="edit" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {contact.phone && (
              <View style={styles.infoRow}>
                <MaterialIcons name="phone" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{contact.phone}</Text>
                </View>
              </View>
            )}

            {contact.mobile && (
              <View style={styles.infoRow}>
                <MaterialIcons name="smartphone" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Mobile</Text>
                  <Text style={styles.infoValue}>{contact.mobile}</Text>
                </View>
              </View>
            )}

            {contact.email && (
              <View style={styles.infoRow}>
                <MaterialIcons name="email" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{contact.email}</Text>
                </View>
              </View>
            )}

            {contact.website && (
              <View style={styles.infoRow}>
                <MaterialIcons name="language" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Website</Text>
                  <Text style={styles.infoValue}>{contact.website}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Address Information */}
          {getFormattedAddress() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>{getFormattedAddress()}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Company Information */}
          {contact.parent_id && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company</Text>
              <View style={styles.infoRow}>
                <MaterialIcons name="business" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>{contact.parent_id[1]}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tags */}
          {contact.category_id && contact.category_id.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {contact.category_id.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag[1]}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Additional Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            {contact.vat && (
              <View style={styles.infoRow}>
                <MaterialIcons name="receipt" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>VAT</Text>
                  <Text style={styles.infoValue}>{contact.vat}</Text>
                </View>
              </View>
            )}

            {contact.lang && (
              <View style={styles.infoRow}>
                <MaterialIcons name="language" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Language</Text>
                  <Text style={styles.infoValue}>{contact.lang}</Text>
                </View>
              </View>
            )}

            {contact.tz && (
              <View style={styles.infoRow}>
                <MaterialIcons name="schedule" size={20} color="#8E8E93" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Timezone</Text>
                  <Text style={styles.infoValue}>{contact.tz}</Text>
                </View>
              </View>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Enhanced Badge System */}
      <ScreenBadge 
        {...getComponentBadges(
          ['BC-B002'], // Base BottomSheet specialized
          ['ContactService', 'DetailService'],
          { layout: 'minimal', position: 'top-left' }
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#E5E5EA',
    width: 40,
    height: 4,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  contactImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  contactImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  contactFunction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  contactTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  contactTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
});
