import { BaseBookingAdapter } from './base-adapter';
import { AvailabilityQuery, AvailabilityResponse, AvailabilitySlot } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MockSearchAdapter extends BaseBookingAdapter {
  name = 'mock';
  private mockActivities = [
    { name: 'Whale Watching Adventure', basePrice: 45, duration: '3 hours', location: 'Harbor Dock A' },
    { name: 'Sunset Kayaking Tour', basePrice: 35, duration: '2 hours', location: 'Beach Launch Point B' },
    { name: 'Deep Sea Fishing Expedition', basePrice: 85, duration: '6 hours', location: 'Marina Pier C' },
    { name: 'Snorkeling Experience', basePrice: 55, duration: '4 hours', location: 'Coral Bay Dock' },
    { name: 'Dolphin Encounter Tour', basePrice: 65, duration: '3.5 hours', location: 'Marine Center Dock' }
  ];
  
  async searchAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    const startTime = performance.now();
    
    // Simulate realistic API delay
    await this.simulateDelay(20, 50);
    
    // Generate mock availability slots
    const slots = this.generateMockSlots(query);
    
    const responseTime = performance.now() - startTime;
    this.logPerformance('searchAvailability', startTime);
    
    return {
      success: true,
      spokenSummary: this.generateVoiceSummary(slots, query),
      availableSlots: slots,
      totalOptions: slots.length,
      responseTime,
      conversationContext: {
        sessionId: query.sessionId || `mock-${Date.now()}`,
        searchCriteria: query,
        platform: this.name
      }
    };
  }
  
  async validateAvailability(availabilityId: string): Promise<boolean> {
    // Simulate validation delay
    await this.simulateDelay(10, 30);
    
    // Mock validation - 95% success rate
    return Math.random() > 0.05;
  }
  
  private generateMockSlots(query: AvailabilityQuery): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    
    // Filter activities based on query
    let activities = [...this.mockActivities];
    if (query.activityType) {
      activities = activities.filter(act => 
        act.name.toLowerCase().includes(query.activityType!.toLowerCase())
      );
    }
    
    // If no activities match, return empty
    if (activities.length === 0) {
      return slots;
    }
    
    // Generate time slots for each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Skip past dates
      if (currentDate < new Date()) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Generate 2-4 time slots per day per activity
      for (const activity of activities) {
        const timesPerDay = Math.floor(Math.random() * 3) + 2;
        const timeSlots = this.generateDayTimeSlots(currentDate, timesPerDay);
        
        for (const timeSlot of timeSlots) {
          // Random availability (5-20 spots)
          const spotsAvailable = Math.floor(Math.random() * 16) + 5;
          
          // Check if party size fits
          if (spotsAvailable < query.partySize) {
            continue;
          }
          
          // Price variation (+/- 20%)
          const priceVariation = 0.8 + (Math.random() * 0.4);
          const price = Math.round(activity.basePrice * priceVariation);
          
          // Apply price filters if specified
          if (query.priceMin && price < query.priceMin) continue;
          if (query.priceMax && price > query.priceMax) continue;
          
          const slot: AvailabilitySlot = {
            availabilityId: `mock-${uuidv4()}`,
            activityName: activity.name,
            spokenDateTime: this.generateSpokenDateTime(timeSlot),
            displayDateTime: timeSlot.toISOString(),
            duration: activity.duration,
            pricePerPerson: price,
            spotsAvailable,
            spokenPrice: this.generateSpokenPrice(price),
            meetingLocation: activity.location,
            totalCapacity: spotsAvailable + Math.floor(Math.random() * 10),
            description: `Experience the best ${activity.name.toLowerCase()} with our expert guides!`
          };
          
          slots.push(slot);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sort by date/time
    slots.sort((a, b) => 
      new Date(a.displayDateTime).getTime() - new Date(b.displayDateTime).getTime()
    );
    
    // Limit results for voice optimization
    return slots.slice(0, 10);
  }
  
  private generateDayTimeSlots(date: Date, count: number): Date[] {
    const slots: Date[] = [];
    const possibleHours = [9, 10, 11, 14, 15, 16]; // Morning and afternoon slots
    
    // Randomly select hours
    const selectedHours = possibleHours
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    
    for (const hour of selectedHours) {
      const slotDate = new Date(date);
      slotDate.setHours(hour, 0, 0, 0);
      
      // Skip if in the past
      if (slotDate > new Date()) {
        slots.push(slotDate);
      }
    }
    
    return slots.sort((a, b) => a.getTime() - b.getTime());
  }
}