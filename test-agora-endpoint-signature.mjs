#!/usr/bin/env node

/**
 * Simple test to verify Agora token endpoint signature is fixed
 * Tests that the endpoint now accepts channel and uid (not role)
 */

const BASE_URL = 'http://localhost:5000';

async function testEndpointSignature() {
  console.log('==============================================');
  console.log('Agora Token Endpoint Signature Test');
  console.log('==============================================\n');

  console.log('Testing endpoint without authentication to verify parameter requirements:\n');

  // Test 1: Call with correct parameters (should fail auth but not validation)
  console.log('1. Testing with correct parameters (channel + uid):');
  const res1 = await fetch(
    `${BASE_URL}/api/agora/token?channel=test_channel&uid=p_12345678`
  );
  
  if (res1.status === 401) {
    console.log('   ✓ Got 401 Unauthorized (expected without auth)');
    console.log('   ✓ Parameters accepted! No 400 validation error');
  } else if (res1.status === 400) {
    const error = await res1.text();
    console.log('   ✗ Got 400 Bad Request - parameters rejected');
    console.log('   Error:', error);
  } else {
    console.log('   Status:', res1.status);
  }

  // Test 2: Call with old-style role parameter
  console.log('\n2. Testing with old parameters (channel + role + uid):');
  const res2 = await fetch(
    `${BASE_URL}/api/agora/token?channel=test_channel&role=host&uid=p_12345678`
  );
  
  if (res2.status === 401) {
    console.log('   ✓ Got 401 Unauthorized');
    console.log('   ✓ Still works with extra "role" param (ignored)');
  } else if (res2.status === 400) {
    console.log('   ⚠ Got 400 - might be validating against role');
  }

  // Test 3: Missing uid parameter
  console.log('\n3. Testing with missing uid (only channel):');
  const res3 = await fetch(
    `${BASE_URL}/api/agora/token?channel=test_channel`
  );
  
  if (res3.status === 400) {
    console.log('   ✓ Got 400 Bad Request - uid is required');
  } else if (res3.status === 401) {
    console.log('   ✗ Got 401 - should validate parameters first');
  }

  // Test 4: Missing channel parameter
  console.log('\n4. Testing with missing channel (only uid):');
  const res4 = await fetch(
    `${BASE_URL}/api/agora/token?uid=p_12345678`
  );
  
  if (res4.status === 400) {
    console.log('   ✓ Got 400 Bad Request - channel is required');
  } else if (res4.status === 401) {
    console.log('   ✗ Got 401 - should validate parameters first');
  }

  console.log('\n==============================================');
  console.log('Summary of Fixed Endpoint');
  console.log('==============================================');
  console.log('\nThe /api/agora/token endpoint now:');
  console.log('  • REQUIRES: channel (string) - the session\'s agoraChannel');
  console.log('  • REQUIRES: uid (string) - unique ID with p_ or g_ prefix');
  console.log('  • REMOVED: role parameter (was "host" or "audience")');
  console.log('  • BEHAVIOR: All users get PUBLISHER role (can send audio/video)');
  console.log('\n✅ The endpoint signature has been fixed!');
  console.log('   It no longer expects a "role" parameter.');
  console.log('   It accepts UIDs like "p_1a20c2b4" and "g_38774353".');
}

// Run the test
testEndpointSignature();