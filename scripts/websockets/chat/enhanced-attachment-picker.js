// src/components/chat/EnhancedAttachmentPicker.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Camera from 'expo-camera';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enhanced Attachment Picker - Modern attachment interface
 * Supports camera, gallery, files, and future emoji integration
 */
const EnhancedAttachmentPicker = ({ 
  visible, 
  onClose, 
  onAttachmentSelected,
  onEmojiPress 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [permissions, setPermissions] = useState({
    camera: null,
    gallery: null
  });

  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Show/hide animations
  React.useEffect(() => {
    if (visible) {
      setShowPicker(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowPicker(false);
      });
    }
  }, [visible]);

  // Check and request permissions
  const checkPermissions = async (type) => {
    try {
      if (type === 'camera') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setPermissions(prev => ({ ...prev, camera: status }));
        return status === 'granted';
      } else if (type === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setPermissions(prev => ({ ...prev, gallery: status }));
        return status === 'granted';
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  // Handle camera capture
  const handleCamera = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const hasPermission = await checkPermissions('camera');
      if (!hasPermission) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in Settings to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      onClose(); // Close picker first

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await onAttachmentSelected({
          type: asset.type === 'video' ? 'video' : 'image',
          uri: asset.uri,
          name: `camera_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          size: asset.fileSize || 0,
          mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg'
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Handle gallery selection
  const handleGallery = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const hasPermission = await checkPermissions('gallery');
      if (!hasPermission) {
        Alert.alert(
          'Gallery Permission Required',
          'Please enable photo library access in Settings to select photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      onClose(); // Close picker first

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10, // Allow up to 10 files
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await onAttachmentSelected({
            type: asset.type === 'video' ? 'video' : 'image',
            uri: asset.uri,
            name: asset.fileName || `gallery_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
            size: asset.fileSize || 0,
            mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg')
          });
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select from gallery. Please try again.');
    }
  };

  // Handle document selection
  const handleDocuments = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      onClose(); // Close picker first

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await onAttachmentSelected({
            type: 'document',
            uri: asset.uri,
            name: asset.name,
            size: asset.size || 0,
            mimeType: asset.mimeType || 'application/octet-stream'
          });
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select documents. Please try again.');
    }
  };

  // Handle location sharing (future implementation)
  const handleLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    Alert.alert('Location Sharing', 'Location sharing feature coming soon!');
  };

  // Handle contact sharing (future implementation)
  const handleContact = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    Alert.alert('Contact Sharing', 'Contact sharing feature coming soon!');
  };

  // Attachment options
  const attachmentOptions = [
    {
      id: 'camera',
      title: 'Camera',
      subtitle: 'Take photo or video',
      icon: 'camera',
      color: '#FF6B6B',
      onPress: handleCamera,
    },
    {
      id: 'gallery',
      title: 'Gallery',
      subtitle: 'Choose from library',
      icon: 'images',
      color: '#4ECDC4',
      onPress: handleGallery,
    },
    {
      id: 'documents',
      title: 'Document',
      subtitle: 'Share files',
      icon: 'document-text',
      color: '#45B7D1',
      onPress: handleDocuments,
    },
    {
      id: 'location',
      title: 'Location',
      subtitle: 'Share location',
      icon: 'location',
      color: '#96CEB4',
      onPress: handleLocation,
    },
    {
      id: 'contact',
      title: 'Contact',
      subtitle: 'Share contact',
      icon: 'person',
      color: '#FECA57',
      onPress: handleContact,
    },
  ];

  if (!showPicker) return null;

  return (
    <Modal
      visible={showPicker}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View 
          style={[styles.backdrop, { opacity: opacityAnim }]}
        >
          <TouchableOpacity 
            style={styles.backdropTouchable}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Picker Content */}
        <Animated.View
          style={[
            styles.pickerContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Share Content</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Attachment Options */}
          <View style={styles.optionsContainer}>
            {attachmentOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionButton}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Emoji Section */}
          <View style={styles.emojiSection}>
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onEmojiPress && onEmojiPress();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.emojiIconContainer}>
                <Text style={styles.emojiIcon}>😀</Text>
              </View>
              <View style={styles.emojiTextContainer}>
                <Text style={styles.emojiTitle}>Emoji & Stickers</Text>
                <Text style={styles.emojiSubtitle}>Express yourself</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emojiSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emojiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  emojiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE4B5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emojiIcon: {
    fontSize: 24,
  },
  emojiTextContainer: {
    flex: 1,
  },
  emojiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  emojiSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default EnhancedAttachmentPicker;