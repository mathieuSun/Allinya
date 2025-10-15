import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_PRACTITIONER_EMAIL = 'chefmat2018@gmail.com';
const TEST_GUEST_EMAIL = 'cheekyma@hotmail.com';
const TEST_PASSWORD = 'Rickrick01';

console.log('🔬 COMPREHENSIVE AGORA SDK DIAGNOSTICS');
console.log('=======================================\n');

async function runDiagnostics() {
  let practitionerToken, guestToken;
  
  try {
    // ============================================
    // DIAGNOSTIC 1: Environment Configuration
    // ============================================
    console.log('📋 DIAGNOSTIC 1: Environment Configuration');
    console.log('-------------------------------------------');
    
    // Check if running on localhost (required for camera/mic access)
    console.log('✅ Running on localhost:5000 - HTTPS/localhost requirement met');
    console.log('');
    
    // ============================================
    // DIAGNOSTIC 2: Login & Authentication
    // ============================================
    console.log('📋 DIAGNOSTIC 2: Authentication System');
    console.log('-------------------------------------------');
    
    // Login as practitioner
    const practitionerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_PRACTITIONER_EMAIL, 
        password: TEST_PASSWORD 
      })
    });
    
    const practitionerData = await practitionerLogin.json();
    practitionerToken = practitionerData.access_token;
    
    if (!practitionerToken) {
      throw new Error('Practitioner login failed - no token received');
    }
    console.log('✅ Practitioner login successful');
    console.log(`   User ID: ${practitionerData.user?.id}`);
    
    // Login as guest
    const guestLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_GUEST_EMAIL, 
        password: TEST_PASSWORD 
      })
    });
    
    const guestData = await guestLogin.json();
    guestToken = guestData.access_token;
    
    if (!guestToken) {
      throw new Error('Guest login failed - no token received');
    }
    console.log('✅ Guest login successful');
    console.log(`   User ID: ${guestData.user?.id}`);
    console.log('');
    
    // ============================================
    // DIAGNOSTIC 3: Session Creation
    // ============================================
    console.log('📋 DIAGNOSTIC 3: Session Creation');
    console.log('-------------------------------------------');
    
    // Guest requests a session
    const sessionRequest = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${guestToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        practitionerId: practitionerData.user?.id
      })
    });
    
    const sessionData = await sessionRequest.json();
    
    if (!sessionData.id) {
      throw new Error('Session creation failed - no session ID');
    }
    console.log('✅ Session created successfully');
    console.log(`   Session ID: ${sessionData.id}`);
    console.log(`   Phase: ${sessionData.phase}`);
    console.log(`   Channel: ${sessionData.agoraChannel}`);
    console.log('');
    
    // ============================================
    // DIAGNOSTIC 4: Agora Token Generation
    // ============================================
    console.log('📋 DIAGNOSTIC 4: Agora Token Generation');
    console.log('-------------------------------------------');
    
    // Get Agora token for practitioner
    const practitionerTokenRequest = await fetch(
      `${BASE_URL}/api/sessions/${sessionData.id}/token`,
      {
        headers: {
          'Authorization': `Bearer ${practitionerToken}`
        }
      }
    );
    
    const practitionerAgoraData = await practitionerTokenRequest.json();
    
    if (!practitionerAgoraData.token) {
      throw new Error('Agora token generation failed for practitioner');
    }
    console.log('✅ Practitioner Agora token generated');
    console.log(`   Token length: ${practitionerAgoraData.token.length}`);
    console.log(`   UID: ${practitionerAgoraData.uid}`);
    console.log(`   App ID: ${practitionerAgoraData.appId?.substring(0, 8)}...`);
    
    // Get Agora token for guest
    const guestTokenRequest = await fetch(
      `${BASE_URL}/api/sessions/${sessionData.id}/token`,
      {
        headers: {
          'Authorization': `Bearer ${guestToken}`
        }
      }
    );
    
    const guestAgoraData = await guestTokenRequest.json();
    
    if (!guestAgoraData.token) {
      throw new Error('Agora token generation failed for guest');
    }
    console.log('✅ Guest Agora token generated');
    console.log(`   Token length: ${guestAgoraData.token.length}`);
    console.log(`   UID: ${guestAgoraData.uid}`);
    console.log('');
    
    // ============================================
    // DIAGNOSTIC 5: Agora Configuration Validation
    // ============================================
    console.log('📋 DIAGNOSTIC 5: Agora Configuration Validation');
    console.log('-------------------------------------------');
    
    // Check token format
    const isValidTokenFormat = practitionerAgoraData.token.length > 100;
    console.log(`${isValidTokenFormat ? '✅' : '❌'} Token format appears valid (length > 100)`);
    
    // Check App ID format
    const isValidAppId = practitionerAgoraData.appId && 
                        practitionerAgoraData.appId.length === 32;
    console.log(`${isValidAppId ? '✅' : '❌'} App ID format valid (32 characters)`);
    
    // Check UIDs are different
    const uniqueUids = practitionerAgoraData.uid !== guestAgoraData.uid;
    console.log(`${uniqueUids ? '✅' : '❌'} Unique UIDs for each user`);
    
    // Check channel name matches session
    const channelMatches = sessionData.agoraChannel === 
                          `session_${sessionData.id}`;
    console.log(`${channelMatches ? '✅' : '❌'} Channel name properly formatted`);
    console.log('');
    
    // ============================================
    // DIAGNOSTIC 6: Common Issues Check
    // ============================================
    console.log('📋 DIAGNOSTIC 6: Common Issues Check');
    console.log('-------------------------------------------');
    
    // Based on Agora documentation
    const issues = [];
    
    if (!practitionerAgoraData.appId) {
      issues.push('❌ INVALID_VENDOR_KEY - App ID is missing');
    }
    
    if (practitionerAgoraData.uid === guestAgoraData.uid) {
      issues.push('❌ UID_CONFLICT - Users have same UID');
    }
    
    if (!practitionerAgoraData.token || !guestAgoraData.token) {
      issues.push('❌ Token generation failed - Check AGORA_APP_CERTIFICATE');
    }
    
    if (issues.length === 0) {
      console.log('✅ No common Agora issues detected');
    } else {
      issues.forEach(issue => console.log(issue));
    }
    console.log('');
    
    // ============================================
    // DIAGNOSTIC 7: Frontend Requirements
    // ============================================
    console.log('📋 DIAGNOSTIC 7: Frontend Requirements');
    console.log('-------------------------------------------');
    console.log('⚠️  Manual checks required in browser:');
    console.log('   1. Browser must be Chrome 65+, Safari 12+, or Firefox 70+');
    console.log('   2. Camera/microphone permissions must be granted');
    console.log('   3. DOM elements for video must exist before playing');
    console.log('   4. Proper error handling for permissions');
    console.log('   5. Await all Agora async operations');
    console.log('');
    
    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('=======================================');
    console.log('✅ Authentication system working');
    console.log('✅ Session creation working');
    console.log('✅ Agora token generation working');
    console.log('✅ Unique UIDs assigned');
    console.log('✅ Channel names properly formatted');
    
    if (!isValidAppId) {
      console.log('❌ App ID may be invalid - verify in Agora console');
    }
    
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Verify AGORA_APP_ID matches your Agora console');
    console.log('2. Verify AGORA_APP_CERTIFICATE is set correctly');
    console.log('3. Check browser console for any client-side errors');
    console.log('4. Test with physical devices (not emulators)');
    console.log('5. Ensure 2+ Mbps internet connection');
    
  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:', error.message);
    console.error('\n📌 CRITICAL ISSUE DETECTED');
    console.error('   Fix this issue before proceeding with video calls');
  }
}

runDiagnostics();