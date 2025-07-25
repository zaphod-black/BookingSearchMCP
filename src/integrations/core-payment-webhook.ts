import { ValidatedBookingData, CorePaymentHandoff, AutomationResult } from '../types';
import { logger } from '../utils/logger';

export class CorePaymentWebhookClient {
  private readonly webhookUrl: string;
  private readonly timeout: number = 30000; // 30 seconds
  
  constructor() {
    const baseUrl = process.env.CORE_PAYMENT_MCP_URL || 'http://localhost:3000';
    const endpoint = process.env.CORE_PAYMENT_WEBHOOK_ENDPOINT || '/api/v1/elevenlabs/webhook/trigger-booking';
    this.webhookUrl = `${baseUrl}${endpoint}`;
  }
  
  async triggerCompleteAutomation(bookingData: ValidatedBookingData & { contactPreference?: string }): Promise<AutomationResult> {
    const startTime = performance.now();
    
    // Prepare payload for CorePaymentMCP
    const payload: CorePaymentHandoff = {
      customerName: bookingData.customerInfo.name,
      customerEmail: bookingData.customerInfo.email,
      customerPhone: bookingData.customerInfo.phone,
      activityName: bookingData.activityName,
      activityDateTime: bookingData.displayDateTime,
      partySize: bookingData.partySize,
      totalAmount: bookingData.totalAmount,
      currency: 'USD',
      voiceSessionId: bookingData.sessionId,
      bookingPlatform: bookingData.platform,
      meetingLocation: bookingData.meetingLocation,
      additionalInfo: {
        duration: bookingData.duration,
        pricePerPerson: bookingData.pricePerPerson,
        contactPreference: bookingData.contactPreference,
        validatedAt: bookingData.validatedAt
      }
    };
    
    try {
      logger.info('Triggering CorePaymentMCP automation', { 
        webhookUrl: this.webhookUrl,
        sessionId: bookingData.sessionId 
      });
      
      const response = await this.makeWebhookRequest(payload);
      
      if (!response.ok) {
        throw new Error(`CorePaymentMCP webhook failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json() as any;
      const responseTime = performance.now() - startTime;
      
      logger.info('CorePaymentMCP automation triggered successfully', { 
        sessionId: bookingData.sessionId,
        responseTime,
        confirmationNumber: result.data?.confirmationNumber
      });
      
      // Return voice-optimized automation result
      return {
        success: true,
        spokenResponse: this.generateVoiceResponse(result, bookingData),
        automationTriggered: true,
        paymentLinkSent: result.data?.emailSent || false,
        confirmationNumber: result.data?.confirmationNumber,
        monitoringStarted: result.data?.monitoringStarted || false,
        expiresAt: result.data?.expiresAt,
        
        // What CorePaymentMCP handles automatically
        automationPipeline: {
          stripePaymentLink: 'Created with professional branding and booking details',
          emailDelivery: 'Branded Gmail template sent with payment link and booking summary',
          paymentMonitoring: 'Real-time Stripe API polling started (30-second intervals)',
          successPath: 'Payment detected → Google Calendar event created → Confirmation email sent',
          timeoutPath: 'No payment in 24 hours → Customer service follow-up email with contact info',
          customerService: 'Phone: (832) 477-1310, Email: hello@zbware.com'
        }
      };
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      logger.error('CorePaymentMCP automation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: bookingData.sessionId,
        responseTime,
        webhookUrl: this.webhookUrl
      });
      
      return {
        success: false,
        automationTriggered: false,
        paymentLinkSent: false,
        monitoringStarted: false,
        error: error instanceof Error ? error.message : 'Payment automation failed',
        fallbackAction: 'Manual customer service follow-up required'
      };
    }
  }
  
  private async makeWebhookRequest(payload: CorePaymentHandoff): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BookingSearchMCP/1.0.0',
          'X-Source': 'voice-booking'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`CorePaymentMCP webhook timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }
  
  private generateVoiceResponse(corePaymentResult: any, bookingData: ValidatedBookingData): string {
    const customerName = bookingData.customerInfo.name;
    const activityName = bookingData.activityName;
    
    if (corePaymentResult.success) {
      return `Thank you ${customerName}! I've successfully reserved your ${activityName} and sent a secure payment link to your email. You'll receive your booking confirmation once payment is complete. Our system will monitor for payment and automatically create your calendar event.`;
    } else {
      return `I've reserved your ${activityName}, ${customerName}, but there was an issue sending the payment link. Our customer service team will contact you shortly at ${bookingData.customerInfo.phone} to complete your booking.`;
    }
  }
  
  // Health check method to verify CorePaymentMCP is accessible
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      const healthUrl = this.webhookUrl.replace('/webhook/trigger-booking', '/health');
      const response = await fetch(healthUrl, { method: 'GET' });
      
      const responseTime = performance.now() - startTime;
      
      return {
        healthy: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}