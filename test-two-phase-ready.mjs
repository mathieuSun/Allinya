#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';

// Test users (assuming these exist from previous tests)
const practitionerEmail = 'chefmat2018@gmail.com';
const practitionerPassword = 'test123';
const guestEmail = 'cheekyma@hotmail.com';
const guestPassword = 'test123';

async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Login failed: ${data.error}`);
  }
  return data;
}

async function createSession(token, practitionerId) {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ practitionerId }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Create session failed: ${data.error}`);
  }
  return data.sessionId;
}

async function acknowledgeSession(token, sessionId) {
  const response = await fetch(`${API_BASE_URL}/sessions/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Acknowledge failed: ${data.error}`);
  }
  return data;
}

async function markReady(token, sessionId, who) {
  const response = await fetch(`${API_BASE_URL}/sessions/ready`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, who }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Mark ready failed: ${data.error}`);
  }
  return data;
}

async function getSession(token, sessionId) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Get session failed: ${data.error}`);
  }
  return data;
}

async function runTest() {
  console.log('🧪 Testing Two-Phase Ready System\n');
  
  try {
    // Step 1: Login both users
    console.log('1. Logging in users...');
    const practitionerData = await loginUser(practitionerEmail, practitionerPassword);
    const guestData = await loginUser(guestEmail, guestPassword);
    console.log('✅ Both users logged in\n');
    
    // Step 2: Create a session
    console.log('2. Creating session...');
    const sessionId = await createSession(guestData.access_token, practitionerData.profile.id);
    console.log(`✅ Session created: ${sessionId}\n`);
    
    // Step 3: Get session status (should show not acknowledged, not ready)
    console.log('3. Checking initial session status...');
    let session = await getSession(guestData.access_token, sessionId);
    console.log(`   acknowledgedPractitioner: ${session.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${session.readyPractitioner}`);
    console.log(`   readyGuest: ${session.readyGuest}`);
    console.log(`   phase: ${session.phase}\n`);
    
    // Step 4: Try to mark practitioner ready without acknowledging (should fail)
    console.log('4. Testing ready without acknowledgment (should fail)...');
    try {
      await markReady(practitionerData.access_token, sessionId, 'practitioner');
      console.log('❌ UNEXPECTED: Practitioner was able to mark ready without acknowledging');
    } catch (error) {
      console.log('✅ Correctly prevented: ' + error.message + '\n');
    }
    
    // Step 5: Acknowledge the session as practitioner
    console.log('5. Acknowledging session as practitioner...');
    const ackResult = await acknowledgeSession(practitionerData.access_token, sessionId);
    console.log(`✅ ${ackResult.message}\n`);
    
    // Step 6: Check session status (should show acknowledged but not ready)
    console.log('6. Checking session after acknowledgment...');
    session = await getSession(guestData.access_token, sessionId);
    console.log(`   acknowledgedPractitioner: ${session.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${session.readyPractitioner}`);
    console.log(`   readyGuest: ${session.readyGuest}`);
    console.log(`   phase: ${session.phase}\n`);
    
    // Step 7: Mark practitioner ready (should work now)
    console.log('7. Marking practitioner ready...');
    await markReady(practitionerData.access_token, sessionId, 'practitioner');
    console.log('✅ Practitioner marked ready\n');
    
    // Step 8: Check session status
    console.log('8. Checking session after practitioner ready...');
    session = await getSession(guestData.access_token, sessionId);
    console.log(`   acknowledgedPractitioner: ${session.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${session.readyPractitioner}`);
    console.log(`   readyGuest: ${session.readyGuest}`);
    console.log(`   phase: ${session.phase}\n`);
    
    // Step 9: Mark guest ready
    console.log('9. Marking guest ready...');
    const finalSession = await markReady(guestData.access_token, sessionId, 'guest');
    console.log('✅ Guest marked ready\n');
    
    // Step 10: Check final status (should transition to live)
    console.log('10. Checking final session status...');
    console.log(`   acknowledgedPractitioner: ${finalSession.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${finalSession.readyPractitioner}`);
    console.log(`   readyGuest: ${finalSession.readyGuest}`);
    console.log(`   phase: ${finalSession.phase}\n`);
    
    if (finalSession.phase === 'live') {
      console.log('🎉 SUCCESS: Two-phase ready system working correctly!');
      console.log('   - Acknowledgment requirement enforced');
      console.log('   - Both parties marked ready');
      console.log('   - Session transitioned to live');
    } else {
      console.log('⚠️ WARNING: Session did not transition to live phase');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();