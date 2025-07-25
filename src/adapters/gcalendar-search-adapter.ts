import { BaseBookingAdapter } from './base-adapter';
import { AvailabilityQuery, AvailabilityResponse, AvailabilitySlot } from '../types';
import { google, calendar_v3 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class GoogleCalendarSearchAdapter extends BaseBookingAdapter {
  name = 'gcalendar';
  private calendarApi!: calendar_v3.Calendar;
  private calendarId: string;
  private businessHours: { start: number; end: number };
  
  constructor() {
    super();
    this.initializeGoogleCalendar();
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    this.businessHours = {
      start: parseInt(process.env.BUSINESS_HOURS_START || '9'),
      end: parseInt(process.env.BUSINESS_HOURS_END || '17')
    };
  }
  
  private initializeGoogleCalendar(): void {
    try {
      // Initialize with service account credentials from environment
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });
      
      this.calendarApi = google.calendar({ version: 'v3', auth });
      logger.info('Google Calendar API initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Calendar API', { error });
      throw error;
    }
  }
  
  async searchAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    const startTime = performance.now();
    
    try {
      // Get existing events (busy times)
      const busyEvents = await this.getBusyTimes(query.startDate, query.endDate);
      
      // Generate available time slots
      const availableSlots = this.generateAvailableSlots(
        query.startDate,
        query.endDate,
        busyEvents,
        query
      );
      
      // Filter by price if specified
      let filteredSlots = availableSlots;
      if (query.priceMin !== undefined || query.priceMax !== undefined) {
        filteredSlots = availableSlots.filter(slot => {
          if (query.priceMin !== undefined && slot.pricePerPerson < query.priceMin) {
            return false;
          }
          if (query.priceMax !== undefined && slot.pricePerPerson > query.priceMax) {
            return false;
          }
          return true;
        });
      }
      
      const responseTime = performance.now() - startTime;
      this.logPerformance('searchAvailability', startTime);
      
      return {
        success: true,
        spokenSummary: this.generateVoiceSummary(filteredSlots.slice(0, 5), query), // Use first 5 for summary
        availableSlots: filteredSlots.slice(0, 5), // Limit to 5 for voice optimization
        totalOptions: Math.min(filteredSlots.length, 5), // Show limited count for voice
        responseTime,
        conversationContext: {
          sessionId: query.sessionId || `gcal-${Date.now()}`,
          searchCriteria: query,
          platform: this.name
        }
      };
      
    } catch (error) {
      logger.error('Google Calendar search error', { error, query });
      
      return {
        success: false,
        spokenSummary: 'I apologize, but I encountered an error while checking availability. Please try again.',
        availableSlots: [],
        totalOptions: 0,
        responseTime: performance.now() - startTime,
        conversationContext: {
          sessionId: query.sessionId || `gcal-error-${Date.now()}`,
          searchCriteria: query,
          platform: this.name
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async validateAvailability(availabilityId: string): Promise<boolean> {
    try {
      // Extract date/time from availability ID
      const [, dateTimeStr] = availabilityId.split('_');
      if (!dateTimeStr) return false;
      
      const slotDateTime = new Date(dateTimeStr);
      const endDateTime = new Date(slotDateTime.getTime() + 60 * 60 * 1000); // 1 hour slot
      
      // Check if time slot is still available
      const events = await this.calendarApi.events.list({
        calendarId: this.calendarId,
        timeMin: slotDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      // If no events in this time slot, it's available
      return !events.data.items || events.data.items.length === 0;
      
    } catch (error) {
      logger.error('Validation error', { error, availabilityId });
      return false;
    }
  }
  
  private async getBusyTimes(startDate: string, endDate: string): Promise<calendar_v3.Schema$Event[]> {
    try {
      const response = await this.calendarApi.events.list({
        calendarId: this.calendarId,
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate + 'T23:59:59').toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      return response.data.items || [];
    } catch (error) {
      logger.error('Failed to get busy times', { error });
      return [];
    }
  }
  
  private generateAvailableSlots(
    startDate: string,
    endDate: string,
    busyEvents: calendar_v3.Schema$Event[],
    query: AvailabilityQuery
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    // Create a set of busy times for quick lookup
    const busyTimes = new Set<string>();
    busyEvents.forEach(event => {
      if (event.start?.dateTime) {
        const eventDate = new Date(event.start.dateTime);
        busyTimes.add(this.getTimeKey(eventDate));
      }
    });
    
    while (currentDate <= end && slots.length < 10) { // Limit to 10 slots for performance
      // Skip weekends if configured
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Skip past dates
      if (currentDate < new Date()) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Generate slots for business hours (limit to 2 per day for voice optimization)
      let dailySlots = 0;
      for (let hour = this.businessHours.start; hour < this.businessHours.end && dailySlots < 2; hour++) {
        const slotTime = new Date(currentDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Skip if in the past
        if (slotTime <= new Date()) {
          continue;
        }
        
        // Skip if busy
        const timeKey = this.getTimeKey(slotTime);
        if (busyTimes.has(timeKey)) {
          continue;
        }
        
        // Create available slot
        const slot = this.createAvailabilitySlot(slotTime, query);
        if (slot) {
          slots.push(slot);
          dailySlots++;
        }
        
        // Stop if we have enough slots
        if (slots.length >= 10) break;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }
  
  private createAvailabilitySlot(dateTime: Date, query: AvailabilityQuery): AvailabilitySlot | null {
    // Determine activity details based on query
    const activityName = query.activityType || 'Activity Booking';
    const duration = '1 hour'; // Default slot duration
    const basePrice = 50; // Default price - in production, this would come from a pricing service
    
    // Calculate price with some variation
    const priceVariation = 0.9 + (Math.random() * 0.2); // +/- 10%
    const price = Math.round(basePrice * priceVariation);
    
    // Random availability (10-30 spots)
    const totalCapacity = Math.floor(Math.random() * 21) + 10;
    const bookedSpots = Math.floor(Math.random() * (totalCapacity * 0.7)); // Up to 70% booked
    const spotsAvailable = totalCapacity - bookedSpots;
    
    // Check if party size fits
    if (spotsAvailable < query.partySize) {
      return null;
    }
    
    return {
      availabilityId: `gcal_${dateTime.toISOString()}_${uuidv4().substring(0, 8)}`,
      activityName,
      spokenDateTime: this.generateSpokenDateTime(dateTime),
      displayDateTime: dateTime.toISOString(),
      duration,
      pricePerPerson: price,
      spotsAvailable,
      spokenPrice: this.generateSpokenPrice(price),
      meetingLocation: 'Main Office', // In production, this would be dynamic
      totalCapacity,
      description: `Book your ${activityName} experience`
    };
  }
  
  private getTimeKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }
}