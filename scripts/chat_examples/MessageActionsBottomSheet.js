import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
// Clipboard import with fallback for Expo Go
let Clipboard;
try {
  Clipboard = require('@react-native-clipboard/clipboard').default;
} catch (error) {
  console.log('Clipboard not available in Expo Go');
  Clipboard = {
    setString: (text) => {
      console.log('Clipboard fallback - would copy:', text);
    }
  };
}
// BottomSheet import with fallback
let BottomSheet, BottomSheetView;
try {
  const bottomSheetModule = require('@gorhom/bottom-sheet');
  BottomSheet = bottomSheetModule.BottomSheet;
  BottomSheetView = bottomSheetModule.BottomSheetView;
} catch (error) {
  console.log('BottomSheet not available, using fallback');
  // Fallback to regular Modal components
  BottomSheet = null;
  BottomSheetView = null;
}
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
// Haptics import with fallback for Expo Go
let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (error) {
  console.log('Haptics not available in Expo Go');
  Haptics = {
    impactAsync: () => Promise.resolve(),
    notificationAsync: () => Promise.resolve(),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' }
  };
}
import { useTheme } from '../../../contexts/ThemeContext';

const MessageActionsBottomSheet = ({
  visible,
  message,
  isOwnMessage,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onForward,
  onSave,
  onMarkUnread
}) => {
  const { colors } = useTheme();

  // Safety check
  if (!colors) {
    return null;
  }
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['40%'], []);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Open/close sheet based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  // Emoji reactions
  const reactions = ['👍', '❤️', '😂', '😮', '😢'];

  // Handle emoji reaction
  const handleEmojiPress = useCallback((emoji) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReaction?.(emoji);
    onClose();
  }, [onReaction, onClose]);

  // Handle copy message
  const handleCopy = useCallback(() => {
    const textToCopy = message?.cleanBody || message?.body || '';
    try {
      Clipboard.setString(textToCopy);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Show success message in Expo Go since clipboard might not work
      if (__DEV__) {
        Alert.alert('Copied', 'Message copied to clipboard!');
      }
    } catch (error) {
      console.log('Clipboard error:', error);
      Alert.alert('Copy Text', textToCopy, [
        { text: 'OK', style: 'default' }
      ]);
    }
    onClose();
  }, [message, onClose]);

  // Handle edit message
  const handleEdit = useCallback(() => {
    if (isOwnMessage) {
      onEdit?.(message);
    }
    onClose();
  }, [isOwnMessage, message, onEdit, onClose]);

  // Handle delete message
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.(message);
            onClose();
          }
        }
      ]
    );
  }, [message, onDelete, onClose]);

  // Handle reply
  const handleReply = useCallback(() => {
    onReply?.(message);
    onClose();
  }, [message, onReply, onClose]);

  // Handle forward
  const handleForward = useCallback(() => {
    onForward?.(message);
    onClose();
  }, [message, onForward, onClose]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(message);
    onClose();
  }, [message, onSave, onClose]);

  // Handle mark as unread
  const handleMarkUnread = useCallback(() => {
    onMarkUnread?.(message);
    onClose();
  }, [message, onMarkUnread, onClose]);

  if (!visible || !message) return null;

  // If BottomSheet is not available, use a simple modal fallback
  if (!BottomSheet || !BottomSheetView) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[styles.fallbackContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.bottomSheetContent}>
              {/* Emoji Reactions */}
              <View style={styles.reactionsContainer}>
                {reactions.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.emojiButton, { backgroundColor: colors.background }]}
                    onPress={() => handleEmojiPress(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.emojiButton, { backgroundColor: colors.background }]}
                  onPress={() => {
                    // TODO: Open emoji picker
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name="plus" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Action Items */}
              <View style={styles.actionsContainer}>
                {/* Edit (only for own messages) */}
                {isOwnMessage && (
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleEdit}
                    activeOpacity={0.7}
                  >
                    <Icon name="pencil" size={24} color={colors.text} />
                    <Text style={[styles.actionText, { color: colors.text }]}>Edit message</Text>
                  </TouchableOpacity>
                )}

                {/* Delete (only for own messages) */}
                {isOwnMessage && (
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Icon name="delete" size={24} color={colors.error} />
                    <Text style={[styles.actionText, { color: colors.error }]}>Delete message</Text>
                  </TouchableOpacity>
                )}

                {/* Copy */}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleCopy}
                  activeOpacity={0.7}
                >
                  <Icon name="content-copy" size={24} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Copy</Text>
                </TouchableOpacity>

                {/* Reply */}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleReply}
                  activeOpacity={0.7}
                >
                  <Icon name="reply" size={24} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Reply</Text>
                </TouchableOpacity>

                {/* Forward */}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleForward}
                  activeOpacity={0.7}
                >
                  <Icon name="share" size={24} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Forward</Text>
                </TouchableOpacity>

                {/* Save */}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleSave}
                  activeOpacity={0.7}
                >
                  <Icon name="bookmark" size={24} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Save</Text>
                </TouchableOpacity>

                {/* Mark as unread (only for other messages) */}
                {!isOwnMessage && (
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleMarkUnread}
                    activeOpacity={0.7}
                  >
                    <Icon name="email-mark-as-unread" size={24} color={colors.text} />
                    <Text style={[styles.actionText, { color: colors.text }]}>Mark as unread</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Normal BottomSheet version
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={true}
          backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: colors.surface }]}
          handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.textSecondary }]}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
            {/* Same content as fallback */}
            {/* Emoji Reactions */}
            <View style={styles.reactionsContainer}>
              {reactions.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.emojiButton, { backgroundColor: colors.background }]}
                  onPress={() => handleEmojiPress(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.emojiButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  // TODO: Open emoji picker
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Icon name="plus" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Action Items */}
            <View style={styles.actionsContainer}>
              {/* Edit (only for own messages) */}
              {isOwnMessage && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleEdit}
                  activeOpacity={0.7}
                >
                  <Icon name="pencil" size={24} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Edit message</Text>
                </TouchableOpacity>
              )}

              {/* Delete (only for own messages) */}
              {isOwnMessage && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={24} color={colors.error} />
                  <Text style={[styles.actionText, { color: colors.error }]}>Delete message</Text>
                </TouchableOpacity>
              )}

              {/* Copy */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleCopy}
                activeOpacity={0.7}
              >
                <Icon name="content-copy" size={24} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Copy</Text>
              </TouchableOpacity>

              {/* Reply */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleReply}
                activeOpacity={0.7}
              >
                <Icon name="reply" size={24} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Reply</Text>
              </TouchableOpacity>

              {/* Forward */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleForward}
                activeOpacity={0.7}
              >
                <Icon name="share" size={24} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Forward</Text>
              </TouchableOpacity>

              {/* Save */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Icon name="bookmark" size={24} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Save</Text>
              </TouchableOpacity>

              {/* Mark as unread (only for other messages) */}
              {!isOwnMessage && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleMarkUnread}
                  activeOpacity={0.7}
                >
                  <Icon name="email-mark-as-unread" size={24} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Mark as unread</Text>
                </TouchableOpacity>
              )}
            </View>
          </BottomSheetView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  fallbackContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  reactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 20,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emojiText: {
    fontSize: 24,
  },
  actionsContainer: {
    flex: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
});

export default MessageActionsBottomSheet;
