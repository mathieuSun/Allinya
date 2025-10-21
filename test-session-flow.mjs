#!/usr/bin/env node

/**
 * Test 3: Session Creation Flow
 * Tests complete session workflow from creation to acceptance
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

async function getPractitioners(cookie) {
  const response = await fetch(`${BASE_URL}/api/practitioners`, {
    headers: { 'Cookie': cookie },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get practitioners: ${error}`);
  }

  return response.json();
}

async function createSession(practitionerId, cookie) {
  logInfo(`Creating session with practitioner ${practitionerId}...`);
  const response = await fetch(`${BASE_URL}/api/sessions/create`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie 
    },
    credentials: 'include',
    body: JSON.stringify({ practitionerId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${error}`);
  }

  const data = await response.json();
  logSuccess(`Session created with ID: ${data.sessionId}`);
  return data;
}

async function getSession(sessionId, cookie) {
  const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
    headers: { 'Cookie': cookie },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get session: ${error}`);
  }

  return response.json();
}

async function getPractitionerSessions(cookie) {
  const response = await fetch(`${BASE_URL}/api/sessions/practitioner`, {
    headers: { 'Cookie': cookie },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get practitioner sessions: ${error}`);
  }

  return response.json();
}

async function acceptSession(sessionId, cookie) {
  logInfo(`Accepting session ${sessionId}...`);
  const response = await fetch(`${BASE_URL}/api/sessions/accept`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie 
    },
    credentials: 'include',
    body: JSON.stringify({ sessionId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to accept session: ${error}`);
  }

  logSuccess('Session accepted');
  return response.json();
}

async function endSession(sessionId, cookie) {
  logInfo(`Ending session ${sessionId}...`);
  const response = await fetch(`${BASE_URL}/api/sessions/end`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookie 
    },
    credentials: 'include',
    body: JSON.stringify({ sessionId })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to end session: ${error}`);
  }

  logSuccess('Session ended');
  return response.json();
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('TEST 3: SESSION CREATION FLOW', YELLOW);
  console.log('='.repeat(60));

  let practLogin, guestLogin, sessionId;

  try {
    // Step 1: Set up practitioner as Online
    console.log('\n--- Step 1: Setup Practitioner ---');
    practLogin = await login(practitioner.email, practitioner.password);
    await updatePractitionerStatus(true, false, practLogin.cookie);
    logSuccess('Practitioner set to Online status');

    // Step 2: Login as guest
    console.log('\n--- Step 2: Login as Guest ---');
    guestLogin = await login(guest.email, guest.password);
    
    // Step 3: Get practitioners and find the online one
    console.log('\n--- Step 3: Find Online Practitioner ---');
    const practitioners = await getPractitioners(guestLogin.cookie);
    const onlinePractitioner = practitioners.find(p => p.isOnline && !p.inService);
    
    if (!onlinePractitioner) {
      throw new Error('No online practitioner found');
    }
    
    logSuccess(`Found online practitioner: ${onlinePractitioner.profile.displayName}`);
    
    // Step 4: Create session as guest
    console.log('\n--- Step 4: Create Session ---');
    const sessionData = await createSession(onlinePractitioner.userId, guestLogin.cookie);
    sessionId = sessionData.sessionId;
    
    // Step 5: Verify session was created
    console.log('\n--- Step 5: Verify Session Creation ---');
    const guestSession = await getSession(sessionId, guestLogin.cookie);
    
    if (guestSession.phase === 'waiting') {
      logSuccess('Session is in waiting phase');
    } else {
      logError(`Unexpected session phase: ${guestSession.phase}`);
    }
    
    // Check practitioner status changed to In Service
    const updatedPractitioners = await getPractitioners(guestLogin.cookie);
    const updatedPract = updatedPractitioners.find(p => p.userId === onlinePractitioner.userId);
    
    if (updatedPract.inService) {
      logSuccess('Practitioner status automatically changed to "In Service"');
    } else {
      logError('Practitioner status did not change to "In Service"');
    }
    
    // Step 6: Practitioner sees pending session
    console.log('\n--- Step 6: Practitioner Views Pending Sessions ---');
    const practSessions = await getPractitionerSessions(practLogin.cookie);
    const pendingSession = practSessions.find(s => s.id === sessionId);
    
    if (pendingSession && pendingSession.phase === 'waiting') {
      logSuccess('Practitioner can see pending session');
    } else {
      logError('Practitioner cannot see pending session');
    }
    
    // Step 7: Practitioner accepts session
    console.log('\n--- Step 7: Practitioner Accepts Session ---');
    await acceptSession(sessionId, practLogin.cookie);
    
    // Step 8: Verify session is now in room_timer phase
    console.log('\n--- Step 8: Verify Session Accepted ---');
    const acceptedSession = await getSession(sessionId, practLogin.cookie);
    
    if (acceptedSession.phase === 'room_timer') {
      logSuccess('Session moved to room_timer phase after acceptance');
    } else {
      logError(`Unexpected session phase after acceptance: ${acceptedSession.phase}`);
    }
    
    // Step 9: Both parties can see session
    console.log('\n--- Step 9: Verify Both Parties Can Access Session ---');
    const guestView = await getSession(sessionId, guestLogin.cookie);
    const practView = await getSession(sessionId, practLogin.cookie);
    
    if (guestView && practView) {
      logSuccess('Both guest and practitioner can view session');
      logInfo(`Guest sees phase: ${guestView.phase}`);
      logInfo(`Practitioner sees phase: ${practView.phase}`);
    }
    
    // Step 10: Test camelCase compliance
    console.log('\n--- Step 10: Validate CamelCase ---');
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
    
    if (checkCamelCase(guestSession, 'session')) {
      logSuccess('Session data uses camelCase');
    }
    
    // Step 11: Clean up - end session
    console.log('\n--- Step 11: Clean Up ---');
    await endSession(sessionId, practLogin.cookie);
    
    console.log('\n' + '='.repeat(60));
    logSuccess('TEST 3 COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    logError(`TEST FAILED: ${error.message}`);
    console.error('='.repeat(60));
    
    // Try to clean up if session was created
    if (sessionId && practLogin?.cookie) {
      try {
        await endSession(sessionId, practLogin.cookie);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);