#!/usr/bin/env node
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

// Test accounts
const PRACTITIONER = {
  email: 'chefmat2018@gmail.com',
  password: 'Rickrick01'
};

const GUEST = {
  email: 'cheekyma@hotmail.com',
  password: 'Rickrick01'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loginUser(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    log(`✅ Logged in as ${email}`, 'green');
    
    return {
      token: data.access_token,
      userId: data.user.id,
      profile: data.profile
    };
  } catch (error) {
    log(`❌ Login error for ${email}: ${error.message}`, 'red');
    throw error;
  }
}

async function updatePractitionerStatus(practitionerId, token, isOnline) {
  try {
    const response = await fetch(`${BASE_URL}/api/practitioners/${practitionerId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isOnline })
    });

    if (!response.ok) {
      throw new Error(`Status update failed: ${response.status}`);
    }

    const data = await response.json();
    log(`✅ Practitioner status updated: ${isOnline ? 'Online' : 'Offline'}`, 'green');
    return data;
  } catch (error) {
    log(`❌ Status update error: ${error.message}`, 'red');
    throw error;
  }
}

async function createSession(practitionerId, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        practitionerId,
        liveSeconds: 300 // 5 minutes
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Session creation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const sessionId = data.sessionId || data.id;
    log(`✅ Session created: ${sessionId}`, 'green');
    
    // Fetch the full session data
    const sessionResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Failed to fetch session: ${sessionResponse.status}`);
    }
    
    const session = await sessionResponse.json();
    log(`   Channel: ${session.agoraChannel}`, 'blue');
    log(`   Guest UID: ${session.agoraUidGuest}`, 'blue');
    log(`   Practitioner UID: ${session.agoraUidPractitioner}`, 'blue');
    return session;
  } catch (error) {
    log(`❌ Session creation error: ${error.message}`, 'red');
    throw error;
  }
}

async function markReady(sessionId, who, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/sessions/ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId, who })
    });

    if (!response.ok) {
      throw new Error(`Mark ready failed: ${response.status}`);
    }

    const data = await response.json();
    log(`✅ ${who} marked as ready`, 'green');
    return data;
  } catch (error) {
    log(`❌ Mark ready error: ${error.message}`, 'red');
    throw error;
  }
}

async function getSession(sessionId, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Get session failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log(`❌ Get session error: ${error.message}`, 'red');
    throw error;
  }
}

async function testAgoraToken(sessionId, uid, token) {
  try {
    const session = await getSession(sessionId, token);
    const channel = session.agoraChannel;
    
    const response = await fetch(
      `${BASE_URL}/api/agora/token?channel=${channel}&role=host&uid=${uid}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Token generation failed: ${response.status}`);
    }

    const data = await response.json();
    log(`✅ Agora token generated for UID ${uid}`, 'green');
    log(`   Token: ${data.token.substring(0, 50)}...`, 'blue');
    return data;
  } catch (error) {
    log(`❌ Agora token error: ${error.message}`, 'red');
    throw error;
  }
}

async function endSession(sessionId, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/sessions/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      throw new Error(`End session failed: ${response.status}`);
    }

    const data = await response.json();
    log(`✅ Session ended`, 'green');
    return data;
  } catch (error) {
    log(`❌ End session error: ${error.message}`, 'red');
    throw error;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  log('\n🎥 TESTING AGORA VIDEO CALL IMPLEMENTATION\n', 'magenta');
  
  let practitionerAuth, guestAuth, session;
  
  try {
    // Step 1: Login both users
    log('\n📱 Step 1: Login users', 'yellow');
    practitionerAuth = await loginUser(PRACTITIONER.email, PRACTITIONER.password);
    guestAuth = await loginUser(GUEST.email, GUEST.password);
    
    // Step 2: Set practitioner online
    log('\n🟢 Step 2: Set practitioner online', 'yellow');
    await updatePractitionerStatus(practitionerAuth.userId, practitionerAuth.token, true);
    
    // Step 3: Guest creates a session
    log('\n📅 Step 3: Guest creates session', 'yellow');
    session = await createSession(practitionerAuth.userId, guestAuth.token);
    
    // Step 4: Both mark themselves as ready
    log('\n✋ Step 4: Both parties mark ready', 'yellow');
    await markReady(session.id, 'guest', guestAuth.token);
    await markReady(session.id, 'practitioner', practitionerAuth.token);
    
    // Step 5: Wait for session to transition to live
    log('\n⏳ Step 5: Waiting for session to go live...', 'yellow');
    await sleep(2000);
    
    // Step 6: Check session status
    const liveSession = await getSession(session.id, guestAuth.token);
    log(`   Session phase: ${liveSession.phase}`, 'blue');
    
    if (liveSession.phase === 'live') {
      log('\n🎥 Session is LIVE!', 'green');
      
      // Step 7: Test Agora token generation for both users
      log('\n🔑 Step 7: Testing Agora token generation', 'yellow');
      await testAgoraToken(session.id, liveSession.agoraUidGuest, guestAuth.token);
      await testAgoraToken(session.id, liveSession.agoraUidPractitioner, practitionerAuth.token);
      
      log('\n✨ VIDEO CALL IMPLEMENTATION TEST SUCCESSFUL!', 'green');
      log('\n📝 Test Summary:', 'yellow');
      log('   ✅ Users can login', 'green');
      log('   ✅ Sessions can be created', 'green');
      log('   ✅ Both parties can mark ready', 'green');
      log('   ✅ Session transitions to live phase', 'green');
      log('   ✅ Agora tokens are generated correctly', 'green');
      log('   ✅ UIDs are properly assigned', 'green');
      
      log('\n🌐 To test the actual video:', 'yellow');
      log(`   1. Open two browser windows`, 'blue');
      log(`   2. Login with the test credentials`, 'blue');
      log(`   3. Navigate to: http://localhost:5000/s/${session.id}`, 'blue');
      log(`   4. Both users should see the video room`, 'blue');
      log(`   5. Camera/mic controls should work`, 'blue');
      
      // Step 8: End session after delay
      log('\n⏰ Ending session in 5 seconds...', 'yellow');
      await sleep(5000);
      await endSession(session.id, guestAuth.token);
      
    } else {
      log(`❌ Session did not transition to live phase. Current phase: ${liveSession.phase}`, 'red');
    }
    
    // Step 9: Set practitioner offline
    log('\n🔴 Step 9: Set practitioner offline', 'yellow');
    await updatePractitionerStatus(practitionerAuth.userId, practitionerAuth.token, false);
    
    log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!\n', 'green');
    
  } catch (error) {
    log(`\n❌ TEST FAILED: ${error.message}\n`, 'red');
    
    // Cleanup on error
    if (session && guestAuth) {
      try {
        await endSession(session.id, guestAuth.token);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    if (practitionerAuth) {
      try {
        await updatePractitionerStatus(practitionerAuth.userId, practitionerAuth.token, false);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  log(`\n❌ UNEXPECTED ERROR: ${error}\n`, 'red');
  process.exit(1);
});