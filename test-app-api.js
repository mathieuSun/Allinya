#!/usr/bin/env node

/**
 * COMPLETE ALLINYA API TEST
 * Tests all endpoints and functionality
 */

const BASE_URL = 'http://localhost:5000';

// Test accounts
const testAccounts = {
  guest: {
    email: 'cheekyma@hotmail.com',
    password: 'password' // Update with real password
  },
  practitioner: {
    email: 'chefmat2018@gmail.com',
    password: 'password' // Update with real password
  }
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });
    
    const data = await response.json().catch(() => null);
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function testHealthCheck() {
  log('\n📱 Testing Health Check...', 'cyan');
  const result = await makeRequest('/api/health');
  
  if (result.ok) {
    log('✅ Server is healthy', 'green');
    return true;
  } else {
    log('❌ Server health check failed', 'red');
    return false;
  }
}

async function testAuthentication() {
  log('\n📱 Testing Authentication...', 'cyan');
  
  // Test guest login
  log('Testing guest login...', 'yellow');
  const guestLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(testAccounts.guest),
    credentials: 'include'
  });
  
  if (guestLogin.ok) {
    log(`✅ Guest login successful: ${guestLogin.data?.email}`, 'green');
  } else {
    log(`❌ Guest login failed: ${guestLogin.data?.error || 'Unknown error'}`, 'red');
  }
  
  // Test practitioner login
  log('Testing practitioner login...', 'yellow');
  const practLogin = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(testAccounts.practitioner),
    credentials: 'include'
  });
  
  if (practLogin.ok) {
    log(`✅ Practitioner login successful: ${practLogin.data?.email}`, 'green');
  } else {
    log(`❌ Practitioner login failed: ${practLogin.data?.error || 'Unknown error'}`, 'red');
  }
  
  return guestLogin.ok && practLogin.ok;
}

async function testProfiles() {
  log('\n📱 Testing Profiles...', 'cyan');
  
  // Get current user
  const userResult = await makeRequest('/api/auth/user', {
    credentials: 'include'
  });
  
  if (userResult.ok && userResult.data) {
    log(`✅ Current user: ${userResult.data.email} (${userResult.data.role})`, 'green');
    
    // Get profile
    const profileResult = await makeRequest(`/api/profiles/${userResult.data.id}`, {
      credentials: 'include'
    });
    
    if (profileResult.ok) {
      log(`✅ Profile fetched: ${profileResult.data.full_name}`, 'green');
    } else {
      log('❌ Profile fetch failed', 'red');
    }
    
    return profileResult.ok;
  } else {
    log('❌ User not authenticated', 'red');
    return false;
  }
}

async function testPractitioners() {
  log('\n📱 Testing Practitioners...', 'cyan');
  
  // Get all practitioners
  const practResult = await makeRequest('/api/practitioners');
  
  if (practResult.ok && practResult.data) {
    log(`✅ Found ${practResult.data.length} practitioners`, 'green');
    
    if (practResult.data.length > 0) {
      const pract = practResult.data[0];
      log(`   - ${pract.full_name}: ${pract.is_online ? '🟢 Online' : '⭕ Offline'}`, 'blue');
      log(`   - Specialties: ${pract.specialties?.join(', ') || 'None'}`, 'blue');
      log(`   - Rating: ${pract.rating || 'N/A'} ⭐`, 'blue');
    }
    
    return true;
  } else {
    log('❌ Failed to fetch practitioners', 'red');
    return false;
  }
}

async function testSessions() {
  log('\n📱 Testing Sessions...', 'cyan');
  
  // Get user sessions
  const sessionsResult = await makeRequest('/api/sessions', {
    credentials: 'include'
  });
  
  if (sessionsResult.ok) {
    log(`✅ User has ${sessionsResult.data?.length || 0} sessions`, 'green');
    
    if (sessionsResult.data && sessionsResult.data.length > 0) {
      const session = sessionsResult.data[0];
      log(`   - Session ID: ${session.id}`, 'blue');
      log(`   - Status: ${session.status}`, 'blue');
      log(`   - Channel: ${session.agora_channel}`, 'blue');
    }
    
    return true;
  } else {
    log('⚠️  Sessions endpoint not responding', 'yellow');
    return false;
  }
}

async function testDevInspector() {
  log('\n📱 Testing Dev Inspector...', 'cyan');
  
  const inspectorResult = await makeRequest('/dev/inspector');
  
  if (inspectorResult.status === 200) {
    log('✅ Dev Inspector page accessible', 'green');
    
    // Check if it contains expected content
    const htmlContent = await fetch(`${BASE_URL}/dev/inspector`).then(r => r.text());
    if (htmlContent.includes('Development Inspector') || htmlContent.includes('Performance')) {
      log('✅ Dev Inspector content verified', 'green');
    }
    
    return true;
  } else {
    log('⚠️  Dev Inspector not accessible', 'yellow');
    return false;
  }
}

async function runCompleteTest() {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log('🧪 ALLINYA COMPLETE API TEST', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  const startTime = Date.now();
  const results = {
    healthCheck: false,
    authentication: false,
    profiles: false,
    practitioners: false,
    sessions: false,
    devInspector: false
  };
  
  // Run tests
  results.healthCheck = await testHealthCheck();
  results.authentication = await testAuthentication();
  results.profiles = await testProfiles();
  results.practitioners = await testPractitioners();
  results.sessions = await testSessions();
  results.devInspector = await testDevInspector();
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log('\n' + '═'.repeat(60), 'cyan');
  log('📊 TEST RESULTS SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    if (result) {
      log(`✅ ${test}: PASSED`, 'green');
      passed++;
    } else {
      log(`❌ ${test}: FAILED`, 'red');
      failed++;
    }
  }
  
  log('\n' + '─'.repeat(60), 'cyan');
  log(`Total: ${passed} passed, ${failed} failed`, passed > failed ? 'green' : 'red');
  log(`Duration: ${duration}s`, 'blue');
  log('═'.repeat(60), 'cyan');
  
  return failed === 0;
}

// Run the test
runCompleteTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});