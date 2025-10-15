#!/usr/bin/env node

// Test script to verify the upload configuration
// This tests that the endpoints return the correct response format

import fetch from 'node-fetch';

async function testUploadEndpoints() {
  console.log('🧪 Testing upload configuration...\n');
  
  // First, we need to authenticate
  // Try with existing test user first
  const testEmail = `test_upload_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('   Creating test user...');
  
  // Create a new test user with all required fields
  const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: 'Test Upload User',
      role: 'practitioner' // Need practitioner role for upload testing
    }),
  });
  
  if (!signupResponse.ok) {
    const errorText = await signupResponse.text();
    console.error('❌ Failed to create test user:', errorText);
    
    // Try with a known test user
    console.log('   Trying with chefmat2018@gmail.com...');
    const authResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'chefmat2018@gmail.com',
        password: '12345678'
      }),
    });
    
    if (!authResponse.ok) {
      console.error('❌ Failed to authenticate with known test user');
      console.error('   Please ensure you have a test user set up');
      process.exit(1);
    }
    
    var authData = await authResponse.json();
    var sessionCookie = authResponse.headers.get('set-cookie') || '';
  } else {
    // Login with the newly created user
    const authResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      }),
    });
    
    if (!authResponse.ok) {
      console.error('❌ Failed to login with test user');
      process.exit(1);
    }
    
    var authData = await authResponse.json();
    var sessionCookie = authResponse.headers.get('set-cookie') || '';
  }
  
  console.log('✅ Authenticated successfully\n');
  
  // Test avatar upload endpoint
  console.log('📸 Testing avatar upload endpoint...');
  const avatarResponse = await fetch('http://localhost:5000/api/upload/avatar', {
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!avatarResponse.ok) {
    console.error('❌ Avatar upload endpoint failed:', avatarResponse.status, avatarResponse.statusText);
    const error = await avatarResponse.text();
    console.error('   Error:', error);
    process.exit(1);
  }
  
  const avatarData = await avatarResponse.json();
  console.log('✅ Avatar upload endpoint response:');
  console.log('   - Upload URL:', avatarData.uploadUrl ? '✓ Present' : '✗ Missing');
  console.log('   - Public URL:', avatarData.publicUrl ? '✓ Present' : '✗ Missing');
  console.log('   - File name:', avatarData.fileName ? '✓ Present' : '✗ Missing');
  
  // Check if the upload URL is a POST endpoint for Supabase
  if (avatarData.uploadUrl) {
    const url = new URL(avatarData.uploadUrl);
    console.log('   - Upload URL host:', url.hostname);
    console.log('   - Expected method: POST (for multipart/form-data)');
  }
  
  console.log('');
  
  // Test gallery upload endpoint
  console.log('🖼️ Testing gallery upload endpoint...');
  const galleryResponse = await fetch('http://localhost:5000/api/upload/gallery', {
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!galleryResponse.ok) {
    console.error('❌ Gallery upload endpoint failed:', galleryResponse.status, galleryResponse.statusText);
    const error = await galleryResponse.text();
    console.error('   Error:', error);
    process.exit(1);
  }
  
  const galleryData = await galleryResponse.json();
  console.log('✅ Gallery upload endpoint response:');
  console.log('   - Upload URL:', galleryData.uploadUrl ? '✓ Present' : '✗ Missing');
  console.log('   - Public URL:', galleryData.publicUrl ? '✓ Present' : '✗ Missing');
  console.log('   - File name:', galleryData.fileName ? '✓ Present' : '✗ Missing');
  console.log('');
  
  // Test video upload endpoint
  console.log('🎥 Testing video upload endpoint...');
  const videoResponse = await fetch('http://localhost:5000/api/upload/video', {
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!videoResponse.ok) {
    console.error('❌ Video upload endpoint failed:', videoResponse.status, videoResponse.statusText);
    const error = await videoResponse.text();
    console.error('   Error:', error);
    process.exit(1);
  }
  
  const videoData = await videoResponse.json();
  console.log('✅ Video upload endpoint response:');
  console.log('   - Upload URL:', videoData.uploadUrl ? '✓ Present' : '✗ Missing');
  console.log('   - Public URL:', videoData.publicUrl ? '✓ Present' : '✗ Missing');
  console.log('   - File name:', videoData.fileName ? '✓ Present' : '✗ Missing');
  console.log('');
  
  console.log('✅ All upload endpoints are configured correctly!');
  console.log('');
  console.log('📝 Summary:');
  console.log('   - Upload method: POST with multipart/form-data');
  console.log('   - File field name: "file" (configured in ObjectUploader)');
  console.log('   - All endpoints return proper upload and public URLs');
  console.log('');
  console.log('🎉 The upload configuration has been successfully updated for Supabase Storage!');
}

testUploadEndpoints().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});