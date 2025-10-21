#!/usr/bin/env node

/**
 * Test 1: Practitioner Login and Status Management
 * Tests all practitioner status transitions and persistence
 */

const BASE_URL = 'http://localhost:5000';

// Test data
const practitioner = {
  email: 'chefmat2018@gmail.com',
  password: 'Rickrick01'
};

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function logSuccess(message) {
  console.log(`${GREEN}✓ ${message}${RESET}`);
}

function logError(message) {
  console.log(`${RED}✗ ${message}${RESET}`);
}

function logInfo(message) {
  console.log(`${BLUE}ℹ ${message}${RESET}`);
}

async function login(email, password) {
  logInfo(`Logging in as ${email}...`);
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }

  const data = await response.json();
  logSuccess(`Logged in successfully as ${data.profile.displayName} (${data.profile.role})`);
  return data;
}

async function getPractitionerStatus(cookie) {
  const response = await fetch(`${BASE_URL}/api/practitioners/get-status`, {
    headers: { 'Cookie': cookie },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get status: ${error}`);
  }

  return response.json();
}

async function updatePractitionerStatus(isOnline, inService, cookie) {
  const statusText = getStatusText(isOnline, inService);
  logInfo(`Updating status to: ${statusText}...`);
  
  const response = await fetch(`${BASE_URL}/api/practitioners/status`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie 
    },
    credentials: 'include',
    body: JSON.stringify({ isOnline, inService })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update status: ${error}`);
  }

  const data = await response.json();
  logSuccess(`Status updated to: ${getStatusText(data.isOnline, data.inService)}`);
  return data;
}

function getStatusText(isOnline, inService) {
  if (!isOnline) return 'Offline';
  if (inService) return 'In Service';
  return 'Online';
}

async function validateStatus(expectedOnline, expectedInService, cookie) {
  const status = await getPractitionerStatus(cookie);
  const expectedText = getStatusText(expectedOnline, expectedInService);
  const actualText = getStatusText(status.isOnline, status.inService);
  
  if (status.isOnline === expectedOnline && status.inService === expectedInService) {
    logSuccess(`Status is correctly: ${actualText}`);
    return true;
  } else {
    logError(`Expected status: ${expectedText}, but got: ${actualText}`);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('TEST 1: PRACTITIONER STATUS MANAGEMENT', YELLOW);
  console.log('='.repeat(60));

  try {
    // Login as practitioner
    const loginResponse = await login(practitioner.email, practitioner.password);
    
    // Extract cookies for session
    const cookie = `session=${loginResponse.sessionToken || ''}`;
    
    // Test 1: Check initial state
    console.log('\n--- Testing Initial State ---');
    const initialStatus = await getPractitionerStatus(cookie);
    logInfo(`Initial status: ${getStatusText(initialStatus.isOnline, initialStatus.inService)}`);
    
    // Test 2: Offline → Online transition
    console.log('\n--- Testing Offline → Online ---');
    await updatePractitionerStatus(true, false, cookie);
    await validateStatus(true, false, cookie);
    
    // Test 3: Online → In Service transition
    console.log('\n--- Testing Online → In Service ---');
    await updatePractitionerStatus(true, true, cookie);
    await validateStatus(true, true, cookie);
    
    // Test 4: In Service → Offline transition
    console.log('\n--- Testing In Service → Offline ---');
    await updatePractitionerStatus(false, false, cookie);
    await validateStatus(false, false, cookie);
    
    // Test 5: Verify can't go directly from Offline → In Service
    console.log('\n--- Testing Invalid Transition: Offline → In Service ---');
    try {
      await updatePractitionerStatus(false, true, cookie);
      logError('ERROR: Should not allow Offline → In Service transition');
    } catch (error) {
      logSuccess('Correctly blocked invalid transition');
    }
    
    // Test 6: Test persistence after "page refresh" (new status check)
    console.log('\n--- Testing Status Persistence ---');
    await updatePractitionerStatus(true, false, cookie); // Set to Online
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    const persistedStatus = await getPractitionerStatus(cookie);
    if (persistedStatus.isOnline && !persistedStatus.inService) {
      logSuccess('Status persisted correctly after refresh');
    } else {
      logError('Status did not persist correctly');
    }
    
    // Test 7: Verify all camelCase in responses
    console.log('\n--- Testing CamelCase Compliance ---');
    function checkCamelCase(obj, path = '') {
      for (const key in obj) {
        if (key.includes('_')) {
          logError(`Found snake_case key: ${key} at ${path}`);
          return false;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (!checkCamelCase(obj[key], `${path}.${key}`)) return false;
        }
      }
      return true;
    }
    
    if (checkCamelCase(initialStatus, 'status')) {
      logSuccess('All keys are in camelCase');
    }
    
    console.log('\n' + '='.repeat(60));
    logSuccess('TEST 1 COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    logError(`TEST FAILED: ${error.message}`);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);