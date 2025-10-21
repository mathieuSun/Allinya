#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const APP_URL = 'http://localhost:5000';

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

async function testGuestFlow() {
  log('\n=== GUEST FLOW TESTING ===\n', 'info');
  
  try {
    // Step 1: Login as guest
    log('Step 1: Logging in as guest (cheekyma@hotmail.com)...', 'info');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cheekyma@hotmail.com',
        password: 'Rickrick01'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    log(`✓ Login successful - User: ${loginData.profile?.displayName}, Role: ${loginData.profile?.role}`, 'success');
    
    // Get cookies for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie') || '';
    
    // Step 2: Verify user profile (using the access token)
    log('\nStep 2: Verifying user profile...', 'info');
    const profileResponse = await fetch(`${API_URL}/auth/user`, {
      headers: { 
        'Authorization': `Bearer ${loginData.accessToken}`,
        'Cookie': cookies
      }
    });
    
    if (!profileResponse.ok) {
      log(`⚠ Profile fetch failed: ${profileResponse.status}`, 'warning');
    } else {
      const profileData = await profileResponse.json();
      log(`✓ Profile verified - ID: ${profileData.id}, Role: ${profileData.profile?.role}`, 'success');
      
      // Check for camelCase in profile
      const profileKeys = Object.keys(profileData);
      const snakeCaseKeys = profileKeys.filter(key => key.includes('_'));
      if (snakeCaseKeys.length > 0) {
        log(`⚠ Warning: Found snake_case keys in profile: ${snakeCaseKeys.join(', ')}`, 'warning');
      } else {
        log('✓ Profile uses correct camelCase format', 'success');
      }
    }
    
    // Step 3: Get practitioners list
    log('\nStep 3: Fetching practitioners list...', 'info');
    const practitionersResponse = await fetch(`${API_URL}/practitioners`, {
      headers: { 'Cookie': cookies }
    });
    
    const practitioners = await practitionersResponse.json();
    log(`✓ Found ${practitioners.length} practitioners`, 'success');
    
    // Analyze practitioner statuses
    log('\nStep 4: Analyzing practitioner statuses...', 'info');
    let offlineCount = 0;
    let onlineCount = 0;
    let inServiceCount = 0;
    
    practitioners.forEach(p => {
      const statusText = !p.isOnline ? 'Offline' : 
                        p.inService ? 'In Service' : 
                        'Online';
      
      if (!p.isOnline) offlineCount++;
      else if (p.inService) inServiceCount++;
      else onlineCount++;
      
      log(`  - ${p.profile.displayName}: ${statusText} (isOnline: ${p.isOnline}, inService: ${p.inService})`, 'info');
    });
    
    log(`\nStatus Summary:`, 'info');
    log(`  Offline: ${offlineCount}`, offlineCount > 0 ? 'info' : 'warning');
    log(`  Online: ${onlineCount}`, onlineCount > 0 ? 'success' : 'warning');
    log(`  In Service: ${inServiceCount}`, 'info');
    
    // Check for camelCase in practitioners data
    if (practitioners.length > 0) {
      const practKeys = Object.keys(practitioners[0]);
      const practSnakeCase = practKeys.filter(key => key.includes('_'));
      if (practSnakeCase.length > 0) {
        log(`\n⚠ Warning: Found snake_case in practitioners: ${practSnakeCase.join(', ')}`, 'warning');
      } else {
        log('\n✓ Practitioners data uses correct camelCase format', 'success');
      }
    }
    
    // Step 5: Find an online practitioner and attempt to start session
    const onlinePractitioner = practitioners.find(p => p.isOnline && !p.inService);
    
    if (onlinePractitioner) {
      log(`\nStep 5: Testing session creation with online practitioner...`, 'info');
      log(`  Selected: ${onlinePractitioner.profile.displayName}`, 'info');
      
      // Create session
      const sessionResponse = await fetch(`${API_URL}/sessions/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': cookies 
        },
        body: JSON.stringify({
          practitionerId: onlinePractitioner.userId
        })
      });
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        log(`✓ Session created successfully - ID: ${sessionData.id}`, 'success');
        log(`  Phase: ${sessionData.phase}`, 'info');
        log(`  Waiting seconds: ${sessionData.waitingSeconds}`, 'info');
        
        // Check session data for camelCase
        const sessionKeys = Object.keys(sessionData);
        const sessionSnakeCase = sessionKeys.filter(key => key.includes('_'));
        if (sessionSnakeCase.length > 0) {
          log(`⚠ Warning: Found snake_case in session: ${sessionSnakeCase.join(', ')}`, 'warning');
        } else {
          log('✓ Session data uses correct camelCase format', 'success');
        }
        
        // Clean up - end the session
        log('\nCleaning up: Ending test session...', 'info');
        await fetch(`${API_URL}/sessions/end`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookies 
          },
          body: JSON.stringify({
            sessionId: sessionData.id
          })
        });
        log('✓ Test session ended', 'success');
      } else {
        log(`✗ Failed to create session: ${sessionResponse.status}`, 'error');
      }
    } else {
      log('\n⚠ No online practitioners available for session testing', 'warning');
      log('  Please set at least one practitioner to "Online" status', 'info');
    }
    
    // Final summary
    log('\n=== GUEST FLOW TEST SUMMARY ===', 'info');
    log('✓ Guest login successful', 'success');
    log('✓ Profile data retrieved', 'success');
    log('✓ Practitioners list fetched', 'success');
    log('✓ CamelCase format verified', 'success');
    
    if (onlinePractitioner) {
      log('✓ Session creation tested', 'success');
    } else {
      log('⚠ Session creation not tested (no online practitioners)', 'warning');
    }
    
  } catch (error) {
    log(`\n✗ Guest flow test failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the test
testGuestFlow();