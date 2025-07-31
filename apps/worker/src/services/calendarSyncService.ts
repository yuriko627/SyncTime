import { writeDoc, readDoc } from "@tonk/keepsync";
import { googleCalendarService } from "./googleCalendarService";
import { 
  transformGoogleEventsToTonk, 
  generateEventsSummary,
  eventsToDocumentFormat,
  TonkScheduleEvent,
  transformGoogleEventsToScheduleBlocks,
  scheduleBlocksToDocumentFormat,
  ScheduleBlock
} from "../utils/calendarTransforms";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

/**
 * Calendar Sync Service
 * Handles syncing calendar data between Google Calendar and KeepSync documents
 */
export class CalendarSyncService {
  
  /**
   * Test Google Calendar API connection and return basic info
   */
  async testConnection() {
    try {
      console.log("Testing Google Calendar API connection...");
      
      // Test connection
      const connectionTest = await googleCalendarService.testConnection();
      if (!connectionTest) {
        throw new Error("Failed to connect to Google Calendar API");
      }

      // List calendars
      const calendars = await googleCalendarService.listCalendars();
      console.log(`Found ${calendars.length} calendars`);

      // Get events from primary calendar (limited for testing)
      const events = await googleCalendarService.getPrimaryCalendarEvents();
      const transformedEvents = transformGoogleEventsToTonk(events, 'primary', 'Primary Calendar');
      const summary = generateEventsSummary(transformedEvents);

      console.log(`Retrieved ${transformedEvents.length} events from primary calendar`);

      return {
        success: true,
        data: {
          calendars: calendars.map(cal => ({
            id: cal.id,
            name: cal.summary,
            primary: cal.primary
          })),
          events: transformedEvents,
          summary
        }
      };
    } catch (error) {
      console.error("Error testing calendar:", error);
      throw error;
    }
  }

  /**
   * Sync events from a specific Google Calendar to KeepSync documents
   */
  async syncCalendarEvents(calendarId: string, timeMin?: string, timeMax?: string) {
    try {
      console.log(`Syncing events from calendar: ${calendarId}`);
      
      // Fetch events from Google Calendar
      const googleEvents = await googleCalendarService.getEvents(calendarId, timeMin, timeMax);
      console.log(`Fetched ${googleEvents.length} events from Google Calendar`);
      
      // Get calendar name
      const calendars = await googleCalendarService.listCalendars();
      const calendar = calendars.find(cal => cal.id === calendarId);
      const calendarName = calendar?.summary || 'Unknown Calendar';
      
      // Transform events to Tonk format
      const transformedEvents = transformGoogleEventsToTonk(
        googleEvents, 
        calendarId, 
        calendarName
      );
      
      // Convert to document format (Record)
      const eventsDocument = eventsToDocumentFormat(transformedEvents);
      
      // Write to KeepSync document
      const documentPath = `calendar/${calendarId}/events`;
      await writeDoc(documentPath, eventsDocument);
      
      console.log(`Successfully synced ${transformedEvents.length} events to ${documentPath}`);
      
      return {
        success: true,
        calendarId,
        calendarName,
        eventsCount: transformedEvents.length,
        documentPath,
        events: transformedEvents
      };
    } catch (error) {
      console.error(`Error syncing calendar ${calendarId}:`, error);
      throw error;
    }
  }

  /**
   * Sync events from primary calendar
   */
  async syncPrimaryCalendar(timeMin?: string, timeMax?: string) {
    return this.syncCalendarEvents('primary', timeMin, timeMax);
  }

  /**
   * Sync events from primary calendar using OAuth authentication
   */
  async syncPrimaryCalendarWithOAuth(oauthClient: OAuth2Client, userId: string, timeMin?: string, timeMax?: string) {
    try {
      console.log(`Syncing events for user: ${userId}`);
      
      // Initialize Google Calendar API with OAuth client
      const calendar = google.calendar({ version: 'v3', auth: oauthClient });
      
      // Set time range - default to next 30 days
      const now = new Date();
      const defaultTimeMin = now.toISOString();
      const defaultTimeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Fetch events from primary calendar
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || defaultTimeMin,
        timeMax: timeMax || defaultTimeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100
      });
      
      const googleEvents = response.data.items || [];
      console.log(`Fetched ${googleEvents.length} events from user's primary calendar`);
      
      // Transform events to Tonk format
      const transformedEvents = transformGoogleEventsToTonk(
        googleEvents, 
        'primary', 
        'Primary Calendar'
      );
      
      // Add user context to events
      const userEvents = transformedEvents.map(event => ({
        ...event,
        importedBy: userId,
        lastSyncAt: Date.now()
      }));
      
      // Convert to document format (Record)
      const eventsDocument = eventsToDocumentFormat(userEvents);
      
      // Write to user-specific KeepSync document
      const documentPath = `calendar/${userId}/events`;
      await writeDoc(documentPath, eventsDocument);
      
      console.log(`Successfully synced ${userEvents.length} events to ${documentPath}`);
      
      return {
        success: true,
        calendarId: 'primary',
        calendarName: 'Primary Calendar',
        eventCount: userEvents.length,
        documentPath,
        events: eventsDocument,
        userId
      };
    } catch (error) {
      console.error(`Error syncing calendar for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Sync participant schedule blocks for a specific event (privacy-focused)
   */
  async syncParticipantScheduleForEvent(
    oauthClient: OAuth2Client, 
    eventId: string,
    participantId: string, 
    timeMin?: string, 
    timeMax?: string
  ) {
    try {
      console.log(`Syncing schedule blocks for participant ${participantId} in event ${eventId}`);
      
      // Initialize Google Calendar API with OAuth client
      const calendar = google.calendar({ version: 'v3', auth: oauthClient });
      
      // Set time range - default to next 30 days
      const now = new Date();
      const defaultTimeMin = now.toISOString();
      const defaultTimeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Fetch events from primary calendar
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || defaultTimeMin,
        timeMax: timeMax || defaultTimeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100
      });
      
      const googleEvents = response.data.items || [];
      console.log(`Fetched ${googleEvents.length} events from participant's calendar`);
      
      // Transform to privacy-focused schedule blocks
      const scheduleBlocks = transformGoogleEventsToScheduleBlocks(googleEvents, participantId);
      
      // Convert to document format
      const scheduleDocument = scheduleBlocksToDocumentFormat(scheduleBlocks, participantId, googleEvents);
      
      // Note: Schedule blocks are now stored directly in the event document via frontend
      // No need to create separate calendar documents
      console.log(`Successfully processed ${scheduleBlocks.length} schedule blocks for participant ${participantId}`);
      
      return {
        success: true,
        eventId,
        participantId,
        scheduleBlockCount: scheduleBlocks.length,
        scheduleBlocks: scheduleDocument
      };
    } catch (error) {
      console.error(`Error syncing schedule for participant ${participantId} in event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Read synced events from KeepSync documents
   */
  async getStoredEvents(calendarId: string): Promise<TonkScheduleEvent[]> {
    try {
      const documentPath = `calendar/${calendarId}/events`;
      const eventsDocument = await readDoc<Record<string, TonkScheduleEvent>>(documentPath);
      
      if (!eventsDocument) {
        console.log(`No stored events found for calendar: ${calendarId}`);
        return [];
      }
      
      const events = Object.values(eventsDocument);
      console.log(`Retrieved ${events.length} stored events for calendar: ${calendarId}`);
      
      return events;
    } catch (error) {
      console.error(`Error reading stored events for ${calendarId}:`, error);
      throw error;
    }
  }

  /**
   * Read synced events for a specific user from KeepSync documents
   */
  async getUserStoredEvents(userId: string): Promise<TonkScheduleEvent[]> {
    try {
      const documentPath = `calendar/${userId}/events`;
      const eventsDocument = await readDoc<Record<string, TonkScheduleEvent>>(documentPath);
      
      if (!eventsDocument) {
        console.log(`No stored events found for user: ${userId}`);
        return [];
      }
      
      const events = Object.values(eventsDocument);
      console.log(`Retrieved ${events.length} stored events for user: ${userId}`);
      
      return events;
    } catch (error) {
      console.error(`Error reading stored events for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status for all calendars
   */
  async getSyncStatus() {
    try {
      // This would list all calendar documents in the future
      // For now, just check primary calendar
      const primaryEvents = await this.getStoredEvents('primary');
      
      return {
        calendars: [
          {
            id: 'primary',
            name: 'Primary Calendar',
            eventsCount: primaryEvents.length,
            lastSync: primaryEvents.length > 0 ? Math.max(...primaryEvents.map(e => e.lastSyncAt)) : null
          }
        ]
      };
    } catch (error) {
      console.error("Error getting sync status:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const calendarSyncService = new CalendarSyncService();