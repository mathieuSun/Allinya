import fs from 'fs';

// Create test image
const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function testFrontendUpload() {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🧪 TESTING COMPLETE UPLOAD FLOW');
  console.log('=' .repeat(60));
  
  try {
    // 1. Login
    console.log('\n📋 STEP 1: Login as practitioner...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'chefmat2018@gmail.com', 
        password: 'Rickrick01' 
      })
    });
    
    const loginData = await loginRes.json();
    const cookies = loginRes.headers.get('set-cookie');
    const token = loginData.session?.access_token;
    console.log('✅ Logged in, token:', token ? 'Present' : 'Missing');
    
    // 2. Upload directly to Supabase
    console.log('\n📋 STEP 2: Upload avatar image...');
    const fileName = `avatar-${Date.now()}.png`;
    const supabaseUrl = 'https://tkswishecwcllxgyhqox.supabase.co';
    
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/avatars/${fileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/png'
      },
      body: imageBuffer
    });
    
    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${await uploadRes.text()}`);
    }
    
    console.log('✅ Image uploaded successfully');
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;
    console.log('   Public URL:', publicUrl);
    
    // 3. Update profile with new avatar
    console.log('\n📋 STEP 3: Update profile with avatar URL...');
    const updateRes = await fetch(`${BASE_URL}/api/profiles/1a20c2b4-469d-4187-96ff-3e3da2a1d3a6`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies
      },
      body: JSON.stringify({ 
        avatar: publicUrl 
      })
    });
    
    console.log('   Update status:', updateRes.status);
    if (updateRes.ok) {
      const profile = await updateRes.json();
      console.log('✅ Profile updated with avatar');
      console.log('   Avatar URL saved:', profile.avatar);
    } else {
      console.log('❌ Profile update failed:', await updateRes.text());
    }
    
    // 4. Fetch profile to verify
    console.log('\n📋 STEP 4: Verify profile has avatar...');
    const getRes = await fetch(`${BASE_URL}/api/profiles/1a20c2b4-469d-4187-96ff-3e3da2a1d3a6`, {
      headers: { 'Cookie': cookies }
    });
    
    if (getRes.ok) {
      const profile = await getRes.json();
      console.log('✅ Profile fetched');
      console.log('   Avatar:', profile.avatar || 'None');
      console.log('   Gallery:', profile.gallery?.length || 0, 'images');
      console.log('   Video:', profile.video || 'None');
    } else {
      console.log('❌ Could not fetch profile');
    }
    
    // 5. Test video call flow
    console.log('\n📋 STEP 5: Test video session creation...');
    const sessionRes = await fetch(`${BASE_URL}/api/sessions/start`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': cookies
      },
      body: JSON.stringify({
        practitionerId: '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6',
        liveSeconds: 1800
      })
    });
    
    if (sessionRes.ok) {
      const session = await sessionRes.json();
      console.log('✅ Session created');
      console.log('   Session ID:', session.id);
      console.log('   Channel:', session.agoraChannel);
      
      // Get Agora token
      const tokenRes = await fetch(`${BASE_URL}/api/agora/token`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({
          channel: session.agoraChannel,
          uid: 'p_1a20c2b4-469d-4187-96ff-3e3da2a1d3a6'
        })
      });
      
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        console.log('✅ Agora token generated');
        console.log('   Token length:', tokenData.token?.length);
        console.log('   App ID present:', tokenData.appId ? 'Yes' : 'No');
      }
    } else {
      console.log('❌ Session creation failed');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('- Uploads to Supabase: ✅ WORKING');
    console.log('- Profile updates: Check above');
    console.log('- Session creation: Check above');
    console.log('- Agora tokens: Check above');
    console.log('\nIf all show ✅, your platform is fully functional!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendUpload();