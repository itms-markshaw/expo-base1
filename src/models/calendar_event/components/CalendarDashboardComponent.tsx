/**
 * Calendar Dashboard Component
 * Shows today's calendar events and activities in a unified view
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { calendarService } from '../services/CalendarEventService';
import { authService } from '../../base/services/BaseAuthService';
import * as Calendar from 'expo-calendar';

interface CalendarItem {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: 'event' | 'activity';
  location?: string;
  notes?: string;
  color: string;
  isAllDay?: boolean;
}

export default function CalendarDashboardComponent() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadCalendarData();
  }, [selectedDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCalendarEvents(),
        loadOdooActivities(),
      ]);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const events = await calendarService.getEventsForDateRange(startOfDay, endOfDay);
      
      const calendarItems: CalendarItem[] = events.map(event => ({
        id: event.id,
        title: event.title,
        startTime: new Date(event.startDate),
        endTime: new Date(event.endDate),
        type: 'event',
        location: event.location,
        notes: event.notes,
        color: '#007AFF',
        isAllDay: event.allDay,
      }));

      setItems(prevItems => [
        ...prevItems.filter(item => item.type !== 'event'),
        ...calendarItems,
      ]);

    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  };

  const loadOdooActivities = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Load both activities and calendar events
      const [activities, calendarEvents] = await Promise.all([
        client.searchRead('mail.activity',
          [
            ['user_id', '=', client.uid],
            ['date_deadline', '=', dateStr]
          ],
          ['id', 'summary', 'note', 'date_deadline', 'activity_type_id'],
          { order: 'date_deadline asc' }
        ),
        client.searchRead('calendar.event',
          [
            '|',
            ['start', '>=', dateStr + ' 00:00:00'],
            ['start', '<=', dateStr + ' 23:59:59']
          ],
          ['id', 'name', 'start', 'stop', 'description', 'location', 'partner_ids', 'user_id', 'allday'],
          { order: 'start asc' }
        )
      ]);

      const activityItems: CalendarItem[] = activities.map(activity => {
        const deadline = new Date(activity.date_deadline + 'T09:00:00'); // Default to 9 AM
        return {
          id: `activity_${activity.id}`,
          title: activity.summary,
          startTime: deadline,
          endTime: new Date(deadline.getTime() + 60 * 60 * 1000), // 1 hour duration
          type: 'activity',
          notes: activity.note,
          color: getActivityTypeColor(activity.activity_type_id[0]),
        };
      });

      const eventItems: CalendarItem[] = calendarEvents.map(event => {
        const startTime = new Date(event.start);
        const endTime = new Date(event.stop);
        return {
          id: `event_${event.id}`,
          title: event.name,
          startTime,
          endTime,
          type: 'event',
          notes: event.description,
          location: event.location,
          isAllDay: event.allday,
          color: '#007AFF', // Default blue for calendar events
        };
      });

      setItems(prevItems => [
        ...prevItems.filter(item => item.type !== 'activity' && item.type !== 'event'),
        ...activityItems,
        ...eventItems,
      ]);

    } catch (error) {
      console.error('Failed to load Odoo activities:', error);
    }
  };

  const getActivityTypeColor = (typeId: number) => {
    const colors = {
      1: '#34C759', // Call
      2: '#FF9500', // Meeting
      3: '#007AFF', // Email
      4: '#9C27B0', // To Do
    };
    return colors[typeId as keyof typeof colors] || '#666';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCalendarData();
    setRefreshing(false);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const sortedItems = items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const groupItemsByHour = () => {
    const groups: { [hour: string]: CalendarItem[] } = {};
    
    sortedItems.forEach(item => {
      if (item.isAllDay) {
        const key = 'All Day';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      } else {
        const hour = item.startTime.getHours();
        const key = `${hour.toString().padStart(2, '0')}:00`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    });

    return groups;
  };

  const groupedItems = groupItemsByHour();

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('prev')}>
          <MaterialIcons name="chevron-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.dateButton} onPress={goToToday}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <Text style={styles.dateSubtext}>
            {selectedDate.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('next')}>
          <MaterialIcons name="chevron-right" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Calendar Items */}
      <ScrollView 
        style={styles.itemsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {Object.keys(groupedItems).length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-available" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No events today</Text>
            <Text style={styles.emptySubtext}>
              Your calendar is clear for {formatDate(selectedDate)}
            </Text>
          </View>
        ) : (
          Object.entries(groupedItems).map(([timeSlot, timeItems]) => (
            <View key={timeSlot} style={styles.timeSlot}>
              <View style={styles.timeSlotHeader}>
                <Text style={styles.timeSlotTitle}>{timeSlot}</Text>
                <View style={styles.timeSlotLine} />
              </View>
              
              {timeItems.map((item) => (
                <TouchableOpacity key={item.id} style={styles.calendarItem}>
                  <View style={[styles.itemIndicator, { backgroundColor: item.color }]} />
                  
                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.itemMeta}>
                        <MaterialIcons 
                          name={item.type === 'event' ? 'event' : 'assignment'} 
                          size={12} 
                          color="#666" 
                        />
                        <Text style={styles.itemType}>
                          {item.type === 'event' ? 'Event' : 'Activity'}
                        </Text>
                      </View>
                    </View>
                    
                    {!item.isAllDay && (
                      <Text style={styles.itemTime}>
                        {formatTime(item.startTime)} - {formatTime(item.endTime)}
                      </Text>
                    )}
                    
                    {item.location && (
                      <View style={styles.itemLocation}>
                        <MaterialIcons name="location-on" size={12} color="#666" />
                        <Text style={styles.itemLocationText} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    )}
                    
                    {item.notes && (
                      <Text style={styles.itemNotes} numberOfLines={2}>
                        {item.notes}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  navButton: {
    padding: 8,
    borderRadius: 6,
  },
  dateButton: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dateSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemsList: {
    flex: 1,
    padding: 16,
  },
  timeSlot: {
    marginBottom: 24,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  timeSlotTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 60,
  },
  timeSlotLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  calendarItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemType: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  itemTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  itemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  itemLocationText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  itemNotes: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
