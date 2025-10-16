#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test accounts - you may need to update these
const GUEST_EMAIL = 'cheekyma@hotmail.com';
const GUEST_PASSWORD = 'test123456';
const PRACTITIONER_EMAIL = 'chefmat2018@gmail.com';
const PRACTITIONER_PASSWORD = 'test123456';

let guestToken = null;
let practitionerToken = null;
let guestId = null;
let practitionerId = null;
let sessionId = null;

async function login(email, password) {
  console.log(`\n📝 Logging in as ${email}...`);
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Login failed: ${error.error}`);
  }
  
  const data = await response.json();
  console.log(`✅ Logged in successfully`);
  return {
    token: data.access_token,
    userId: data.user.id,
    profile: data.profile
  };
}

async function getPractitionerStatus(token) {
  const response = await fetch(`${API_BASE}/practitioners/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get practitioner status: ${error.error}`);
  }
  
  return await response.json();
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
    throw new Error(`Failed to toggle practitioner status: ${error.error}`);
  }
  
  const data = await response.json();
  console.log(`✅ Practitioner is now ${data.isOnline ? 'online' : 'offline'}`);
  return data;
}

async function createSession(token, practitionerId) {
  console.log(`\n🎯 Creating session with practitioner ${practitionerId}...`);
  
  const response = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      practitionerId,
      liveSeconds: 300 // 5 minutes
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create session: ${error.error}`);
  }
  
  const data = await response.json();
  console.log(`✅ Session created with ID: ${data.sessionId}`);
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
  console.log(`\n✋ Marking ${who} as ready for session ${sessionId}...`);
  
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
    throw new Error(`Failed to mark ${who} ready: ${error.error}`);
  }
  
  const session = await response.json();
  console.log(`✅ ${who} marked as ready`);
  console.log(`   Guest ready: ${session.guestReady}`);
  console.log(`   Practitioner ready: ${session.practitionerReady}`);
  console.log(`   Session phase: ${session.phase}`);
  return session;
}

async function runTests() {
  console.log('🚀 Starting Session Flow Tests');
  console.log('================================\n');
  
  try {
    // Step 1: Login as both guest and practitioner
    console.log('Step 1: Login as both users');
    console.log('----------------------------');
    
    const guestAuth = await login(GUEST_EMAIL, GUEST_PASSWORD);
    guestToken = guestAuth.token;
    guestId = guestAuth.userId;
    console.log(`   Guest ID: ${guestId}`);
    console.log(`   Guest role: ${guestAuth.profile.role}`);
    
    const practAuth = await login(PRACTITIONER_EMAIL, PRACTITIONER_PASSWORD);
    practitionerToken = practAuth.token;
    practitionerId = practAuth.userId;
    console.log(`   Practitioner ID: ${practitionerId}`);
    console.log(`   Practitioner role: ${practAuth.profile.role}`);
    
    // Step 2: Set practitioner online
    console.log('\nStep 2: Set practitioner online');
    console.log('--------------------------------');
    await togglePractitionerOnline(practitionerToken, true);
    
    // Verify practitioner is online
    const practStatus = await getPractitionerStatus(practitionerToken);
    console.log(`   Practitioner online: ${practStatus.isOnline}`);
    
    // Step 3: Guest creates a session
    console.log('\nStep 3: Guest creates a session');
    console.log('--------------------------------');
    sessionId = await createSession(guestToken, practitionerId);
    
    // Get initial session state
    let session = await getSession(guestToken, sessionId);
    console.log(`   Session phase: ${session.phase}`);
    console.log(`   Guest ready: ${session.guestReady}`);
    console.log(`   Practitioner ready: ${session.practitionerReady}`);
    
    // Step 4: Guest marks ready
    console.log('\nStep 4: Guest marks ready');
    console.log('-------------------------');
    session = await markReady(guestToken, sessionId, 'guest');
    
    if (session.guestReady !== true) {
      throw new Error('Guest should be marked as ready');
    }
    if (session.phase !== 'waiting') {
      throw new Error('Session should still be waiting (practitioner not ready yet)');
    }
    
    // Step 5: Practitioner marks ready
    console.log('\nStep 5: Practitioner marks ready');
    console.log('---------------------------------');
    session = await markReady(practitionerToken, sessionId, 'practitioner');
    
    if (session.practitionerReady !== true) {
      throw new Error('Practitioner should be marked as ready');
    }
    if (session.guestReady !== true) {
      throw new Error('Guest should still be marked as ready');
    }
    if (session.phase !== 'live') {
      throw new Error('Session should transition to live when both are ready');
    }
    
    // Step 6: Verify final state
    console.log('\nStep 6: Verify final session state');
    console.log('-----------------------------------');
    session = await getSession(guestToken, sessionId);
    console.log(`   Session phase: ${session.phase}`);
    console.log(`   Guest ready: ${session.guestReady}`);
    console.log(`   Practitioner ready: ${session.practitionerReady}`);
    console.log(`   Agora channel: ${session.agoraChannel}`);
    
    // Final validation
    if (session.phase !== 'live') {
      throw new Error('Session should be in live phase');
    }
    if (!session.guestReady || !session.practitionerReady) {
      throw new Error('Both parties should be marked as ready');
    }
    if (!session.agoraChannel) {
      throw new Error('Session should have an Agora channel');
    }
    
    console.log('\n✅ All tests passed successfully!');
    console.log('==================================\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);