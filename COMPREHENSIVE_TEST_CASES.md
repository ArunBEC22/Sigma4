# Comprehensive Chatbot Test Cases

## Test Suite for Wanderlust AI Travel Assistant

### Category 1: Availability Queries

#### TC1.1: Basic Availability Query
**Input:** "Any places in Pune under 5K?"
**Expected:** 
- Searches immediately
- Shows listing cards
- Does NOT ask for dates/guests
**Status:** ✅ PASS

#### TC1.2: Availability Query - No Results
**Input:** "Any places in Pune under 100?"
**Expected:**
- Searches immediately
- Shows "Sorry, no properties found"
- Suggests alternatives or budget adjustment
**Status:** ⚠️ NEEDS TESTING

#### TC1.3: Availability Query - Different Formats
**Inputs:**
- "Do you have listings in Mumbai under 10000?"
- "Are there properties in Goa within 5000?"
- "Show me places in Delhi under 8K"
**Expected:** All should search immediately
**Status:** ⚠️ NEEDS TESTING

---

### Category 2: Booking Flow

#### TC2.1: Booking Without Required Info
**Conversation:**
```
User: "Any places in Pune under 5K?"
Bot: Shows 1 listing
User: "yes" or "book this"
```
**Expected:**
- Bot should say: "I'd be happy to help you book! However, I need:
  - Check-in date
  - Check-out date (or number of nights)
  - Number of guests
  Please provide these details."
**Status:** ❌ FAIL (Currently shows listings again)

#### TC2.2: Booking With Partial Info
**Conversation:**
```
User: "Show me places in Pune for 4 people"
Bot: Shows listings
User: "book the first one"
```
**Expected:**
- Bot should ask for missing check-in/check-out dates
**Status:** ⚠️ NEEDS TESTING

#### TC2.3: Booking With Complete Info
**Conversation:**
```
User: "Show me places in Pune on 20th May 2026 for 4 people"
Bot: Shows listings
User: "book the first one"
```
**Expected:**
- Bot calculates price
- Shows booking summary
- Asks for confirmation
**Status:** ⚠️ NEEDS TESTING

---

### Category 3: Context Management

#### TC3.1: Context Preservation
**Conversation:**
```
User: "I want to go to Pune"
Bot: Asks for dates and guests
User: "20th May 2026"
Bot: Asks for guests
User: "4 people"
```
**Expected:**
- Bot remembers Pune throughout
- Bot remembers date when asking for guests
**Status:** ✅ PASS

#### TC3.2: Context Override
**Conversation:**
```
User: "Show me places in Mumbai"
Bot: Asks for details
User: "Actually, show me Pune instead"
```
**Expected:**
- Bot updates destination to Pune
- Keeps other context (if any)
**Status:** ⚠️ NEEDS TESTING

---

### Category 4: Edge Cases

#### TC4.1: Confusing Input
**Inputs:**
- "No"
- "Maybe"
- "I don't know"
- "Cancel"
**Expected:**
- Bot acknowledges current context
- Asks clarifying question
- Doesn't break or show errors
**Status:** ⚠️ NEEDS TESTING

#### TC4.2: Invalid Dates
**Input:** "Book for yesterday"
**Expected:**
- Bot says dates must be in future
- Asks for valid dates
**Status:** ⚠️ NEEDS TESTING

#### TC4.3: Invalid Guest Count
**Inputs:**
- "0 people"
- "100 people"
- "-5 guests"
**Expected:**
- Bot says guest count must be 1-20
- Asks for valid number
**Status:** ⚠️ NEEDS TESTING

#### TC4.4: Typos in City Names
**Inputs:**
- "manglore" (Mangalore)
- "bangalor" (Bangalore)
- "puna" (Pune)
**Expected:**
- Bot understands and corrects
- Or asks "Did you mean X?"
**Status:** ⚠️ NEEDS TESTING

---

### Category 5: Multi-turn Conversations

#### TC5.1: Complete Booking Journey
**Full Flow:**
```
1. User: "Any places in Pune under 5K?"
2. Bot: Shows listings
3. User: "Show me details of the first one"
4. Bot: Shows details
5. User: "Book this"
6. Bot: Asks for dates and guests
7. User: "20th May 2026, 4 people, 3 nights"
8. Bot: Shows price breakdown
9. User: "Yes, confirm"
10. Bot: Creates booking, redirects to payment
```
**Expected:** Smooth flow, no errors
**Status:** ⚠️ NEEDS FULL TESTING

#### TC5.2: Changing Mind Mid-Booking
**Flow:**
```
User: "Book this property"
Bot: Asks for details
User: "Actually, show me other options"
```
**Expected:**
- Bot cancels current booking intent
- Shows search results again
**Status:** ⚠️ NEEDS TESTING

---

### Category 6: Error Handling

#### TC6.1: Network Error
**Scenario:** API call fails
**Expected:**
- Bot shows friendly error message
- Suggests trying again
- Doesn't crash
**Status:** ⚠️ NEEDS TESTING

#### TC6.2: Database Empty
**Scenario:** No listings in database
**Expected:**
- Bot says no properties available
- Suggests checking back later
**Status:** ⚠️ NEEDS TESTING

#### TC6.3: User Not Logged In
**Scenario:** User tries to chat without login
**Expected:**
- Bot says "Please login to use chat"
- Doesn't allow booking
**Status:** ✅ PASS

---

### Category 7: Special Features

#### TC7.1: End Chat Button
**Action:** Click end chat button
**Expected:**
- Shows confirmation dialog
- Clears all messages
- Starts fresh conversation
**Status:** ✅ PASS

#### TC7.2: View Details Button
**Action:** Click "View Details" on listing card
**Expected:**
- No UUID shown in chat
- Shows property details
- No duplicate listing card
**Status:** ✅ PASS

#### TC7.3: Fraud Detection
**Scenario:** Viewing suspicious listing
**Expected:**
- Bot shows safety warning
- Recommends caution or alternative
**Status:** ⚠️ NEEDS TESTING

---

## Priority Fixes Needed

### HIGH PRIORITY
1. **TC2.1** - Booking validation (check for required info)
2. **TC4.1** - Handle confusing inputs gracefully
3. **TC5.1** - Complete booking journey testing

### MEDIUM PRIORITY
4. **TC1.2** - No results handling
5. **TC3.2** - Context override
6. **TC4.2** - Date validation

### LOW PRIORITY
7. **TC4.4** - Typo handling
8. **TC5.2** - Changing mind scenarios
9. **TC6.1-6.3** - Error handling

---

## Test Execution Plan

1. Fix HIGH priority issues first
2. Run automated tests for each category
3. Manual testing for edge cases
4. User acceptance testing
5. Performance testing under load

## Success Criteria

- ✅ All HIGH priority tests pass
- ✅ 90%+ of MEDIUM priority tests pass
- ✅ No critical bugs in production
- ✅ User can complete booking without confusion
- ✅ Bot handles errors gracefully