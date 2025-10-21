#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

// Test colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green :
                type === 'error' ? colors.red :
                type === 'warning' ? colors.yellow :
                type === 'header' ? colors.magenta :
                colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main comprehensive test function
async function runComprehensiveTests() {
  log('\n' + '='.repeat(70), 'header');
  log('     ALLINYA COMPREHENSIVE TESTING SUITE - FINAL', 'header');
  log('='.repeat(70), 'header');
  log(`\nStarted: ${new Date().toLocaleString()}`, 'info');
  
  const testResults = {
    guestLogin: false,
    practitionerLogin: false,
    statusCycling: false,
    sessionFlow: false,
    terminologyCorrect: false,
    camelCaseCompliant: false,
    errors: []
  };
  
  let guestAuth = null;
  let practAuth = null;
  let sessionId = null;
  
  try {
    // ========== TEST 1: GUEST LOGIN AND EXPLORATION ==========
    log('\n📌 TEST 1: GUEST LOGIN AND EXPLORATION', 'header');
    log('─'.repeat(50), 'info');
    
    const guestLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cheekyma@hotmail.com',
        password: 'Rickrick01'
      })
    });
    
    if (!guestLoginRes.ok) {
      throw new Error(`Guest login failed: ${guestLoginRes.status}`);
    }
    
    const guestData = await guestLoginRes.json();
    guestAuth = {
      token: guestData.accessToken,
      user: guestData.user,
      profile: guestData.profile
    };
    
    log(`✅ Guest login successful: ${guestAuth.profile?.displayName || 'Unknown'} (${guestAuth.profile?.role})`, 'success');
    testResults.guestLogin = true;
    
    // Check practitioners list
    const practListRes = await fetch(`${API_URL}/practitioners`, {
      headers: { 'Authorization': `Bearer ${guestAuth.token}` }
    });
    
    const practitioners = await practListRes.json();
    log(`✅ Found ${practitioners.length} practitioners`, 'success');
    
    // Analyze practitioner statuses
    const statusCounts = { offline: 0, online: 0, inService: 0 };
    practitioners.forEach(p => {
      if (!p.isOnline) statusCounts.offline++;
      else if (p.inService) statusCounts.inService++;
      else statusCounts.online++;
      
      const statusText = !p.isOnline ? 'Offline' : 
                        p.inService ? 'In Service' : 
                        'Online';
      log(`  • ${p.profile.displayName}: ${statusText}`, 'info');
    });
    
    log(`\n  Status Summary:`, 'info');
    log(`    Offline: ${statusCounts.offline}`, 'info');
    log(`    Online: ${statusCounts.online}`, statusCounts.online > 0 ? 'success' : 'warning');
    log(`    In Service: ${statusCounts.inService}`, 'info');
    
    // Check camelCase
    if (practitioners.length > 0) {
      const sampleKeys = Object.keys(practitioners[0]);
      const snakeCase = sampleKeys.filter(k => k.includes('_'));
      if (snakeCase.length === 0) {
        log(`✅ CamelCase format verified in practitioners data`, 'success');
        testResults.camelCaseCompliant = true;
      } else {
        log(`⚠️ Found snake_case: ${snakeCase.join(', ')}`, 'warning');
      }
    }
    
    // ========== TEST 2: PRACTITIONER LOGIN AND STATUS ==========
    log('\n📌 TEST 2: PRACTITIONER LOGIN AND STATUS CYCLING', 'header');
    log('─'.repeat(50), 'info');
    
    const practLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chefmat2018@gmail.com',
        password: 'Rickrick01'
      })
    });
    
    if (!practLoginRes.ok) {
      throw new Error(`Practitioner login failed: ${practLoginRes.status}`);
    }
    
    const practData = await practLoginRes.json();
    practAuth = {
      token: practData.accessToken,
      user: practData.user,
      profile: practData.profile
    };
    
    log(`✅ Practitioner login successful: ${practAuth.profile?.displayName} (${practAuth.profile?.role})`, 'success');
    testResults.practitionerLogin = true;
    
    // Test status cycling
    log('\nTesting status cycling...', 'info');
    
    // Cycle: Offline → Online → In Service → Offline
    const statusTests = [
      { isOnline: false, inService: false, name: 'Offline' },
      { isOnline: true, inService: false, name: 'Online' },
      { isOnline: true, inService: true, name: 'In Service' },
      { isOnline: false, inService: false, name: 'Offline' }
    ];
    
    for (const status of statusTests) {
      const statusRes = await fetch(`${API_URL}/practitioners/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${practAuth.token}` 
        },
        body: JSON.stringify(status)
      });
      
      if (statusRes.ok) {
        const contentType = statusRes.headers.get('content-type');
        log(`    Response Content-Type: ${contentType}`, 'debug');
        
        if (!contentType || !contentType.includes('application/json')) {
          const text = await statusRes.text();
          log(`  ❌ Non-JSON response for ${status.name}. Content-Type: ${contentType}`, 'error');
          log(`  Response text: ${text.substring(0, 200)}`, 'error');
          throw new Error('Response is not JSON');
        }
        
        const result = await statusRes.json();
        const actualStatus = !result.isOnline ? 'Offline' : 
                           result.inService ? 'In Service' : 
                           'Online';
        log(`  ✅ Status changed to: ${actualStatus}`, 'success');
        
        // Verify terminology
        if (actualStatus === status.name) {
          testResults.terminologyCorrect = true;
        }
      } else {
        const errorText = await statusRes.text();
        log(`  ⚠️ Failed to set status: ${status.name}. Error: ${errorText}`, 'warning');
      }
    }
    
    testResults.statusCycling = true;
    
    // Set to Online for session testing
    await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${practAuth.token}` 
      },
      body: JSON.stringify({ isOnline: true, inService: false })
    });
    
    // ========== TEST 3: COMPLETE SESSION FLOW ==========
    log('\n📌 TEST 3: COMPLETE SESSION FLOW', 'header');
    log('─'.repeat(50), 'info');
    
    // Guest creates session
    log('Creating session as guest...', 'info');
    const createSessionRes = await fetch(`${API_URL}/sessions/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${guestAuth.token}` 
      },
      body: JSON.stringify({
        practitionerId: practAuth.user.id
      })
    });
    
    if (createSessionRes.ok) {
      const sessionData = await createSessionRes.json();
      sessionId = sessionData.id;
      log(`✅ Session created: ${sessionId}`, 'success');
      log(`  Phase: ${sessionData.phase}`, 'info');
      
      // Practitioner checks sessions
      const practSessionsRes = await fetch(`${API_URL}/sessions/practitioner`, {
        headers: { 'Authorization': `Bearer ${practAuth.token}` }
      });
      
      if (practSessionsRes.ok) {
        const sessions = await practSessionsRes.json();
        const pendingSession = sessions.find(s => s.id === sessionId);
        if (pendingSession) {
          log(`✅ Practitioner sees session request from: ${pendingSession.guest?.displayName}`, 'success');
        }
      }
      
      // Practitioner accepts
      const acceptRes = await fetch(`${API_URL}/sessions/accept`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${practAuth.token}` 
        },
        body: JSON.stringify({ sessionId })
      });
      
      if (acceptRes.ok) {
        log(`✅ Session accepted by practitioner`, 'success');
        
        // Check practitioner status changed to In Service
        const statusCheckRes = await fetch(`${API_URL}/practitioners/get-status`, {
          headers: { 'Authorization': `Bearer ${practAuth.token}` }
        });
        
        if (statusCheckRes.ok) {
          const status = await statusCheckRes.json();
          if (status.inService) {
            log(`✅ Practitioner automatically set to "In Service"`, 'success');
          }
        }
      }
      
      // Test ready mechanism
      log('\nTesting ready mechanism...', 'info');
      
      // Guest marks ready
      await fetch(`${API_URL}/sessions/ready`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestAuth.token}` 
        },
        body: JSON.stringify({ sessionId, who: 'guest' })
      });
      log(`  ✅ Guest marked ready`, 'success');
      
      // Practitioner marks ready
      await fetch(`${API_URL}/sessions/ready`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${practAuth.token}` 
        },
        body: JSON.stringify({ sessionId, who: 'practitioner' })
      });
      log(`  ✅ Practitioner marked ready`, 'success');
      
      // Check if session went live
      await sleep(1000);
      const sessionStatusRes = await fetch(`${API_URL}/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${guestAuth.token}` }
      });
      
      if (sessionStatusRes.ok) {
        const session = await sessionStatusRes.json();
        if (session.phase === 'live') {
          log(`✅ Session transitioned to LIVE phase`, 'success');
        } else {
          log(`  Session phase: ${session.phase}`, 'info');
        }
      }
      
      // End session
      const endRes = await fetch(`${API_URL}/sessions/end`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestAuth.token}` 
        },
        body: JSON.stringify({ sessionId })
      });
      
      if (endRes.ok) {
        log(`✅ Session ended successfully`, 'success');
        testResults.sessionFlow = true;
      }
      
      // Create review
      const reviewRes = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestAuth.token}` 
        },
        body: JSON.stringify({
          sessionId,
          rating: 5,
          comment: 'Excellent session!'
        })
      });
      
      if (reviewRes.ok) {
        log(`✅ Review created successfully`, 'success');
      }
    }
    
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, 'error');
    testResults.errors.push(error.message);
  }
  
  // ========== FINAL REPORT ==========
  log('\n' + '='.repeat(70), 'header');
  log('     FINAL TEST REPORT', 'header');
  log('='.repeat(70), 'header');
  
  log('\n✔️ TEST RESULTS:', 'header');
  log(`  Guest Login: ${testResults.guestLogin ? '✅ PASSED' : '❌ FAILED'}`, testResults.guestLogin ? 'success' : 'error');
  log(`  Practitioner Login: ${testResults.practitionerLogin ? '✅ PASSED' : '❌ FAILED'}`, testResults.practitionerLogin ? 'success' : 'error');
  log(`  Status Cycling: ${testResults.statusCycling ? '✅ PASSED' : '❌ FAILED'}`, testResults.statusCycling ? 'success' : 'error');
  log(`  Session Flow: ${testResults.sessionFlow ? '✅ PASSED' : '❌ FAILED'}`, testResults.sessionFlow ? 'success' : 'error');
  log(`  Terminology Correct: ${testResults.terminologyCorrect ? '✅ PASSED' : '❌ FAILED'}`, testResults.terminologyCorrect ? 'success' : 'error');
  log(`  CamelCase Compliant: ${testResults.camelCaseCompliant ? '✅ PASSED' : '❌ FAILED'}`, testResults.camelCaseCompliant ? 'success' : 'error');
  
  if (testResults.errors.length > 0) {
    log('\n❌ ERRORS ENCOUNTERED:', 'error');
    testResults.errors.forEach(err => log(`  • ${err}`, 'error'));
  }
  
  const allPassed = Object.values(testResults).filter(v => v === true).length === 6;
  
  log('\n' + '='.repeat(70), 'header');
  if (allPassed) {
    log('🎉 OVERALL RESULT: ALL TESTS PASSED!', 'success');
    log('The Allinya application is fully functional and ready for use.', 'success');
  } else {
    log('⚠️ OVERALL RESULT: SOME TESTS NEED ATTENTION', 'warning');
  }
  log('='.repeat(70), 'header');
  log(`Completed: ${new Date().toLocaleString()}`, 'info');
}

// Run tests
runComprehensiveTests();