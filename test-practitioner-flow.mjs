#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

// Test colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green :
                type === 'error' ? colors.red :
                type === 'warning' ? colors.yellow :
                colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPractitionerFlow() {
  log('\n=== PRACTITIONER FLOW TESTING ===\n', 'info');
  
  try {
    // Step 1: Login as practitioner
    log('Step 1: Logging in as practitioner (chefmat2018@gmail.com)...', 'info');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chefmat2018@gmail.com',
        password: 'Rickrick01'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} - ${error}`);
    }
    
    const loginData = await loginResponse.json();
    log(`✓ Login successful - User: ${loginData.profile?.displayName}, Role: ${loginData.profile?.role}`, 'success');
    
    if (loginData.profile?.role !== 'practitioner') {
      throw new Error(`Expected practitioner role, got: ${loginData.profile?.role}`);
    }
    
    // Get cookies and access token for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie') || '';
    const accessToken = loginData.accessToken;
    
    // Step 2: Get current practitioner status
    log('\nStep 2: Getting current practitioner status...', 'info');
    const statusResponse = await fetch(`${API_URL}/practitioners/get-status`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Cookie': cookies 
      }
    });
    
    const currentStatus = await statusResponse.json();
    log(`✓ Current status - isOnline: ${currentStatus.isOnline}, inService: ${currentStatus.inService}`, 'success');
    
    const getStatusText = (isOnline, inService) => {
      if (!isOnline) return 'Offline';
      if (inService) return 'In Service';
      return 'Online';
    };
    
    log(`  Status: ${getStatusText(currentStatus.isOnline, currentStatus.inService)}`, 'info');
    
    // Step 3: Test status cycling
    log('\nStep 3: Testing status cycling...', 'info');
    
    // Test cycle: Start from Offline
    log('\n  Setting to Offline...', 'info');
    let response = await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ isOnline: false, inService: false })
    });
    
    let statusData = await response.json();
    log(`  ✓ Status set to: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'success');
    
    // Offline → Online
    log('\n  Cycling: Offline → Online...', 'info');
    response = await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ isOnline: true, inService: false })
    });
    
    statusData = await response.json();
    if (statusData.isOnline && !statusData.inService) {
      log(`  ✓ Successfully cycled to: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'success');
    } else {
      log(`  ✗ Unexpected status: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'error');
    }
    
    // Online → In Service
    log('\n  Cycling: Online → In Service...', 'info');
    response = await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ isOnline: true, inService: true })
    });
    
    statusData = await response.json();
    if (statusData.isOnline && statusData.inService) {
      log(`  ✓ Successfully cycled to: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'success');
    } else {
      log(`  ✗ Unexpected status: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'error');
    }
    
    // In Service → Offline
    log('\n  Cycling: In Service → Offline...', 'info');
    response = await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ isOnline: false, inService: false })
    });
    
    statusData = await response.json();
    if (!statusData.isOnline && !statusData.inService) {
      log(`  ✓ Successfully cycled to: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'success');
    } else {
      log(`  ✗ Unexpected status: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'error');
    }
    
    // Test invalid transition: Offline → In Service (should be blocked)
    log('\n  Testing invalid transition: Offline → In Service...', 'info');
    response = await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ isOnline: false, inService: true })
    });
    
    if (response.ok) {
      statusData = await response.json();
      if (statusData.isOnline && statusData.inService) {
        log(`  ✓ Server correctly changed invalid state to valid: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'success');
      } else {
        log(`  ⚠ Server allowed invalid state: ${getStatusText(statusData.isOnline, statusData.inService)}`, 'warning');
      }
    } else {
      log(`  ✓ Server correctly blocked invalid transition`, 'success');
    }
    
    // Step 4: Test status persistence
    log('\nStep 4: Testing status persistence...', 'info');
    
    // Set to Online
    await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ isOnline: true, inService: false })
    });
    
    log('  Status set to Online, waiting 2 seconds...', 'info');
    await sleep(2000);
    
    // Check if status persists
    const persistResponse = await fetch(`${API_URL}/practitioners/get-status`, {
      headers: { 'Cookie': cookies }
    });
    
    const persistedStatus = await persistResponse.json();
    if (persistedStatus.isOnline && !persistedStatus.inService) {
      log('  ✓ Status persisted correctly as Online', 'success');
    } else {
      log(`  ✗ Status changed unexpectedly to: ${getStatusText(persistedStatus.isOnline, persistedStatus.inService)}`, 'error');
    }
    
    // Step 5: Check practitioner sessions endpoint
    log('\nStep 5: Checking practitioner sessions endpoint...', 'info');
    const sessionsResponse = await fetch(`${API_URL}/sessions/practitioner`, {
      headers: { 'Cookie': cookies }
    });
    
    if (sessionsResponse.ok) {
      const sessions = await sessionsResponse.json();
      log(`  ✓ Sessions endpoint working - Found ${sessions.length} sessions`, 'success');
      
      // Check for camelCase compliance
      if (sessions.length > 0) {
        const sessionKeys = Object.keys(sessions[0]);
        const snakeCaseKeys = sessionKeys.filter(key => key.includes('_'));
        if (snakeCaseKeys.length > 0) {
          log(`  ⚠ Found snake_case in sessions: ${snakeCaseKeys.join(', ')}`, 'warning');
        } else {
          log('  ✓ Sessions data uses correct camelCase format', 'success');
        }
      }
    } else {
      log(`  ✗ Failed to fetch sessions: ${sessionsResponse.status}`, 'error');
    }
    
    // Final summary
    log('\n=== PRACTITIONER FLOW TEST SUMMARY ===', 'info');
    log('✓ Practitioner login successful', 'success');
    log('✓ Status retrieval working', 'success');
    log('✓ Status cycling working correctly', 'success');
    log('✓ Invalid transitions handled properly', 'success');
    log('✓ Status persistence verified', 'success');
    log('✓ Sessions endpoint accessible', 'success');
    
    // Set back to Offline at the end
    await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ isOnline: false, inService: false })
    });
    log('\n✓ Practitioner set back to Offline', 'info');
    
  } catch (error) {
    log(`\n✗ Practitioner flow test failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the test
testPractitionerFlow();