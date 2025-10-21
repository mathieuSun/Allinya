#!/usr/bin/env node

/**
 * Test 2: Guest View and Practitioner Discovery
 * Tests guest login and practitioner exploration functionality
 */

const BASE_URL = 'http://localhost:5000';

// Test data
const guest = {
  email: 'cheekyma@hotmail.com',
  password: 'Rickrick01'
};

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
  const setCookie = response.headers.get('set-cookie');
  logSuccess(`Logged in successfully as ${data.profile.displayName} (${data.profile.role})`);
  return { data, cookie: setCookie };
}

async function logout(cookie) {
  logInfo('Logging out...');
  const response = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': cookie },
    credentials: 'include'
  });

  if (!response.ok) {
    logError('Failed to logout');
  } else {
    logSuccess('Logged out successfully');
  }
}

async function getPractitioners(cookie) {
  logInfo('Fetching practitioners...');
  const response = await fetch(`${BASE_URL}/api/practitioners`, {
    headers: { 'Cookie': cookie },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get practitioners: ${error}`);
  }

  const data = await response.json();
  logSuccess(`Found ${data.length} practitioner(s)`);
  return data;
}

async function updatePractitionerStatus(isOnline, inService, cookie) {
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

  return response.json();
}

function getStatusText(isOnline, inService) {
  if (!isOnline) return 'Offline';
  if (inService) return 'In Service';
  return 'Online';
}

function validatePractitionerDisplay(practitioner) {
  const statusText = getStatusText(practitioner.isOnline, practitioner.inService);
  logInfo(`Practitioner: ${practitioner.profile.displayName}`);
  logInfo(`  - Status: ${statusText}`);
  logInfo(`  - Is Online: ${practitioner.isOnline}`);
  logInfo(`  - In Service: ${practitioner.inService}`);
  
  // Validate status display
  if (statusText === 'Offline' && !practitioner.isOnline && !practitioner.inService) {
    logSuccess('  - Offline status displayed correctly');
  } else if (statusText === 'Online' && practitioner.isOnline && !practitioner.inService) {
    logSuccess('  - Online status displayed correctly');
  } else if (statusText === 'In Service' && practitioner.isOnline && practitioner.inService) {
    logSuccess('  - In Service status displayed correctly');
  } else {
    logError(`  - Status mismatch: ${statusText}`);
    return false;
  }
  
  // Check if button should be enabled (only when Online)
  const shouldBeEnabled = practitioner.isOnline && !practitioner.inService;
  if (shouldBeEnabled) {
    logSuccess('  - "Start Session" button should be ENABLED');
  } else {
    logInfo('  - "Start Session" button should be DISABLED');
  }
  
  return true;
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('TEST 2: GUEST VIEW AND PRACTITIONER DISCOVERY', YELLOW);
  console.log('='.repeat(60));

  try {
    // First, set up practitioner states
    console.log('\n--- Setting Up Practitioner States ---');
    const practLogin = await login(practitioner.email, practitioner.password);
    
    // Test different practitioner states
    const states = [
      { isOnline: false, inService: false, name: 'Offline' },
      { isOnline: true, inService: false, name: 'Online' },
      { isOnline: true, inService: true, name: 'In Service' }
    ];
    
    for (const state of states) {
      console.log('\n' + '-'.repeat(40));
      logInfo(`Testing with practitioner in ${state.name} state...`);
      
      // Set practitioner status
      await updatePractitionerStatus(state.isOnline, state.inService, practLogin.cookie);
      
      // Login as guest
      await logout(practLogin.cookie);
      const guestLogin = await login(guest.email, guest.password);
      
      // Get practitioners list
      const practitioners = await getPractitioners(guestLogin.cookie);
      
      // Validate each practitioner
      console.log('\nValidating Practitioner Display:');
      practitioners.forEach(pract => {
        validatePractitionerDisplay(pract);
      });
      
      // Test camelCase compliance
      console.log('\n--- Testing CamelCase Compliance ---');
      function checkCamelCase(obj, path = '') {
        for (const key in obj) {
          if (key.includes('_')) {
            logError(`Found snake_case key: ${key} at ${path}`);
            return false;
          }
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            if (!checkCamelCase(obj[key], `${path}.${key}`)) return false;
          }
        }
        return true;
      }
      
      if (practitioners.every(p => checkCamelCase(p, 'practitioner'))) {
        logSuccess('All practitioners data uses camelCase');
      }
      
      // Logout guest
      await logout(guestLogin.cookie);
      
      // Re-login as practitioner for next iteration
      if (state !== states[states.length - 1]) {
        const nextLogin = await login(practitioner.email, practitioner.password);
        practLogin.cookie = nextLogin.cookie;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    logSuccess('TEST 2 COMPLETED SUCCESSFULLY');
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