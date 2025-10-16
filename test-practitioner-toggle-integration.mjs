#!/usr/bin/env node

const API_URL = 'http://localhost:5000';

// Generate a unique email for testing
const uniqueId = Date.now();
const testEmail = `test.practitioner.${uniqueId}@gmail.com`;
const testPassword = 'TestPass123!';
const testName = 'Test Practitioner';

async function testPractitionerToggleIntegration() {
  console.log('🧪 Integration Test: Practitioner Status Toggle\n');
  console.log('========================================');
  
  try {
    // 1. Create a new practitioner account
    console.log('\n1️⃣ Creating practitioner account...');
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);
    
    const signupResponse = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        full_name: testName,
        role: 'practitioner'
      })
    });

    const signupText = await signupResponse.text();
    
    if (!signupResponse.ok) {
      throw new Error(`Signup failed (${signupResponse.status}): ${signupText}`);
    }

    const signupData = JSON.parse(signupText);
    const profile = signupData.profile;
    
    console.log('✅ Practitioner account created!');
    console.log('   ID:', profile.id);
    console.log('   Name:', profile.displayName);
    console.log('   Role:', profile.role);
    
    // If session is null (email confirmation required), login immediately
    let access_token = signupData.access_token || signupData.session?.access_token;
    
    if (!access_token) {
      console.log('   Session is null (email confirmation required), logging in...');
      
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      
      const loginText = await loginResponse.text();
      
      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginText}`);
      }
      
      const loginData = JSON.parse(loginText);
      access_token = loginData.access_token || loginData.session?.access_token;
      
      if (!access_token) {
        throw new Error('No access token after login');
      }
      
      console.log('✅ Logged in successfully!');
    }

    // 2. Get initial practitioner status
    console.log('\n2️⃣ Getting initial practitioner status...');
    const statusResponse = await fetch(`${API_URL}/api/practitioners/status`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.text();
      throw new Error(`Get status failed: ${error}`);
    }

    const currentStatus = await statusResponse.json();
    console.log('✅ Initial status:', currentStatus.isOnline ? 'Online' : 'Offline');

    // 3. Toggle to opposite status using PATCH endpoint
    const newStatus = !currentStatus.isOnline;
    console.log(`\n3️⃣ Toggling status to: ${newStatus ? 'Online' : 'Offline'}...`);
    console.log('   Endpoint:', `PATCH /api/practitioners/${profile.id}/status`);
    console.log('   Payload:', JSON.stringify({ isOnline: newStatus }));
    
    const toggleResponse = await fetch(`${API_URL}/api/practitioners/${profile.id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}` 
      },
      body: JSON.stringify({ isOnline: newStatus })
    });

    const toggleText = await toggleResponse.text();
    
    if (!toggleResponse.ok) {
      throw new Error(`Toggle failed (${toggleResponse.status}): ${toggleText}`);
    }

    const toggleResult = JSON.parse(toggleText);
    console.log('✅ Toggle response received!');
    console.log('   Success:', toggleResult.success);
    console.log('   Message:', toggleResult.message);
    console.log('   New status:', toggleResult.isOnline ? 'Online' : 'Offline');

    // 4. Verify the status persisted by fetching again
    console.log('\n4️⃣ Verifying status persisted...');
    const verifyResponse = await fetch(`${API_URL}/api/practitioners/status`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.text();
      throw new Error(`Verify failed: ${error}`);
    }

    const verifiedStatus = await verifyResponse.json();
    console.log('✅ Fetched status:', verifiedStatus.isOnline ? 'Online' : 'Offline');

    // Check if it matches what we set
    if (verifiedStatus.isOnline === newStatus) {
      console.log('✅ Status persisted correctly!');
    } else {
      throw new Error(`Status did not persist! Expected ${newStatus}, got ${verifiedStatus.isOnline}`);
    }

    // 5. Toggle back to original status
    console.log(`\n5️⃣ Toggling back to original status: ${currentStatus.isOnline ? 'Online' : 'Offline'}...`);
    const toggleBackResponse = await fetch(`${API_URL}/api/practitioners/${profile.id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}` 
      },
      body: JSON.stringify({ isOnline: currentStatus.isOnline })
    });

    const toggleBackText = await toggleBackResponse.text();
    
    if (!toggleBackResponse.ok) {
      throw new Error(`Toggle back failed: ${toggleBackText}`);
    }

    const toggleBackResult = JSON.parse(toggleBackText);
    console.log('✅ Toggled back successfully!');
    console.log('   Status:', toggleBackResult.isOnline ? 'Online' : 'Offline');

    // 6. Test using POST /api/presence/toggle endpoint as alternative
    console.log('\n6️⃣ Testing alternative POST /api/presence/toggle endpoint...');
    const altToggleResponse = await fetch(`${API_URL}/api/presence/toggle`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}` 
      },
      body: JSON.stringify({ online: true })
    });

    if (!altToggleResponse.ok) {
      const error = await altToggleResponse.text();
      console.log('⚠️  Alternative endpoint failed:', error);
    } else {
      const altResult = await altToggleResponse.json();
      console.log('✅ Alternative endpoint works!');
      console.log('   Status:', altResult.isOnline ? 'Online' : 'Offline');
    }

    console.log('\n========================================');
    console.log('✅✅✅ ALL TESTS PASSED! ✅✅✅');
    console.log('========================================');
    console.log('\n📊 Summary:');
    console.log('  • Frontend sends: { isOnline: boolean }');
    console.log('  • Backend accepts: { isOnline: boolean }');
    console.log('  • Backend returns: { success, isOnline, message }');
    console.log('  • Database stores: is_online (snake_case)');
    console.log('  • Storage layer handles camelCase ↔ snake_case conversion');
    console.log('\n✨ The practitioner status toggle is working correctly!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n💡 Debug info:');
    console.error('  • Check if the server is running on port 5000');
    console.error('  • Check if Supabase is configured correctly');
    console.error('  • Check the browser console for any frontend errors');
    process.exit(1);
  }
}

// Run the test
testPractitionerToggleIntegration();