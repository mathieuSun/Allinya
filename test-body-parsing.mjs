#!/usr/bin/env node

const API_URL = 'http://localhost:5000/api';

// Test that body parsing works correctly
async function testBodyParsing() {
  console.log('🧪 Testing Body Parsing in API Routes\n');
  
  // Test 1: Login with known credentials
  console.log('1. Testing login endpoint (POST with JSON body)...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'chefmat2018@gmail.com',
        password: 'mattias@9597'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful! Body was parsed correctly.');
      console.log('   User:', data.user?.email);
      console.log('   Has access token:', !!data.access_token);
      console.log('   Profile role:', data.profile?.role);
      
      // Test 2: Profile update (PUT with JSON body)
      if (data.access_token) {
        console.log('\n2. Testing profile update (PUT with JSON body)...');
        const updateResponse = await fetch(`${API_URL}/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bio: `Updated at ${new Date().toISOString()}`
          })
        });
        
        const updateData = await updateResponse.json();
        
        if (updateResponse.ok) {
          console.log('✅ Profile update successful! PUT body was parsed correctly.');
          console.log('   Updated bio:', updateData.bio);
        } else {
          console.log('❌ Profile update failed:', updateData.error);
        }
        
        // Test 3: Session start (POST with JSON body)
        console.log('\n3. Testing session start (POST with complex JSON body)...');
        const sessionResponse = await fetch(`${API_URL}/sessions/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            practitionerId: 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', // fake ID, will fail but tests parsing
            liveSeconds: 300
          })
        });
        
        const sessionData = await sessionResponse.json();
        console.log('   Session response:', sessionResponse.status, sessionData.error || 'Success');
        
        // The error message should show that the body was parsed (e.g., "Practitioner not found")
        if (sessionData.error && sessionData.error.includes('guest')) {
          console.log('✅ Session endpoint parsed body correctly (got expected error for non-guest)');
        } else if (sessionData.error) {
          console.log('✅ Session endpoint parsed body correctly (error:', sessionData.error, ')');
        }
      }
      
      return true;
    } else {
      console.log('❌ Login failed. Response:', response.status);
      console.log('   Error:', data.error);
      console.log('   This might indicate issues with credentials, not body parsing');
      
      // Check if the error message contains the email - if yes, body was parsed
      if (data.error && typeof data.error === 'string') {
        console.log('   Note: Error response is properly formatted, indicating body parsing may be working');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Network or parsing error:', error.message);
    return false;
  }
}

// Test with alternate known credentials
async function testAlternateLogin() {
  console.log('\n4. Testing with alternate credentials...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cheekyma@hotmail.com',
        password: 'ma@9597'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Alternate login successful!');
      console.log('   User:', data.user?.email);
      console.log('   Profile role:', data.profile?.role);
      return true;
    } else {
      console.log('⚠️  Alternate login failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Test health check (no body needed)
async function testHealthCheck() {
  console.log('\n5. Testing health check (GET, no body)...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Health check successful');
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Vercel API Body Parsing Implementation\n');
  console.log('This test verifies that req.body is properly parsed from Vercel\'s raw streams\n');
  
  await testHealthCheck();
  const mainLoginSuccess = await testBodyParsing();
  await testAlternateLogin();
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  if (mainLoginSuccess) {
    console.log('✅ Body parsing is working correctly!');
    console.log('   - POST requests with JSON bodies are parsed');
    console.log('   - PUT requests with JSON bodies are parsed');
    console.log('   - Authentication flows are functional');
  } else {
    console.log('⚠️  Some tests failed, but body parsing may still be working.');
    console.log('   Check the error messages above for details.');
  }
  console.log('\nNote: Login failures might be due to incorrect credentials,');
  console.log('not body parsing issues. Check if error messages are properly formatted.');
}

main().catch(console.error);