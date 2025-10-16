#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://tkswishecwcllxgyhqox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc3dpc2hlY3djbGx4Z3locW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5MjQ2MDksImV4cCI6MjA0MjUwMDYwOX0.IXnGxDsGNPenCJ-lO7g5RGJaL1b0LglqnS2JdQAu0us';
const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = 'http://localhost:5000';

async function testPractitionerToggle() {
  console.log('🧪 Testing practitioner status toggle...\n');

  try {
    // 1. Login as practitioner
    console.log('1️⃣ Logging in as practitioner...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chefmat2018@gmail.com',
        password: 'testing123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      throw new Error(`Login failed: ${error.error}`);
    }

    const { access_token, profile } = await loginResponse.json();
    console.log('✅ Logged in as:', profile.displayName);
    console.log('   Role:', profile.role);
    console.log('   ID:', profile.id);

    // 2. Get current practitioner status
    console.log('\n2️⃣ Getting current practitioner status...');
    const statusResponse = await fetch(`${API_URL}/api/practitioners/status`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.json();
      throw new Error(`Get status failed: ${error.error}`);
    }

    const currentStatus = await statusResponse.json();
    console.log('✅ Current status:', currentStatus.isOnline ? 'Online' : 'Offline');

    // 3. Toggle to opposite status
    const newStatus = !currentStatus.isOnline;
    console.log(`\n3️⃣ Toggling status to: ${newStatus ? 'Online' : 'Offline'}...`);
    
    const toggleResponse = await fetch(`${API_URL}/api/practitioners/${profile.id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}` 
      },
      body: JSON.stringify({ isOnline: newStatus })
    });

    if (!toggleResponse.ok) {
      const error = await toggleResponse.json();
      throw new Error(`Toggle failed: ${error.error}`);
    }

    const toggleResult = await toggleResponse.json();
    console.log('✅ Toggle successful!');
    console.log('   Message:', toggleResult.message);
    console.log('   New status:', toggleResult.isOnline ? 'Online' : 'Offline');

    // 4. Verify the status persisted
    console.log('\n4️⃣ Verifying status persisted...');
    const verifyResponse = await fetch(`${API_URL}/api/practitioners/status`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(`Verify failed: ${error.error}`);
    }

    const verifiedStatus = await verifyResponse.json();
    console.log('✅ Verified status:', verifiedStatus.isOnline ? 'Online' : 'Offline');

    if (verifiedStatus.isOnline === newStatus) {
      console.log('✅ Status persisted correctly!');
    } else {
      console.log('❌ Status did not persist correctly!');
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

    if (!toggleBackResponse.ok) {
      const error = await toggleBackResponse.json();
      throw new Error(`Toggle back failed: ${error.error}`);
    }

    const toggleBackResult = await toggleBackResponse.json();
    console.log('✅ Toggle back successful!');
    console.log('   New status:', toggleBackResult.isOnline ? 'Online' : 'Offline');

    console.log('\n✅✅✅ All tests passed! The practitioner status toggle is working correctly! ✅✅✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testPractitionerToggle();