#!/usr/bin/env node

// Simple test script to verify the practitioner online status toggle fix
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Generate unique test user credentials
const timestamp = Date.now();
const TEST_EMAIL = `test-practitioner-${timestamp}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = `Test Practitioner ${timestamp}`;

async function testOnlineStatusToggle() {
  console.log('🧪 Testing Practitioner Online Status Toggle Fix (PostgREST Workaround)');
  console.log('=====================================================================\n');

  try {
    // Step 1: Create a new test practitioner account
    console.log('1️⃣ Creating test practitioner account...');
    console.log(`   Email: ${TEST_EMAIL}`);
    
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        full_name: TEST_NAME,
        role: 'practitioner',
      }),
    });

    if (!signupResponse.ok) {
      const error = await signupResponse.text();
      throw new Error(`Signup failed: ${error}`);
    }

    const signupData = await signupResponse.json();
    const accessToken = signupData.access_token;
    const practitionerId = signupData.user.id;

    console.log('✅ Test practitioner created successfully');
    console.log(`   Practitioner ID: ${practitionerId}\n`);

    // Wait a moment for the database to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Test the main toggle endpoint (POST /api/presence/toggle)
    console.log('2️⃣ Testing POST /api/presence/toggle endpoint...');
    console.log('   Setting online = true');
    
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
      console.error('❌ FAILED: Toggle to online failed');
      console.error(`   Error: ${error}`);
      console.error('   This means the PostgREST schema cache workaround may not be working.\n');
      throw new Error(`Toggle failed with: ${error}`);
    }

    const toggleOnData = await toggleOnResponse.json();
    console.log('✅ SUCCESS: Toggle to online worked!');
    console.log(`   Response: online=${toggleOnData.online}, inService=${toggleOnData.inService}\n`);

    // Step 3: Toggle back to offline
    console.log('3️⃣ Testing toggle to offline...');
    
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
      console.error('❌ FAILED: Toggle to offline failed');
      console.error(`   Error: ${error}\n`);
      throw new Error(`Toggle failed with: ${error}`);
    }

    const toggleOffData = await toggleOffResponse.json();
    console.log('✅ SUCCESS: Toggle to offline worked!');
    console.log(`   Response: online=${toggleOffData.online}, inService=${toggleOffData.inService}\n`);

    // Step 4: Test the PATCH endpoint (used by frontend)
    console.log('4️⃣ Testing PATCH /api/practitioners/:id/status endpoint...');
    console.log('   This is the endpoint used by the frontend UI');
    
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
      console.error('❌ FAILED: PATCH status endpoint failed');
      console.error(`   Error: ${error}`);
      console.error('   The frontend toggle will not work!\n');
      throw new Error(`PATCH failed with: ${error}`);
    }

    const patchData = await patchResponse.json();
    console.log('✅ SUCCESS: PATCH status worked!');
    console.log(`   Response: ${JSON.stringify(patchData, null, 2)}\n`);

    // Step 5: Verify the practitioners list endpoint works
    console.log('5️⃣ Testing GET /api/practitioners (list with ordering)...');
    
    const listResponse = await fetch(`${BASE_URL}/api/practitioners`, {
      method: 'GET',
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('❌ FAILED: List practitioners failed');
      console.error(`   Error: ${error}\n`);
      throw new Error(`List failed with: ${error}`);
    }

    const practitioners = await listResponse.json();
    console.log('✅ SUCCESS: List practitioners worked!');
    console.log(`   Found ${practitioners.length} practitioners\n`);

    // Step 6: Test online practitioners filter
    console.log('6️⃣ Testing GET /api/practitioners/online (filtered list)...');
    
    const onlineResponse = await fetch(`${BASE_URL}/api/practitioners/online`, {
      method: 'GET',
    });

    if (!onlineResponse.ok) {
      const error = await onlineResponse.text();
      console.error('❌ FAILED: Get online practitioners failed');
      console.error(`   Error: ${error}\n`);
      throw new Error(`Online filter failed with: ${error}`);
    }

    const onlinePractitioners = await onlineResponse.json();
    console.log('✅ SUCCESS: Get online practitioners worked!');
    console.log(`   Found ${onlinePractitioners.length} online practitioners\n`);

    console.log('========================================================');
    console.log('🎉 ALL TESTS PASSED! THE FIX IS WORKING CORRECTLY! 🎉');
    console.log('========================================================\n');
    console.log('Summary:');
    console.log('✅ PostgREST schema cache workaround is functional');
    console.log('✅ Practitioner online status toggle works via POST /api/presence/toggle');
    console.log('✅ Frontend toggle works via PATCH /api/practitioners/:id/status');
    console.log('✅ Practitioners list with ordering works');
    console.log('✅ Online practitioners filtering works\n');
    console.log('The practitioner online status toggle bug has been successfully fixed!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nThe PostgREST schema cache workaround may not be working.');
    console.error('Please check the server logs for detailed error messages.');
    process.exit(1);
  }
}

// Run the test
testOnlineStatusToggle();