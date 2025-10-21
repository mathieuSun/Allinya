import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

// Test practitioners endpoints after fixes
async function testPractitionersEndpoint() {
  console.log('\n=== Testing Practitioners Endpoints After Fixes ===\n');
  
  try {
    // Test 1: Get all practitioners
    console.log('1. Testing GET /api/practitioners...');
    const response = await fetch(`${API_URL}/api/practitioners`);
    const status = response.status;
    const data = await response.json();
    
    if (status === 200) {
      console.log('✓ GET /api/practitioners SUCCESS');
      console.log(`   Found ${data.length} practitioners`);
      
      // Show first practitioner structure
      if (data.length > 0) {
        const first = data[0];
        console.log('   Sample practitioner structure:');
        console.log('   - userId:', first.userId);
        console.log('   - isOnline:', first.isOnline);
        console.log('   - inService:', first.inService);
        console.log('   - rating:', first.rating);
        console.log('   - Has profile:', !!first.profile);
        if (first.profile) {
          console.log('     - displayName:', first.profile.displayName);
          console.log('     - role:', first.profile.role);
        }
      }
    } else {
      console.log(`✗ GET /api/practitioners FAILED with status ${status}`);
      console.log('   Error:', data.error || data);
    }
    
    // Test 2: Get online practitioners
    console.log('\n2. Testing GET /api/practitioners?online=true...');
    const onlineResp = await fetch(`${API_URL}/api/practitioners?online=true`);
    const onlineStatus = onlineResp.status;
    const onlineData = await onlineResp.json();
    
    if (onlineStatus === 200) {
      console.log('✓ GET /api/practitioners?online=true SUCCESS');
      console.log(`   Found ${onlineData.length} online practitioners`);
    } else {
      console.log(`✗ GET /api/practitioners?online=true FAILED with status ${onlineStatus}`);
      console.log('   Error:', onlineData.error || onlineData);
    }
    
    // Test 3: Get specific practitioner (if we have one)
    if (data.length > 0 && status === 200) {
      const practId = data[0].userId;
      console.log(`\n3. Testing GET /api/practitioners/${practId}...`);
      
      const practResp = await fetch(`${API_URL}/api/practitioners?id=${practId}`);
      const practStatus = practResp.status;
      const practData = await practResp.json();
      
      if (practStatus === 200) {
        console.log('✓ GET /api/practitioners/[id] SUCCESS');
        console.log('   Practitioner:', practData.profile?.displayName);
      } else {
        console.log(`✗ GET /api/practitioners/[id] FAILED with status ${practStatus}`);
        console.log('   Error:', practData.error || practData);
      }
    }
    
    console.log('\n=== Summary ===');
    console.log('The Supabase camelCase column issue appears to be', 
                status === 200 ? 'FIXED ✓' : 'NOT FIXED ✗');
    
  } catch (error) {
    console.error('\nError during testing:', error);
  }
}

// Run tests
testPractitionersEndpoint();