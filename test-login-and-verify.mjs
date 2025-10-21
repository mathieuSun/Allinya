#!/usr/bin/env node

/**
 * Test login and verify data setup
 */

const BASE_URL = 'http://localhost:5000';

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function logSuccess(message) {
  console.log(`${GREEN}✓ ${message}${RESET}`);
}

function logError(message) {
  console.log(`${RED}✗ ${message}${RESET}`);
}

function logInfo(message) {
  console.log(`${BLUE}ℹ ${message}${RESET}`);
}

async function testLogin() {
  console.log('=== Testing Login and Data Setup ===\n');
  
  // Test practitioner login
  logInfo('Testing practitioner login...');
  const practResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'chefmat2018@gmail.com',
      password: 'Rickrick01'
    })
  });
  
  const practCookie = practResponse.headers.get('set-cookie');
  const practData = await practResponse.json();
  
  if (practResponse.ok) {
    logSuccess(`Practitioner logged in: ${practData.profile?.displayName}`);
    logInfo(`Profile ID: ${practData.profile?.id}`);
    logInfo(`Role: ${practData.profile?.role}`);
    
    // Check if practitioner record exists
    const statusResponse = await fetch(`${BASE_URL}/api/practitioners/status`, {
      method: 'GET',
      headers: { 'Cookie': practCookie }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      logSuccess('Practitioner record exists');
      logInfo(`Current status - Online: ${statusData.isOnline}, In Service: ${statusData.inService}`);
    } else {
      logError('Practitioner record not found');
      
      // Try to create practitioner record via status update
      logInfo('Attempting to create practitioner record...');
      const createResponse = await fetch(`${BASE_URL}/api/practitioners/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': practCookie 
        },
        body: JSON.stringify({ isOnline: false, inService: false })
      });
      
      if (createResponse.ok) {
        logSuccess('Practitioner record created');
      } else {
        logError('Failed to create practitioner record');
      }
    }
  } else {
    logError(`Practitioner login failed: ${practData.error || practData}`);
  }
  
  // Test guest login
  logInfo('\nTesting guest login...');
  const guestResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cheekyma@hotmail.com',
      password: 'Rickrick01'
    })
  });
  
  const guestData = await guestResponse.json();
  
  if (guestResponse.ok) {
    logSuccess(`Guest logged in: ${guestData.profile?.displayName}`);
    logInfo(`Profile ID: ${guestData.profile?.id}`);
    logInfo(`Role: ${guestData.profile?.role}`);
  } else {
    logError(`Guest login failed: ${guestData.error || guestData}`);
  }
  
  // Test practitioners endpoint
  logInfo('\nTesting practitioners list endpoint...');
  const practListResponse = await fetch(`${BASE_URL}/api/practitioners`);
  
  if (practListResponse.ok) {
    const practitioners = await practListResponse.json();
    logSuccess(`Found ${practitioners.length} practitioners`);
    if (practitioners.length > 0) {
      logInfo(`First practitioner: ${practitioners[0].profile?.displayName || 'Unknown'}`);
    }
  } else {
    const error = await practListResponse.text();
    logError(`Failed to get practitioners: ${error}`);
  }
  
  return {
    practitioner: practCookie,
    guest: guestResponse.headers.get('set-cookie')
  };
}

testLogin().catch(console.error);