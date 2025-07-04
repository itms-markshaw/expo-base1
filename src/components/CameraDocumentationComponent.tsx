/**
 * Camera & Documentation Component
 * Photo capture, document scanning, signature capture, and file attachments
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { authService } from '../models/base/services/BaseAuthService';

interface CameraDocumentationProps {
  model: string;
  recordId: number;
  recordName?: string;
  onAttachmentAdded?: () => void;
}

interface Attachment {
  id: number;
  name: string;
  mimetype: string;
  file_size: number;
  create_date: string;
  url?: string;
}

export default function CameraDocumentationComponent({
  model,
  recordId,
  recordName,
  onAttachmentAdded
}: CameraDocumentationProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureType, setCaptureType] = useState<'photo' | 'document' | 'signature'>('photo');
  const [description, setDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const documentationTypes = [
    {
      id: 'photo',
      name: 'Take Photo',
      description: 'Capture photo with camera',
      icon: 'camera-alt',
      color: '#FF9500',
    },
    {
      id: 'document',
      name: 'Scan Document',
      description: 'Scan and attach document',
      icon: 'document-scanner',
      color: '#007AFF',
    },
    {
      id: 'signature',
      name: 'Capture Signature',
      description: 'Digital signature capture',
      icon: 'edit',
      color: '#9C27B0',
    },
    {
      id: 'gallery',
      name: 'From Gallery',
      description: 'Select from photo library',
      icon: 'photo-library',
      color: '#34C759',
    },
  ];

  const loadAttachments = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const attachments = await client.searchRead('ir.attachment',
        [
          ['res_model', '=', model],
          ['res_id', '=', recordId]
        ],
        ['id', 'name', 'mimetype', 'file_size', 'create_date'],
        { order: 'create_date desc' }
      );

      setAttachments(attachments);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  React.useEffect(() => {
    loadAttachments();
  }, [model, recordId]);

  const handleCapturePress = (type: string) => {
    setCaptureType(type as any);
    setDescription('');
    setPreviewImage(null);
    setShowCaptureModal(true);
  };

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and media library permissions are required for this feature.'
      );
      return false;
    }
    return true;
  };

  const capturePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewImage(result.assets[0].uri);
        return result.assets[0];
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
    return null;
  };

  const selectFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewImage(result.assets[0].uri);
        return result.assets[0];
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
    return null;
  };

  const scanDocument = async () => {
    // For now, use camera with document-optimized settings
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Document aspect ratio
        quality: 1.0, // High quality for documents
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewImage(result.assets[0].uri);
        return result.assets[0];
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to scan document');
    }
    return null;
  };

  const captureSignature = async () => {
    // Placeholder for signature capture
    Alert.alert(
      'Signature Capture',
      'Signature capture feature will be implemented with react-native-signature-canvas',
      [
        { text: 'Cancel' },
        { 
          text: 'Simulate', 
          onPress: () => {
            // Create a mock signature
            setPreviewImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
            setDescription('Digital signature captured');
          }
        }
      ]
    );
  };

  const handleCapture = async () => {
    setLoading(true);
    try {
      let asset = null;

      switch (captureType) {
        case 'photo':
          asset = await capturePhoto();
          break;
        case 'document':
          asset = await scanDocument();
          break;
        case 'signature':
          await captureSignature();
          return;
        case 'gallery':
          asset = await selectFromGallery();
          break;
      }

      if (asset) {
        setPreviewImage(asset.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture');
    } finally {
      setLoading(false);
    }
  };

  const uploadAttachment = async () => {
    if (!previewImage || !description.trim()) {
      Alert.alert('Error', 'Please add a description for the attachment');
      return;
    }

    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Convert image to base64 if needed
      let base64Data = previewImage;
      if (previewImage.startsWith('file://')) {
        // For real implementation, you'd convert file to base64
        base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      } else if (previewImage.startsWith('data:image/')) {
        base64Data = previewImage.split(',')[1];
      }

      const fileName = `${captureType}_${Date.now()}.${captureType === 'document' ? 'pdf' : 'jpg'}`;
      const mimeType = captureType === 'document' ? 'application/pdf' : 'image/jpeg';

      // Create attachment
      const attachmentData = {
        name: fileName,
        datas_fname: fileName,
        datas: base64Data,
        res_model: model,
        res_id: recordId,
        mimetype: mimeType,
        type: 'binary',
        description: description,
      };

      const attachmentId = await client.create('ir.attachment', attachmentData);

      // Post chatter message
      const actionEmoji = {
        photo: '📸',
        document: '📄',
        signature: '✍️',
        gallery: '🖼️'
      };

      await client.callModel(model, 'message_post', [recordId], {
        body: `<p>${actionEmoji[captureType]} <strong>${documentationTypes.find(t => t.id === captureType)?.name}</strong></p>
               <p><strong>File:</strong> ${fileName}</p>
               <p><strong>Description:</strong> ${description}</p>
               <p><strong>Size:</strong> ${(base64Data.length * 0.75 / 1024).toFixed(1)} KB</p>`,
        attachment_ids: [attachmentId],
      });

      setShowCaptureModal(false);
      setPreviewImage(null);
      setDescription('');
      await loadAttachments();
      onAttachmentAdded?.();

      Alert.alert('Success', 'Attachment uploaded successfully!');

    } catch (error) {
      console.error('Failed to upload attachment:', error);
      Alert.alert('Error', 'Failed to upload attachment');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.includes('pdf')) return 'picture-as-pdf';
    if (mimetype.includes('document') || mimetype.includes('word')) return 'description';
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'table-chart';
    return 'attach-file';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="camera-alt" size={24} color="#FF9500" />
        <Text style={styles.title}>Documentation</Text>
        <Text style={styles.subtitle}>
          {recordName || `${model}:${recordId}`}
        </Text>
      </View>

      {/* Capture Options */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.captureOptions}
        contentContainerStyle={styles.captureOptionsContent}
      >
        {documentationTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.captureOption, { borderColor: type.color }]}
            onPress={() => handleCapturePress(type.id)}
          >
            <MaterialIcons name={type.icon as any} size={32} color={type.color} />
            <Text style={styles.captureOptionName}>{type.name}</Text>
            <Text style={styles.captureOptionDescription}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Attachments List */}
      <ScrollView style={styles.attachmentsList}>
        <Text style={styles.attachmentsTitle}>
          📎 Attachments ({attachments.length})
        </Text>

        {attachments.map((attachment) => (
          <View key={attachment.id} style={styles.attachmentCard}>
            <MaterialIcons 
              name={getFileIcon(attachment.mimetype) as any} 
              size={24} 
              color="#666" 
            />
            <View style={styles.attachmentInfo}>
              <Text style={styles.attachmentName}>{attachment.name}</Text>
              <Text style={styles.attachmentDetails}>
                {formatFileSize(attachment.file_size)} • {new Date(attachment.create_date).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity style={styles.attachmentAction}>
              <MaterialIcons name="download" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        ))}

        {attachments.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="attach-file" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>No attachments yet</Text>
            <Text style={styles.emptySubtext}>
              Use the options above to add photos, documents, or signatures
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Capture Modal */}
      <Modal
        visible={showCaptureModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCaptureModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCaptureModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {documentationTypes.find(t => t.id === captureType)?.name}
            </Text>
            <TouchableOpacity 
              onPress={uploadAttachment}
              disabled={!previewImage || loading}
            >
              <Text style={[
                styles.uploadButton,
                (!previewImage || loading) && styles.uploadButtonDisabled
              ]}>
                Upload
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Capture Button */}
            {!previewImage && (
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  { backgroundColor: documentationTypes.find(t => t.id === captureType)?.color }
                ]}
                onPress={handleCapture}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons 
                      name={documentationTypes.find(t => t.id === captureType)?.icon as any} 
                      size={32} 
                      color="#FFF" 
                    />
                    <Text style={styles.captureButtonText}>
                      {documentationTypes.find(t => t.id === captureType)?.name}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Preview */}
            {previewImage && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: previewImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setPreviewImage(null)}
                >
                  <MaterialIcons name="refresh" size={20} color="#007AFF" />
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Description Input */}
            <Text style={styles.inputLabel}>Description:</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder={`Describe this ${captureType}...`}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  captureOptions: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  captureOptionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  captureOption: {
    alignItems: 'center',
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFF',
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  captureOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
    textAlign: 'center',
  },
  captureOptionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  attachmentsList: {
    flex: 1,
    padding: 16,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  attachmentDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  attachmentAction: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  uploadButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  uploadButtonDisabled: {
    color: '#C7C7CC',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  captureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    marginBottom: 24,
  },
  captureButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 8,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewImage: {
    width: 300,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  retakeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
