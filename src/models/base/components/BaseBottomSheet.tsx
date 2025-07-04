/**
 * Base Bottom Sheet Component
 * Universal bottom sheet for quick actions and record details
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
import { BaseModel, BaseBottomSheetProps, BottomSheetAction } from '../types/BaseModel';

interface BaseBottomSheetComponentProps<T extends BaseModel> extends BaseBottomSheetProps<T> {
  title?: string;
  subtitle?: string;
  headerContent?: React.ReactNode;
  children?: React.ReactNode;
  snapPoints?: string[];
  enablePanDownToClose?: boolean;
}

export default function BaseBottomSheet<T extends BaseModel>({
  record,
  visible,
  onClose,
  actions = [],
  title,
  subtitle,
  headerContent,
  children,
  snapPoints = ['25%', '50%', '90%'],
  enablePanDownToClose = true,
}: BaseBottomSheetComponentProps<T>) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>
          {title || record.display_name || `Record ${record.id}`}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
      >
        <MaterialIcons name="close" size={24} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        <Text style={styles.actionsTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                action.disabled && styles.disabledActionButton
              ]}
              onPress={() => action.onPress(record)}
              disabled={action.disabled}
            >
              <View style={[
                styles.actionIcon,
                { backgroundColor: action.color || '#007AFF' }
              ]}>
                <MaterialIcons 
                  name={action.icon as any} 
                  size={20} 
                  color="#FFF" 
                />
              </View>
              <Text style={[
                styles.actionLabel,
                action.disabled && styles.disabledActionLabel
              ]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderRecordInfo = () => (
    <View style={styles.recordInfo}>
      <Text style={styles.recordInfoTitle}>Record Information</Text>
      <View style={styles.recordInfoGrid}>
        <View style={styles.recordInfoItem}>
          <Text style={styles.recordInfoLabel}>ID</Text>
          <Text style={styles.recordInfoValue}>{record.id}</Text>
        </View>
        {record.create_date && (
          <View style={styles.recordInfoItem}>
            <Text style={styles.recordInfoLabel}>Created</Text>
            <Text style={styles.recordInfoValue}>
              {new Date(record.create_date).toLocaleDateString()}
            </Text>
          </View>
        )}
        {record.write_date && (
          <View style={styles.recordInfoItem}>
            <Text style={styles.recordInfoLabel}>Modified</Text>
            <Text style={styles.recordInfoValue}>
              {new Date(record.write_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPointsMemo}
      onChange={handleSheetChanges}
      enablePanDownToClose={enablePanDownToClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
    >
      <BottomSheetView style={styles.bottomSheetContainer}>
        {renderHeader()}
        
        <BottomSheetScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {headerContent}
          {renderActions()}
          {children}
          {renderRecordInfo()}
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
    width: 40,
    height: 4,
  },
  bottomSheetContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    minWidth: 80,
    paddingVertical: 8,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
  },
  disabledActionLabel: {
    color: '#8E8E93',
  },
  recordInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  recordInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  recordInfoGrid: {
    gap: 8,
  },
  recordInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordInfoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  recordInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
});
