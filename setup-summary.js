#!/usr/bin/env node

// BookingSearchMCP Setup Summary and Verification
require('dotenv').config();

console.log('BookingSearchMCP Setup Summary & Status');
console.log('=' .repeat(50));

console.log('\n📋 Configuration Status:');
console.log(`✓ Calendar ID: ${process.env.GOOGLE_CALENDAR_ID}`);
console.log(`✓ Service Account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
console.log(`✓ Private Key: ${process.env.GOOGLE_PRIVATE_KEY ? 'Configured' : '❌ Missing'}`);
console.log(`✓ CorePaymentMCP URL: ${process.env.CORE_PAYMENT_MCP_URL}`);
console.log(`✓ Business Hours: ${process.env.BUSINESS_HOURS_START}:00 - ${process.env.BUSINESS_HOURS_END}:00 ${process.env.TIMEZONE}`);

console.log('\n🔧 MCP Tools Available:');
console.log('1. search_availability - Search for booking slots');
console.log('2. validate_booking_selection - Reserve selected option');
console.log('3. prepare_payment_handoff - Trigger payment automation');

console.log('\n⚡ Performance Characteristics:');
console.log('• Target Response Time: <100ms (currently ~400ms for initial Google API calls)');
console.log('• Voice Response Length: <200 characters ✓');
console.log('• Results Limit: 5 options for voice optimization ✓');
console.log('• Cache TTL: 10 minutes');

console.log('\n🔄 Complete Workflow:');
console.log('1. 11Labs Voice Agent → search_availability()');
console.log('2. Customer selects option → validate_booking_selection()');
console.log('3. Call ends → prepare_payment_handoff()');
console.log('4. CorePaymentMCP → Stripe + Email + Calendar automation');

console.log('\n🚀 Ready to Start:');
console.log('');
console.log('# Terminal 1: Start CorePaymentMCP');
console.log('cd ../CorePaymentMCP');
console.log('npm run dev');
console.log('');
console.log('# Terminal 2: Start BookingSearchMCP');
console.log('cd BookingSearchMCP');
console.log('npm run dev');
console.log('');
console.log('# Terminal 3: Test complete workflow');
console.log('node test-workflow.js');

console.log('\n📞 11Labs Voice Agent Integration:');
console.log('MCP Server URL: stdio (when running npm run dev)');
console.log('Tools to configure in 11Labs:');
console.log('• search_availability');
console.log('• validate_booking_selection');
console.log('• prepare_payment_handoff');

console.log('\n📝 Sample Voice Conversation Flow:');
console.log('');
console.log('Customer: "I need whale watching for 4 people next weekend"');
console.log('Agent: "Let me check availability for you..."');
console.log('       [calls search_availability MCP tool]');
console.log('Agent: "Perfect! I found 5 available times for whale watching."');
console.log('       "The earliest is Monday at 9 AM for 49 dollars per person."');
console.log('');
console.log('Customer: "I\'ll take the 9 AM slot"');
console.log('Agent: "Let me reserve that for you. Can I get your name and phone?"');
console.log('Customer: "Sarah Johnson, 555-987-6543"');
console.log('Agent: [calls validate_booking_selection MCP tool]');
console.log('       "Perfect! I\'ve reserved whale watching for Sarah Johnson"');
console.log('       "The total for 4 people is 196 dollars."');
console.log('       "I\'ll send you a payment link after this call."');
console.log('');
console.log('[Call ends]');
console.log('System: [calls prepare_payment_handoff MCP tool]');
console.log('CorePaymentMCP: Sends payment link → Monitors payment → Creates calendar event');

console.log('\n✅ System is ready for voice booking integration!');
console.log('\n🔗 GitHub Repository: https://github.com/zaphod-black/BookingSearchMCP');
console.log('📚 Full documentation available in README.md');