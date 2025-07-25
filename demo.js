#!/usr/bin/env node

// Simple demo script to show BookingSearchMCP functionality
const { MockSearchAdapter } = require('./dist/adapters/mock-search-adapter');
const { VoiceOptimizedCache } = require('./dist/cache/voice-cache');

async function demo() {
  console.log('🚀 BookingSearchMCP Demo\n');
  
  const adapter = new MockSearchAdapter();
  const cache = new VoiceOptimizedCache();
  
  // Demo search query
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const query = {
    startDate: tomorrow.toISOString().split('T')[0],
    endDate: nextWeek.toISOString().split('T')[0],
    partySize: 4,
    activityType: 'whale watching',
    sessionId: 'demo-session-' + Date.now(),
    startTime: performance.now()
  };
  
  console.log('🔍 Searching for availability...');
  console.log('Query:', {
    dates: `${query.startDate} to ${query.endDate}`,
    partySize: query.partySize,
    activityType: query.activityType
  });
  console.log();
  
  try {
    const result = await adapter.searchAvailability(query);
    
    console.log('✅ Search Results:');
    console.log(`Response Time: ${Math.round(result.responseTime)}ms`);
    console.log(`Total Options: ${result.totalOptions}`);
    console.log();
    
    console.log('🎙️ Voice Summary:');
    console.log(`"${result.spokenSummary}"`);
    console.log();
    
    if (result.availableSlots.length > 0) {
      console.log('📅 Available Slots:');
      result.availableSlots.slice(0, 3).forEach((slot, i) => {
        console.log(`${i + 1}. ${slot.activityName}`);
        console.log(`   Time: ${slot.spokenDateTime}`);
        console.log(`   Price: ${slot.spokenPrice} per person`);
        console.log(`   Available: ${slot.spotsAvailable} spots`);
        console.log(`   Location: ${slot.meetingLocation}`);
        console.log();
      });
      
      // Demo validation
      console.log('✅ Validating first option...');
      const validationResult = await adapter.validateAvailability(result.availableSlots[0].availabilityId);
      console.log(`Validation result: ${validationResult ? 'Available' : 'No longer available'}`);
    }
    
    console.log('\n🎯 Performance Metrics:');
    console.log(`✓ Response time: ${Math.round(result.responseTime)}ms (target: <100ms)`);
    console.log(`✓ Voice summary length: ${result.spokenSummary.length} chars (target: <200)`);
    console.log(`✓ Results optimized for voice: ${result.availableSlots.length <= 10 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n🔗 Next Steps:');
  console.log('1. Customer selects option during voice call');
  console.log('2. validate_booking_selection() reserves the slot');
  console.log('3. prepare_payment_handoff() triggers CorePaymentMCP');
  console.log('4. CorePaymentMCP handles payment + automation');
  
  console.log('\n✨ Demo completed!');
}

if (require.main === module) {
  demo().catch(console.error);
}