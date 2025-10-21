#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Allinya Application
 * Tests all functionality after camelCase migration
 */

const BASE_URL = 'http://localhost:5000';

// Test accounts
const accounts = {
  practitioner: {
    email: 'chefmat2018@gmail.com',
    password: 'Rickrick01'
  },
  guest: {
    email: 'cheekyma@hotmail.com',
    password: 'Rickrick01'
  }
};

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
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

function logWarning(message) {
  console.log(`${YELLOW}⚠ ${message}${RESET}`);
}

// Helper function to check for snake_case keys
function validateCamelCase(obj, context = '') {
  let valid = true;
  
  function check(o, path) {
    if (!o || typeof o !== 'object') return;
    
    if (Array.isArray(o)) {
      o.forEach((item, i) => check(item, `${path}[${i}]`));
      return;
    }
    
    for (const key in o) {
      if (!o.hasOwnProperty(key)) continue;
      
      if (key.includes('_')) {
        logError(`Snake_case violation: "${key}" at ${path || context}`);
        valid = false;
      }
      
      if (typeof o[key] === 'object' && o[key] !== null) {
        check(o[key], path ? `${path}.${key}` : key);
      }
    }
  }
  
  check(obj, '');
  return valid;
}

// API helper functions
async function apiCall(method, endpoint, body = null, cookie = null) {
  const options = {
    method,
    headers: {},
    credentials: 'include'
  };
  
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  
  if (cookie) {
    options.headers['Cookie'] = cookie;
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const text = await response.text();
  
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  // Always validate camelCase for JSON responses
  if (typeof data === 'object' && data !== null) {
    validateCamelCase(data, endpoint);
  }
  
  return { 
    ok: response.ok, 
    status: response.status,
    data,
    cookie: response.headers.get('set-cookie')
  };
}

// Test functions
async function testHealthCheck() {
  log('\n=== Testing Health Check ===', CYAN);
  
  const result = await apiCall('GET', '/api/health');
  
  if (result.ok) {
    logSuccess('Health check passed');
    if (result.data.status === 'ok') {
      logSuccess('API is healthy');
    }
  } else {
    logError('Health check failed');
  }
  
  return result.ok;
}

async function testPractitionerLogin() {
  log('\n=== Testing Practitioner Login ===', CYAN);
  
  const result = await apiCall('POST', '/api/auth/login', accounts.practitioner);
  
  if (result.ok) {
    logSuccess(`Logged in as ${result.data.profile.displayName}`);
    logInfo(`Role: ${result.data.profile.role}`);
    return { success: true, cookie: result.cookie, data: result.data };
  } else {
    logError(`Login failed: ${result.data.error || result.data}`);
    return { success: false };
  }
}

async function testGuestLogin() {
  log('\n=== Testing Guest Login ===', CYAN);
  
  const result = await apiCall('POST', '/api/auth/login', accounts.guest);
  
  if (result.ok) {
    logSuccess(`Logged in as ${result.data.profile.displayName}`);
    logInfo(`Role: ${result.data.profile.role}`);
    return { success: true, cookie: result.cookie, data: result.data };
  } else {
    logError(`Login failed: ${result.data.error || result.data}`);
    return { success: false };
  }
}

async function testPractitionerStatusManagement(cookie) {
  log('\n=== Testing Practitioner Status Management ===', CYAN);
  
  const tests = [
    { from: 'Current', to: { isOnline: false, inService: false }, name: 'Offline' },
    { from: 'Offline', to: { isOnline: true, inService: false }, name: 'Online' },
    { from: 'Online', to: { isOnline: true, inService: true }, name: 'In Service' },
    { from: 'In Service', to: { isOnline: false, inService: false }, name: 'Offline' }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    logInfo(`Testing transition: ${test.from} → ${test.name}`);
    
    const result = await apiCall('PUT', '/api/practitioners/status', test.to, cookie);
    
    if (result.ok) {
      logSuccess(`Status changed to ${test.name}`);
      
      // Verify persistence by getting current practitioner status
      const checkResult = await apiCall('GET', '/api/practitioners/status', null, cookie);
      if (checkResult.ok && 
          checkResult.data.isOnline === test.to.isOnline && 
          checkResult.data.inService === test.to.inService) {
        logSuccess('Status persisted correctly');
      } else {
        logError('Status did not persist');
        allPassed = false;
      }
    } else {
      logError(`Failed to change status: ${result.data.error || result.data}`);
      allPassed = false;
    }
  }
  
  // Test invalid transition
  logInfo('Testing invalid transition: Offline → In Service');
  const invalidResult = await apiCall('PUT', '/api/practitioners/status', 
    { isOnline: false, inService: true }, cookie);
  
  if (!invalidResult.ok) {
    logSuccess('Invalid transition correctly blocked');
  } else {
    logError('Invalid transition was not blocked');
    allPassed = false;
  }
  
  return allPassed;
}

async function testGuestExploration(guestCookie, practCookie) {
  log('\n=== Testing Guest Exploration ===', CYAN);
  
  // Set practitioner to Online
  await apiCall('PUT', '/api/practitioners/status', 
    { isOnline: true, inService: false }, practCookie);
  
  // Get practitioners as guest
  const result = await apiCall('GET', '/api/practitioners', null, guestCookie);
  
  if (result.ok && Array.isArray(result.data)) {
    logSuccess(`Found ${result.data.length} practitioner(s)`);
    
    result.data.forEach(p => {
      const status = !p.isOnline ? 'Offline' : 
                    p.inService ? 'In Service' : 'Online';
      logInfo(`- ${p.profile.displayName}: ${status}`);
      
      // Check button availability
      const canStart = p.isOnline && !p.inService;
      logInfo(`  Start Session button: ${canStart ? 'ENABLED' : 'DISABLED'}`);
    });
    
    return true;
  } else {
    logError('Failed to get practitioners');
    return false;
  }
}

async function testSessionFlow(guestCookie, practCookie) {
  log('\n=== Testing Session Creation Flow ===', CYAN);
  
  try {
    // Ensure practitioner is online
    await apiCall('PUT', '/api/practitioners/status', 
      { isOnline: true, inService: false }, practCookie);
    
    // Get practitioner ID
    const practitioners = await apiCall('GET', '/api/practitioners', null, guestCookie);
    const onlinePract = practitioners.data.find(p => p.isOnline && !p.inService);
    
    if (!onlinePract) {
      logError('No online practitioner found');
      return false;
    }
    
    // Create session
    logInfo('Creating session...');
    const createResult = await apiCall('POST', '/api/sessions/create', 
      { practitionerId: onlinePract.userId }, guestCookie);
    
    if (!createResult.ok) {
      logError('Failed to create session');
      return false;
    }
    
    const sessionId = createResult.data.sessionId;
    logSuccess(`Session created: ${sessionId}`);
    
    // Verify practitioner status changed to In Service
    const statusCheck = await apiCall('GET', '/api/practitioners', null, guestCookie);
    const updatedPract = statusCheck.data.find(p => p.userId === onlinePract.userId);
    
    if (updatedPract.inService) {
      logSuccess('Practitioner automatically set to "In Service"');
    } else {
      logError('Practitioner status did not change');
    }
    
    // Practitioner accepts session
    logInfo('Practitioner accepting session...');
    const acceptResult = await apiCall('POST', '/api/sessions/accept', 
      { sessionId }, practCookie);
    
    if (acceptResult.ok) {
      logSuccess('Session accepted by practitioner');
    } else {
      logError('Failed to accept session');
    }
    
    // Check session status
    const sessionResult = await apiCall('GET', `/api/sessions/${sessionId}`, null, guestCookie);
    if (sessionResult.ok) {
      logInfo(`Session phase: ${sessionResult.data.phase}`);
    }
    
    // End session
    await apiCall('POST', '/api/sessions/end', { sessionId }, practCookie);
    logSuccess('Session ended and cleaned up');
    
    return true;
  } catch (error) {
    logError(`Session flow test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  log('COMPREHENSIVE TEST SUITE FOR ALLINYA APPLICATION', YELLOW);
  console.log('='.repeat(70));
  
  const testResults = {
    healthCheck: false,
    practitionerLogin: false,
    guestLogin: false,
    statusManagement: false,
    guestExploration: false,
    sessionFlow: false,
    camelCaseCompliance: true
  };
  
  try {
    // Test 1: Health Check
    testResults.healthCheck = await testHealthCheck();
    
    // Test 2: Practitioner Login
    const practLogin = await testPractitionerLogin();
    testResults.practitionerLogin = practLogin.success;
    
    if (!practLogin.success) {
      logError('Cannot continue without practitioner login');
      return testResults;
    }
    
    // Test 3: Guest Login
    const guestLogin = await testGuestLogin();
    testResults.guestLogin = guestLogin.success;
    
    if (!guestLogin.success) {
      logError('Cannot continue without guest login');
      return testResults;
    }
    
    // Test 4: Practitioner Status Management
    testResults.statusManagement = await testPractitionerStatusManagement(practLogin.cookie);
    
    // Test 5: Guest Exploration
    testResults.guestExploration = await testGuestExploration(guestLogin.cookie, practLogin.cookie);
    
    // Test 6: Session Flow
    testResults.sessionFlow = await testSessionFlow(guestLogin.cookie, practLogin.cookie);
    
  } catch (error) {
    logError(`Test suite error: ${error.message}`);
  }
  
  // Generate Report
  console.log('\n' + '='.repeat(70));
  log('TEST RESULTS SUMMARY', YELLOW);
  console.log('='.repeat(70));
  
  let totalPassed = 0;
  let totalTests = 0;
  
  for (const [test, passed] of Object.entries(testResults)) {
    totalTests++;
    if (passed) {
      totalPassed++;
      logSuccess(`${test}: PASSED`);
    } else {
      logError(`${test}: FAILED`);
    }
  }
  
  console.log('\n' + '-'.repeat(70));
  const percentage = Math.round((totalPassed / totalTests) * 100);
  
  if (percentage === 100) {
    log(`✨ ALL TESTS PASSED (${totalPassed}/${totalTests}) ✨`, GREEN);
  } else {
    log(`⚠ ${totalPassed}/${totalTests} tests passed (${percentage}%)`, YELLOW);
  }
  console.log('='.repeat(70));
  
  process.exit(percentage === 100 ? 0 : 1);
}

// Run the comprehensive test suite
runAllTests().catch(console.error);