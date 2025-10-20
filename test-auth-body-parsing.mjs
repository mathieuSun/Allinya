#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function testSignup() {
  console.log('\n🧪 Testing signup with parsed body...');
  
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    full_name: 'Test User',
    role: 'guest'
  };
  
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    console.log('Signup response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Signup successful!');
      console.log('User ID:', data.user?.id);
      console.log('Profile:', data.profile);
      return data.access_token;
    } else {
      console.error('❌ Signup failed:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during signup:', error);
    return null;
  }
}

async function testLogin() {
  console.log('\n🧪 Testing login with parsed body...');
  
  const credentials = {
    email: 'chefmat2018@gmail.com',
    password: 'mattias@9597'
  };
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    console.log('Login response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('User:', data.user?.email);
      console.log('Profile role:', data.profile?.role);
      return data.access_token;
    } else {
      console.error('❌ Login failed:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during login:', error);
    return null;
  }
}

async function testProtectedRoute(token) {
  console.log('\n🧪 Testing protected route with auth token...');
  
  try {
    const response = await fetch(`${API_URL}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Profile response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Protected route accessed successfully!');
      console.log('Profile data:', data);
      return true;
    } else {
      console.error('❌ Protected route access failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error accessing protected route:', error);
    return false;
  }
}

async function testProfileUpdate(token) {
  console.log('\n🧪 Testing profile update with parsed body...');
  
  const updates = {
    displayName: 'Updated Name',
    bio: 'Testing body parsing in PUT requests'
  };
  
  try {
    const response = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    const data = await response.json();
    console.log('Update response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Profile update successful!');
      console.log('Updated profile:', data);
      return true;
    } else {
      console.error('❌ Profile update failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    return false;
  }
}

async function testPractitionerToggle(token) {
  console.log('\n🧪 Testing practitioner toggle with PUT method...');
  
  const toggleData = {
    isOnline: true
  };
  
  try {
    const response = await fetch(`${API_URL}/practitioners/toggle-status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(toggleData)
    });
    
    const data = await response.json();
    console.log('Toggle response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Practitioner toggle successful!');
      console.log('Practitioner status:', data);
      return true;
    } else {
      // This might fail if user is not a practitioner, which is expected
      console.log('⚠️  Toggle failed (expected if not practitioner):', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error toggling practitioner status:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing API Body Parsing and Authentication Flows\n');
  console.log('API URL:', API_URL);
  
  // Test signup (creates new user each time)
  const signupToken = await testSignup();
  
  // Test login with existing credentials
  const loginToken = await testLogin();
  
  if (loginToken) {
    // Test authenticated routes
    await testProtectedRoute(loginToken);
    await testProfileUpdate(loginToken);
    await testPractitionerToggle(loginToken);
  }
  
  console.log('\n✨ Body parsing and authentication test complete!');
}

main().catch(console.error);