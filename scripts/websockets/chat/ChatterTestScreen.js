/**
 * Universal Chatter Test Screen
 * 
 * Test implementation to validate the Universal Chatter Component foundation
 * Tests the integration with res.partner (contacts) model first
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import ChatterContainer from '../components/chatter/ChatterContainer';
import { contactsService } from '../services/contacts';

const ChatterTestScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [testContacts, setTestContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChatter, setShowChatter] = useState(false);

  // Load test contacts
  useEffect(() => {
    loadTestContacts();
  }, []);

  const loadTestContacts = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading test contacts for Chatter validation...');
      
      // Get first 10 contacts for testing
      const contacts = await contactsService.getContacts({
        limit: 10,
        offset: 0,
        domain: [['active', '=', true]]
      });

      console.log(`📊 Loaded ${contacts.length} test contacts`);
      setTestContacts(contacts);

      // Auto-select first contact if available
      if (contacts.length > 0) {
        setSelectedContact(contacts[0]);
      }

    } catch (error) {
      console.error('❌ Failed to load test contacts:', error);
      Alert.alert('Error', 'Failed to load test contacts for Chatter validation');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contact) => {
    console.log(`👤 Selected contact for Chatter test: ${contact.name} (ID: ${contact.id})`);
    setSelectedContact(contact);
    setShowChatter(false); // Reset chatter view
  };

  const handleShowChatter = () => {
    if (!selectedContact) {
      Alert.alert('No Contact', 'Please select a contact first');
      return;
    }
    
    console.log(`🚀 Testing Universal Chatter with contact: ${selectedContact.name}`);
    setShowChatter(true);
  };

  const renderContactList = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Select Test Contact
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Choose a contact to test the Universal Chatter Component
      </Text>

      <ScrollView style={styles.contactList}>
        {testContacts.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={[
              styles.contactItem,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedContact?.id === contact.id && { borderColor: colors.primary, backgroundColor: colors.primaryContainer }
            ]}
            onPress={() => handleContactSelect(contact)}
          >
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, { color: colors.text }]}>
                {contact.name}
              </Text>
              <Text style={[styles.contactDetails, { color: colors.textSecondary }]}>
                ID: {contact.id} • {contact.email || contact.phone || 'No email/phone'}
              </Text>
              {contact.is_company && (
                <View style={[styles.companyBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.companyBadgeText, { color: colors.onPrimary }]}>
                    Company
                  </Text>
                </View>
              )}
            </View>
            {selectedContact?.id === contact.id && (
              <Icon name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.testButton,
          { backgroundColor: selectedContact ? colors.primary : colors.border }
        ]}
        onPress={handleShowChatter}
        disabled={!selectedContact}
      >
        <Icon 
          name="chat" 
          size={20} 
          color={selectedContact ? colors.onPrimary : colors.textSecondary} 
        />
        <Text style={[
          styles.testButtonText,
          { color: selectedContact ? colors.onPrimary : colors.textSecondary }
        ]}>
          Test Universal Chatter
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderChatterTest = () => (
    <View style={styles.chatterSection}>
      <View style={[styles.chatterHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowChatter(false)}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.chatterHeaderInfo}>
          <Text style={[styles.chatterTitle, { color: colors.text }]}>
            Universal Chatter Test
          </Text>
          <Text style={[styles.chatterSubtitle, { color: colors.textSecondary }]}>
            {selectedContact?.name} (ID: {selectedContact?.id})
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            console.log('🔄 Refreshing Chatter test...');
            // Force re-render of ChatterContainer
            setShowChatter(false);
            setTimeout(() => setShowChatter(true), 100);
          }}
        >
          <Icon name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.chatterContainer}>
        <ChatterContainer
          model="res.partner"
          resId={selectedContact.id}
          recordName={selectedContact.name}
          recordData={selectedContact}
          enabledTabs={['messages', 'activities', 'audits', 'ai', 'analytics']}
          defaultTab="messages"
          onDataChange={(data) => {
            console.log('📊 Chatter data changed:', {
              tab: data.tab,
              dataCount: Array.isArray(data.data) ? data.data.length : 'N/A',
              model: data.model,
              resId: data.resId
            });
          }}
          customStyles={{
            container: { flex: 1 }
          }}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading test contacts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Universal Chatter Test
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Validate Foundation Architecture
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {showChatter ? renderChatterTest() : renderContactList()}
      </View>

      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.statusItem}>
          <Icon name="database" size={16} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Model: res.partner
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Icon name="chat" size={16} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Phase 1: Foundation Test
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Icon name="check-circle" size={16} color={colors.success} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Ready for Phase 2
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  contactList: {
    flex: 1,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactDetails: {
    fontSize: 14,
  },
  companyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  companyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatterSection: {
    flex: 1,
  },
  chatterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  chatterHeaderInfo: {
    flex: 1,
  },
  chatterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatterSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  chatterContainer: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
  },
});

export default ChatterTestScreen;
