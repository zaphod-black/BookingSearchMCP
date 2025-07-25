export interface AvailabilityQuery {
  startDate: string;
  endDate: string;
  partySize: number;
  activityType?: string;
  platform?: string;
  sessionId?: string;
  startTime?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
}

export interface AvailabilitySlot {
  availabilityId: string;
  activityName: string;
  spokenDateTime: string;
  displayDateTime: string;
  duration: string;
  pricePerPerson: number;
  spotsAvailable: number;
  spokenPrice: string;
  meetingLocation: string;
  totalCapacity?: number;
  description?: string;
}

export interface AvailabilityResponse {
  success: boolean;
  spokenSummary: string;
  availableSlots: AvailabilitySlot[];
  totalOptions: number;
  responseTime: number;
  conversationContext: {
    sessionId: string;
    searchCriteria: AvailabilityQuery;
    platform: string;
  };
  error?: string;
}

export interface VoiceOptimizedResponse {
  spokenSummary: string;
  conversationContext: any;
  responseTime: number;
  voiceOptimized: boolean;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface ValidatedBookingData {
  availabilityId: string;
  activityName: string;
  displayDateTime: string;
  duration: string;
  pricePerPerson: number;
  partySize: number;
  totalAmount: number;
  customerInfo: CustomerInfo;
  sessionId: string;
  validatedAt: string;
  platform: string;
  meetingLocation: string;
}

export interface CorePaymentHandoff {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  activityName: string;
  activityDateTime: string;
  partySize: number;
  totalAmount: number;
  currency: string;
  voiceSessionId: string;
  bookingPlatform: string;
  meetingLocation?: string;
  additionalInfo?: Record<string, any>;
}

export interface AutomationResult {
  success: boolean;
  spokenResponse?: string;
  automationTriggered: boolean;
  paymentLinkSent: boolean;
  confirmationNumber?: string;
  monitoringStarted: boolean;
  expiresAt?: string;
  error?: string;
  fallbackAction?: string;
  automationPipeline?: {
    stripePaymentLink: string;
    emailDelivery: string;
    paymentMonitoring: string;
    successPath: string;
    timeoutPath: string;
    customerService: string;
  };
}

export interface CachedResult {
  data: any;
  timestamp: number;
}

export interface MCPToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  _meta?: Record<string, any>;
  [key: string]: any;
}