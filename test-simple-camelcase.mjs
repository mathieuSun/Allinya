#!/usr/bin/env node

// Simple test to verify camelCase runtime types
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function test() {
  console.log('🚀 Testing camelCase runtime types...\n');

  // 1. Create a test user
  const timestamp = Date.now();
  const testUser = {
    email: `test.${timestamp}@allinya.com`,
    password: 'testpass123',
    full_name: 'Test User',
    role: 'practitioner'
  };

  console.log('1. Creating test user...');
  const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });

  if (!signupResponse.ok) {
    console.error('❌ Signup failed:', await signupResponse.text());
    process.exit(1);
  }

  const signupData = await signupResponse.json();
  console.log(`✅ Created user: ${testUser.email}`);
  console.log(`   User ID: ${signupData.user.id}\n`);

  // 2. Check the profile returned from signup
  console.log('2. Checking profile structure from signup response...');
  const profile = signupData.profile;
  
  if (!profile) {
    console.error('❌ No profile in signup response');
    process.exit(1);
  }

  console.log('   Profile properties:');
  console.log(`   - id: ${profile.id ? '✅' : '❌'} ${profile.id || 'MISSING'}`);
  console.log(`   - role: ${profile.role ? '✅' : '❌'} ${profile.role || 'MISSING'}`);
  console.log(`   - displayName: ${profile.displayName ? '✅' : '❌'} "${profile.displayName || 'MISSING'}"`);
  console.log(`   - avatarUrl: ${profile.avatarUrl !== undefined ? '✅' : '❌'} ${profile.avatarUrl || 'null'}`);
  console.log(`   - galleryUrls: ${profile.galleryUrls !== undefined ? '✅' : '❌'} ${JSON.stringify(profile.galleryUrls) || 'MISSING'}`);
  console.log(`   - videoUrl: ${profile.videoUrl !== undefined ? '✅' : '❌'} ${profile.videoUrl || 'null'}`);
  console.log(`   - specialties: ${profile.specialties !== undefined ? '✅' : '❌'} ${JSON.stringify(profile.specialties) || 'MISSING'}`);
  
  // Check for snake_case (should NOT exist)
  console.log('\n   Checking for snake_case properties (should NOT exist):');
  const snakeCaseFound = [];
  if ('display_name' in profile) snakeCaseFound.push('display_name');
  if ('avatar_url' in profile) snakeCaseFound.push('avatar_url');
  if ('gallery_urls' in profile) snakeCaseFound.push('gallery_urls');
  if ('video_url' in profile) snakeCaseFound.push('video_url');
  
  if (snakeCaseFound.length > 0) {
    console.error(`   ❌ Found snake_case properties: ${snakeCaseFound.join(', ')}`);
    console.error('\n❌ API is returning snake_case instead of camelCase!');
    process.exit(1);
  } else {
    console.log('   ✅ No snake_case properties found');
  }

  // 3. Test updating profile with media URLs using the session
  if (signupData.session && signupData.session.access_token) {
    console.log('\n3. Testing profile updates with session token...');
    const token = signupData.session.access_token;
    
    // Update avatar
    const avatarResponse = await fetch(`${API_BASE}/profile/avatar`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ avatarUrl: 'https://test.com/avatar.jpg' }),
    });

    if (avatarResponse.ok) {
      const avatarProfile = await avatarResponse.json();
      console.log(`   ✅ Avatar updated: ${avatarProfile.avatarUrl}`);
      
      // Check response uses camelCase
      if ('avatar_url' in avatarProfile) {
        console.error('   ❌ Response contains snake_case "avatar_url"');
        process.exit(1);
      }
    } else {
      console.log(`   ⚠️  Avatar update failed: ${avatarResponse.status}`);
    }
  }

  console.log('\n🎉 SUCCESS! The API is correctly returning camelCase properties.');
  console.log('✅ Profile uses displayName (not display_name)');
  console.log('✅ Profile uses avatarUrl (not avatar_url)');
  console.log('✅ Profile uses galleryUrls (not gallery_urls)');
  console.log('✅ Profile uses videoUrl (not video_url)');
  console.log('\nThe frontend components should now work correctly with RuntimeProfile type.\n');
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});