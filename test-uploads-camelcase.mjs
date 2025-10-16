#!/usr/bin/env node

// Test that uploads work correctly with camelCase runtime types
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test user credentials
const testUser = {
  email: 'test.practitioner@allinya.com',
  password: 'testpass123',
};

let authToken;
let userId;

async function test() {
  console.log('🚀 Testing profile uploads with camelCase runtime types...\n');

  // 1. Login to get auth token
  console.log('1. Logging in...');
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    process.exit(1);
  }

  const loginData = await loginResponse.json();
  authToken = loginData.access_token;
  userId = loginData.user.id;
  console.log('✅ Logged in successfully\n');

  // 2. Get current profile to check camelCase properties
  console.log('2. Fetching profile to verify camelCase properties...');
  const profileResponse = await fetch(`${API_BASE}/auth/user`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });

  if (!profileResponse.ok) {
    console.error('❌ Failed to fetch profile:', await profileResponse.text());
    process.exit(1);
  }

  const profileData = await profileResponse.json();
  const profile = profileData.profile;
  
  // Check that profile has camelCase properties
  const camelCaseProperties = [
    'displayName', 'avatarUrl', 'galleryUrls', 'videoUrl', 'specialties', 'createdAt', 'updatedAt'
  ];
  
  console.log('   Profile properties:');
  for (const prop of camelCaseProperties) {
    const hasProperty = prop in profile;
    console.log(`   - ${prop}: ${hasProperty ? '✅' : '❌'} ${hasProperty ? `(${JSON.stringify(profile[prop])})` : 'MISSING'}`);
  }
  
  // Check for snake_case properties (should NOT exist)
  const snakeCaseProperties = [
    'display_name', 'avatar_url', 'gallery_urls', 'video_url', 'created_at', 'updated_at'
  ];
  
  console.log('\n   Checking for snake_case (should NOT exist):');
  let hasSnakeCase = false;
  for (const prop of snakeCaseProperties) {
    const hasProperty = prop in profile;
    if (hasProperty) {
      hasSnakeCase = true;
      console.log(`   - ${prop}: ❌ SHOULD NOT EXIST but found: ${JSON.stringify(profile[prop])}`);
    } else {
      console.log(`   - ${prop}: ✅ Not present (correct)`);
    }
  }
  
  if (hasSnakeCase) {
    console.error('\n❌ Profile contains snake_case properties! API is not returning camelCase.');
    process.exit(1);
  }
  
  console.log('\n✅ Profile is using camelCase properties correctly\n');

  // 3. Test updating profile with avatar URL
  console.log('3. Testing avatar URL update...');
  const testAvatarUrl = 'https://example.com/test-avatar.jpg';
  const avatarUpdateResponse = await fetch(`${API_BASE}/profile/avatar`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ avatarUrl: testAvatarUrl }),
  });

  if (!avatarUpdateResponse.ok) {
    console.error('❌ Avatar update failed:', await avatarUpdateResponse.text());
    process.exit(1);
  }

  const updatedProfile = await avatarUpdateResponse.json();
  if (updatedProfile.avatarUrl === testAvatarUrl) {
    console.log(`✅ Avatar URL updated successfully: ${updatedProfile.avatarUrl}\n`);
  } else {
    console.error(`❌ Avatar URL not updated correctly. Expected: ${testAvatarUrl}, Got: ${updatedProfile.avatarUrl}`);
    process.exit(1);
  }

  // 4. Test updating gallery URLs
  console.log('4. Testing gallery URLs update...');
  const testGalleryUrls = [
    'https://example.com/gallery1.jpg',
    'https://example.com/gallery2.jpg'
  ];
  const galleryUpdateResponse = await fetch(`${API_BASE}/profile/gallery`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ galleryUrls: testGalleryUrls }),
  });

  if (!galleryUpdateResponse.ok) {
    console.error('❌ Gallery update failed:', await galleryUpdateResponse.text());
    process.exit(1);
  }

  const profileWithGallery = await galleryUpdateResponse.json();
  if (JSON.stringify(profileWithGallery.galleryUrls) === JSON.stringify(testGalleryUrls)) {
    console.log(`✅ Gallery URLs updated successfully: ${JSON.stringify(profileWithGallery.galleryUrls)}\n`);
  } else {
    console.error(`❌ Gallery URLs not updated correctly. Expected: ${JSON.stringify(testGalleryUrls)}, Got: ${JSON.stringify(profileWithGallery.galleryUrls)}`);
    process.exit(1);
  }

  // 5. Test updating video URL
  console.log('5. Testing video URL update...');
  const testVideoUrl = 'https://example.com/test-video.mp4';
  const videoUpdateResponse = await fetch(`${API_BASE}/profile/video`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ videoUrl: testVideoUrl }),
  });

  if (!videoUpdateResponse.ok) {
    console.error('❌ Video update failed:', await videoUpdateResponse.text());
    process.exit(1);
  }

  const profileWithVideo = await videoUpdateResponse.json();
  if (profileWithVideo.videoUrl === testVideoUrl) {
    console.log(`✅ Video URL updated successfully: ${profileWithVideo.videoUrl}\n`);
  } else {
    console.error(`❌ Video URL not updated correctly. Expected: ${testVideoUrl}, Got: ${profileWithVideo.videoUrl}`);
    process.exit(1);
  }

  console.log('🎉 All upload tests passed! The camelCase runtime types are working correctly.\n');
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});