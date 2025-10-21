import fetch from 'node-fetch';

// Test if the Supabase camelCase issue is fully fixed
const API_BASE = 'http://localhost:5000';

async function testEndpoints() {
  console.log('=== Final Solution Testing ===\n');
  
  let allTestsPassed = true;
  
  // Test 1: GET /api/practitioners
  console.log('1. Testing GET /api/practitioners...');
  try {
    const response = await fetch(`${API_BASE}/api/practitioners`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✓ SUCCESS - ${data.length || 0} practitioners returned`);
      if (data.length > 0) {
        // Check that data is in camelCase
        const practitioner = data[0];
        const hasCamelCase = 'userId' in practitioner && 'isOnline' in practitioner;
        const hasSnakeCase = 'user_id' in practitioner || 'is_online' in practitioner;
        
        if (hasCamelCase && !hasSnakeCase) {
          console.log('   ✓ Data correctly returned in camelCase format');
        } else {
          console.log('   ✗ WARNING: Data format issue detected');
          console.log('     Sample data:', JSON.stringify(practitioner, null, 2));
          allTestsPassed = false;
        }
        
        // Check profile data
        if (practitioner.profile) {
          const profileHasCamelCase = 'displayName' in practitioner.profile;
          const profileHasSnakeCase = 'display_name' in practitioner.profile;
          
          if (profileHasCamelCase && !profileHasSnakeCase) {
            console.log('   ✓ Profile data correctly in camelCase');
          } else if (profileHasSnakeCase) {
            console.log('   ✗ Profile data still has snake_case keys');
            allTestsPassed = false;
          }
        }
      }
    } else {
      console.log(`   ✗ FAILED with status ${response.status}`);
      console.log(`   Error:`, data.error || data.message || data);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ✗ Exception:`, error.message);
    allTestsPassed = false;
  }
  
  // Test 2: GET /api/practitioners?online=true
  console.log('\n2. Testing GET /api/practitioners?online=true...');
  try {
    const response = await fetch(`${API_BASE}/api/practitioners?online=true`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✓ SUCCESS - ${data.length || 0} online practitioners`);
    } else {
      console.log(`   ✗ FAILED with status ${response.status}`);
      console.log(`   Error:`, data.error || data.message || data);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ✗ Exception:`, error.message);
    allTestsPassed = false;
  }
  
  // Test 3: GET /api/sessions
  console.log('\n3. Testing GET /api/sessions...');
  try {
    const response = await fetch(`${API_BASE}/api/sessions`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✓ SUCCESS - ${data.length || 0} sessions returned`);
      if (data.length > 0) {
        const session = data[0];
        const hasCamelCase = 'practitionerId' in session || 'guestId' in session;
        const hasSnakeCase = 'practitioner_id' in session || 'guest_id' in session;
        
        if (hasCamelCase && !hasSnakeCase) {
          console.log('   ✓ Session data correctly in camelCase');
        } else if (hasSnakeCase) {
          console.log('   ✗ Session data still has snake_case keys');
          allTestsPassed = false;
        }
      }
    } else {
      console.log(`   ✗ FAILED with status ${response.status}`);
      console.log(`   Error:`, data.error || data.message || data);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ✗ Exception:`, error.message);
    allTestsPassed = false;
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - Supabase camelCase issue is FIXED!');
    console.log('\nSolution: PostgREST automatically converts camelCase DB columns to snake_case.');
    console.log('We now use snake_case in queries and convert responses back to camelCase.');
  } else {
    console.log('❌ Some tests failed - Additional fixes may be needed');
  }
}

testEndpoints();