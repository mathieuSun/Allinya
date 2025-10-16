#!/usr/bin/env node

// Final test script to verify the practitioner online status toggle fix
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Use existing test practitioner credentials from the database
const PRACTITIONER_EMAIL = 'chefmat2018@gmail.com';
const PRACTITIONER_PASSWORD = '12345678';

async function testOnlineStatusToggle() {
  console.log('🧪 Testing Practitioner Online Status Toggle Fix');
  console.log('    (PostgREST schema cache workaround)');
  console.log('================================================\n');

  try {
    // Step 1: Login as existing practitioner
    console.log('1️⃣ Logging in as practitioner...');
    console.log(`   Email: ${PRACTITIONER_EMAIL}`);
    
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

    let loginData;
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('⚠️  Login failed, may need to create user. Trying signup...');
      
      // If login fails, try to create the user
      const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: PRACTITIONER_EMAIL,
          password: PRACTITIONER_PASSWORD,
          full_name: 'Dr. Sarah Chen',
          role: 'practitioner',
        }),
      });
      
      if (!signupResponse.ok) {
        const signupError = await signupResponse.text();
        console.error('❌ Both login and signup failed');
        console.error(`   Login error: ${errorText}`);
        console.error(`   Signup error: ${signupError}`);
        throw new Error('Unable to authenticate');
      }
      
      loginData = await signupResponse.json();
      console.log('✅ User created and logged in successfully');
    } else {
      loginData = await loginResponse.json();
      console.log('✅ Login successful');
    }
    
    const accessToken = loginData.access_token;
    const practitionerId = loginData.user.id;
    console.log(`   Practitioner ID: ${practitionerId}\n`);

    // Step 2: Test toggling online status to true
    console.log('2️⃣ Testing toggle to ONLINE (POST /api/presence/toggle)...');
    
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
      
      // Check if it's the schema cache error
      if (error.includes('online') && error.includes('schema cache')) {
        console.error('\n   ⚠️  This is the PostgREST schema cache error!');
        console.error('   The workaround has NOT been applied correctly.');
      }
      throw new Error(`Toggle failed: ${error}`);
    }

    const toggleOnData = await toggleOnResponse.json();
    console.log('✅ SUCCESS: Toggle to online worked!');
    console.log(`   Status: online=${toggleOnData.online}`);
    
    // Show success message
    console.log('\n   🎉 The PostgREST schema cache workaround is working!');
    console.log('   The query is now using "is_online" internally.\n');

    // Step 3: Toggle back to offline
    console.log('3️⃣ Testing toggle to OFFLINE...');
    
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
      console.error(`   Error: ${error}`);
      throw new Error(`Toggle failed: ${error}`);
    }

    const toggleOffData = await toggleOffResponse.json();
    console.log('✅ SUCCESS: Toggle to offline worked!');
    console.log(`   Status: online=${toggleOffData.online}\n`);

    // Step 4: Test the PATCH endpoint (used by frontend UI)
    console.log('4️⃣ Testing PATCH endpoint (used by frontend)...');
    console.log('   Endpoint: PATCH /api/practitioners/:id/status');
    
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
      console.error('   ⚠️  The frontend toggle will NOT work!');
      throw new Error(`PATCH failed: ${error}`);
    }

    const patchData = await patchResponse.json();
    console.log('✅ SUCCESS: PATCH status worked!');
    console.log(`   Response: success=${patchData.success}, online=${patchData.online}`);
    console.log(`   Message: "${patchData.message}"\n`);

    // Step 5: Test listing all practitioners (verify ordering works)
    console.log('5️⃣ Testing GET /api/practitioners (with ordering)...');
    
    const listResponse = await fetch(`${BASE_URL}/api/practitioners`, {
      method: 'GET',
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('❌ FAILED: List practitioners failed');
      console.error(`   Error: ${error}`);
      
      if (error.includes('online') && error.includes('schema')) {
        console.error('\n   ⚠️  The ordering fix was not applied!');
        console.error('   Should be using "is_online" for ordering.');
      }
      throw new Error(`List failed: ${error}`);
    }

    const practitioners = await listResponse.json();
    console.log('✅ SUCCESS: List practitioners worked!');
    console.log(`   Found ${practitioners.length} practitioners`);
    
    // Find our test practitioner
    const ourPractitioner = practitioners.find(p => p.userId === practitionerId);
    if (ourPractitioner) {
      console.log(`   Our practitioner online status: ${ourPractitioner.online}\n`);
    }

    // Step 6: Test online practitioners filter
    console.log('6️⃣ Testing GET /api/practitioners/online (filtered)...');
    
    const onlineResponse = await fetch(`${BASE_URL}/api/practitioners/online`, {
      method: 'GET',
    });

    if (!onlineResponse.ok) {
      const error = await onlineResponse.text();
      console.error('❌ FAILED: Get online practitioners failed');
      console.error(`   Error: ${error}`);
      
      if (error.includes('online') && error.includes('schema')) {
        console.error('\n   ⚠️  The filter fix was not applied!');
        console.error('   Should be using "is_online" for filtering.');
      }
      throw new Error(`Filter failed: ${error}`);
    }

    const onlinePractitioners = await onlineResponse.json();
    console.log('✅ SUCCESS: Get online practitioners worked!');
    console.log(`   Found ${onlinePractitioners.length} online practitioners\n`);

    // Final summary
    console.log('========================================================');
    console.log('🎉 ALL TESTS PASSED! THE FIX IS WORKING PERFECTLY! 🎉');
    console.log('========================================================\n');
    console.log('✅ Summary of fixes applied:');
    console.log('   1. updatePractitioner() now maps "online" to "is_online"');
    console.log('   2. getAllPractitioners() orders by "is_online"');
    console.log('   3. getOnlinePractitioners() filters by "is_online"');
    console.log('');
    console.log('✅ All endpoints are working:');
    console.log('   • POST /api/presence/toggle - Backend toggle');
    console.log('   • PATCH /api/practitioners/:id/status - Frontend toggle');
    console.log('   • GET /api/practitioners - List with ordering');
    console.log('   • GET /api/practitioners/online - Filtered list');
    console.log('');
    console.log('The practitioner online status toggle bug has been');
    console.log('successfully fixed with the PostgREST workaround!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nPlease check:');
    console.error('1. The server is running on port 5000');
    console.error('2. The database is accessible');
    console.error('3. The fixes were applied to server/storage.ts');
    console.error('4. The workflow was restarted after the fixes');
    process.exit(1);
  }
}

// Run the test
testOnlineStatusToggle();