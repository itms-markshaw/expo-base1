/**
 * Contact Card Component
 * Individual contact card for list views
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Contact } from '../types/Contact';

interface ContactCardProps {
  contact: Contact;
  onPress: (contact: Contact) => void;
  compact?: boolean;
}

export default function ContactCard({ contact, onPress, compact = false }: ContactCardProps) {
  const getContactTypeIcon = () => {
    if (contact.is_company) return 'business';
    return 'person';
  };

  const getContactTypeColor = () => {
    if (contact.is_company) return '#FF9500';
    return '#007AFF';
  };

  const getContactBadges = () => {
    const badges = [];
    if (contact.customer_rank > 0) badges.push('Customer');
    if (contact.supplier_rank > 0) badges.push('Supplier');
    if (contact.employee) badges.push('Employee');
    return badges;
  };

  const formatRelationalField = (field: [number, string] | undefined, fallback: string = '') => {
    return Array.isArray(field) ? field[1] : fallback;
  };

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.compactCard]}
      onPress={() => onPress(contact)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {contact.image_128 ? (
            <Image
              source={{ uri: `data:image/png;base64,${contact.image_128}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: getContactTypeColor() }]}>
              <MaterialIcons 
                name={getContactTypeIcon() as any} 
                size={compact ? 20 : 24} 
                color="#FFF" 
              />
            </View>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text style={[styles.contactName, compact && styles.compactName]} numberOfLines={1}>
              {contact.name}
            </Text>
            {!contact.active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>

          {/* Contact Details */}
          {!compact && (
            <>
              {contact.email && (
                <View style={styles.contactDetail}>
                  <MaterialIcons name="email" size={14} color="#8E8E93" />
                  <Text style={styles.contactDetailText} numberOfLines={1}>
                    {contact.email}
                  </Text>
                </View>
              )}

              {(contact.phone || contact.mobile) && (
                <View style={styles.contactDetail}>
                  <MaterialIcons name="phone" size={14} color="#8E8E93" />
                  <Text style={styles.contactDetailText} numberOfLines={1}>
                    {contact.phone || contact.mobile}
                  </Text>
                </View>
              )}

              {contact.city && (
                <View style={styles.contactDetail}>
                  <MaterialIcons name="location-on" size={14} color="#8E8E93" />
                  <Text style={styles.contactDetailText} numberOfLines={1}>
                    {contact.city}
                    {contact.country_id && `, ${formatRelationalField(contact.country_id)}`}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Badges */}
          {!compact && getContactBadges().length > 0 && (
            <View style={styles.badgesContainer}>
              {getContactBadges().map((badge, index) => (
                <View key={index} style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              // Handle quick action - could open bottom sheet
              console.log('Quick action for contact:', contact.id);
            }}
          >
            <MaterialIcons name="more-vert" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Company Info for individuals */}
      {!compact && !contact.is_company && contact.parent_id && (
        <View style={styles.companyInfo}>
          <MaterialIcons name="business" size={12} color="#8E8E93" />
          <Text style={styles.companyText} numberOfLines={1}>
            {formatRelationalField(contact.parent_id)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactCard: {
    padding: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  compactName: {
    fontSize: 14,
  },
  inactiveBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  contactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactDetailText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
    flex: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  badge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  actions: {
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  companyText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    flex: 1,
  },
});
