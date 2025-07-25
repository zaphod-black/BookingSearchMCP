# BookingSearchMCP

BookingSearchMCP is a high-performance Model Context Protocol (MCP) server designed for real-time booking availability searches in voice-driven applications. Built specifically for integration with 11Labs voice agents, it provides sub-100ms response times for live customer interactions during phone conversations.

## Overview

BookingSearchMCP serves as the search and discovery layer for booking systems, offering fast availability lookups across multiple platforms while seamlessly integrating with payment processing systems. The system is architected for voice-first interactions, providing conversational responses optimized for speech synthesis.

### Key Features

- **Ultra-Fast Response Times**: Sub-100ms search responses optimized for voice interactions
- **Multi-Platform Support**: Modular adapter system supporting Google Calendar, with extensibility for FareHarbor, Rezdy, and other booking platforms
- **Voice-Optimized Output**: Responses formatted for natural speech synthesis with appropriate length constraints
- **Intelligent Caching**: 10-minute TTL memory cache with pre-warming capabilities for common searches
- **Real-Time Validation**: Live availability confirmation to prevent double-bookings
- **Seamless Payment Integration**: Direct handoff to CorePaymentMCP for complete payment automation
- **Performance Monitoring**: Built-in metrics collection and slow request alerting
- **Production-Ready**: Comprehensive error handling, logging, and Docker support

## Architecture

The system follows a three-tier architecture optimized for voice interactions:

```
Voice Agent (11Labs)
       |
       v
BookingSearchMCP (MCP Protocol)
  |-- search_availability
  |-- validate_booking_selection
  |-- prepare_payment_handoff
       |
       v
CorePaymentMCP Integration
  |-- Stripe Payment Processing
  |-- Automated Email Systems
  |-- Calendar Management
  |-- Customer Service Workflows
```

### Component Architecture

- **MCP Server Layer**: Implements the Model Context Protocol for tool-based interactions
- **Booking Adapters**: Platform-specific implementations for different booking systems
- **Voice Cache**: High-performance in-memory caching optimized for common voice queries
- **Performance Monitor**: Real-time metrics collection and alerting system
- **Integration Layer**: Seamless handoff to external payment and automation systems

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Google Service Account (for Google Calendar integration)
- Access to CorePaymentMCP system (for payment processing)

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/zaphod-black/BookingSearchMCP.git
cd BookingSearchMCP
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Build and start the server:**
```bash
npm run build
npm start
```

For development with hot reloading:
```bash
npm run dev
```

## Configuration

### Environment Variables

The system requires the following environment variables:

#### Server Configuration
```bash
NODE_ENV=production|development
PORT=3001
MCP_SERVER_NAME=booking-search-mcp
```

#### CorePaymentMCP Integration
```bash
CORE_PAYMENT_MCP_URL=http://localhost:3000
CORE_PAYMENT_WEBHOOK_ENDPOINT=/api/v1/elevenlabs/webhook/trigger-booking
```

#### Google Calendar Integration
```bash
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### Performance Tuning
```bash
CACHE_TTL_SECONDS=600
CACHE_WARM_UP_ENABLED=true
ENABLE_PERFORMANCE_MONITORING=true
SLOW_REQUEST_THRESHOLD_MS=100
```

#### Business Logic
```bash
BUSINESS_HOURS_START=9
BUSINESS_HOURS_END=17
TIMEZONE=America/Chicago
MAX_VOICE_RESPONSE_LENGTH=200
DEFAULT_PARTY_SIZE_LIMIT=20
```

### Google Service Account Setup

1. Create a Google Cloud Project
2. Enable the Google Calendar API
3. Create a Service Account with Calendar access
4. Download the service account key
5. Extract the email and private key for environment variables

## MCP Protocol Implementation

BookingSearchMCP implements three core MCP tools for voice agent integration:

### 1. search_availability

Searches for available booking slots with voice-optimized responses.

**Input Schema:**
```json
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-22", 
  "partySize": 4,
  "activityType": "whale watching",
  "platform": "gcalendar",
  "sessionId": "voice-session-123",
  "priceMin": 25,
  "priceMax": 100
}
```

**Response Format:**
```json
{
  "content": [{
    "type": "text",
    "text": "Perfect! I found 3 available times for whale watching. The earliest is Saturday January 15th at 10 AM for forty five dollars per person."
  }],
  "_meta": {
    "availableOptions": [...],
    "sessionId": "voice-session-123",
    "responseTime": 67,
    "totalOptions": 3
  }
}
```

### 2. validate_booking_selection

Validates and temporarily reserves a selected booking option.

**Input Schema:**
```json
{
  "sessionId": "voice-session-123",
  "selectedOptionId": "gcal_2024-01-15T10:00:00Z_abc123",
  "customerInfo": {
    "name": "John Smith",
    "phone": "+1-555-123-4567",
    "email": "john@example.com"
  }
}
```

### 3. prepare_payment_handoff

Prepares validated booking for handoff to CorePaymentMCP payment system.

**Input Schema:**
```json
{
  "sessionId": "voice-session-123",
  "customerContactPreference": "email"
}
```

## Voice Integration Workflow

The complete voice call workflow follows this sequence:

1. **Inbound Call**: Customer calls requesting booking information
2. **Voice Search**: Agent calls `search_availability` tool
3. **Results Presentation**: Agent reads voice-optimized availability summary
4. **Customer Selection**: Customer chooses preferred time slot
5. **Booking Validation**: Agent calls `validate_booking_selection` tool
6. **Call Completion**: Agent confirms booking and ends call
7. **Payment Automation**: System calls `prepare_payment_handoff` tool
8. **CorePaymentMCP Integration**: Automated payment link delivery and monitoring

### Example Voice Integration

```javascript
// 11Labs voice agent implementation
const agent = new ElevenLabsAgent({
  mcpTools: ['search_availability', 'validate_booking_selection', 'prepare_payment_handoff']
});

// During voice call
agent.onUserMessage('I need whale watching for 4 people next weekend', async () => {
  const searchResult = await agent.callMCPTool('search_availability', {
    startDate: '2024-01-20',
    endDate: '2024-01-21', 
    partySize: 4,
    activityType: 'whale watching'
  });
  
  return agent.speak(searchResult.content[0].text);
});

// After customer selection
agent.onUserMessage('I want the 10 AM slot', async () => {
  const validationResult = await agent.callMCPTool('validate_booking_selection', {
    sessionId: currentSessionId,
    selectedOptionId: selectedSlotId,
    customerInfo: collectedCustomerInfo
  });
  
  return agent.speak(validationResult.content[0].text);
});
```

## Booking Platform Adapters

The system uses a modular adapter pattern to support multiple booking platforms:

### Current Adapters

#### MockSearchAdapter
- **Purpose**: Testing and development
- **Features**: Realistic booking data simulation
- **Response Time**: 20-50ms simulated delay
- **Activities**: Whale watching, kayaking, fishing, snorkeling, dolphin tours

#### GoogleCalendarSearchAdapter  
- **Purpose**: Google Calendar integration
- **Features**: Live calendar availability checking
- **Business Hours**: Configurable working hours
- **Validation**: Real-time slot availability confirmation

### Adding Custom Adapters

To integrate a new booking platform:

1. **Create Adapter Class:**
```typescript
export class CustomPlatformAdapter extends BaseBookingAdapter {
  name = 'custom-platform';
  
  async searchAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    // Platform-specific API integration
    const results = await this.platformAPI.searchBookings(query);
    
    return {
      success: true,
      spokenSummary: this.generateVoiceSummary(results, query),
      availableSlots: this.formatResults(results),
      totalOptions: results.length,
      responseTime: performance.now() - query.startTime,
      conversationContext: {
        sessionId: query.sessionId,
        searchCriteria: query,
        platform: this.name
      }
    };
  }
  
  async validateAvailability(availabilityId: string): Promise<boolean> {
    // Platform-specific validation logic
    return await this.platformAPI.checkAvailability(availabilityId);
  }
}
```

2. **Register Adapter:**
```typescript
// In BookingSearchTools constructor
this.adapters.set('custom-platform', new CustomPlatformAdapter());
```

3. **Update Configuration:**
Add platform-specific environment variables and documentation.

## Performance Characteristics

### Response Time Targets

- **search_availability**: <100ms (95th percentile)
- **validate_booking_selection**: <50ms
- **prepare_payment_handoff**: <200ms

### Optimization Features

#### Intelligent Caching
- **Cache Duration**: 10-minute TTL with automatic cleanup
- **Pre-warming**: Common searches cached on startup
- **Cache Keys**: Query-based composite keys for efficient lookups
- **Memory Management**: Automatic cleanup of expired entries

#### Voice Optimization
- **Response Length**: Limited to 200 characters for natural speech
- **Result Limiting**: Maximum 10 options per search for voice clarity
- **Natural Language**: Spoken prices and dates for TTS systems

#### Connection Management
- **API Pooling**: Persistent connections to external services
- **Timeout Handling**: Configurable request timeouts
- **Retry Logic**: Automatic retry for transient failures

### Performance Monitoring

The system includes comprehensive performance monitoring:

```typescript
// Automatic metrics collection
const metrics = performanceMonitor.getMetrics();
console.log({
  totalRequests: metrics.totalRequests,
  averageResponseTime: metrics.averageResponseTime,
  slowRequests: metrics.slowRequests,
  toolMetrics: metrics.toolMetrics
});
```

#### Monitoring Features
- Real-time response time tracking
- Slow request alerting (configurable threshold)
- Tool-specific performance metrics
- Periodic performance reporting

## CorePaymentMCP Integration

BookingSearchMCP integrates seamlessly with the CorePaymentMCP system for complete payment automation:

### Integration Flow

1. **Booking Validation**: Customer selection validated and reserved
2. **Handoff Preparation**: Booking data formatted for payment system
3. **Webhook Trigger**: POST request to CorePaymentMCP automation endpoint
4. **Payment Automation**: CorePaymentMCP handles complete payment workflow

### CorePaymentMCP Automation Features

The integration leverages these existing CorePaymentMCP capabilities:

- **Stripe Payment Links**: Professional branded payment processing
- **Gmail Email System**: Automated email delivery with custom templates
- **Real-time Payment Monitoring**: 30-second interval payment checking
- **Google Calendar Integration**: Automatic calendar event creation
- **Customer Service Workflows**: Timeout handling with professional follow-up
- **Database Management**: Complete transaction and booking record keeping

### Webhook Payload

```json
{
  "customerName": "John Smith",
  "customerEmail": "john@example.com", 
  "customerPhone": "+1-555-123-4567",
  "activityName": "Whale Watching Adventure",
  "activityDateTime": "2024-01-15T10:00:00Z",
  "partySize": 4,
  "totalAmount": 180.00,
  "currency": "USD",
  "voiceSessionId": "voice-session-123",
  "bookingPlatform": "gcalendar",
  "meetingLocation": "Harbor Dock A"
}
```

## Testing

### Test Suite Structure

```bash
tests/
├── unit/           # Individual component tests
├── integration/    # End-to-end workflow tests  
└── performance/    # Response time validation tests
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Performance tests only
npm test -- --testPathPattern=performance
```

### Test Categories

#### Unit Tests
- Voice cache functionality
- Adapter base class behavior
- Performance monitoring accuracy
- Utility function validation

#### Integration Tests
- Complete MCP tool workflows
- Multi-adapter compatibility
- CorePaymentMCP integration
- Error handling scenarios

#### Performance Tests
- Response time validation
- Concurrent request handling
- Cache effectiveness
- Memory usage optimization

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t booking-search-mcp:latest .

# Run container
docker run -d \
  --name booking-search-mcp \
  -p 3001:3001 \
  --env-file .env \
  booking-search-mcp:latest
```

### Docker Compose with CorePaymentMCP

```yaml
version: '3.8'
services:
  booking-search-mcp:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - CORE_PAYMENT_MCP_URL=http://core-payment-mcp:3000
    depends_on:
      - core-payment-mcp
      
  core-payment-mcp:
    image: core-payment-mcp:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

### Production Deployment Checklist

#### Configuration
- [ ] Set NODE_ENV=production
- [ ] Configure Google Service Account credentials
- [ ] Verify CorePaymentMCP connectivity
- [ ] Set appropriate cache TTL values
- [ ] Configure business hours and timezone

#### Security
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS for external communications
- [ ] Implement rate limiting for public endpoints
- [ ] Configure appropriate CORS policies

#### Monitoring
- [ ] Set up log aggregation (ELK, Splunk, etc.)
- [ ] Configure performance monitoring alerts
- [ ] Implement health check endpoints
- [ ] Set up error notification systems

#### Scaling
- [ ] Configure horizontal scaling if needed
- [ ] Implement load balancing for multiple instances
- [ ] Monitor memory usage and cache effectiveness
- [ ] Plan for peak usage scenarios

## API Reference

### Health Check Endpoint

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

### MCP Protocol Endpoints

BookingSearchMCP implements the standard MCP protocol:

#### Tool Discovery
```json
{
  "method": "tools/list",
  "params": {}
}
```

#### Tool Execution
```json
{
  "method": "tools/call",
  "params": {
    "name": "search_availability",
    "arguments": {
      "startDate": "2024-01-15",
      "endDate": "2024-01-22",
      "partySize": 4
    }
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "content": [{
    "type": "text", 
    "text": "I apologize, but I encountered an error while searching for availability. Please try again."
  }],
  "_meta": {
    "error": true,
    "errorCode": "SEARCH_FAILED",
    "errorMessage": "External API timeout"
  }
}
```

### Common Error Scenarios

#### Search Failures
- External API timeouts
- Invalid date ranges
- Platform connectivity issues
- Authentication failures

#### Validation Errors
- Expired search sessions
- Invalid availability IDs
- Booking conflicts
- Insufficient capacity

#### Integration Errors
- CorePaymentMCP connectivity issues
- Webhook delivery failures
- Authentication problems
- Payload validation errors

## Security Considerations

### Data Protection
- Customer information is temporarily stored only during active sessions
- All sensitive data is cleared after session expiration
- API credentials are stored as environment variables only

### API Security
- Input validation on all MCP tool parameters
- Rate limiting to prevent abuse
- Secure communication with external services
- Proper error handling to prevent information leakage

### Authentication
- Google Service Account authentication for Calendar API
- Secure webhook authentication with CorePaymentMCP
- Environment-based credential management

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-adapter`
3. Install dependencies: `npm install`
4. Make changes with appropriate tests
5. Ensure all tests pass: `npm test`
6. Verify performance requirements: `npm run test:performance`
7. Submit a pull request

### Coding Standards

- Follow TypeScript best practices
- Maintain sub-100ms response times for voice tools
- Include comprehensive test coverage
- Update documentation for new features
- Follow semantic versioning for releases

### Adapter Development Guidelines

When creating new booking platform adapters:

1. Extend the `BaseBookingAdapter` class
2. Implement required abstract methods
3. Follow voice optimization patterns
4. Include platform-specific tests
5. Document configuration requirements
6. Ensure error handling consistency

## License

This project is licensed under the ISC License. See the LICENSE file for details.

## Support

For issues, feature requests, or questions:

- Create a GitHub issue for bug reports
- Submit pull requests for enhancements
- Check the troubleshooting section for common issues
- Review logs in the `logs/` directory for debugging

### Troubleshooting

#### Common Issues

**Slow Response Times**
- Check external API connectivity
- Verify cache configuration
- Monitor system resource usage
- Review performance metrics

**Google Calendar Integration Issues**
- Verify service account credentials
- Check calendar permissions
- Validate calendar ID format
- Review API quota limits

**CorePaymentMCP Integration Problems**
- Confirm CorePaymentMCP is running on expected port
- Verify webhook endpoint configuration
- Check network connectivity between services
- Review payload format compatibility