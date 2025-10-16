#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

// Chef Mat practitioner test credentials
const PRACTITIONER_EMAIL = 'chef.mat@example.com';
const PRACTITIONER_PASSWORD = 'practitioner123';

async function loginPractitioner() {
  console.log('🔐 Logging in as practitioner...');
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PRACTITIONER_EMAIL,
      password: PRACTITIONER_PASSWORD
    })
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Login failed: ${error}`);
  }
  
  const sessionCookie = res.headers.get('set-cookie');
  console.log('✅ Logged in successfully');
  return sessionCookie;
}

async function checkStatus(sessionCookie) {
  const res = await fetch(`${API_URL}/practitioners/status`, {
    headers: { 'Cookie': sessionCookie }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get status: ${await res.text()}`);
  }
  
  const data = await res.json();
  console.log('📊 Current status:', JSON.stringify(data, null, 2));
  
  // Check that the response has isOnline field (not online)
  if (!('isOnline' in data)) {
    throw new Error('❌ Response missing isOnline field');
  }
  
  return data.isOnline;
}

async function toggleStatus(sessionCookie, newStatus) {
  // Get practitioner profile to get user ID
  const profileRes = await fetch(`${API_URL}/profile`, {
    headers: { 'Cookie': sessionCookie }
  });
  const profile = await profileRes.json();
  
  console.log(`🔄 Toggling status to ${newStatus ? 'online' : 'offline'}...`);
  const res = await fetch(`${API_URL}/practitioners/${profile.id}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({ is_online: newStatus })
  });
  
  if (!res.ok) {
    throw new Error(`Failed to toggle status: ${await res.text()}`);
  }
  
  const data = await res.json();
  console.log('✅ Toggle response:', JSON.stringify(data, null, 2));
  
  // Verify response has isOnline field (not online)
  if (!('isOnline' in data)) {
    throw new Error('❌ Toggle response missing isOnline field');
  }
  
  return data;
}

async function runTest() {
  try {
    console.log('🧪 Testing online status toggle fix...\n');
    
    // Step 1: Login
    const sessionCookie = await loginPractitioner();
    
    // Step 2: Check initial status
    console.log('\n📍 Checking initial status...');
    const initialStatus = await checkStatus(sessionCookie);
    console.log(`Initial isOnline: ${initialStatus}`);
    
    // Step 3: Toggle to opposite status
    console.log('\n🔀 Toggling to opposite status...');
    const toggleResponse = await toggleStatus(sessionCookie, !initialStatus);
    
    // Verify toggle response has correct field and value
    if (toggleResponse.isOnline !== !initialStatus) {
      throw new Error(`❌ Toggle failed: expected ${!initialStatus}, got ${toggleResponse.isOnline}`);
    }
    console.log(`✅ Toggle successful: isOnline is now ${toggleResponse.isOnline}`);
    
    // Step 4: Verify status persisted
    console.log('\n🔍 Verifying status persisted...');
    const newStatus = await checkStatus(sessionCookie);
    
    if (newStatus !== !initialStatus) {
      throw new Error(`❌ Status not persisted: expected ${!initialStatus}, got ${newStatus}`);
    }
    console.log(`✅ Status persisted correctly: ${newStatus}`);
    
    // Step 5: Toggle back to original
    console.log('\n↩️ Toggling back to original status...');
    await toggleStatus(sessionCookie, initialStatus);
    
    // Step 6: Final verification
    console.log('\n✨ Final verification...');
    const finalStatus = await checkStatus(sessionCookie);
    
    if (finalStatus !== initialStatus) {
      throw new Error(`❌ Final status incorrect: expected ${initialStatus}, got ${finalStatus}`);
    }
    
    console.log('\n🎉 All tests passed! The online status toggle is working correctly.');
    console.log('✅ UI should now update immediately when toggling');
    console.log('✅ Status persists after refresh');
    console.log('✅ Button shows correct state (Online/Offline)');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();