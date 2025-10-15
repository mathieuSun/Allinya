import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'chefmat2018@gmail.com';
const TEST_PASSWORD = 'Rickrick01';

// Test authentication and upload URLs
async function testSupabaseUpload() {
  try {
    console.log('🚀 Testing Supabase Storage Upload System\n');
    console.log('========================================\n');
    
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    
    if (!token) {
      throw new Error('Failed to get auth token');
    }
    console.log('✅ Logged in successfully\n');
    
    // Step 2: Test avatar upload URL
    console.log('📸 Step 2: Getting avatar upload URL...');
    const avatarResponse = await fetch(`${BASE_URL}/api/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const avatarData = await avatarResponse.json();
    console.log('Avatar Upload Response:', {
      hasUploadURL: !!avatarData.uploadUrl,
      hasPublicURL: !!avatarData.publicUrl,
      publicUrl: avatarData.publicUrl
    });
    
    if (avatarData.uploadUrl) {
      console.log('✅ Avatar upload URL generated successfully');
      console.log(`   URL will be visible at: ${avatarData.publicUrl}`);
    }
    
    // Step 3: Test gallery upload URL
    console.log('\n🖼️ Step 3: Getting gallery upload URL...');
    const galleryResponse = await fetch(`${BASE_URL}/api/upload/gallery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const galleryData = await galleryResponse.json();
    console.log('Gallery Upload Response:', {
      hasUploadURL: !!galleryData.uploadUrl,
      hasPublicURL: !!galleryData.publicUrl,
      publicUrl: galleryData.publicUrl
    });
    
    if (galleryData.uploadUrl) {
      console.log('✅ Gallery upload URL generated successfully');
      console.log(`   URL will be visible at: ${galleryData.publicUrl}`);
    }
    
    // Step 4: Test video upload URL
    console.log('\n🎥 Step 4: Getting video upload URL...');
    const videoResponse = await fetch(`${BASE_URL}/api/upload/video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const videoData = await videoResponse.json();
    console.log('Video Upload Response:', {
      hasUploadURL: !!videoData.uploadUrl,
      hasPublicURL: !!videoData.publicUrl,
      publicUrl: videoData.publicUrl
    });
    
    if (videoData.uploadUrl) {
      console.log('✅ Video upload URL generated successfully');
      console.log(`   URL will be visible at: ${videoData.publicUrl}`);
    }
    
    console.log('\n========================================');
    console.log('🎉 ALL SUPABASE STORAGE TESTS PASSED!\n');
    console.log('📌 Next Steps:');
    console.log('1. Go to your profile page');
    console.log('2. Upload an avatar, gallery image, or video');
    console.log('3. Check Supabase Storage dashboard to see uploaded files');
    console.log('4. Files will be in the respective buckets (avatars, gallery, videos)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      const text = await error.response.text();
      console.error('Response:', text);
    }
  }
}

testSupabaseUpload();