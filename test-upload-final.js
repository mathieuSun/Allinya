import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'chefmat2018@gmail.com';
const TEST_PASSWORD = 'Rickrick01';

async function testUploadToSupabase() {
  try {
    console.log('🚀 Testing Supabase Storage Upload\n');
    
    // Step 1: Login
    console.log('📝 Logging in...');
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
    
    // Step 2: Get upload URL
    console.log('📸 Getting avatar upload URL...');
    const uploadResponse = await fetch(`${BASE_URL}/api/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const uploadData = await uploadResponse.json();
    console.log('✅ Got upload URL:', uploadData.publicUrl);
    
    // Step 3: Create a test file
    const testImageBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
      0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3b
    ]);
    
    // Step 4: Upload file using POST with FormData
    console.log('\n📤 Uploading file to Supabase Storage...');
    const formData = new FormData();
    const blob = new Blob([testImageBuffer], { type: 'image/gif' });
    formData.append('file', blob, 'test.gif');
    
    const uploadToSupabase = await fetch(uploadData.uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    console.log('Upload Response Status:', uploadToSupabase.status);
    console.log('Upload Response OK:', uploadToSupabase.ok);
    
    if (uploadToSupabase.ok) {
      console.log('✅ File uploaded successfully to Supabase!');
      console.log('🔗 File should be accessible at:', uploadData.publicUrl);
      console.log('\n🎉 SUCCESS! Check your Supabase Storage dashboard');
      console.log('   The file should be in the "avatars" bucket');
    } else {
      const error = await uploadToSupabase.text();
      console.error('❌ Upload failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUploadToSupabase();