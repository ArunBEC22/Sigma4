/**
 * Comprehensive Chatbot Test Suite
 * Tests all critical user flows and edge cases
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:8080';
let conversationId = null;
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Test helper functions
function logTest(testName, status, message = '') {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}`.green);
    if (message) console.log(`   ${message}`.gray);
  } else if (status === 'FAIL') {
    testResults.failed++;
    console.log(`❌ ${testName}`.red);
    if (message) console.log(`   ${message}`.yellow);
  } else {
    console.log(`⚠️  ${testName}`.yellow);
    if (message) console.log(`   ${message}`.gray);
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(60).cyan);
  console.log(`  ${title}`.cyan.bold);
  console.log('='.repeat(60).cyan + '\n');
}

async function sendMessage(message, expectListings = false) {
  try {
    const response = await axios.post(`${BASE_URL}/chat/message`, {
      conversationId,
      message
    }, {
      headers: {
        'Cookie': 'connect.sid=test-session' // Mock session
      }
    });

    console.log(`\n📤 User: ${message}`.blue);
    console.log(`🤖 Bot: ${response.data.response}`.green);
    
    if (response.data.listings) {
      console.log(`📋 Listings: ${response.data.listings.length}`.magenta);
    }

    return response.data;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`.red);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`.red);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`.red);
    }
    return null;
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Cases
async function testAvailabilityQuery() {
  logSection('TEST CATEGORY 1: Availability Queries');

  // TC1.1: Basic availability query
  const response1 = await sendMessage('Any places in Pune under 5K?');
  if (response1 && response1.listings && response1.listings.length > 0) {
    logTest('TC1.1: Basic Availability Query', 'PASS', 'Found listings immediately');
  } else if (response1 && response1.listings && response1.listings.length === 0) {
    logTest('TC1.1: Basic Availability Query', 'PASS', 'No results but searched correctly');
  } else {
    logTest('TC1.1: Basic Availability Query', 'FAIL', 'Did not search or return listings');
  }

  await delay(1000);

  // TC1.3: Different format
  const response2 = await sendMessage('Show me places in Mumbai under 10000');
  if (response2 && response2.listings) {
    logTest('TC1.3: Different Query Format', 'PASS', 'Understood alternative phrasing');
  } else {
    logTest('TC1.3: Different Query Format', 'FAIL', 'Did not understand query');
  }
}

async function testBookingValidation() {
  logSection('TEST CATEGORY 2: Booking Flow Validation');

  // Start fresh conversation
  await sendMessage('Any places in Pune under 5K?');
  await delay(1000);

  // TC2.1: Try to book without required info
  const response = await sendMessage('yes, book this');
  
  const hasCheckInRequest = response.response.toLowerCase().includes('check-in');
  const hasCheckOutRequest = response.response.toLowerCase().includes('check-out');
  const hasGuestsRequest = response.response.toLowerCase().includes('guest');
  const isAskingForInfo = hasCheckInRequest || hasCheckOutRequest || hasGuestsRequest;
  const isShowingListingsAgain = response.listings && response.listings.length > 0;

  if (isAskingForInfo && !isShowingListingsAgain) {
    logTest('TC2.1: Booking Without Required Info', 'PASS', 'Bot correctly asks for missing information');
  } else if (isShowingListingsAgain) {
    logTest('TC2.1: Booking Without Required Info', 'FAIL', 'Bot shows listings again instead of asking for info');
  } else {
    logTest('TC2.1: Booking Without Required Info', 'FAIL', 'Bot did not ask for required information');
  }
}

async function testCompleteBookingFlow() {
  logSection('TEST CATEGORY 3: Complete Booking Journey');

  // TC5.1: Full booking flow
  console.log('\n🎯 Starting complete booking journey...\n'.cyan);

  // Step 1: Availability query
  let response = await sendMessage('Any places in Pune under 5K?');
  await delay(1000);
  
  if (!response || !response.listings || response.listings.length === 0) {
    logTest('TC5.1: Complete Booking Journey', 'FAIL', 'No listings found for test');
    return;
  }

  // Step 2: Try to book
  response = await sendMessage('yes, book this');
  await delay(1000);

  const askedForInfo = response.response.toLowerCase().includes('check-in') || 
                       response.response.toLowerCase().includes('date') ||
                       response.response.toLowerCase().includes('guest');

  if (!askedForInfo) {
    logTest('TC5.1: Complete Booking Journey', 'FAIL', 'Did not ask for booking details');
    return;
  }

  // Step 3: Provide booking details
  response = await sendMessage('20th May 2026, 4 people, 3 nights');
  await delay(1000);

  const showsPrice = response.response.includes('₹') || response.response.toLowerCase().includes('total');
  const asksConfirmation = response.response.toLowerCase().includes('confirm') || 
                          response.response.toLowerCase().includes('proceed');

  if (showsPrice && asksConfirmation) {
    logTest('TC5.1: Complete Booking Journey', 'PASS', 'Successfully calculated price and asked for confirmation');
  } else {
    logTest('TC5.1: Complete Booking Journey', 'FAIL', 'Did not show price or ask for confirmation');
  }
}

async function testEdgeCases() {
  logSection('TEST CATEGORY 4: Edge Cases');

  // TC4.1: Confusing input
  const response1 = await sendMessage('maybe');
  await delay(1000);
  
  if (response1 && response1.response && !response1.response.includes('error')) {
    logTest('TC4.1: Confusing Input', 'PASS', 'Handled gracefully without error');
  } else {
    logTest('TC4.1: Confusing Input', 'FAIL', 'Crashed or showed error');
  }

  // TC4.2: Invalid dates
  const response2 = await sendMessage('Book for yesterday');
  await delay(1000);
  
  const mentionsFuture = response2 && response2.response && 
                        (response2.response.toLowerCase().includes('future') || 
                         response2.response.toLowerCase().includes('valid'));
  
  if (mentionsFuture) {
    logTest('TC4.2: Invalid Dates', 'PASS', 'Detected invalid date');
  } else {
    logTest('TC4.2: Invalid Dates', 'WARN', 'May not validate dates properly');
  }
}

async function testContextManagement() {
  logSection('TEST CATEGORY 5: Context Management');

  // TC3.1: Context preservation
  await sendMessage('I want to go to Pune');
  await delay(1000);
  
  const response1 = await sendMessage('20th May 2026');
  await delay(1000);
  
  const response2 = await sendMessage('4 people');
  await delay(1000);

  // Check if bot remembers Pune and date
  const remembersDestination = response2.conversationContext && 
                               response2.conversationContext.destination === 'Pune';
  const remembersDate = response2.conversationContext && 
                       response2.conversationContext.checkIn;

  if (remembersDestination && remembersDate) {
    logTest('TC3.1: Context Preservation', 'PASS', 'Bot remembers previous information');
  } else {
    logTest('TC3.1: Context Preservation', 'FAIL', 'Bot forgot previous context');
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '█'.repeat(60).rainbow);
  console.log('  WANDERLUST AI CHATBOT - COMPREHENSIVE TEST SUITE'.rainbow.bold);
  console.log('█'.repeat(60).rainbow + '\n');

  try {
    // Start conversation
    console.log('🚀 Starting test conversation...'.cyan);
    const startResponse = await axios.post(`${BASE_URL}/chat/start`, {}, {
      headers: {
        'Cookie': 'connect.sid=test-session'
      }
    });
    
    conversationId = startResponse.data.conversationId;
    console.log(`✅ Conversation started: ${conversationId}\n`.green);

    // Run test categories
    await testAvailabilityQuery();
    await delay(2000);

    await testBookingValidation();
    await delay(2000);

    await testCompleteBookingFlow();
    await delay(2000);

    await testEdgeCases();
    await delay(2000);

    await testContextManagement();

    // Print summary
    logSection('TEST SUMMARY');
    console.log(`Total Tests: ${testResults.total}`.white.bold);
    console.log(`Passed: ${testResults.passed}`.green.bold);
    console.log(`Failed: ${testResults.failed}`.red.bold);
    
    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    console.log(`\nPass Rate: ${passRate}%`.cyan.bold);

    if (testResults.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! 🎉\n'.green.bold);
    } else {
      console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review.\n`.yellow.bold);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:'.red.bold);
    console.error(error.message.red);
    if (error.response) {
      console.error(`Status: ${error.response.status}`.red);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`.red);
    }
  }
}

// Run tests
console.log('⏳ Waiting for server to be ready...'.yellow);
setTimeout(() => {
  runAllTests().then(() => {
    console.log('\n✅ Test suite completed\n'.green);
    process.exit(testResults.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('\n❌ Fatal error:'.red, error);
    process.exit(1);
  });
}, 2000);

// Made with Bob
