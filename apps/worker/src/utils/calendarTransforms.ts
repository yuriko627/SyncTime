/**
 * Calendar Data Transformation Utilities
 * Converts Google Calendar events to privacy-focused schedule blocks for KeepSync documents
 */

// Privacy-focused schedule block (no sensitive calendar details)
export interface ScheduleBlock {
  startTime: string;
  endTime: string;
  lastSyncAt: number;
}

/**
 * Create a schedule block with explicit field order
 */
function createScheduleBlock(startTime: string, endTime: string, lastSyncAt: number): ScheduleBlock {
  // Use object literal with explicit property order
  return {
    startTime,
    endTime,
    lastSyncAt
  };
}

// Legacy interface for backward compatibility
export interface TonkScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  attendees?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  
  // Source tracking
  sourceCalendarId: string;   // Google Calendar ID
  sourceEventId: string;      // Original Google event ID
  calendarName?: string;
  
  // Worker metadata (following Tonk patterns)
  importedBy: string;         // Worker/user who imported this
  createdAt: number;          // Unix timestamp
  updatedAt: number;          // Unix timestamp
  lastSyncAt: number;         // When last synced from Google
}

export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  created?: string;
  updated?: string;
}

/**
 * Transform Google Calendar event to Tonk schedule format for KeepSync documents
 */
export function transformGoogleEventToTonk(
  googleEvent: GoogleCalendarEvent,
  sourceCalendarId: string,
  calendarName?: string,
  importedBy: string = 'calendar-worker'
): TonkScheduleEvent {
  // Determine if it's an all-day event
  const isAllDay = Boolean(googleEvent.start?.date && googleEvent.end?.date);
  
  // Get start and end times
  const startTime = googleEvent.start?.dateTime || googleEvent.start?.date || '';
  const endTime = googleEvent.end?.dateTime || googleEvent.end?.date || '';
  
  // Extract attendee emails
  const attendees = googleEvent.attendees?.map(attendee => 
    attendee.displayName || attendee.email || ''
  ).filter(Boolean) || [];

  // Map Google status to our format
  const mapStatus = (status?: string): 'confirmed' | 'tentative' | 'cancelled' => {
    switch (status) {
      case 'confirmed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  };

  const now = Date.now();
  
  // Generate internal ID (different from Google event ID)
  const internalId = `${sourceCalendarId}_${googleEvent.id || Math.random().toString(36).substring(2, 15)}`;

  const event: TonkScheduleEvent = {
    id: internalId,
    title: googleEvent.summary || 'Untitled Event',
    startTime,
    endTime,
    isAllDay,
    status: mapStatus(googleEvent.status),
    
    // Source tracking
    sourceCalendarId,
    sourceEventId: googleEvent.id || '',
    
    // Worker metadata (Unix timestamps)
    importedBy,
    createdAt: now,
    updatedAt: now,
    lastSyncAt: now,
  };

  // Only add optional properties if they have valid values
  if (googleEvent.description) {
    event.description = googleEvent.description;
  }
  
  if (googleEvent.location) {
    event.location = googleEvent.location;
  }
  
  if (attendees.length > 0) {
    event.attendees = attendees;
  }
  
  if (calendarName) {
    event.calendarName = calendarName;
  }

  return event;
}

/**
 * Transform array of Google Calendar events to Tonk format
 */
export function transformGoogleEventsToTonk(
  googleEvents: GoogleCalendarEvent[],
  sourceCalendarId: string,
  calendarName?: string,
  importedBy: string = 'calendar-worker'
): TonkScheduleEvent[] {
  return googleEvents.map(event => 
    transformGoogleEventToTonk(event, sourceCalendarId, calendarName, importedBy)
  );
}

/**
 * Convert events array to Record format for KeepSync document storage
 */
export function eventsToDocumentFormat(events: TonkScheduleEvent[]): Record<string, TonkScheduleEvent> {
  return events.reduce((acc, event) => {
    acc[event.id] = event;
    return acc;
  }, {} as Record<string, TonkScheduleEvent>);
}

/**
 * Convert Record format back to events array
 */
export function documentFormatToEvents(eventsRecord: Record<string, TonkScheduleEvent>): TonkScheduleEvent[] {
  return Object.values(eventsRecord);
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: TonkScheduleEvent[],
  startDate: string,
  endDate: string
): TonkScheduleEvent[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return events.filter(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    
    // Event overlaps with the date range
    return eventStart <= end && eventEnd >= start;
  });
}

/**
 * Sort events by start time
 */
export function sortEventsByStartTime(events: TonkScheduleEvent[]): TonkScheduleEvent[] {
  return events.sort((a, b) => {
    const timeA = new Date(a.startTime).getTime();
    const timeB = new Date(b.startTime).getTime();
    return timeA - timeB;
  });
}

/**
 * Generate a summary of events for a date range
 */
export function generateEventsSummary(events: TonkScheduleEvent[]): {
  total: number;
  confirmed: number;
  tentative: number;
  cancelled: number;
  allDay: number;
  withLocation: number;
  withAttendees: number;
} {
  return {
    total: events.length,
    confirmed: events.filter(e => e.status === 'confirmed').length,
    tentative: events.filter(e => e.status === 'tentative').length,
    cancelled: events.filter(e => e.status === 'cancelled').length,
    allDay: events.filter(e => e.isAllDay).length,
    withLocation: events.filter(e => e.location).length,
    withAttendees: events.filter(e => e.attendees?.length).length
  };
}

/**
 * Transform Google Calendar events to privacy-focused schedule blocks
 * Only includes time ranges and availability status, no sensitive details
 */
export function transformGoogleEventsToScheduleBlocks(
  googleEvents: GoogleCalendarEvent[],
  participantId: string
): ScheduleBlock[] {
  const scheduleBlocks: ScheduleBlock[] = [];
  const now = Date.now();

  googleEvents.forEach(event => {
    // Skip events without proper time information
    if (!event.id || !event.start || !event.end) {
      return;
    }

    // Skip cancelled events
    if (event.status === 'cancelled') {
      return;
    }

    // Get start and end times
    const startTime = event.start.dateTime || event.start.date;
    const endTime = event.end.dateTime || event.end.date;

    if (!startTime || !endTime) {
      return;
    }

    // Create schedule block with explicit field order
    const scheduleBlock = createScheduleBlock(startTime, endTime, now);

    scheduleBlocks.push(scheduleBlock);
  });

  return scheduleBlocks;
}

/**
 * Generate privacy-preserving block ID
 */
function generatePrivacyPreservingBlockId(googleEvent: GoogleCalendarEvent, participantId: string): string {
  const crypto = require('crypto');
  
  // Create a hash based on event time + participant, but not the actual Google event ID
  const startTime = googleEvent.start?.dateTime || googleEvent.start?.date || '';
  const endTime = googleEvent.end?.dateTime || googleEvent.end?.date || '';
  const eventSignature = `${startTime}-${endTime}-${participantId}`;
  
  // Fallback to random ID if we can't create a proper signature
  if (!startTime || !endTime) {
    return Math.random().toString(36).substring(2, 15);
  }
  
  return crypto.createHash('sha256')
    .update(eventSignature)
    .digest('hex')
    .substring(0, 15); // Keep it reasonably short
}

/**
 * Convert schedule blocks array to Record format for KeepSync document storage
 */
export function scheduleBlocksToDocumentFormat(
  scheduleBlocks: ScheduleBlock[], 
  participantId: string,
  googleEvents: GoogleCalendarEvent[]
): Record<string, ScheduleBlock> {
  return scheduleBlocks.reduce((acc, block, index) => {
    // Use privacy-preserving ID instead of exposing Google event ID
    const googleEvent = googleEvents[index];
    const blockId = `${participantId}-${googleEvent ? generatePrivacyPreservingBlockId(googleEvent, participantId) : Math.random().toString(36).substring(2, 15)}`;
    acc[blockId] = block;
    return acc;
  }, {} as Record<string, ScheduleBlock>);
}

/**
 * Convert Record format back to schedule blocks array
 */
export function documentFormatToScheduleBlocks(blocksRecord: Record<string, ScheduleBlock>): ScheduleBlock[] {
  return Object.values(blocksRecord);
}

/**
 * Filter schedule blocks by date range
 */
export function filterScheduleBlocksByDateRange(
  scheduleBlocks: ScheduleBlock[],
  startDate: string,
  endDate: string
): ScheduleBlock[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return scheduleBlocks.filter(block => {
    const blockStart = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);
    
    // Block overlaps with the date range
    return blockStart <= end && blockEnd >= start;
  });
}