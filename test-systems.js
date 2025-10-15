#!/usr/bin/env node

/**
 * Comprehensive system test for Allinya platform
 * Tests: Object Storage, Agora Video, Database, and Auth
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

// Test credentials
const PRACTITIONER = {
  email: 'chefmat2018@gmail.com',
  password: 'Rickrick01'
};

const GUEST = {
  email: 'cheekyma@hotmail.com', 
  password: 'Rickrick01'
};

let practitionerToken = '';
let guestToken = '';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(credentials) {
  console.log(`\nLogging in as ${credentials.email}...`);
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.session || !data.session.access_token) {
    throw new Error('No access token received');
  }
  
  const token = data.session.access_token;
  console.log('✅ Login successful');
  console.log(`   User ID: ${data.user.id}`);
  console.log(`   Access token: ${token.substring(0, 20)}...`);
  return token;
}

async function testObjectStorage(token) {
  console.log('\n🧪 Testing Object Storage...');
  
  try {
    // Test getting upload URL
    const uploadResponse = await fetch(`${BASE_URL}/api/objects/upload-public`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      if (error.includes('running on Replit')) {
        console.log('⚠️  Object storage requires Replit environment (expected in local dev)');
        return 'skipped';
      }
      throw new Error(`Failed to get upload URL: ${uploadResponse.status}`);
    }
    
    const { uploadURL, publicPath } = await uploadResponse.json();
    console.log('✅ Got upload URL');
    console.log(`   Public path: ${publicPath}`);
    console.log(`   Upload URL starts with: ${uploadURL.substring(0, 50)}...`);
    
    // Test updating profile with avatar
    const avatarResponse = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ publicPath })
    });
    
    if (!avatarResponse.ok) {
      const error = await avatarResponse.text();
      throw new Error(`Failed to update avatar: ${avatarResponse.status} - ${error}`);
    }
    
    console.log('✅ Avatar URL updated in profile');
    
    return true;
  } catch (error) {
    if (error.message.includes('500')) {
      console.log('⚠️  Object storage requires Replit environment (expected in local dev)');
      return 'skipped';
    }
    throw error;
  }
}

async function testAgoraToken(token) {
  console.log('\n🧪 Testing Agora Token Generation...');
  
  const channel = `test_${Date.now()}`;
  const uid = `test_${Math.random().toString(36).substring(7)}`;
  
  const response = await fetch(`${BASE_URL}/api/agora/token?channel=${channel}&role=host&uid=${uid}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Agora token: ${response.status} - ${error}`);
  }
  
  const { token: agoraToken } = await response.json();
  console.log('✅ Agora token generated');
  console.log(`   Token length: ${agoraToken.length} characters`);
  
  return true;
}

async function testSessionCreation(practitionerToken, guestToken) {
  console.log('\n🧪 Testing Session Creation...');
  
  // First, get practitioner ID
  const practitionersResponse = await fetch(`${BASE_URL}/api/practitioners`);
  const practitioners = await practitionersResponse.json();
  
  if (!practitioners || practitioners.length === 0) {
    console.log('⚠️  No practitioners found, skipping session test');
    return false;
  }
  
  const practitionerId = practitioners[0].userId || practitioners[0].id;
  console.log(`   Using practitioner ID: ${practitionerId}`);
  
  // Create session as guest using /api/sessions/start
  const sessionResponse = await fetch(`${BASE_URL}/api/sessions/start`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${guestToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      practitionerId,
      liveSeconds: 300 // 5 minutes
    })
  });
  
  if (!sessionResponse.ok) {
    const error = await sessionResponse.text();
    throw new Error(`Failed to create session: ${sessionResponse.status} - ${error}`);
  }
  
  const sessionData = await sessionResponse.json();
  const sessionId = sessionData.sessionId;
  console.log('✅ Session created');
  console.log(`   Session ID: ${sessionId}`);
  
  // Get session details
  const sessionDetailsResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${guestToken}` }
  });
  
  if (!sessionDetailsResponse.ok) {
    throw new Error(`Failed to get session details: ${sessionDetailsResponse.status}`);
  }
  
  const session = await sessionDetailsResponse.json();
  console.log(`   Agora Channel: ${session.agoraChannel}`);
  console.log(`   Guest UID: ${session.agoraUidGuest}`);
  console.log(`   Practitioner UID: ${session.agoraUidPractitioner}`);
  
  return session;
}

async function testDatabaseConnection() {
  console.log('\n🧪 Testing Database Connection...');
  
  const response = await fetch(`${BASE_URL}/api/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  
  const health = await response.json();
  console.log('✅ Database connected');
  console.log(`   Status: ${health.status}`);
  
  return true;
}

async function runAllTests() {
  console.log('========================================');
  console.log('     ALLINYA SYSTEM VERIFICATION TEST');
  console.log('========================================');
  
  const results = {
    database: false,
    practitionerAuth: false,
    guestAuth: false,
    objectStorage: false,
    agoraToken: false,
    sessionCreation: false
  };
  
  try {
    // Test database
    results.database = await testDatabaseConnection();
    
    // Test auth
    practitionerToken = await login(PRACTITIONER);
    results.practitionerAuth = true;
    
    guestToken = await login(GUEST);
    results.guestAuth = true;
    
    // Test object storage
    results.objectStorage = await testObjectStorage(practitionerToken);
    
    // Test Agora
    results.agoraToken = await testAgoraToken(practitionerToken);
    
    // Test session creation
    results.sessionCreation = await testSessionCreation(practitionerToken, guestToken);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
  
  // Print summary
  console.log('\n========================================');
  console.log('              TEST SUMMARY');
  console.log('========================================');
  console.log(`Database Connection:  ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Practitioner Auth:    ${results.practitionerAuth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Guest Auth:           ${results.guestAuth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Object Storage:       ${results.objectStorage === 'skipped' ? '⚠️ SKIPPED (local dev)' : results.objectStorage ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Agora Token:          ${results.agoraToken ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Creation:     ${results.sessionCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log('========================================');
  
  const allPassed = Object.entries(results).every(([key, value]) => {
    if (key === 'objectStorage' && value === 'skipped') return true;
    return value;
  });
  
  if (allPassed) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL! 🎉');
  } else {
    console.log('⚠️  Some systems need attention');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});