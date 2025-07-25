# 11Labs Voice Agent Integration Guide
## BookingSearchMCP + CorePaymentMCP Complete Voice Booking System

### Project Overview

This document provides comprehensive instructions for integrating 11Labs voice agents with our dual-MCP booking and payment automation system. The integration enables end-to-end voice booking workflows from initial availability search through automated payment processing and calendar management.

## System Architecture

```
Customer Voice Call
       ↓
11Labs Voice Agent
       ↓
BookingSearchMCP (MCP Tools via stdio)
  ├── search_availability
  ├── validate_booking_selection
  └── prepare_payment_handoff
       ↓
CorePaymentMCP (HTTP Webhook)
  ├── Stripe Payment Link Generation
  ├── Gmail Email Automation
  ├── Google Calendar Event Creation
  └── Customer Service Workflows
```

## Prerequisites

### System Requirements
- **BookingSearchMCP**: Running on port 3001 with stdio MCP interface
- **CorePaymentMCP**: Running on port 3000 with HTTP webhook endpoints
- **Google Calendar**: Configured with service account authentication
- **Stripe Account**: Test/production keys configured in CorePaymentMCP
- **Gmail Account**: App password configured for email automation

### Environment Verification
Before proceeding, verify both systems are operational:

```bash
# Terminal 1: Start CorePaymentMCP
cd CorePaymentMCP
npm run dev
# Should show: Server running on port 3000

# Terminal 2: Start BookingSearchMCP  
cd BookingSearchMCP
npm run dev
# Should show: BookingSearchMCP server started successfully

# Terminal 3: Test integration
cd BookingSearchMCP
node test-workflow.js
# Should show: Workflow Test COMPLETED
```

## 11Labs Agent Configuration

### MCP Server Connection

**Connection Type**: stdio (Standard Input/Output)
**Server Command**: `npm run dev` (from BookingSearchMCP directory)
**Protocol**: Model Context Protocol (MCP)

### Required MCP Tools Configuration

Configure your 11Labs voice agent with these three MCP tools:

#### 1. search_availability

**Purpose**: Search for available booking slots on Google Calendar
**Usage**: Called when customer requests booking availability

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "startDate": {
      "type": "string",
      "description": "Start date for search (YYYY-MM-DD)",
      "required": true
    },
    "endDate": {
      "type": "string", 
      "description": "End date for search (YYYY-MM-DD)",
      "required": true
    },
    "partySize": {
      "type": "number",
      "description": "Number of people in party",
      "required": true
    },
    "activityType": {
      "type": "string",
      "description": "Type of activity (e.g., 'whale watching', 'kayaking')",
      "required": false
    },
    "platform": {
      "type": "string",
      "description": "Booking platform ('gcalendar' for production, 'mock' for testing)",
      "default": "gcalendar"
    },
    "sessionId": {
      "type": "string",
      "description": "Voice session identifier",
      "required": false
    },
    "priceMin": {
      "type": "number",
      "description": "Minimum price filter per person",
      "required": false
    },
    "priceMax": {
      "type": "number", 
      "description": "Maximum price filter per person",
      "required": false
    }
  }
}
```

**Expected Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Perfect! I found 3 available times for whale watching. The earliest is Monday at 9 AM for forty five dollars per person."
  }],
  "_meta": {
    "availableOptions": [...],
    "sessionId": "voice-session-123",
    "responseTime": 67,
    "totalOptions": 3
  }
}
```

#### 2. validate_booking_selection

**Purpose**: Validate and temporarily reserve selected booking option
**Usage**: Called after customer selects preferred time slot

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Voice session ID from search_availability",
      "required": true
    },
    "selectedOptionId": {
      "type": "string",
      "description": "ID of selected availability slot",
      "required": true
    },
    "customerInfo": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Customer full name",
          "required": true
        },
        "phone": {
          "type": "string",
          "description": "Customer phone number",
          "required": true
        },
        "email": {
          "type": "string",
          "description": "Customer email address",
          "required": false
        }
      },
      "required": true
    }
  }
}
```

**Expected Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Perfect! I've reserved whale watching for John Smith on Monday at 9 AM. The total for 4 people is 180 dollars. I'll send you a payment link after this call."
  }],
  "_meta": {
    "bookingValidated": true,
    "sessionId": "voice-session-123",
    "totalAmount": 180.00,
    "readyForPayment": true
  }
}
```

#### 3. prepare_payment_handoff

**Purpose**: Trigger CorePaymentMCP automation after call completion
**Usage**: Called automatically after voice call ends (not during conversation)

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "description": "Voice session ID",
      "required": true
    },
    "customerContactPreference": {
      "type": "string",
      "enum": ["email", "sms", "both"],
      "description": "How to contact customer",
      "default": "email"
    }
  }
}
```

**Expected Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Thank you! I've successfully reserved your booking and sent a secure payment link to your email."
  }],
  "_meta": {
    "handoffCompleted": true,
    "paymentLinkSent": true,
    "automationStarted": true
  }
}
```

## Voice Conversation Flow Implementation

### Complete Conversation Script Template

```
CUSTOMER: "Hi, I'm looking for whale watching for 4 people next weekend."

AGENT: "I'd be happy to help you find whale watching availability for 4 people. Let me check what we have available next weekend."

[AGENT CALLS: search_availability]
{
  "startDate": "2024-01-20",
  "endDate": "2024-01-21", 
  "partySize": 4,
  "activityType": "whale watching",
  "platform": "gcalendar"
}

[MCP RESPONSE RECEIVED]
AGENT: "Perfect! I found 3 available times for whale watching. The earliest is Saturday at 10 AM for forty five dollars per person, then we have Saturday at 2 PM and Sunday at 9 AM, both also forty five dollars per person. Which time would work best for you?"

CUSTOMER: "Saturday at 10 AM sounds perfect."

AGENT: "Excellent choice! Let me reserve Saturday at 10 AM for you. I'll need to get your name and contact information. What's your full name?"

CUSTOMER: "John Smith"

AGENT: "Great, and what's the best phone number to reach you at?"

CUSTOMER: "555-123-4567"

AGENT: "Perfect, and do you have an email address where I can send your booking confirmation?"

CUSTOMER: "Yes, it's john@example.com"

AGENT: "Wonderful! Let me reserve that Saturday 10 AM whale watching slot for you."

[AGENT CALLS: validate_booking_selection]
{
  "sessionId": "[session_id_from_search]",
  "selectedOptionId": "[slot_id_from_search_results]",
  "customerInfo": {
    "name": "John Smith",
    "phone": "555-123-4567", 
    "email": "john@example.com"
  }
}

[MCP RESPONSE RECEIVED]
AGENT: "Perfect! I've reserved whale watching for John Smith on Saturday at 10 AM. The total for 4 people is 180 dollars. I'll send you a secure payment link to john@example.com right after this call, and you'll have 24 hours to complete your payment. Once paid, you'll receive a confirmation email with all the details including the meeting location. Is there anything else I can help you with today?"

CUSTOMER: "No, that's everything. Thank you!"

AGENT: "You're very welcome! You should receive that payment link within the next few minutes. Have a great day and enjoy your whale watching adventure!"

[CALL ENDS]

[SYSTEM AUTOMATICALLY CALLS: prepare_payment_handoff]
{
  "sessionId": "[session_id_from_search]",
  "customerContactPreference": "email"
}

[COREPAYMENTMCP AUTOMATION TRIGGERED]
- Stripe payment link created and emailed
- Payment monitoring started (30-second intervals)
- On payment: Google Calendar event created + confirmation email sent
- On timeout: Customer service follow-up email sent
```

### Key Conversation Guidelines

#### 1. Natural Information Gathering
- Always collect customer name and phone number (required)
- Email is optional but recommended for confirmations
- Ask for information naturally within conversation flow
- Confirm all details before making reservation

#### 2. Voice-Optimized Responses
- Use the exact text from MCP tool responses - they're optimized for speech
- Don't modify or paraphrase the availability summaries
- Speak prices naturally ("forty five dollars" not "$45")
- Use conversational date formats ("Saturday at 10 AM" not "2024-01-20T10:00")

#### 3. Error Handling
- If search returns no results: "I don't see any availability for those dates. Would you like to try different dates?"
- If validation fails: "I'm sorry, that time slot was just booked. Let me find you another option."
- If system errors occur: "I'm experiencing a technical issue. Let me connect you with our customer service team."

#### 4. Payment Process Communication
- Always mention payment link will be sent after the call
- Specify 24-hour payment window
- Confirm email address for payment link delivery
- Mention confirmation email will follow payment

## Testing and Validation

### Development Testing Process

#### 1. Pre-Integration Testing
```bash
# Verify BookingSearchMCP is working
cd BookingSearchMCP
node test-mcp-tools.js

# Expected output should show:
# ✅ MCP Tools Test COMPLETED!
# ✅ Google Calendar: Connected
# ✅ Voice Optimization: Implemented
```

#### 2. Integration Testing with 11Labs Agent
```bash
# Start both systems
# Terminal 1:
cd CorePaymentMCP && npm run dev

# Terminal 2: 
cd BookingSearchMCP && npm run dev

# Configure 11Labs agent with MCP tools
# Test conversation flow using the script template above
```

#### 3. End-to-End Workflow Validation
- Customer requests availability
- Agent searches and presents options
- Customer selects preferred time
- Agent validates and reserves booking
- Call ends, payment automation triggers
- Customer receives payment link email
- Payment completion creates calendar event
- Customer receives booking confirmation

### Production Deployment Checklist

#### Pre-Deployment Verification
- [ ] Google Calendar service account configured with production calendar
- [ ] Stripe production keys configured in CorePaymentMCP
- [ ] Gmail SMTP configured for production email sending
- [ ] Both systems tested with real booking data
- [ ] 11Labs agent tested with complete conversation flows
- [ ] Error handling scenarios validated
- [ ] Performance requirements met (sub-100ms search responses)

#### Go-Live Checklist
- [ ] CorePaymentMCP running on production server port 3000
- [ ] BookingSearchMCP running on production server port 3001
- [ ] Network connectivity between systems verified
- [ ] 11Labs agent configured with production MCP connection
- [ ] Monitoring and logging enabled for both systems
- [ ] Customer service team notified of system activation
- [ ] Backup procedures documented and tested

## Troubleshooting Guide

### Common Integration Issues

#### MCP Connection Problems
**Symptom**: 11Labs agent cannot connect to BookingSearchMCP
**Solutions**:
- Verify BookingSearchMCP is running with `npm run dev`
- Check that stdio connection is properly configured in 11Labs
- Ensure no firewall blocking the connection
- Test MCP tools manually with `node test-mcp-tools.js`

#### Google Calendar Integration Issues
**Symptom**: No availability returned or calendar errors
**Solutions**:
- Run `node test-calendar.js` to verify Google integration
- Check service account permissions on target calendar
- Verify GOOGLE_PRIVATE_KEY environment variable formatting
- Ensure calendar is shared with service account email

#### CorePaymentMCP Integration Issues
**Symptom**: Payment handoff fails or webhooks not working
**Solutions**:
- Verify CorePaymentMCP is running on expected port
- Check network connectivity between BookingSearchMCP and CorePaymentMCP
- Test webhook endpoint manually: `curl -X POST http://localhost:3000/api/v1/elevenlabs/webhook/trigger-booking`
- Review CorePaymentMCP logs for webhook processing errors

#### Performance Issues
**Symptom**: Slow response times during voice calls
**Solutions**:
- Monitor response times with performance logging
- Check Google Calendar API quota and rate limits
- Verify sufficient server resources (CPU, memory)
- Consider implementing additional caching layers

### Support and Escalation

#### Technical Support Contacts
- **System Architecture**: Claude Code integration team
- **Google Calendar Issues**: Google Cloud Platform support
- **Stripe Payment Issues**: Stripe support documentation
- **11Labs Integration**: 11Labs MCP documentation and support

#### Monitoring and Alerts
- Set up alerts for response times >100ms
- Monitor CorePaymentMCP webhook success rates
- Track booking completion rates and payment success
- Alert on system connectivity failures between components

#### Performance Metrics to Monitor
- Average search response time
- Booking validation success rate
- Payment handoff completion rate
- Customer satisfaction scores
- System uptime and availability

## Advanced Configuration

### Custom Activity Types
To add new activity types beyond the default examples:

1. **Update BookingSearchMCP configuration**:
   - Add activity types to mock adapter or calendar configuration
   - Configure pricing and availability rules per activity type

2. **Train 11Labs agent**:
   - Add activity-specific conversation patterns
   - Update search queries to include new activity types

### Multi-Calendar Support
For businesses with multiple booking calendars:

1. **Configure additional calendars** in BookingSearchMCP environment
2. **Update search logic** to query multiple calendar sources  
3. **Modify agent conversation** to handle calendar selection

### Custom Pricing Rules
For dynamic pricing or complex rate structures:

1. **Extend adapter pricing logic** in BookingSearchMCP
2. **Update validation rules** for price calculations
3. **Test pricing scenarios** with different party sizes and dates

This integration guide provides everything needed to successfully deploy voice booking automation with 11Labs agents. Follow the step-by-step process and use the provided testing procedures to ensure reliable operation.