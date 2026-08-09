/**
 * Simple Chatbot Test Script (No external dependencies)
 * Tests critical booking validation flow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
let conversationId = null;

// Simple logging without colors
function log(message, type = 'info') {
  const prefix = {
    'info': 'ℹ️ ',
    'success': '✅',
    'error': '❌',
    'test': '🧪',
    'user': '👤',
    'bot': '🤖'
  }[type] || '';
  
  console.log(`${prefix} ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function sendMessage(message) {
  try {
    const response = await axios.post(`${BASE_URL}/chat/message`, {
      conversationId,
      message
    }, {
      headers: {
        'Cookie': 'connect.sid=test-session'
      }
    });

    log(`User: ${message}`, 'user');
    log(`Bot: ${response.data.response}`, 'bot');
    
    if (response.data.listings) {
      log(`Found ${response.data.listings.length} listings`, 'info');
    }

    return response.data;
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'error');
      log(`Data: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return null;
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBookingValidation() {
  logSection('TEST: Booking Validation');

  log('Step 1: Ask for availability', 'test');
  const response1 = await sendMessage('Any places in Pune under 5K?');
  await delay(1000);

  if (!response1 || !response1.listings || response1.listings.length === 0) {
    log('No listings found. Cannot proceed with test.', 'error');
    return false;
  }

  log('Step 2: Try to book without providing details', 'test');
  const response2 = await sendMessage('yes, book this');
  await delay(1000);

  // Check if bot asks for required information
  const asksForCheckIn = response2.response.toLowerCase().includes('check-in');
  const asksForCheckOut = response2.response.toLowerCase().includes('check-out');
  const asksForGuests = response2.response.toLowerCase().includes('guest');
  const showsListingsAgain = response2.listings && response2.listings.length > 0;

  console.log('\nValidation Results:');
  console.log(`  Asks for check-in: ${asksForCheckIn ? '✅' : '❌'}`);
  console.log(`  Asks for check-out: ${asksForCheckOut ? '✅' : '❌'}`);
  console.log(`  Asks for guests: ${asksForGuests ? '✅' : '❌'}`);
  console.log(`  Shows listings again: ${showsListingsAgain ? '❌ (WRONG)' : '✅ (CORRECT)'}`);

  const isAsking = asksForCheckIn || asksForCheckOut || asksForGuests;
  
  if (isAsking && !showsListingsAgain) {
    log('TEST PASSED: Bot correctly asks for missing information', 'success');
    return true;
  } else if (showsListingsAgain) {
    log('TEST FAILED: Bot shows listings again instead of asking for info', 'error');
    return false;
  } else {
    log('TEST FAILED: Bot does not ask for required information', 'error');
    return false;
  }
}

async function testCompleteFlow() {
  logSection('TEST: Complete Booking Flow');

  log('Step 1: Search for listings', 'test');
  const response1 = await sendMessage('Any places in Pune under 5K?');
  await delay(1000);

  if (!response1 || !response1.listings || response1.listings.length === 0) {
    log('No listings found. Cannot proceed with test.', 'error');
    return false;
  }

  log('Step 2: Express booking intent', 'test');
  const response2 = await sendMessage('yes, book this');
  await delay(1000);

  log('Step 3: Provide booking details', 'test');
  const response3 = await sendMessage('20th May 2026, 4 people, 3 nights');
  await delay(1000);

  // Check if bot shows price and asks for confirmation
  const showsPrice = response3.response.includes('₹') || response3.response.toLowerCase().includes('total');
  const asksConfirmation = response3.response.toLowerCase().includes('confirm') || 
                          response3.response.toLowerCase().includes('proceed');

  console.log('\nFlow Results:');
  console.log(`  Shows price: ${showsPrice ? '✅' : '❌'}`);
  console.log(`  Asks for confirmation: ${asksConfirmation ? '✅' : '❌'}`);

  if (showsPrice && asksConfirmation) {
    log('TEST PASSED: Complete flow works correctly', 'success');
    return true;
  } else {
    log('TEST FAILED: Flow incomplete or incorrect', 'error');
    return false;
  }
}

async function runTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('  WANDERLUST AI CHATBOT - VALIDATION TESTS');
  console.log('█'.repeat(60) + '\n');

  try {
    // Start conversation
    log('Starting test conversation...', 'info');
    const startResponse = await axios.post(`${BASE_URL}/chat/start`, {}, {
      headers: {
        'Cookie': 'connect.sid=test-session'
      }
    });
    
    conversationId = startResponse.data.conversationId;
    log(`Conversation started: ${conversationId}`, 'success');

    // Run tests
    const test1 = await testBookingValidation();
    await delay(2000);

    // Start new conversation for second test
    const startResponse2 = await axios.post(`${BASE_URL}/chat/start`, {}, {
      headers: {
        'Cookie': 'connect.sid=test-session'
      }
    });
    conversationId = startResponse2.data.conversationId;

    const test2 = await testCompleteFlow();

    // Summary
    logSection('TEST SUMMARY');
    console.log(`Booking Validation Test: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Complete Flow Test: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = test1 && test2;
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}\n`);

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    log('Test suite failed:', 'error');
    log(error.message, 'error');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'error');
      log(`Data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
    }
    process.exit(1);
  }
}

// Run tests
log('Waiting for server to be ready...', 'info');
setTimeout(() => {
  runTests();
}, 2000);

// Made with Bob
