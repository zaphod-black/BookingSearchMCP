import { 
  AvailabilityQuery, 
  AvailabilityResponse,
  CustomerInfo,
  ValidatedBookingData,
  MCPToolResponse 
} from '../types';
import { VoiceOptimizedCache } from '../cache/voice-cache';
import { BaseBookingAdapter } from '../adapters/base-adapter';
import { MockSearchAdapter } from '../adapters/mock-search-adapter';
import { GoogleCalendarSearchAdapter } from '../adapters/gcalendar-search-adapter';
import { CorePaymentWebhookClient } from '../integrations/core-payment-webhook';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class BookingSearchTools {
  private adapters: Map<string, BaseBookingAdapter> = new Map();
  private searchContextStore: Map<string, AvailabilityResponse> = new Map();
  private validatedBookings: Map<string, ValidatedBookingData> = new Map();
  private corePaymentClient: CorePaymentWebhookClient;
  
  constructor(private cache: VoiceOptimizedCache) {
    this.initializeAdapters();
    this.corePaymentClient = new CorePaymentWebhookClient();
  }
  
  private initializeAdapters(): void {
    this.adapters.set('mock', new MockSearchAdapter());
    this.adapters.set('gcalendar', new GoogleCalendarSearchAdapter());
  }
  
  private getAdapter(platform: string = 'auto'): BaseBookingAdapter {
    if (platform === 'auto') {
      // Default to Google Calendar for now
      platform = 'gcalendar';
    }
    
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Unknown booking platform: ${platform}`);
    }
    
    return adapter;
  }
  
  private generateSessionId(): string {
    return `voice-${Date.now()}-${uuidv4().substring(0, 8)}`;
  }
  
  private generateCacheKey(query: AvailabilityQuery): string {
    return `search:${query.platform}:${query.startDate}:${query.endDate}:${query.partySize}:${query.activityType || 'any'}`;
  }
  
  private async storeSearchContext(sessionId: string, response: AvailabilityResponse): Promise<void> {
    this.searchContextStore.set(sessionId, response);
    
    // Auto-cleanup after 30 minutes
    setTimeout(() => {
      this.searchContextStore.delete(sessionId);
    }, 30 * 60 * 1000);
  }
  
  private async getSearchContext(sessionId: string): Promise<AvailabilityResponse | null> {
    return this.searchContextStore.get(sessionId) || null;
  }
  
  private async storeValidatedBooking(sessionId: string, booking: ValidatedBookingData): Promise<void> {
    this.validatedBookings.set(sessionId, booking);
    
    // Auto-cleanup after 1 hour
    setTimeout(() => {
      this.validatedBookings.delete(sessionId);
    }, 60 * 60 * 1000);
  }
  
  private async getValidatedBooking(sessionId: string): Promise<ValidatedBookingData | null> {
    return this.validatedBookings.get(sessionId) || null;
  }
  
  private createErrorResponse(message: string): MCPToolResponse {
    return {
      content: [{
        type: 'text',
        text: message
      }],
      _meta: {
        error: true
      }
    };
  }
  
  private calculateTotal(slot: { pricePerPerson: number }, partySize: number): string {
    const total = slot.pricePerPerson * partySize;
    const dollars = Math.floor(total);
    const cents = Math.round((total - dollars) * 100);
    
    if (cents === 0) {
      return `${dollars} dollars`;
    }
    
    return `${dollars} dollars and ${cents} cents`;
  }
  
  async searchAvailability(params: {
    startDate: string;
    endDate: string;
    partySize: number;
    activityType?: string;
    platform?: string;
    sessionId?: string;
    priceMin?: number;
    priceMax?: number;
  }): Promise<MCPToolResponse> {
    const query: AvailabilityQuery = {
      ...params,
      sessionId: params.sessionId || this.generateSessionId(),
      startTime: performance.now()
    };
    
    try {
      // Get appropriate adapter
      const adapter = this.getAdapter(params.platform || 'auto');
      
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      let result = await this.cache.get(cacheKey);
      
      if (!result) {
        // Search for availability
        result = await adapter.searchAvailability(query);
        
        // Cache the result
        await this.cache.set(cacheKey, result);
      }
      
      // Filter by price if specified
      if (params.priceMin !== undefined || params.priceMax !== undefined) {
        result.availableSlots = result.availableSlots.filter((slot: any) => {
          if (params.priceMin !== undefined && slot.pricePerPerson < params.priceMin) {
            return false;
          }
          if (params.priceMax !== undefined && slot.pricePerPerson > params.priceMax) {
            return false;
          }
          return true;
        });
        
        // Update summary
        result.totalOptions = result.availableSlots.length;
        result.spokenSummary = (adapter as any).generateVoiceSummary(result.availableSlots, query);
      }
      
      // Store search context for later validation
      await this.storeSearchContext(query.sessionId!, result);
      
      return {
        content: [{
          type: 'text',
          text: result.spokenSummary
        }],
        _meta: {
          availableOptions: result.availableSlots,
          sessionId: query.sessionId,
          responseTime: result.responseTime,
          totalOptions: result.totalOptions
        }
      };
      
    } catch (error) {
      logger.error('Search availability error', { error, params });
      return this.createErrorResponse('I apologize, but I encountered an error while searching for availability. Please try again.');
    }
  }
  
  async validateBookingSelection(params: {
    sessionId: string;
    selectedOptionId: string;
    customerInfo: CustomerInfo;
  }): Promise<MCPToolResponse> {
    try {
      // Retrieve stored search context
      const searchContext = await this.getSearchContext(params.sessionId);
      if (!searchContext) {
        return this.createErrorResponse('Your search session has expired. Please search for availability again.');
      }
      
      // Find selected option
      const selectedOption = searchContext.availableSlots.find(
        slot => slot.availabilityId === params.selectedOptionId
      );
      
      if (!selectedOption) {
        return this.createErrorResponse('I couldn\'t find that option. Please choose from the available times I mentioned.');
      }
      
      // Get adapter and validate availability
      const adapter = this.getAdapter(searchContext.conversationContext.platform);
      const isStillAvailable = await adapter.validateAvailability(params.selectedOptionId);
      
      if (!isStillAvailable) {
        return this.createErrorResponse('I\'m sorry, that time slot was just booked by someone else. Let me search for another option for you.');
      }
      
      // Calculate total
      const partySize = searchContext.conversationContext.searchCriteria.partySize;
      const totalAmount = selectedOption.pricePerPerson * partySize;
      
      // Store validated booking
      const validatedBooking: ValidatedBookingData = {
        ...selectedOption,
        customerInfo: params.customerInfo,
        sessionId: params.sessionId,
        validatedAt: new Date().toISOString(),
        platform: searchContext.conversationContext.platform,
        partySize,
        totalAmount
      };
      
      await this.storeValidatedBooking(params.sessionId, validatedBooking);
      
      const totalSpoken = this.calculateTotal(selectedOption, partySize);
      
      return {
        content: [{
          type: 'text',
          text: `Perfect! I've reserved ${selectedOption.activityName} for ${params.customerInfo.name} on ${selectedOption.spokenDateTime}. The total for ${partySize} ${partySize === 1 ? 'person' : 'people'} is ${totalSpoken}. I'll send you a payment link after this call.`
        }],
        _meta: {
          bookingValidated: true,
          sessionId: params.sessionId,
          validatedBooking,
          totalAmount,
          readyForPayment: true
        }
      };
      
    } catch (error) {
      logger.error('Validate booking error', { error, params });
      return this.createErrorResponse('I apologize, but I couldn\'t validate your booking selection. Please try again.');
    }
  }
  
  async preparePaymentHandoff(params: {
    sessionId: string;
    customerContactPreference: 'email' | 'sms' | 'both';
  }): Promise<MCPToolResponse> {
    try {
      const validatedBooking = await this.getValidatedBooking(params.sessionId);
      if (!validatedBooking) {
        throw new Error('No validated booking found for session');
      }
      
      // Call CorePaymentMCP webhook
      const paymentResult = await this.corePaymentClient.triggerCompleteAutomation({
        ...validatedBooking,
        contactPreference: params.customerContactPreference
      });
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment automation failed');
      }
      
      return {
        content: [{
          type: 'text',
          text: paymentResult.spokenResponse || 'Booking handoff completed successfully. Payment link has been sent.'
        }],
        _meta: {
          handoffCompleted: true,
          paymentLinkSent: paymentResult.paymentLinkSent,
          corePaymentReference: paymentResult.confirmationNumber,
          automationStarted: paymentResult.automationTriggered,
          expiresAt: paymentResult.expiresAt
        }
      };
      
    } catch (error) {
      logger.error('Payment handoff error', { error, params });
      return this.createErrorResponse('I apologize, but I couldn\'t process the payment handoff. Our customer service team will contact you shortly.');
    }
  }
}