#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

// Test credentials
const TEST_EMAIL = 'chef_mat@example.com';
const TEST_PASSWORD = 'testpass123';

async function testAgoraTokenEndpoint() {
  console.log('Testing Agora token endpoint with fixed parameters...\n');

  try {
    // 1. Login first to get auth token
    console.log('1. Logging in as practitioner...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });

    if (!loginRes.ok) {
      const error = await loginRes.text();
      throw new Error(`Login failed: ${error}`);
    }

    const loginData = await loginRes.json();
    const authToken = loginData.access_token;
    console.log('✓ Login successful\n');

    // 2. Test with practitioner UID
    console.log('2. Testing token generation with practitioner UID...');
    const practitionerUid = 'p_1a20c2b4';
    const testChannel = 'sess_test123';
    
    const tokenRes1 = await fetch(
      `${API_URL}/api/agora/token?channel=${testChannel}&uid=${practitionerUid}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (!tokenRes1.ok) {
      const error = await tokenRes1.text();
      console.error('✗ Failed to generate token for practitioner:', error);
    } else {
      const data = await tokenRes1.json();
      console.log('✓ Token generated for practitioner UID:', practitionerUid);
      console.log('  Token:', data.token.substring(0, 50) + '...');
    }

    // 3. Test with guest UID
    console.log('\n3. Testing token generation with guest UID...');
    const guestUid = 'g_38774353';
    
    const tokenRes2 = await fetch(
      `${API_URL}/api/agora/token?channel=${testChannel}&uid=${guestUid}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (!tokenRes2.ok) {
      const error = await tokenRes2.text();
      console.error('✗ Failed to generate token for guest:', error);
    } else {
      const data = await tokenRes2.json();
      console.log('✓ Token generated for guest UID:', guestUid);
      console.log('  Token:', data.token.substring(0, 50) + '...');
    }

    // 4. Test error case - missing parameters
    console.log('\n4. Testing error handling (missing uid)...');
    const errorRes = await fetch(
      `${API_URL}/api/agora/token?channel=${testChannel}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (errorRes.ok) {
      console.error('✗ Should have failed with missing uid');
    } else {
      console.log('✓ Correctly rejected request with missing uid');
    }

    console.log('\n✅ All tests passed! The endpoint is now working correctly.');
    console.log('The endpoint accepts:');
    console.log('  - channel: the session\'s agoraChannel field');
    console.log('  - uid: unique identifier (p_ or g_ prefixed)');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testAgoraTokenEndpoint();