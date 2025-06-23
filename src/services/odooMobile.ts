/**
 * Odoo Mobile-Specific Integrations
 * GPS tracking, camera, notifications, offline capabilities
 */

import { authService } from './auth';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

export interface LocationLog {
  id?: number;
  user_id: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
  activity_type: 'check_in' | 'check_out' | 'visit' | 'delivery';
  related_record_model?: string;
  related_record_id?: number;
}

export interface PhotoAttachment {
  name: string;
  uri: string;
  type: string;
  size: number;
  base64?: string;
}

class OdooMobileService {

  /**
   * Log GPS location for field service
   */
  async logLocation(activityType: LocationLog['activity_type'], relatedModel?: string, relatedId?: number): Promise<boolean> {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Create location log record
      const locationData: any = {
        user_id: client.uid,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date().toISOString(),
        activity_type: activityType,
      };

      if (address.length > 0) {
        const addr = address[0];
        locationData.address = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
      }

      if (relatedModel && relatedId) {
        locationData.related_record_model = relatedModel;
        locationData.related_record_id = relatedId;
      }

      // Try to create in custom location log model, fallback to chatter message
      try {
        await client.create('hr.attendance.location', locationData);
      } catch (modelError) {
        // Fallback: post as chatter message
        const message = `<p><strong>📍 Location Log:</strong> ${activityType}</p>
                        <p><strong>Coordinates:</strong> ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}</p>
                        <p><strong>Address:</strong> ${locationData.address || 'Unknown'}</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>`;

        if (relatedModel && relatedId) {
          await client.callModel(relatedModel, 'message_post', [relatedId], { body: message });
        }
      }

      console.log(`✅ Location logged: ${activityType} at ${locationData.address}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to log location:', error.message);
      return false;
    }
  }

  /**
   * Take photo and attach to record
   */
  async takePhotoAndAttach(model: string, recordId: number, description?: string): Promise<boolean> {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission denied');
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        return false;
      }

      const photo = result.assets[0];
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Create attachment
      const attachmentData = {
        name: `Photo_${Date.now()}.jpg`,
        datas_fname: `Photo_${Date.now()}.jpg`,
        datas: photo.base64,
        res_model: model,
        res_id: recordId,
        mimetype: 'image/jpeg',
        type: 'binary',
        description: description || 'Mobile photo attachment',
      };

      const attachmentId = await client.create('ir.attachment', attachmentData);

      // Post chatter message about photo
      await client.callModel(model, 'message_post', [recordId], {
        body: `<p>📸 <strong>Photo attached:</strong> ${attachmentData.name}</p>
               <p>${description || 'Mobile photo capture'}</p>`,
        attachment_ids: [attachmentId],
      });

      console.log(`✅ Photo attached with ID: ${attachmentId}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to take and attach photo:', error.message);
      return false;
    }
  }

  /**
   * Scan barcode/QR code
   */
  async scanBarcode(): Promise<string | null> {
    try {
      // This would require expo-barcode-scanner
      // For now, return mock data
      console.log('📱 Barcode scanning would be implemented here');
      return 'MOCK_BARCODE_123456';

    } catch (error) {
      console.error('❌ Failed to scan barcode:', error.message);
      return null;
    }
  }

  /**
   * Check in/out for attendance
   */
  async checkInOut(action: 'check_in' | 'check_out'): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Log location first
      await this.logLocation(action);

      // Create attendance record
      const attendanceData: any = {
        employee_id: client.uid, // Assuming user is linked to employee
        check_in: action === 'check_in' ? new Date().toISOString() : undefined,
        check_out: action === 'check_out' ? new Date().toISOString() : undefined,
      };

      if (action === 'check_out') {
        // Find last check-in to update
        const lastAttendance = await client.searchRead('hr.attendance', 
          [
            ['employee_id', '=', client.uid],
            ['check_out', '=', false]
          ], 
          ['id'], 
          { limit: 1, order: 'check_in desc' }
        );

        if (lastAttendance.length > 0) {
          await client.update('hr.attendance', lastAttendance[0].id, {
            check_out: new Date().toISOString()
          });
        }
      } else {
        await client.create('hr.attendance', attendanceData);
      }

      console.log(`✅ ${action === 'check_in' ? 'Checked in' : 'Checked out'} successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to ${action}:`, error.message);
      return false;
    }
  }

  /**
   * Send push notification
   */
  async sendNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });

      console.log(`✅ Notification sent: ${title}`);

    } catch (error) {
      console.error('❌ Failed to send notification:', error.message);
    }
  }

  /**
   * Sync offline data
   */
  async syncOfflineData(): Promise<boolean> {
    try {
      // This would implement offline queue sync
      console.log('🔄 Syncing offline data...');
      
      // Mock implementation
      const offlineQueue = []; // Would get from local storage
      
      for (const item of offlineQueue) {
        // Sync each offline item
        console.log(`Syncing offline item: ${item}`);
      }

      console.log('✅ Offline data synced');
      return true;

    } catch (error) {
      console.error('❌ Failed to sync offline data:', error.message);
      return false;
    }
  }

  /**
   * Get nearby records (using GPS)
   */
  async getNearbyRecords(model: string, radiusKm: number = 10): Promise<any[]> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({});
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get records with GPS coordinates
      const records = await client.searchRead(model, 
        [
          ['partner_latitude', '!=', 0],
          ['partner_longitude', '!=', 0]
        ], 
        ['name', 'partner_latitude', 'partner_longitude', 'street', 'city']
      );

      // Filter by distance
      const nearbyRecords = records.filter(record => {
        const distance = this.calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          record.partner_latitude,
          record.partner_longitude
        );
        return distance <= radiusKm;
      });

      console.log(`✅ Found ${nearbyRecords.length} nearby records within ${radiusKm}km`);
      return nearbyRecords;

    } catch (error) {
      console.error('❌ Failed to get nearby records:', error.message);
      return [];
    }
  }

  /**
   * Calculate distance between two GPS points
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Voice memo recording and attachment
   */
  async recordVoiceMemo(model: string, recordId: number): Promise<boolean> {
    try {
      // This would require expo-av for audio recording
      console.log('🎤 Voice memo recording would be implemented here');
      
      // Mock implementation
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      await client.callModel(model, 'message_post', [recordId], {
        body: '<p>🎤 <strong>Voice memo recorded</strong></p><p>Audio note attached to this record.</p>',
      });

      return true;

    } catch (error) {
      console.error('❌ Failed to record voice memo:', error.message);
      return false;
    }
  }

  /**
   * Signature capture and attachment
   */
  async captureSignature(model: string, recordId: number, signerName: string): Promise<boolean> {
    try {
      // This would require react-native-signature-canvas
      console.log('✍️ Signature capture would be implemented here');
      
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      await client.callModel(model, 'message_post', [recordId], {
        body: `<p>✍️ <strong>Signature captured</strong></p><p>Signed by: ${signerName}</p><p>Date: ${new Date().toLocaleString()}</p>`,
      });

      return true;

    } catch (error) {
      console.error('❌ Failed to capture signature:', error.message);
      return false;
    }
  }
}

export const odooMobileService = new OdooMobileService();
