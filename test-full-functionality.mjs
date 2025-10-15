import fs from 'fs';
import path from 'path';

// Create a test file for upload
const testImagePath = 'test-upload.png';
const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(testImagePath, imageBuffer);

async function testFullFunctionality() {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🧪 COMPREHENSIVE ALLINYA PLATFORM TEST');
  console.log('=' .repeat(60));
  
  // Test 1: Login
  console.log('\n📋 TEST 1: Authentication');
  console.log('-'.repeat(40));
  
  let practitionerCookies, guestCookies;
  
  try {
    // Login as practitioner
    const practRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'chefmat2018@gmail.com', 
        password: 'Rickrick01' 
      })
    });
    
    if (!practRes.ok) {
      const error = await practRes.text();
      throw new Error(`Practitioner login failed: ${error}`);
    }
    
    practitionerCookies = practRes.headers.get('set-cookie');
    const practData = await practRes.json();
    console.log('✅ Practitioner login successful');
    console.log('   User ID:', practData.user?.id);
    console.log('   Supabase token:', practData.session?.access_token ? 'Present' : 'Missing');
    
    // Login as guest
    const guestRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'cheekyma@hotmail.com', 
        password: 'Rickrick01' 
      })
    });
    
    if (!guestRes.ok) {
      const error = await guestRes.text();
      throw new Error(`Guest login failed: ${error}`);
    }
    
    guestCookies = guestRes.headers.get('set-cookie');
    const guestData = await guestRes.json();
    console.log('✅ Guest login successful');
    console.log('   User ID:', guestData.user?.id);
    console.log('   Supabase token:', guestData.session?.access_token ? 'Present' : 'Missing');
    
    // Store tokens for later use
    const practitionerToken = practData.session?.access_token;
    const guestToken = guestData.session?.access_token;
    
    // Test 2: Upload functionality
    console.log('\n📋 TEST 2: File Upload to Supabase');
    console.log('-'.repeat(40));
    
    if (!practitionerToken) {
      throw new Error('No Supabase token received from login');
    }
    
    // Test direct Supabase upload
    const fileName = `test-${Date.now()}.png`;
    const supabaseUrl = 'https://tkswishecwcllxgyhqox.supabase.co';
    
    console.log('Testing direct Supabase upload...');
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/avatars/${fileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${practitionerToken}`,
        'Content-Type': 'image/png'
      },
      body: imageBuffer
    });
    
    console.log('Upload response status:', uploadRes.status);
    const uploadResult = await uploadRes.text();
    console.log('Upload response:', uploadResult);
    
    if (uploadRes.ok) {
      console.log('✅ Direct Supabase upload successful');
      
      // Check if file exists
      const checkRes = await fetch(`${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`);
      console.log('File accessible:', checkRes.ok ? 'Yes' : 'No');
      
      // Test backend upload endpoint
      console.log('\nTesting backend upload endpoint...');
      const backendUploadRes = await fetch(`${BASE_URL}/api/objects/upload`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${practitionerToken}`,
          'Content-Type': 'image/png',
          'x-bucket-name': 'avatars',
          'x-file-name': `backend-test-${Date.now()}.png`
        },
        body: imageBuffer
      });
      
      console.log('Backend upload status:', backendUploadRes.status);
      const backendResult = await backendUploadRes.text();
      console.log('Backend upload response:', backendResult);
      
      if (backendUploadRes.ok) {
        console.log('✅ Backend upload endpoint working');
      } else {
        console.log('❌ Backend upload endpoint failed');
      }
    } else {
      console.log('❌ Direct Supabase upload failed');
    }
    
    // Test 3: Session and Video
    console.log('\n📋 TEST 3: Session Creation and Video Token');
    console.log('-'.repeat(40));
    
    // Create a session
    const sessionRes = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': guestCookies
      },
      body: JSON.stringify({
        practitionerId: '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6',
        liveSeconds: 1800
      })
    });
    
    if (!sessionRes.ok) {
      const error = await sessionRes.text();
      throw new Error(`Session creation failed: ${error}`);
    }
    
    const session = await sessionRes.json();
    console.log('✅ Session created successfully');
    console.log('   Session ID:', session.id);
    console.log('   Channel:', session.agoraChannel);
    
    // Get Agora tokens
    const practTokenRes = await fetch(`${BASE_URL}/api/agora/token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': practitionerCookies
      },
      body: JSON.stringify({
        channel: session.agoraChannel,
        uid: `p_1a20c2b4-469d-4187-96ff-3e3da2a1d3a6`
      })
    });
    
    if (practTokenRes.ok) {
      const tokenData = await practTokenRes.json();
      console.log('✅ Practitioner token generated');
      console.log('   Token length:', tokenData.token?.length);
      console.log('   App ID present:', tokenData.appId ? 'Yes' : 'No');
      console.log('   UID returned:', tokenData.uid);
    } else {
      console.log('❌ Practitioner token failed:', await practTokenRes.text());
    }
    
    // Test 4: Frontend Routes
    console.log('\n📋 TEST 4: Frontend Routes');
    console.log('-'.repeat(40));
    
    const routes = [
      '/',
      '/auth',
      '/profile',
      '/explore',
      '/dashboard'
    ];
    
    for (const route of routes) {
      const res = await fetch(`${BASE_URL}${route}`);
      console.log(`   ${route}: ${res.status === 200 ? '✅' : '❌'} (${res.status})`);
    }
    
    // Test 5: Check Supabase connection
    console.log('\n📋 TEST 5: Supabase Integration');
    console.log('-'.repeat(40));
    
    // Check if Supabase client is configured
    const profileRes = await fetch(`${BASE_URL}/api/profiles/1a20c2b4-469d-4187-96ff-3e3da2a1d3a6`, {
      headers: {
        'Cookie': practitionerCookies
      }
    });
    
    if (profileRes.ok) {
      const profile = await profileRes.json();
      console.log('✅ Supabase profiles accessible');
      console.log('   Profile name:', profile.name);
    } else {
      console.log('❌ Cannot fetch profiles from Supabase');
    }
    
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log('Check the results above to identify what\'s not working.');
    console.log('\n🔍 KEY AREAS TO CHECK:');
    console.log('1. Supabase tokens from login (needed for uploads)');
    console.log('2. Upload endpoints (both direct and backend)');
    console.log('3. Agora token generation');
    console.log('4. Frontend routes accessibility');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
}

testFullFunctionality();