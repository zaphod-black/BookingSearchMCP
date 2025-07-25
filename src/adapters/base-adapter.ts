import { AvailabilityQuery, AvailabilityResponse, AvailabilitySlot } from '../types';
import { logger } from '../utils/logger';

export abstract class BaseBookingAdapter {
  abstract name: string;
  
  abstract searchAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse>;
  
  abstract validateAvailability(availabilityId: string): Promise<boolean>;
  
  protected async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  protected generateSpokenDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    return date.toLocaleString('en-US', options).replace(' at ', ' at ');
  }
  
  protected generateSpokenPrice(price: number): string {
    const dollars = Math.floor(price);
    const cents = Math.round((price - dollars) * 100);
    
    if (cents === 0) {
      return `${dollars} dollar${dollars !== 1 ? 's' : ''}`;
    }
    
    return `${dollars} dollars and ${cents} cents`;
  }
  
  protected calculateTotal(pricePerPerson: number, partySize: number): string {
    const total = pricePerPerson * partySize;
    return this.generateSpokenPrice(total);
  }
  
  protected generateVoiceSummary(slots: AvailabilitySlot[], query: AvailabilityQuery): string {
    if (slots.length === 0) {
      return `I'm sorry, I don't see any availability for ${query.activityType || 'that activity'} during those dates.`;
    }
    
    const first = slots[0];
    if (slots.length === 1) {
      return `I found one available time for ${query.activityType || first.activityName}. It's ${first.spokenDateTime} for ${first.spokenPrice} per person.`;
    }
    
    return `Perfect! I found ${slots.length} available ${slots.length === 1 ? 'time' : 'times'} for ${query.activityType || first.activityName}. The earliest is ${first.spokenDateTime} for ${first.spokenPrice} per person.`;
  }
  
  protected logPerformance(operation: string, startTime: number): void {
    const duration = performance.now() - startTime;
    logger.info(`${this.name} adapter: ${operation} completed`, { duration });
    
    if (duration > 100) {
      logger.warn(`${this.name} adapter: Slow operation detected`, { operation, duration });
    }
  }
}