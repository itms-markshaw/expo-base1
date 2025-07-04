/**
 * CalendarEventService - Calendar Integration Service
 * Model-specific service for calendar.event
 *
 * MIGRATED: From src/services/calendarService.ts
 * Native calendar access, event creation, and Odoo activity sync
 */

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { authService } from '../../base/services/BaseAuthService';

export interface CalendarEvent {
  id?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  alarms?: Calendar.Alarm[];
  recurrenceRule?: Calendar.RecurrenceRule;
  availability?: Calendar.Availability;
  calendarId?: string;
}

export interface OdooActivity {
  id?: number;
  summary: string;
  date_deadline: string;
  note?: string;
  activity_type_id: number;
  res_model: string;
  res_id: number;
  user_id: number;
  calendar_event_id?: string;
}

class CalendarService {
  private defaultCalendarId: string | null = null;

  /**
   * Request calendar permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const remindersStatus = await Calendar.requestRemindersPermissionsAsync();
        return remindersStatus.status === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Failed to request calendar permissions:', error);
      return false;
    }
  }

  /**
   * Get available calendars
   */
  async getCalendars(): Promise<Calendar.Calendar[]> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permission not granted');
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      // Filter to writable calendars
      return calendars.filter(calendar => 
        calendar.allowsModifications && 
        calendar.source.name !== 'Subscribed Calendars'
      );
    } catch (error) {
      console.error('Failed to get calendars:', error);
      return [];
    }
  }

  /**
   * Get or create default calendar for Odoo activities
   */
  async getDefaultCalendar(): Promise<string | null> {
    try {
      if (this.defaultCalendarId) {
        return this.defaultCalendarId;
      }

      const calendars = await this.getCalendars();
      
      // Look for existing Odoo calendar
      let odooCalendar = calendars.find(cal => 
        cal.title.toLowerCase().includes('odoo') || 
        cal.title.toLowerCase().includes('activities')
      );

      if (!odooCalendar) {
        // Find primary calendar or create new one
        odooCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];
        
        if (!odooCalendar) {
          // Create new calendar if none available
          const defaultSource = await Calendar.getDefaultCalendarAsync();
          if (defaultSource) {
            const newCalendarId = await Calendar.createCalendarAsync({
              title: 'Odoo Activities',
              color: '#007AFF',
              entityType: Calendar.EntityTypes.EVENT,
              sourceId: defaultSource.source.id,
              source: defaultSource.source,
              name: 'Odoo Activities',
              ownerAccount: defaultSource.source.name,
              accessLevel: Calendar.CalendarAccessLevel.OWNER,
            });
            this.defaultCalendarId = newCalendarId;
            return newCalendarId;
          }
        }
      }

      if (odooCalendar) {
        this.defaultCalendarId = odooCalendar.id;
        return odooCalendar.id;
      }

      return null;
    } catch (error) {
      console.error('Failed to get default calendar:', error);
      return null;
    }
  }

  /**
   * Create calendar event from Odoo activity
   */
  async createEventFromActivity(activity: OdooActivity): Promise<string | null> {
    try {
      const calendarId = await this.getDefaultCalendar();
      if (!calendarId) {
        throw new Error('No calendar available');
      }

      // Parse activity deadline
      const deadline = new Date(activity.date_deadline);
      const startDate = new Date(deadline);
      const endDate = new Date(deadline.getTime() + 60 * 60 * 1000); // 1 hour duration

      // Create calendar event
      const eventDetails: Calendar.Event = {
        title: activity.summary,
        startDate,
        endDate,
        notes: activity.note || `Odoo Activity - ${activity.res_model}`,
        location: undefined,
        alarms: [
          { relativeOffset: -15 }, // 15 minutes before
          { relativeOffset: -60 }, // 1 hour before
        ],
        availability: Calendar.Availability.BUSY,
      };

      const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
      
      // Update Odoo activity with calendar event ID
      if (activity.id) {
        await this.updateOdooActivityWithEventId(activity.id, eventId);
      }

      console.log(`✅ Created calendar event: ${eventId} for activity: ${activity.summary}`);
      return eventId;

    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return null;
    }
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> {
    try {
      const eventDetails: Partial<Calendar.Event> = {};
      
      if (updates.title) eventDetails.title = updates.title;
      if (updates.startDate) eventDetails.startDate = updates.startDate;
      if (updates.endDate) eventDetails.endDate = updates.endDate;
      if (updates.notes) eventDetails.notes = updates.notes;
      if (updates.location) eventDetails.location = updates.location;
      if (updates.alarms) eventDetails.alarms = updates.alarms;

      await Calendar.updateEventAsync(eventId, eventDetails);
      console.log(`✅ Updated calendar event: ${eventId}`);
      return true;

    } catch (error) {
      console.error('Failed to update calendar event:', error);
      return false;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    try {
      await Calendar.deleteEventAsync(eventId);
      console.log(`✅ Deleted calendar event: ${eventId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      return false;
    }
  }

  /**
   * Get calendar events for date range
   */
  async getEventsForDateRange(startDate: Date, endDate: Date): Promise<Calendar.Event[]> {
    try {
      const calendars = await this.getCalendars();
      const calendarIds = calendars.map(cal => cal.id);

      if (calendarIds.length === 0) {
        return [];
      }

      const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
      return events;

    } catch (error) {
      console.error('Failed to get calendar events:', error);
      return [];
    }
  }

  /**
   * Sync Odoo activity with calendar
   */
  async syncActivityWithCalendar(activity: OdooActivity): Promise<string | null> {
    try {
      // Check if activity already has calendar event
      if (activity.calendar_event_id) {
        // Update existing event
        const deadline = new Date(activity.date_deadline);
        const success = await this.updateCalendarEvent(activity.calendar_event_id, {
          title: activity.summary,
          startDate: deadline,
          endDate: new Date(deadline.getTime() + 60 * 60 * 1000),
          notes: activity.note,
        });
        
        return success ? activity.calendar_event_id : null;
      } else {
        // Create new event
        return await this.createEventFromActivity(activity);
      }
    } catch (error) {
      console.error('Failed to sync activity with calendar:', error);
      return null;
    }
  }

  /**
   * Update Odoo activity with calendar event ID
   */
  private async updateOdooActivityWithEventId(activityId: number, eventId: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Note: This would require a custom field in Odoo to store calendar_event_id
      // For now, we'll store it in the activity note
      const activity = await client.read('mail.activity', activityId, ['note']);
      if (activity.length > 0) {
        const currentNote = activity[0].note || '';
        const updatedNote = `${currentNote}\n[Calendar Event ID: ${eventId}]`;
        
        await client.update('mail.activity', activityId, {
          note: updatedNote,
        });
      }
    } catch (error) {
      console.error('Failed to update Odoo activity with event ID:', error);
    }
  }

  /**
   * Extract calendar event ID from activity note
   */
  extractEventIdFromNote(note: string): string | null {
    if (!note) return null;
    
    const match = note.match(/\[Calendar Event ID: ([^\]]+)\]/);
    return match ? match[1] : null;
  }

  /**
   * Create activity with calendar integration
   */
  async createActivityWithCalendar(activityData: Omit<OdooActivity, 'id'>): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Create Odoo activity
      const activityId = await client.create('mail.activity', activityData);
      
      // Create calendar event
      const eventId = await this.createEventFromActivity({
        ...activityData,
        id: activityId,
      });

      if (eventId) {
        console.log(`✅ Created activity ${activityId} with calendar event ${eventId}`);
      }

      return activityId;

    } catch (error) {
      console.error('Failed to create activity with calendar:', error);
      return null;
    }
  }

  /**
   * Delete activity and its calendar event
   */
  async deleteActivityWithCalendar(activityId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get activity to find calendar event ID
      const activity = await client.read('mail.activity', activityId, ['note']);
      if (activity.length > 0) {
        const eventId = this.extractEventIdFromNote(activity[0].note);
        if (eventId) {
          await this.deleteCalendarEvent(eventId);
        }
      }

      // Delete Odoo activity
      await client.delete('mail.activity', activityId);
      
      console.log(`✅ Deleted activity ${activityId} and its calendar event`);
      return true;

    } catch (error) {
      console.error('Failed to delete activity with calendar:', error);
      return false;
    }
  }

  /**
   * Get today's calendar events
   */
  async getTodaysEvents(): Promise<Calendar.Event[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return await this.getEventsForDateRange(startOfDay, endOfDay);
  }

  /**
   * Get this week's calendar events
   */
  async getWeekEvents(): Promise<Calendar.Event[]> {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7);
    
    return await this.getEventsForDateRange(startOfWeek, endOfWeek);
  }

  /**
   * Check for calendar conflicts
   */
  async checkForConflicts(startDate: Date, endDate: Date): Promise<Calendar.Event[]> {
    try {
      const events = await this.getEventsForDateRange(startDate, endDate);
      
      return events.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        return (
          (startDate >= eventStart && startDate < eventEnd) ||
          (endDate > eventStart && endDate <= eventEnd) ||
          (startDate <= eventStart && endDate >= eventEnd)
        );
      });
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
      return [];
    }
  }
}

export const calendarService = new CalendarService();
