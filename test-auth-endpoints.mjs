#!/usr/bin/env node

/**
 * Test script for authentication endpoints
 */

const BASE_URL = 'http://localhost:5000';

// Test data
const testUser = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123',
  full_name: 'Test User',
  role: 'guest'
};

let accessToken = '';

async function testSignup() {
  console.log('\n🧪 Testing POST /api/auth/signup...');
  console.log(`   Creating user: ${testUser.email}`);
  
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Signup failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error('No access token returned from signup');
  }
  
  accessToken = data.access_token;
  
  console.log('✅ Signup successful');
  console.log(`   User ID: ${data.user.id}`);
  console.log(`   Access token: ${accessToken.substring(0, 20)}...`);
  console.log(`   Profile role: ${data.profile.role}`);
  
  return true;
}

async function testLogin() {
  console.log('\n🧪 Testing POST /api/auth/login...');
  console.log(`   Logging in as: ${testUser.email}`);
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error('No access token returned from login');
  }
  
  accessToken = data.access_token;
  
  console.log('✅ Login successful');
  console.log(`   User ID: ${data.user.id}`);
  console.log(`   Access token: ${accessToken.substring(0, 20)}...`);
  console.log(`   Profile display name: ${data.profile?.displayName}`);
  
  return true;
}

async function testGetUser() {
  console.log('\n🧪 Testing GET /api/auth/user...');
  console.log(`   Using Bearer token authentication`);
  
  const response = await fetch(`${BASE_URL}/api/auth/user`, {
    headers: { 
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Get user failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  console.log('✅ Get user successful');
  console.log(`   User ID: ${data.id}`);
  console.log(`   Profile display name: ${data.profile.displayName}`);
  console.log(`   Profile role: ${data.profile.role}`);
  
  return true;
}

async function testLogout() {
  console.log('\n🧪 Testing POST /api/auth/logout...');
  console.log(`   Using Bearer token in Authorization header`);
  
  const response = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.status !== 204) {
    const error = await response.text();
    throw new Error(`Logout failed: Expected 204, got ${response.status} - ${error}`);
  }
  
  console.log('✅ Logout successful (204 No Content)');
  
  return true;
}

async function testUnauthorizedAccess() {
  console.log('\n🧪 Testing unauthorized access after logout...');
  
  const response = await fetch(`${BASE_URL}/api/auth/user`, {
    headers: { 
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.ok) {
    throw new Error('Expected 401 Unauthorized, but request succeeded');
  }
  
  console.log('✅ Correctly blocked unauthorized access (401 Unauthorized)');
  
  return true;
}

async function runTests() {
  console.log('🚀 Starting Authentication Endpoint Tests');
  console.log('=' .repeat(50));
  
  try {
    // Test signup
    await testSignup();
    
    // Test login  
    await testLogin();
    
    // Test get user
    await testGetUser();
    
    // Test logout
    await testLogout();
    
    // Test unauthorized access after logout
    await testUnauthorizedAccess();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All authentication tests passed!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();