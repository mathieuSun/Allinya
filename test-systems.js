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

let practitionerCookie = '';
let guestCookie = '';

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
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie received');
  }
  
  // Extract just the connect.sid cookie
  const sidMatch = setCookie.match(/connect\.sid=([^;]+)/);
  if (!sidMatch) {
    throw new Error('No session ID found in cookie');
  }
  
  const cookie = `connect.sid=${sidMatch[1]}`;
  console.log('✅ Login successful');
  console.log(`   Session cookie: ${cookie.substring(0, 50)}...`);
  return cookie;
}

async function testObjectStorage(cookie) {
  console.log('\n🧪 Testing Object Storage...');
  
  // Test getting upload URL
  const uploadResponse = await fetch(`${BASE_URL}/api/objects/upload-public`, {
    method: 'POST',
    headers: { 'Cookie': cookie }
  });
  
  if (!uploadResponse.ok) {
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
      'Cookie': cookie,
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
}

async function testAgoraToken(cookie) {
  console.log('\n🧪 Testing Agora Token Generation...');
  
  const channel = `test_${Date.now()}`;
  const uid = `test_${Math.random().toString(36).substring(7)}`;
  
  const response = await fetch(`${BASE_URL}/api/agora/token?channel=${channel}&role=host&uid=${uid}`, {
    headers: { 'Cookie': cookie }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Agora token: ${response.status} - ${error}`);
  }
  
  const { token } = await response.json();
  console.log('✅ Agora token generated');
  console.log(`   Token length: ${token.length} characters`);
  
  return true;
}

async function testSessionCreation(practitionerCookie, guestCookie) {
  console.log('\n🧪 Testing Session Creation...');
  
  // First, get practitioner ID
  const practitionersResponse = await fetch(`${BASE_URL}/api/practitioners`);
  const practitioners = await practitionersResponse.json();
  
  if (!practitioners || practitioners.length === 0) {
    console.log('⚠️  No practitioners found, skipping session test');
    return false;
  }
  
  const practitionerId = practitioners[0].id;
  console.log(`   Using practitioner ID: ${practitionerId}`);
  
  // Create session as guest
  const sessionResponse = await fetch(`${BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: { 
      'Cookie': guestCookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ practitionerId })
  });
  
  if (!sessionResponse.ok) {
    const error = await sessionResponse.text();
    throw new Error(`Failed to create session: ${sessionResponse.status} - ${error}`);
  }
  
  const session = await sessionResponse.json();
  console.log('✅ Session created');
  console.log(`   Session ID: ${session.id}`);
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
    practitionerCookie = await login(PRACTITIONER);
    results.practitionerAuth = true;
    
    guestCookie = await login(GUEST);
    results.guestAuth = true;
    
    // Test object storage
    results.objectStorage = await testObjectStorage(practitionerCookie);
    
    // Test Agora
    results.agoraToken = await testAgoraToken(practitionerCookie);
    
    // Test session creation
    results.sessionCreation = await testSessionCreation(practitionerCookie, guestCookie);
    
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
  console.log(`Object Storage:       ${results.objectStorage ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Agora Token:          ${results.agoraToken ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Creation:     ${results.sessionCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log('========================================');
  
  const allPassed = Object.values(results).every(r => r);
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