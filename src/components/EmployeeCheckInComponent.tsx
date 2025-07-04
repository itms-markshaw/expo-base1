/**
 * Employee Check-In Component
 * GPS-enabled attendance tracking with location logging
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { authService } from '../models/base/services/BaseAuthService';

interface AttendanceRecord {
  id: number;
  check_in: string;
  check_out?: string;
  worked_hours: number;
  employee_id: [number, string];
}

interface LocationLog {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  timestamp: string;
}

export default function EmployeeCheckInComponent() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationLog | null>(null);
  const [attendanceModuleAvailable, setAttendanceModuleAvailable] = useState(true);
  const [warningShown, setWarningShown] = useState(false);

  useEffect(() => {
    loadAttendanceStatus();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for check-in/out');
        return;
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

      const addressString = address.length > 0 
        ? `${address[0].street || ''} ${address[0].city || ''} ${address[0].region || ''}`.trim()
        : 'Unknown location';

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        address: addressString,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Failed to get location:', error);
      Alert.alert('Location Error', 'Failed to get current location');
    } finally {
      setLocationLoading(false);
    }
  };

  const loadAttendanceStatus = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Get current user's employee record
      const employees = await client.searchRead('hr.employee',
        [['user_id', '=', client.uid]],
        ['id', 'name']
      );

      if (employees.length === 0) {
        Alert.alert('Error', 'No employee record found for current user');
        return;
      }

      const employeeId = employees[0].id;

      try {
        // Check for open attendance (checked in but not out)
        const openAttendance = await client.searchRead('hr.attendance',
          [
            ['employee_id', '=', employeeId],
            ['check_out', '=', false]
          ],
          ['id', 'check_in', 'employee_id'],
          { limit: 1, order: 'check_in desc' }
        );

        if (openAttendance.length > 0) {
          setIsCheckedIn(true);
          setCurrentAttendance(openAttendance[0]);
        } else {
          setIsCheckedIn(false);
          setCurrentAttendance(null);
        }

        // Get recent attendance records
        const recentRecords = await client.searchRead('hr.attendance',
          [['employee_id', '=', employeeId]],
          ['id', 'check_in', 'check_out', 'worked_hours', 'employee_id'],
          { limit: 10, order: 'check_in desc' }
        );

        setRecentAttendance(recentRecords);

      } catch (attendanceError: any) {
        // HR Attendance module not installed
        if (attendanceError.message?.includes("hr.attendance doesn't exist")) {
          console.log('📝 HR Attendance module not available - using demo mode');
          setAttendanceModuleAvailable(false);
          setIsCheckedIn(false);
          setCurrentAttendance(null);
          setRecentAttendance([]);
          // Only show alert once per component lifecycle
          if (!warningShown) {
            Alert.alert('Info', 'HR Attendance module not installed. Check-in functionality is disabled.');
            setWarningShown(true);
          }
        } else {
          throw attendanceError;
        }
      }

    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!attendanceModuleAvailable) {
      Alert.alert('Feature Unavailable', 'HR Attendance module not installed. Check-in functionality is disabled.');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Location Required', 'Please wait for location to be detected');
      return;
    }

    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get employee ID
      const employees = await client.searchRead('hr.employee', 
        [['user_id', '=', client.uid]], 
        ['id', 'name']
      );

      if (employees.length === 0) {
        throw new Error('No employee record found');
      }

      const employeeId = employees[0].id;

      // Create attendance record
      const attendanceData = {
        employee_id: employeeId,
        check_in: new Date().toISOString(),
      };

      try {
        const attendanceId = await client.create('hr.attendance', attendanceData);
      } catch (attendanceError: any) {
        if (attendanceError.message?.includes("hr.attendance doesn't exist")) {
          Alert.alert('Error', 'HR Attendance module not installed. Check-in functionality is disabled.');
          return;
        } else {
          throw attendanceError;
        }
      }

      // Log location
      await logLocationActivity('check_in', currentLocation);

      // Post chatter message
      await client.callModel('hr.employee', 'message_post', [employeeId], {
        body: `<p>✅ <strong>Checked In</strong></p>
               <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
               <p><strong>Location:</strong> ${currentLocation.address}</p>
               <p><strong>Coordinates:</strong> ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}</p>`,
      });

      setIsCheckedIn(true);
      await loadAttendanceStatus();
      
      Alert.alert('Success', 'Checked in successfully!');

    } catch (error) {
      console.error('Check-in failed:', error);
      Alert.alert('Error', `Check-in failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceModuleAvailable) {
      Alert.alert('Feature Unavailable', 'HR Attendance module not installed. Check-out functionality is disabled.');
      return;
    }

    if (!currentAttendance) {
      Alert.alert('Error', 'No active check-in found');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Location Required', 'Please wait for location to be detected');
      return;
    }

    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Update attendance record with check-out time
      try {
        await client.update('hr.attendance', currentAttendance.id, {
          check_out: new Date().toISOString(),
        });
      } catch (attendanceError: any) {
        if (attendanceError.message?.includes("hr.attendance doesn't exist")) {
          Alert.alert('Error', 'HR Attendance module not installed. Check-out functionality is disabled.');
          return;
        } else {
          throw attendanceError;
        }
      }

      // Log location
      await logLocationActivity('check_out', currentLocation);

      // Calculate worked hours
      const checkInTime = new Date(currentAttendance.check_in);
      const checkOutTime = new Date();
      const workedHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // Get employee ID
      const employees = await client.searchRead('hr.employee', 
        [['user_id', '=', client.uid]], 
        ['id']
      );

      if (employees.length > 0) {
        // Post chatter message
        await client.callModel('hr.employee', 'message_post', [employees[0].id], {
          body: `<p>🏁 <strong>Checked Out</strong></p>
                 <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                 <p><strong>Location:</strong> ${currentLocation.address}</p>
                 <p><strong>Hours Worked:</strong> ${workedHours.toFixed(2)} hours</p>`,
        });
      }

      setIsCheckedIn(false);
      setCurrentAttendance(null);
      await loadAttendanceStatus();
      
      Alert.alert('Success', `Checked out successfully! Worked ${workedHours.toFixed(2)} hours`);

    } catch (error) {
      console.error('Check-out failed:', error);
      Alert.alert('Error', `Check-out failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logLocationActivity = async (activityType: 'check_in' | 'check_out', location: LocationLog) => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Try to create location log (custom model)
      const locationData = {
        user_id: client.uid,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address,
        activity_type: activityType,
        timestamp: location.timestamp,
      };

      try {
        await client.create('hr.attendance.location', locationData);
      } catch (modelError) {
        // Model might not exist, that's okay
        console.log('Location log model not available, skipping');
      }

    } catch (error) {
      console.error('Failed to log location:', error);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Current Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialIcons 
            name={isCheckedIn ? "work" : "work-off"} 
            size={32} 
            color={isCheckedIn ? "#34C759" : "#666"} 
          />
          <Text style={styles.statusTitle}>
            {!attendanceModuleAvailable
              ? "Attendance Unavailable"
              : isCheckedIn
                ? "Currently Working"
                : "Not Checked In"
            }
          </Text>
        </View>

        {!attendanceModuleAvailable ? (
          <View style={styles.unavailableInfo}>
            <Text style={styles.unavailableText}>
              HR Attendance module not installed
            </Text>
            <Text style={styles.unavailableSubtext}>
              Contact your administrator to enable attendance features
            </Text>
          </View>
        ) : isCheckedIn && currentAttendance ? (
          <View style={styles.workingInfo}>
            <Text style={styles.workingText}>
              Started at {formatTime(currentAttendance.check_in)}
            </Text>
            <Text style={styles.workingSubtext}>
              {formatDate(currentAttendance.check_in)}
            </Text>
          </View>
        ) : null}

        {/* Location Info */}
        <View style={styles.locationInfo}>
          <MaterialIcons name="location-on" size={20} color="#007AFF" />
          {locationLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginLeft: 8 }} />
          ) : currentLocation ? (
            <View style={styles.locationDetails}>
              <Text style={styles.locationText}>{currentLocation.address}</Text>
              <Text style={styles.locationCoords}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <Text style={styles.locationError}>Location not available</Text>
          )}
        </View>

        {/* Check In/Out Button */}
        <TouchableOpacity
          style={[
            styles.checkButton,
            isCheckedIn ? styles.checkOutButton : styles.checkInButton,
            !attendanceModuleAvailable && styles.disabledButton
          ]}
          onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={loading || !currentLocation || !attendanceModuleAvailable}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <MaterialIcons 
                name={isCheckedIn ? "logout" : "login"} 
                size={24} 
                color="#FFF" 
              />
              <Text style={styles.checkButtonText}>
                {isCheckedIn ? "Check Out" : "Check In"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Attendance */}
      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Recent Attendance</Text>
        
        {recentAttendance.map((record) => (
          <View key={record.id} style={styles.attendanceRecord}>
            <View style={styles.attendanceDate}>
              <Text style={styles.attendanceDateText}>
                {formatDate(record.check_in)}
              </Text>
            </View>
            
            <View style={styles.attendanceTimes}>
              <View style={styles.timeEntry}>
                <MaterialIcons name="login" size={16} color="#34C759" />
                <Text style={styles.timeText}>{formatTime(record.check_in)}</Text>
              </View>
              
              {record.check_out ? (
                <View style={styles.timeEntry}>
                  <MaterialIcons name="logout" size={16} color="#FF3B30" />
                  <Text style={styles.timeText}>{formatTime(record.check_out)}</Text>
                </View>
              ) : (
                <View style={styles.timeEntry}>
                  <MaterialIcons name="schedule" size={16} color="#FF9500" />
                  <Text style={[styles.timeText, styles.workingText]}>Working...</Text>
                </View>
              )}
            </View>
            
            {record.worked_hours > 0 && (
              <View style={styles.hoursWorked}>
                <Text style={styles.hoursText}>
                  {formatDuration(record.worked_hours)}
                </Text>
              </View>
            )}
          </View>
        ))}

        {recentAttendance.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="schedule" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>No attendance records</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  statusCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  workingInfo: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  workingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  workingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  unavailableInfo: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  unavailableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  unavailableSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  locationDetails: {
    marginLeft: 8,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  locationError: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkInButton: {
    backgroundColor: '#34C759',
  },
  checkOutButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
    opacity: 0.6,
  },
  checkButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  historyCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  attendanceRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  attendanceDate: {
    width: 80,
  },
  attendanceDateText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  attendanceTimes: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  hoursWorked: {
    width: 60,
    alignItems: 'flex-end',
  },
  hoursText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
