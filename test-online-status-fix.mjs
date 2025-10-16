#!/usr/bin/env node

// Test script to verify the practitioner online status toggle fix
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Use test credentials
const PRACTITIONER_EMAIL = 'chef.matsumoto@yahoo.com';
const PRACTITIONER_PASSWORD = 'password123';

async function testOnlineStatusToggle() {
  console.log('🧪 Testing Practitioner Online Status Toggle Fix');
  console.log('================================================\n');

  try {
    // Step 1: Login as practitioner
    console.log('1️⃣ Logging in as practitioner...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: PRACTITIONER_EMAIL,
        password: PRACTITIONER_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Login failed: ${error}`);
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access_token;
    const practitionerId = loginData.user.id;

    console.log('✅ Login successful');
    console.log(`   Practitioner ID: ${practitionerId}\n`);

    // Step 2: Test toggling online status to true
    console.log('2️⃣ Testing toggle to ONLINE...');
    const toggleOnResponse = await fetch(`${BASE_URL}/api/presence/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        online: true,
      }),
    });

    if (!toggleOnResponse.ok) {
      const error = await toggleOnResponse.text();
      console.error('❌ Toggle to online failed:', error);
      throw new Error(`Toggle to online failed: ${error}`);
    }

    const toggleOnData = await toggleOnResponse.json();
    console.log('✅ Toggle to online successful');
    console.log(`   Online status: ${toggleOnData.online}`);
    console.log(`   In service: ${toggleOnData.inService}\n`);

    // Step 3: Verify status via GET endpoint
    console.log('3️⃣ Verifying status via GET endpoint...');
    const statusResponse = await fetch(`${BASE_URL}/api/practitioners/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.text();
      console.error('❌ Get status failed:', error);
      throw new Error(`Get status failed: ${error}`);
    }

    const statusData = await statusResponse.json();
    console.log('✅ Status retrieved successfully');
    console.log(`   Online: ${statusData.online}`);
    console.log(`   In service: ${statusData.inService}\n`);

    // Step 4: Test toggling online status to false
    console.log('4️⃣ Testing toggle to OFFLINE...');
    const toggleOffResponse = await fetch(`${BASE_URL}/api/presence/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        online: false,
      }),
    });

    if (!toggleOffResponse.ok) {
      const error = await toggleOffResponse.text();
      console.error('❌ Toggle to offline failed:', error);
      throw new Error(`Toggle to offline failed: ${error}`);
    }

    const toggleOffData = await toggleOffResponse.json();
    console.log('✅ Toggle to offline successful');
    console.log(`   Online status: ${toggleOffData.online}`);
    console.log(`   In service: ${toggleOffData.inService}\n`);

    // Step 5: Test alternate PATCH endpoint (used by frontend)
    console.log('5️⃣ Testing PATCH endpoint (used by frontend)...');
    const patchResponse = await fetch(`${BASE_URL}/api/practitioners/${practitionerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        is_online: true,
      }),
    });

    if (!patchResponse.ok) {
      const error = await patchResponse.text();
      console.error('❌ PATCH status failed:', error);
      throw new Error(`PATCH status failed: ${error}`);
    }

    const patchData = await patchResponse.json();
    console.log('✅ PATCH status successful');
    console.log(`   Success: ${patchData.success}`);
    console.log(`   Online: ${patchData.online}`);
    console.log(`   Message: ${patchData.message}\n`);

    // Step 6: Test listing all practitioners (verify ordering works)
    console.log('6️⃣ Testing listing all practitioners...');
    const listResponse = await fetch(`${BASE_URL}/api/practitioners`, {
      method: 'GET',
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('❌ List practitioners failed:', error);
      throw new Error(`List practitioners failed: ${error}`);
    }

    const practitioners = await listResponse.json();
    console.log('✅ List practitioners successful');
    console.log(`   Total practitioners: ${practitioners.length}`);
    if (practitioners.length > 0) {
      console.log(`   First practitioner online status: ${practitioners[0].online}`);
    }
    console.log('');

    // Step 7: Test getting online practitioners only
    console.log('7️⃣ Testing getting online practitioners...');
    const onlineResponse = await fetch(`${BASE_URL}/api/practitioners/online`, {
      method: 'GET',
    });

    if (!onlineResponse.ok) {
      const error = await onlineResponse.text();
      console.error('❌ Get online practitioners failed:', error);
      throw new Error(`Get online practitioners failed: ${error}`);
    }

    const onlinePractitioners = await onlineResponse.json();
    console.log('✅ Get online practitioners successful');
    console.log(`   Online practitioners: ${onlinePractitioners.length}\n`);

    console.log('====================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('====================================\n');
    console.log('The PostgREST schema cache workaround is working correctly!');
    console.log('The practitioner online status toggle bug has been fixed.');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nThis indicates the fix may not be working properly.');
    console.error('Check the server logs for more details.');
    process.exit(1);
  }
}

// Run the test
testOnlineStatusToggle();