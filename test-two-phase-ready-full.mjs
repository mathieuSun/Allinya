#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000/api';

// Test user details
const practitionerDetails = {
  email: `practitioner_${Date.now()}@test.com`,
  password: 'test1234',
  full_name: 'Test Practitioner',
  role: 'practitioner'
};

const guestDetails = {
  email: `guest_${Date.now()}@test.com`,
  password: 'test1234',
  full_name: 'Test Guest',
  role: 'guest'
};

async function signupUser(details) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(details),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Signup failed: ${data.error}`);
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

async function updatePractitionerStatus(token, practitionerId, isOnline) {
  const response = await fetch(`${API_BASE_URL}/practitioners/${practitionerId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ isOnline }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Update status failed: ${data.error}`);
  }
  return data;
}

async function runTest() {
  console.log('🧪 Testing Two-Phase Ready System\n');
  console.log('Test emails:');
  console.log('  Practitioner:', practitionerDetails.email);
  console.log('  Guest:', guestDetails.email);
  console.log('');
  
  try {
    // Step 1: Create test users
    console.log('1. Creating test users...');
    const practitionerData = await signupUser(practitionerDetails);
    const guestData = await signupUser(guestDetails);
    console.log('✅ Both test users created\n');
    
    // Step 2: Set practitioner online
    console.log('2. Setting practitioner online...');
    await updatePractitionerStatus(
      practitionerData.access_token, 
      practitionerData.profile.id, 
      true
    );
    console.log('✅ Practitioner is online\n');
    
    // Step 3: Create a session
    console.log('3. Creating session...');
    const sessionId = await createSession(guestData.access_token, practitionerData.profile.id);
    console.log(`✅ Session created: ${sessionId}\n`);
    
    // Step 4: Get session status (should show not acknowledged, not ready)
    console.log('4. Checking initial session status...');
    let session = await getSession(guestData.access_token, sessionId);
    console.log(`   acknowledgedPractitioner: ${session.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${session.readyPractitioner}`);
    console.log(`   readyGuest: ${session.readyGuest}`);
    console.log(`   phase: ${session.phase}`);
    
    if (!session.acknowledgedPractitioner) {
      console.log('   ✅ Correctly not acknowledged initially\n');
    } else {
      console.log('   ❌ ERROR: Should not be acknowledged initially\n');
    }
    
    // Step 5: Try to mark practitioner ready without acknowledging (should fail)
    console.log('5. Testing ready without acknowledgment (should fail)...');
    try {
      await markReady(practitionerData.access_token, sessionId, 'practitioner');
      console.log('❌ UNEXPECTED: Practitioner was able to mark ready without acknowledging');
      process.exit(1);
    } catch (error) {
      console.log('✅ Correctly prevented: ' + error.message + '\n');
    }
    
    // Step 6: Acknowledge the session as practitioner
    console.log('6. Acknowledging session as practitioner...');
    const ackResult = await acknowledgeSession(practitionerData.access_token, sessionId);
    console.log(`✅ ${ackResult.message}\n`);
    
    // Step 7: Check session status (should show acknowledged but not ready)
    console.log('7. Checking session after acknowledgment...');
    session = await getSession(guestData.access_token, sessionId);
    console.log(`   acknowledgedPractitioner: ${session.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${session.readyPractitioner}`);
    console.log(`   readyGuest: ${session.readyGuest}`);
    console.log(`   phase: ${session.phase}`);
    
    if (session.acknowledgedPractitioner && !session.readyPractitioner) {
      console.log('   ✅ Correctly acknowledged but not ready\n');
    } else {
      console.log('   ❌ ERROR: Wrong acknowledgment state\n');
    }
    
    // Step 8: Mark practitioner ready (should work now)
    console.log('8. Marking practitioner ready...');
    await markReady(practitionerData.access_token, sessionId, 'practitioner');
    console.log('✅ Practitioner marked ready\n');
    
    // Step 9: Check session status
    console.log('9. Checking session after practitioner ready...');
    session = await getSession(guestData.access_token, sessionId);
    console.log(`   acknowledgedPractitioner: ${session.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${session.readyPractitioner}`);
    console.log(`   readyGuest: ${session.readyGuest}`);
    console.log(`   phase: ${session.phase}`);
    
    if (session.readyPractitioner && !session.readyGuest && session.phase === 'waiting') {
      console.log('   ✅ Practitioner ready, waiting for guest\n');
    } else {
      console.log('   ❌ ERROR: Wrong ready state\n');
    }
    
    // Step 10: Mark guest ready
    console.log('10. Marking guest ready...');
    const finalSession = await markReady(guestData.access_token, sessionId, 'guest');
    console.log('✅ Guest marked ready\n');
    
    // Step 11: Check final status (should transition to live)
    console.log('11. Checking final session status...');
    console.log(`   acknowledgedPractitioner: ${finalSession.acknowledgedPractitioner}`);
    console.log(`   readyPractitioner: ${finalSession.readyPractitioner}`);
    console.log(`   readyGuest: ${finalSession.readyGuest}`);
    console.log(`   phase: ${finalSession.phase}\n`);
    
    if (finalSession.phase === 'live' && 
        finalSession.acknowledgedPractitioner &&
        finalSession.readyPractitioner &&
        finalSession.readyGuest) {
      console.log('🎉 SUCCESS: Two-phase ready system working perfectly!');
      console.log('   ✅ Acknowledgment requirement enforced');
      console.log('   ✅ Both parties marked ready');
      console.log('   ✅ Session transitioned to live');
      console.log('\n✨ All tests passed!');
    } else {
      console.log('⚠️ WARNING: Final state not as expected');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();