/**
 * Calendar Integration Component
 * Schedule activities with native calendar integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { calendarService, CalendarEvent } from '../services/calendarService';
import * as Calendar from 'expo-calendar';

interface CalendarIntegrationProps {
  visible: boolean;
  onClose: () => void;
  onActivityCreated?: (activityId: number) => void;
  initialData?: {
    summary?: string;
    date?: Date;
    note?: string;
  };
}

export default function CalendarIntegrationComponent({
  visible,
  onClose,
  onActivityCreated,
  initialData,
}: CalendarIntegrationProps) {
  const [loading, setLoading] = useState(false);
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [conflicts, setConflicts] = useState<Calendar.Event[]>([]);
  
  // Form data
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [startDate, setStartDate] = useState(initialData?.date || new Date());
  const [endDate, setEndDate] = useState(
    new Date((initialData?.date || new Date()).getTime() + 60 * 60 * 1000)
  );
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true);
  const [setReminders, setSetReminders] = useState(true);
  const [allDay, setAllDay] = useState(false);
  
  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    if (visible) {
      loadCalendars();
    }
  }, [visible]);

  useEffect(() => {
    if (createCalendarEvent && startDate && endDate) {
      checkForConflicts();
    }
  }, [startDate, endDate, createCalendarEvent]);

  const loadCalendars = async () => {
    try {
      const availableCalendars = await calendarService.getCalendars();
      setCalendars(availableCalendars);
      
      if (availableCalendars.length > 0) {
        const defaultCalendar = await calendarService.getDefaultCalendar();
        setSelectedCalendar(defaultCalendar || availableCalendars[0].id);
      }
    } catch (error) {
      console.error('Failed to load calendars:', error);
      Alert.alert('Error', 'Failed to access calendar. Please check permissions.');
    }
  };

  const checkForConflicts = async () => {
    try {
      const conflictingEvents = await calendarService.checkForConflicts(startDate, endDate);
      setConflicts(conflictingEvents);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date, isStart: boolean = true) => {
    if (selectedDate) {
      if (isStart) {
        setStartDate(selectedDate);
        // Auto-adjust end date if it's before start date
        if (selectedDate >= endDate) {
          setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000));
        }
      } else {
        setEndDate(selectedDate);
      }
    }
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  const createActivity = async () => {
    if (!summary.trim()) {
      Alert.alert('Error', 'Please enter an activity summary');
      return;
    }

    setLoading(true);
    try {
      const activityData = {
        summary: summary.trim(),
        note: note.trim(),
        date_deadline: startDate.toISOString().split('T')[0],
        activity_type_id: 1, // Default activity type
        res_model: 'res.partner',
        res_id: 1, // Default record
        user_id: 1, // Will be set by service
      };

      let activityId: number | null = null;

      if (createCalendarEvent) {
        // Create activity with calendar integration
        activityId = await calendarService.createActivityWithCalendar(activityData);
      } else {
        // Create activity only (would need direct Odoo service call)
        console.log('Creating activity without calendar integration');
        // This would use the regular activity creation method
      }

      if (activityId) {
        onActivityCreated?.(activityId);
        onClose();
        resetForm();
        Alert.alert('Success', 'Activity created successfully!');
      } else {
        Alert.alert('Error', 'Failed to create activity');
      }

    } catch (error) {
      console.error('Failed to create activity:', error);
      Alert.alert('Error', 'Failed to create activity');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSummary('');
    setNote('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 60 * 60 * 1000));
    setCreateCalendarEvent(true);
    setSetReminders(true);
    setAllDay(false);
    setConflicts([]);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Activity</Text>
          <TouchableOpacity onPress={createActivity} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.saveButton}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Activity Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Details</Text>
            
            <Text style={styles.inputLabel}>Summary *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What needs to be done?"
              value={summary}
              onChangeText={setSummary}
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Additional details..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>
            
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Text style={styles.inputLabel}>Start</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    setDatePickerMode('date');
                    setShowStartPicker(true);
                  }}
                >
                  <MaterialIcons name="event" size={20} color="#007AFF" />
                  <Text style={styles.dateTimeText}>
                    {startDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                {!allDay && (
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => {
                      setDatePickerMode('time');
                      setShowStartPicker(true);
                    }}
                  >
                    <MaterialIcons name="access-time" size={20} color="#007AFF" />
                    <Text style={styles.dateTimeText}>
                      {formatTime(startDate)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dateTimeItem}>
                <Text style={styles.inputLabel}>End</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => {
                    setDatePickerMode('date');
                    setShowEndPicker(true);
                  }}
                >
                  <MaterialIcons name="event" size={20} color="#007AFF" />
                  <Text style={styles.dateTimeText}>
                    {endDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                {!allDay && (
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => {
                      setDatePickerMode('time');
                      setShowEndPicker(true);
                    }}
                  >
                    <MaterialIcons name="access-time" size={20} color="#007AFF" />
                    <Text style={styles.dateTimeText}>
                      {formatTime(endDate)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>All Day</Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Calendar Integration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calendar Integration</Text>
            
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Add to Calendar</Text>
                <Text style={styles.switchSubtext}>Create event in device calendar</Text>
              </View>
              <Switch
                value={createCalendarEvent}
                onValueChange={setCreateCalendarEvent}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor="#FFF"
              />
            </View>

            {createCalendarEvent && (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Set Reminders</Text>
                  <Switch
                    value={setReminders}
                    onValueChange={setSetReminders}
                    trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                    thumbColor="#FFF"
                  />
                </View>

                {calendars.length > 0 && (
                  <View style={styles.calendarSelector}>
                    <Text style={styles.inputLabel}>Calendar</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {calendars.map((calendar) => (
                        <TouchableOpacity
                          key={calendar.id}
                          style={[
                            styles.calendarOption,
                            selectedCalendar === calendar.id && styles.calendarOptionSelected,
                            { borderColor: calendar.color }
                          ]}
                          onPress={() => setSelectedCalendar(calendar.id)}
                        >
                          <View style={[styles.calendarColor, { backgroundColor: calendar.color }]} />
                          <Text style={[
                            styles.calendarName,
                            selectedCalendar === calendar.id && styles.calendarNameSelected
                          ]}>
                            {calendar.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <View style={styles.conflictsSection}>
              <View style={styles.conflictsHeader}>
                <MaterialIcons name="warning" size={20} color="#FF9500" />
                <Text style={styles.conflictsTitle}>Schedule Conflicts</Text>
              </View>
              {conflicts.slice(0, 3).map((conflict, index) => (
                <View key={index} style={styles.conflictItem}>
                  <Text style={styles.conflictTitle}>{conflict.title}</Text>
                  <Text style={styles.conflictTime}>
                    {formatDateTime(new Date(conflict.startDate))} - {formatTime(new Date(conflict.endDate))}
                  </Text>
                </View>
              ))}
              {conflicts.length > 3 && (
                <Text style={styles.moreConflicts}>
                  +{conflicts.length - 3} more conflicts
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode={datePickerMode}
            display="default"
            onChange={(event, date) => handleDateChange(event, date, true)}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode={datePickerMode}
            display="default"
            onChange={(event, date) => handleDateChange(event, date, false)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  switchSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  calendarSelector: {
    marginTop: 16,
  },
  calendarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  calendarOptionSelected: {
    backgroundColor: '#007AFF15',
  },
  calendarColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarName: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  calendarNameSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  conflictsSection: {
    backgroundColor: '#FFF5E6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  conflictsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  conflictsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8860B',
  },
  conflictItem: {
    marginBottom: 8,
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  conflictTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  moreConflicts: {
    fontSize: 12,
    color: '#B8860B',
    fontStyle: 'italic',
  },
});
