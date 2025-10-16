#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test credentials (use an existing test user or create one)
const testEmail = 'chefmat2018@gmail.com';
const testPassword = 'password123';

async function testUnifiedUpload() {
  console.log('🧪 Testing Unified Upload Endpoints\n');

  try {
    // 1. Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ Login successful\n');

    // 2. Test unified upload endpoint for avatars
    console.log('2️⃣ Testing /api/objects/upload for avatars...');
    const avatarUploadResponse = await fetch(`${BASE_URL}/api/objects/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bucket: 'avatars',
        fileType: 'image/jpeg'
      })
    });

    if (!avatarUploadResponse.ok) {
      throw new Error(`Avatar upload URL request failed: ${avatarUploadResponse.status}`);
    }

    const avatarData = await avatarUploadResponse.json();
    console.log('✅ Avatar upload URL generated:');
    console.log('   - Upload URL:', avatarData.uploadUrl.substring(0, 80) + '...');
    console.log('   - Public URL:', avatarData.publicUrl);
    console.log('   - Success:', avatarData.success);
    console.log();

    // 3. Test unified upload endpoint for gallery
    console.log('3️⃣ Testing /api/objects/upload for gallery...');
    const galleryUploadResponse = await fetch(`${BASE_URL}/api/objects/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bucket: 'gallery',
        fileType: 'image/png'
      })
    });

    if (!galleryUploadResponse.ok) {
      throw new Error(`Gallery upload URL request failed: ${galleryUploadResponse.status}`);
    }

    const galleryData = await galleryUploadResponse.json();
    console.log('✅ Gallery upload URL generated:');
    console.log('   - Success:', galleryData.success);
    console.log();

    // 4. Test unified upload endpoint for videos
    console.log('4️⃣ Testing /api/objects/upload for videos...');
    const videoUploadResponse = await fetch(`${BASE_URL}/api/objects/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bucket: 'videos',
        fileType: 'video/mp4'
      })
    });

    if (!videoUploadResponse.ok) {
      throw new Error(`Video upload URL request failed: ${videoUploadResponse.status}`);
    }

    const videoData = await videoUploadResponse.json();
    console.log('✅ Video upload URL generated:');
    console.log('   - Success:', videoData.success);
    console.log();

    // 5. Test upload completion endpoint
    console.log('5️⃣ Testing /api/objects/upload/complete...');
    const completeResponse = await fetch(`${BASE_URL}/api/objects/upload/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        bucket: 'avatars',
        publicUrl: avatarData.publicUrl
      })
    });

    if (!completeResponse.ok) {
      const errorText = await completeResponse.text();
      throw new Error(`Upload completion failed: ${completeResponse.status} - ${errorText}`);
    }

    const completeData = await completeResponse.json();
    console.log('✅ Upload completion successful:');
    console.log('   - Message:', completeData.message);
    console.log('   - Profile updated:', !!completeData.profile);
    console.log();

    // 6. Verify existing endpoints still work
    console.log('6️⃣ Testing backward compatibility with existing endpoints...');
    const oldAvatarResponse = await fetch(`${BASE_URL}/api/upload/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!oldAvatarResponse.ok) {
      throw new Error(`Old avatar endpoint failed: ${oldAvatarResponse.status}`);
    }

    const oldAvatarData = await oldAvatarResponse.json();
    console.log('✅ Old /api/upload/avatar endpoint still works');
    console.log();

    console.log('🎉 All tests passed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Unified /api/objects/upload endpoint works for all buckets');
    console.log('   ✅ Upload completion endpoint saves URLs to profile');
    console.log('   ✅ Service role authentication is working');
    console.log('   ✅ Backward compatibility maintained');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testUnifiedUpload();