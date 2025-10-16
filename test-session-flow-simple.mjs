#!/usr/bin/env node

import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

const API_BASE = 'http://localhost:5000/api';

// Generate random test emails with valid domains
const timestamp = Date.now();
const guestEmail = `testguest${timestamp}@gmail.com`;
const practEmail = `testpract${timestamp}@gmail.com`;
const password = 'TestPass123!';

let guestToken = null;
let practitionerToken = null;
let guestId = null;
let practitionerId = null;
let sessionId = null;

async function signup(email, password, full_name, role) {
  console.log(`\n📝 Creating ${role} account: ${email}...`);
  
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name, role })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Signup failed: ${data.error || response.statusText}`);
  }
  
  console.log(`✅ Account created`);
  
  // If no session/token (due to email confirmation), login immediately
  if (!data.access_token || !data.session) {
    console.log(`   No immediate session, logging in...`);
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      throw new Error(`Login failed after signup: ${loginData.error}`);
    }
    
    return {
      token: loginData.access_token,
      userId: loginData.user.id,
      profile: loginData.profile
    };
  }
  
  return {
    token: data.access_token,
    userId: data.user.id,
    profile: data.profile
  };
}

async function togglePractitionerOnline(token, online) {
  console.log(`\n👤 Setting practitioner online status to: ${online}...`);
  
  const response = await fetch(`${API_BASE}/presence/toggle`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ online })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to toggle status: ${error.error}`);
  }
  
  const data = await response.json();
  console.log(`✅ Practitioner is now ${data.isOnline ? 'online' : 'offline'}`);
  return data;
}

async function createSession(token, practitionerId) {
  console.log(`\n🎯 Creating session...`);
  
  const response = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      practitionerId,
      liveSeconds: 300
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create session: ${error.error}`);
  }
  
  const data = await response.json();
  console.log(`✅ Session created: ${data.sessionId}`);
  return data.sessionId;
}

async function getSession(token, sessionId) {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get session: ${error.error}`);
  }
  
  return await response.json();
}

async function markReady(token, sessionId, who) {
  console.log(`\n✋ Marking ${who} as ready...`);
  
  const response = await fetch(`${API_BASE}/sessions/ready`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      who
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to mark ready: ${error.error}`);
  }
  
  return await response.json();
}

async function runTests() {
  console.log('🚀 Testing Session Flow');
  console.log('========================\n');
  
  try {
    // Step 1: Create accounts
    console.log('STEP 1: Create test accounts');
    const guestAuth = await signup(guestEmail, password, 'Test Guest', 'guest');
    guestToken = guestAuth.token;
    guestId = guestAuth.userId;
    console.log(`   Guest ID: ${guestId}`);
    
    const practAuth = await signup(practEmail, password, 'Test Practitioner', 'practitioner');
    practitionerToken = practAuth.token;
    practitionerId = practAuth.userId;
    console.log(`   Practitioner ID: ${practitionerId}`);
    
    // Step 2: Set practitioner online
    console.log('\nSTEP 2: Set practitioner online');
    await togglePractitionerOnline(practitionerToken, true);
    
    // Step 3: Guest creates session
    console.log('\nSTEP 3: Guest creates session');
    sessionId = await createSession(guestToken, practitionerId);
    
    let session = await getSession(guestToken, sessionId);
    console.log(`   Initial state:`);
    console.log(`   - Phase: ${session.phase} (should be 'waiting')`);
    console.log(`   - Guest ready: ${session.guestReady} (should be false)`);
    console.log(`   - Practitioner ready: ${session.practitionerReady} (should be false)`);
    
    if (session.phase !== 'waiting' || session.guestReady !== false || session.practitionerReady !== false) {
      throw new Error('Initial session state is incorrect');
    }
    
    // Step 4: Guest marks ready
    console.log('\nSTEP 4: Guest marks ready');
    session = await markReady(guestToken, sessionId, 'guest');
    console.log(`   After guest ready:`);
    console.log(`   - Phase: ${session.phase} (should still be 'waiting')`);
    console.log(`   - Guest ready: ${session.guestReady} (should be true)`);
    console.log(`   - Practitioner ready: ${session.practitionerReady} (should be false)`);
    
    if (session.guestReady !== true || session.practitionerReady !== false || session.phase !== 'waiting') {
      throw new Error('Session state after guest ready is incorrect');
    }
    
    // Step 5: Practitioner marks ready (should trigger transition to live)
    console.log('\nSTEP 5: Practitioner marks ready');
    session = await markReady(practitionerToken, sessionId, 'practitioner');
    console.log(`   After practitioner ready:`);
    console.log(`   - Phase: ${session.phase} (should be 'live')`);
    console.log(`   - Guest ready: ${session.guestReady} (should be true)`);
    console.log(`   - Practitioner ready: ${session.practitionerReady} (should be true)`);
    
    if (session.guestReady !== true || session.practitionerReady !== true || session.phase !== 'live') {
      throw new Error('Session should transition to live when both are ready');
    }
    
    // Final verification
    console.log('\nSTEP 6: Final verification');
    session = await getSession(guestToken, sessionId);
    console.log(`   Final state:`);
    console.log(`   - Phase: ${session.phase}`);
    console.log(`   - Guest ready: ${session.guestReady}`);
    console.log(`   - Practitioner ready: ${session.practitionerReady}`);
    console.log(`   - Agora channel: ${session.agoraChannel}`);
    
    if (session.phase !== 'live') {
      throw new Error(`❌ Session phase is ${session.phase}, expected 'live'`);
    }
    if (!session.guestReady || !session.practitionerReady) {
      throw new Error('❌ Both parties should be ready');
    }
    if (!session.agoraChannel) {
      throw new Error('❌ Session should have Agora channel');
    }
    
    console.log('\n✅ All tests PASSED!');
    console.log('====================');
    console.log('✓ Session created successfully');
    console.log('✓ Guest can mark ready');
    console.log('✓ Practitioner can mark ready');
    console.log('✓ Session transitions to live when both ready');
    console.log('✓ Database fields are properly mapped');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTests().catch(console.error);