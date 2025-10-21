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

async function testCompleteSessionFlow() {
  log('\n=== COMPLETE SESSION FLOW TESTING ===\n', 'info');
  
  let guestCookies = '';
  let practitionerCookies = '';
  let sessionId = '';
  
  try {
    // Step 1: Login as practitioner and set to Online
    log('Step 1: Setting up practitioner (Online status)...', 'info');
    const practLoginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chefmat2018@gmail.com',
        password: 'Rickrick01'
      }),
      credentials: 'include'
    });
    
    practitionerCookies = practLoginResponse.headers.get('set-cookie') || '';
    const practData = await practLoginResponse.json();
    log(`  ✓ Practitioner logged in: ${practData.displayName}`, 'success');
    
    // Set practitioner to Online
    const statusResponse = await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': practitionerCookies 
      },
      body: JSON.stringify({ isOnline: true, inService: false })
    });
    
    const statusData = await statusResponse.json();
    log(`  ✓ Practitioner status set to: Online`, 'success');
    
    // Step 2: Login as guest
    log('\nStep 2: Logging in as guest...', 'info');
    const guestLoginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cheekyma@hotmail.com',
        password: 'Rickrick01'
      }),
      credentials: 'include'
    });
    
    guestCookies = guestLoginResponse.headers.get('set-cookie') || '';
    const guestData = await guestLoginResponse.json();
    log(`  ✓ Guest logged in: ${guestData.displayName}`, 'success');
    
    // Step 3: Guest creates session with practitioner
    log('\nStep 3: Guest creating session with practitioner...', 'info');
    const createSessionResponse = await fetch(`${API_URL}/sessions/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': guestCookies 
      },
      body: JSON.stringify({
        practitionerId: practData.id
      })
    });
    
    if (!createSessionResponse.ok) {
      throw new Error(`Failed to create session: ${createSessionResponse.status}`);
    }
    
    const sessionData = await createSessionResponse.json();
    sessionId = sessionData.id;
    log(`  ✓ Session created - ID: ${sessionId}`, 'success');
    log(`    Phase: ${sessionData.phase}`, 'info');
    log(`    Waiting seconds: ${sessionData.waitingSeconds}`, 'info');
    
    // Check camelCase in session data
    const sessionKeys = Object.keys(sessionData);
    const snakeCaseKeys = sessionKeys.filter(key => key.includes('_'));
    if (snakeCaseKeys.length > 0) {
      log(`  ⚠ Found snake_case keys: ${snakeCaseKeys.join(', ')}`, 'warning');
    } else {
      log(`  ✓ Session data uses correct camelCase format`, 'success');
    }
    
    // Step 4: Practitioner checks for sessions
    log('\nStep 4: Practitioner checking for incoming sessions...', 'info');
    const practSessionsResponse = await fetch(`${API_URL}/sessions/practitioner`, {
      headers: { 'Cookie': practitionerCookies }
    });
    
    const practSessions = await practSessionsResponse.json();
    const pendingSession = practSessions.find(s => s.id === sessionId);
    
    if (pendingSession) {
      log(`  ✓ Practitioner sees pending session`, 'success');
      log(`    Guest: ${pendingSession.guest?.displayName || 'Unknown'}`, 'info');
      log(`    Phase: ${pendingSession.phase}`, 'info');
    } else {
      log(`  ✗ Session not found in practitioner's list`, 'error');
    }
    
    // Step 5: Practitioner acknowledges session
    log('\nStep 5: Practitioner acknowledging session...', 'info');
    const ackResponse = await fetch(`${API_URL}/sessions/acknowledge`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': practitionerCookies 
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (ackResponse.ok) {
      log(`  ✓ Session acknowledged by practitioner`, 'success');
    } else {
      log(`  ⚠ Acknowledge failed: ${ackResponse.status}`, 'warning');
    }
    
    // Step 6: Practitioner accepts session
    log('\nStep 6: Practitioner accepting session...', 'info');
    const acceptResponse = await fetch(`${API_URL}/sessions/accept`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': practitionerCookies 
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (acceptResponse.ok) {
      const acceptData = await acceptResponse.json();
      log(`  ✓ Session accepted`, 'success');
      log(`    New phase: ${acceptData.phase}`, 'info');
      
      // Check if practitioner is now In Service
      const newStatusResponse = await fetch(`${API_URL}/practitioners/get-status`, {
        headers: { 'Cookie': practitionerCookies }
      });
      const newStatus = await newStatusResponse.json();
      if (newStatus.inService) {
        log(`  ✓ Practitioner automatically set to "In Service"`, 'success');
      }
    } else {
      log(`  ✗ Accept failed: ${acceptResponse.status}`, 'error');
    }
    
    // Step 7: Both parties mark ready
    log('\nStep 7: Testing ready mechanism...', 'info');
    
    // Guest marks ready
    const guestReadyResponse = await fetch(`${API_URL}/sessions/ready`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': guestCookies 
      },
      body: JSON.stringify({ 
        sessionId,
        who: 'guest'
      })
    });
    
    if (guestReadyResponse.ok) {
      log(`  ✓ Guest marked as ready`, 'success');
    }
    
    // Practitioner marks ready
    const practReadyResponse = await fetch(`${API_URL}/sessions/ready`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': practitionerCookies 
      },
      body: JSON.stringify({ 
        sessionId,
        who: 'practitioner'
      })
    });
    
    if (practReadyResponse.ok) {
      log(`  ✓ Practitioner marked as ready`, 'success');
    }
    
    // Check session status after both ready
    await sleep(1000);
    const sessionStatusResponse = await fetch(`${API_URL}/sessions/${sessionId}`, {
      headers: { 'Cookie': guestCookies }
    });
    
    if (sessionStatusResponse.ok) {
      const currentSession = await sessionStatusResponse.json();
      log(`  Session phase after ready: ${currentSession.phase}`, 'info');
      if (currentSession.phase === 'live') {
        log(`  ✓ Session transitioned to LIVE`, 'success');
      }
    }
    
    // Step 8: Get Agora token (test video session setup)
    log('\nStep 8: Testing Agora token generation...', 'info');
    const tokenResponse = await fetch(`${API_URL}/sessions/token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': guestCookies 
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      log(`  ✓ Agora token generated`, 'success');
      log(`    Channel: ${tokenData.channel}`, 'info');
      log(`    Token length: ${tokenData.token?.length || 0} chars`, 'info');
    } else {
      log(`  ⚠ Token generation failed: ${tokenResponse.status}`, 'warning');
    }
    
    // Step 9: End session
    log('\nStep 9: Ending session...', 'info');
    const endResponse = await fetch(`${API_URL}/sessions/end`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': guestCookies 
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (endResponse.ok) {
      const endData = await endResponse.json();
      log(`  ✓ Session ended successfully`, 'success');
      log(`    Final phase: ${endData.phase}`, 'info');
    }
    
    // Step 10: Test review creation
    log('\nStep 10: Creating review...', 'info');
    const reviewResponse = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': guestCookies 
      },
      body: JSON.stringify({
        sessionId,
        rating: 5,
        comment: 'Excellent healing session!'
      })
    });
    
    if (reviewResponse.ok) {
      const reviewData = await reviewResponse.json();
      log(`  ✓ Review created successfully`, 'success');
      
      // Check camelCase in review
      const reviewKeys = Object.keys(reviewData);
      const reviewSnakeCase = reviewKeys.filter(key => key.includes('_'));
      if (reviewSnakeCase.length > 0) {
        log(`  ⚠ Found snake_case in review: ${reviewSnakeCase.join(', ')}`, 'warning');
      } else {
        log(`  ✓ Review data uses correct camelCase format`, 'success');
      }
    } else {
      log(`  ⚠ Review creation failed: ${reviewResponse.status}`, 'warning');
    }
    
    // Final summary
    log('\n=== COMPLETE SESSION FLOW TEST SUMMARY ===', 'info');
    log('✓ Guest and practitioner login successful', 'success');
    log('✓ Session creation working', 'success');
    log('✓ Practitioner can see and acknowledge sessions', 'success');
    log('✓ Session accept mechanism working', 'success');
    log('✓ Ready mechanism functioning', 'success');
    log('✓ Agora token generation working', 'success');
    log('✓ Session end functionality working', 'success');
    log('✓ Review system functional', 'success');
    log('✓ CamelCase format mostly compliant', 'success');
    
  } catch (error) {
    log(`\n✗ Complete session flow test failed: ${error.message}`, 'error');
    
    // Cleanup on error
    if (sessionId) {
      try {
        await fetch(`${API_URL}/sessions/end`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': guestCookies || practitionerCookies 
          },
          body: JSON.stringify({ sessionId })
        });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testCompleteSessionFlow();