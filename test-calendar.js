#!/usr/bin/env node

// Google Calendar connectivity test for BookingSearchMCP
require('dotenv').config();
const { google } = require('googleapis');
const { GoogleCalendarSearchAdapter } = require('./dist/adapters/gcalendar-search-adapter');

async function testGoogleCalendarConnection() {
  console.log('Testing Google Calendar Connection for BookingSearchMCP');
  console.log('='.repeat(60));
  
  // Test 1: Basic Authentication
  console.log('\n1. Testing Google Service Account Authentication...');
  
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    console.log(`✓ Service Account Email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
    console.log(`✓ Target Calendar: ${calendarId}`);
    console.log('✓ Authentication configured successfully');
    
    // Test 2: Calendar Access
    console.log('\n2. Testing Calendar Access...');
    
    const calendarInfo = await calendar.calendars.get({
      calendarId: calendarId
    });
    
    console.log(`✓ Calendar found: ${calendarInfo.data.summary}`);
    console.log(`✓ Calendar timezone: ${calendarInfo.data.timeZone}`);
    console.log(`✓ Calendar access confirmed`);
    
    // Test 3: Event Listing
    console.log('\n3. Testing Event Retrieval...');
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const events = await calendar.events.list({
      calendarId: calendarId,
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    console.log(`✓ Events retrieved: ${events.data.items?.length || 0} events found`);
    
    if (events.data.items && events.data.items.length > 0) {
      console.log('\nExisting Events:');
      events.data.items.slice(0, 5).forEach((event, i) => {
        const start = event.start?.dateTime || event.start?.date;
        console.log(`  ${i + 1}. ${event.summary} - ${start}`);
      });
    } else {
      console.log('  No existing events found - calendar is clear for testing');
    }
    
    // Test 4: BookingSearchMCP Adapter
    console.log('\n4. Testing BookingSearchMCP Google Calendar Adapter...');
    
    const adapter = new GoogleCalendarSearchAdapter();
    
    const searchQuery = {
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0],
      partySize: 4,
      activityType: 'test booking',
      sessionId: 'test-session-' + Date.now(),
      startTime: performance.now()
    };
    
    console.log('Search Query:', {
      startDate: searchQuery.startDate,
      endDate: searchQuery.endDate,
      partySize: searchQuery.partySize,
      activityType: searchQuery.activityType
    });
    
    const searchResult = await adapter.searchAvailability(searchQuery);
    
    console.log(`✓ Search completed in ${Math.round(searchResult.responseTime)}ms`);
    console.log(`✓ Available slots found: ${searchResult.totalOptions}`);
    console.log(`✓ Voice summary: "${searchResult.spokenSummary}"`);
    
    if (searchResult.availableSlots.length > 0) {
      console.log('\nSample Available Slots:');
      searchResult.availableSlots.slice(0, 3).forEach((slot, i) => {
        console.log(`  ${i + 1}. ${slot.activityName}`);
        console.log(`     Time: ${slot.spokenDateTime}`);
        console.log(`     Price: ${slot.spokenPrice} per person`);
        console.log(`     Available: ${slot.spotsAvailable} spots`);
        console.log(`     ID: ${slot.availabilityId}`);
        console.log();
      });
      
      // Test 5: Availability Validation
      console.log('5. Testing Availability Validation...');
      const firstSlot = searchResult.availableSlots[0];
      const isValid = await adapter.validateAvailability(firstSlot.availabilityId);
      console.log(`✓ Slot validation result: ${isValid ? 'Available' : 'Not available'}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Google Calendar Integration Test SUCCESSFUL!');
    console.log('\nNext Steps:');
    console.log('1. Start BookingSearchMCP server: npm run dev');
    console.log('2. Test MCP tools with voice agent integration');
    console.log('3. Test end-to-end workflow with CorePaymentMCP');
    console.log('\nCalendar is ready for voice booking searches!');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    
    if (error.message.includes('403')) {
      console.error('\n🔧 Troubleshooting:');
      console.error('- Verify the service account has Calendar access');
      console.error('- Check if calendar is shared with service account email');
      console.error('- Ensure service account has "Calendar Editor" or "Calendar Reader" permissions');
    }
    
    if (error.message.includes('401')) {
      console.error('\n🔧 Troubleshooting:');
      console.error('- Check GOOGLE_PRIVATE_KEY format (ensure \\n characters are properly escaped)');
      console.error('- Verify GOOGLE_SERVICE_ACCOUNT_EMAIL is correct');
      console.error('- Ensure service account key is not expired');
    }
    
    if (error.message.includes('404')) {
      console.error('\n🔧 Troubleshooting:');
      console.error('- Verify GOOGLE_CALENDAR_ID is correct');
      console.error('- Ensure calendar exists and is accessible');
      console.error('- Check calendar sharing permissions');
    }
    
    console.error('\nFor more help, check:');
    console.error('- Google Cloud Console > IAM & Admin > Service Accounts');
    console.error('- Google Calendar > Settings > Calendar sharing');
    console.error('- Environment variables in .env file');
    
    process.exit(1);
  }
}

// Performance timing
console.time('Total Test Time');
testGoogleCalendarConnection()
  .then(() => {
    console.timeEnd('Total Test Time');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    console.timeEnd('Total Test Time');
    process.exit(1);
  });