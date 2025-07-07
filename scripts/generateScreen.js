#!/usr/bin/env node

/**
 * Screen Generator CLI
 * Automatically generates numbered screens following the established patterns
 * 
 * Usage:
 * npm run generate:screen --model=product.product --number=701 --type=list
 * npm run generate:screen --model=crm.lead --number=301 --type=detail
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(arg => arg.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const modelName = getArg('model');
const screenNumber = getArg('number');
const screenType = getArg('type') || 'list';

if (!modelName || !screenNumber) {
  console.error('❌ Missing required arguments');
  console.log('Usage: npm run generate:screen --model=product.product --number=701 --type=list');
  process.exit(1);
}

// Model configuration
const modelConfigs = {
  'product.product': {
    displayName: 'Products',
    category: 'inventory',
    fields: ['name', 'default_code', 'list_price', 'categ_id', 'active'],
    searchFields: ['name', 'default_code'],
    icon: 'inventory',
    color: '#9C27B0'
  },
  'crm.lead': {
    displayName: 'CRM Leads',
    category: 'crm',
    fields: ['name', 'partner_name', 'email_from', 'phone', 'stage_id', 'probability'],
    searchFields: ['name', 'partner_name', 'email_from'],
    icon: 'trending-up',
    color: '#34C759'
  },
  'project.project': {
    displayName: 'Projects',
    category: 'projects',
    fields: ['name', 'partner_id', 'user_id', 'date_start', 'date', 'active'],
    searchFields: ['name'],
    icon: 'folder',
    color: '#9C27B0'
  },
  'helpdesk.ticket': {
    displayName: 'Helpdesk Tickets',
    category: 'helpdesk',
    fields: ['name', 'partner_id', 'user_id', 'team_id', 'stage_id', 'priority'],
    searchFields: ['name', 'ticket_ref'],
    icon: 'support',
    color: '#FF9500'
  }
};

const config = modelConfigs[modelName] || {
  displayName: modelName.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
  category: 'other',
  fields: ['name', 'active'],
  searchFields: ['name'],
  icon: 'list',
  color: '#666'
};

// Generate screen templates
const generateListScreen = () => `/**
 * ${screenNumber}_${config.displayName.replace(/\s+/g, '')}List - ${config.displayName} list view
 * Screen Number: ${screenNumber}
 * Model: ${modelName.replace('.', '_')}
 * Type: list
 *
 * GENERATED: Auto-generated screen following established patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import ScreenBadge from '../../../components/ScreenBadge';
import SkeletonLoader from '../../base/components/SkeletonLoader';
import { BaseModelService } from '../../base/services/BaseModelService';
import { BaseModel } from '../../base/types/BaseModel';

interface ${config.displayName.replace(/\s+/g, '')}Model extends BaseModel {
  ${config.fields.map(field => `${field}?: any;`).join('\n  ')}
}

const ${modelName.replace('.', '_')}Service = new BaseModelService<${config.displayName.replace(/\s+/g, '')}Model>(
  '${modelName}',
  [${config.fields.map(f => `'${f}'`).join(', ')}],
  [${config.searchFields.map(f => `'${f}'`).join(', ')}]
);

export default function ${config.displayName.replace(/\s+/g, '')}List() {
  const navigation = useNavigation();
  const { navigateToScreen } = useAppNavigation();
  
  const [data, setData] = useState<${config.displayName.replace(/\s+/g, '')}Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const records = await ${modelName.replace('.', '_')}Service.list();
      setData(records);
    } catch (error) {
      console.error('Failed to load ${config.displayName.toLowerCase()}:', error);
      Alert.alert('Error', 'Failed to load ${config.displayName.toLowerCase()}');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleItemPress = useCallback((item: ${config.displayName.replace(/\s+/g, '')}Model) => {
    navigateToScreen('${config.displayName.replace(/\s+/g, '')}Detail', { id: item.id });
  }, [navigateToScreen]);

  const renderItem = ({ item }: { item: ${config.displayName.replace(/\s+/g, '')}Model }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleItemPress(item)}
    >
      <View style={[styles.itemIcon, { backgroundColor: '${config.color}15' }]}>
        <MaterialIcons name="${config.icon}" size={24} color="${config.color}" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name || item.display_name}</Text>
        <Text style={styles.itemSubtitle}>ID: {item.id}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenBadge screenNumber={${screenNumber}} />
        <SkeletonLoader type="list" count={10} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={${screenNumber}} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>${config.displayName}</Text>
        <TouchableOpacity onPress={() => navigateToScreen('${config.displayName.replace(/\s+/g, '')}Create')}>
          <MaterialIcons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
});`;

const generateDetailScreen = () => `/**
 * ${screenNumber}_${config.displayName.replace(/\s+/g, '')}Detail - ${config.displayName} detail view
 * Screen Number: ${screenNumber}
 * Model: ${modelName.replace('.', '_')}
 * Type: detail
 *
 * GENERATED: Auto-generated screen following established patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import ScreenBadge from '../../../components/ScreenBadge';
import SkeletonLoader from '../../base/components/SkeletonLoader';
import BaseChatter from '../../base/components/BaseChatter';
import { BaseModelService } from '../../base/services/BaseModelService';
import { BaseModel } from '../../base/types/BaseModel';

interface ${config.displayName.replace(/\s+/g, '')}Model extends BaseModel {
  ${config.fields.map(field => `${field}?: any;`).join('\n  ')}
}

const ${modelName.replace('.', '_')}Service = new BaseModelService<${config.displayName.replace(/\s+/g, '')}Model>(
  '${modelName}',
  [${config.fields.map(f => `'${f}'`).join(', ')}],
  [${config.searchFields.map(f => `'${f}'`).join(', ')}]
);

export default function ${config.displayName.replace(/\s+/g, '')}Detail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { navigateToScreen } = useAppNavigation();
  
  const recordId = route.params?.id;
  const [record, setRecord] = useState<${config.displayName.replace(/\s+/g, '')}Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showChatter, setShowChatter] = useState(false);

  const loadRecord = useCallback(async () => {
    if (!recordId) return;
    
    try {
      const data = await ${modelName.replace('.', '_')}Service.read(recordId);
      setRecord(data);
    } catch (error) {
      console.error('Failed to load ${config.displayName.toLowerCase()}:', error);
      Alert.alert('Error', 'Failed to load ${config.displayName.toLowerCase()}');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recordId]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecord();
  }, [loadRecord]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenBadge screenNumber={${screenNumber}} />
        <SkeletonLoader type="detail" />
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenBadge screenNumber={${screenNumber}} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Record not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={${screenNumber}} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{record.name || record.display_name}</Text>
        <TouchableOpacity onPress={() => setShowChatter(!showChatter)}>
          <MaterialIcons name="chat" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          ${config.fields.map(field => `
          {record.${field} && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>${field.charAt(0).toUpperCase() + field.slice(1)}</Text>
              <Text style={styles.fieldValue}>{record.${field}?.toString()}</Text>
            </View>
          )}`).join('')}
        </View>
      </ScrollView>

      {showChatter && (
        <BaseChatter
          modelName="${modelName}"
          recordId={record.id}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 17,
    color: '#000000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 17,
    color: '#FF3B30',
    marginTop: 16,
  },
});`;

// Determine folder structure
const modelFolder = modelName.replace('.', '_');
const screenCategory = Math.floor(parseInt(screenNumber) / 100) * 100;

// Create directories
const modelPath = path.join(__dirname, '..', 'src', 'models', modelFolder);
const screensPath = path.join(modelPath, 'screens');

if (!fs.existsSync(modelPath)) {
  fs.mkdirSync(modelPath, { recursive: true });
}
if (!fs.existsSync(screensPath)) {
  fs.mkdirSync(screensPath, { recursive: true });
}

// Generate screen content
let screenContent;
switch (screenType) {
  case 'list':
    screenContent = generateListScreen();
    break;
  case 'detail':
    screenContent = generateDetailScreen();
    break;
  default:
    console.error(`❌ Unsupported screen type: ${screenType}`);
    process.exit(1);
}

// Write screen file
const fileName = `${screenNumber}_${config.displayName.replace(/\s+/g, '')}${screenType.charAt(0).toUpperCase() + screenType.slice(1)}.tsx`;
const filePath = path.join(screensPath, fileName);

fs.writeFileSync(filePath, screenContent);

console.log(`✅ Generated screen: ${filePath}`);
console.log(`📱 Screen Number: ${screenNumber}`);
console.log(`🏷️  Model: ${modelName}`);
console.log(`📋 Type: ${screenType}`);
console.log(`\n🚀 Next steps:`);
console.log(`1. Add navigation route in App.tsx`);
console.log(`2. Add to AppNavigationProvider.tsx`);
console.log(`3. Test the generated screen`);
