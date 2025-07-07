/**
 * BC-S001_BaseBottomSheet - Universal bottom sheet component
 * Component Reference: BC-S001
 * 
 * Universal bottom sheet component that provides consistent sheet functionality
 * across all screens with gesture handling and smooth animations
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanGestureHandler,
  State,
  Dimensions,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { height: screenHeight } = Dimensions.get('window');

export interface BottomSheetAction {
  label: string;
  icon: string;
  color?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface BaseBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions?: BottomSheetAction[];
  children?: React.ReactNode;
  height?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  dismissOnBackdrop?: boolean;
}

/**
 * BC-S001: Universal Bottom Sheet Component
 * 
 * Features:
 * - Smooth slide-up animation
 * - Gesture-based dismissal
 * - Backdrop tap to dismiss
 * - Customizable height
 * - Action buttons support
 * - Header with title and close button
 * - Consistent styling across app
 */
export default function BaseBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  actions = [],
  children,
  height = screenHeight * 0.5,
  showHandle = true,
  showCloseButton = true,
  dismissOnBackdrop = true,
}: BaseBottomSheetProps) {
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate sheet in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: height,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, height]);

  // Handle gesture state changes
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // Dismiss if dragged down significantly or with high velocity
      if (translationY > height * 0.3 || velocityY > 1000) {
        onClose();
      } else {
        // Snap back to original position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Render header
  const renderHeader = () => {
    if (!title && !showCloseButton && !showHandle) return null;

    return (
      <View style={styles.header}>
        {showHandle && <View style={styles.handle} />}
        
        {(title || showCloseButton) && (
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            
            {showCloseButton && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render actions
  const renderActions = () => {
    if (actions.length === 0) return null;

    return (
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              action.destructive && styles.destructiveAction
            ]}
            onPress={() => {
              action.onPress();
              onClose();
            }}
          >
            <MaterialIcons 
              name={action.icon as any} 
              size={20} 
              color={action.destructive ? "#FF3B30" : action.color || "#007AFF"} 
            />
            <Text style={[
              styles.actionText,
              action.destructive && styles.destructiveText,
              action.color && { color: action.color }
            ]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={dismissOnBackdrop ? onClose : undefined}
        >
          <Animated.View
            style={[
              styles.backdropOverlay,
              { opacity: backdropOpacity }
            ]}
          />
        </TouchableOpacity>

        {/* Bottom Sheet */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                height,
                transform: [{ translateY }]
              }
            ]}
          >
            {renderHeader()}
            
            {children && (
              <View style={styles.content}>
                {children}
              </View>
            )}
            
            {renderActions()}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#F2F2F7',
  },
  destructiveAction: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 12,
  },
  destructiveText: {
    color: '#FF3B30',
  },
});
