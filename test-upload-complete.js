import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'chefmat2018@gmail.com';
const TEST_PASSWORD = 'Rickrick01';

async function testCompleteUpload() {
  try {
    console.log('🚀 FINAL SUPABASE UPLOAD TEST\n');
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
    
    // Step 2: Get avatar upload credentials
    console.log('📸 Step 2: Getting avatar upload credentials...');
    const avatarResponse = await fetch(`${BASE_URL}/api/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const avatarData = await avatarResponse.json();
    console.log('Upload credentials received:', {
      hasUploadUrl: !!avatarData.uploadUrl,
      hasToken: !!avatarData.token,
      publicUrl: avatarData.publicUrl
    });
    
    if (!avatarData.uploadUrl || !avatarData.token) {
      throw new Error('Missing upload URL or token');
    }
    
    // Step 3: Create a test image (1x1 red pixel GIF)
    console.log('\n📦 Step 3: Creating test image...');
    const testImage = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
      0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3b
    ]);
    console.log('✅ Test image created (1x1 red pixel GIF)\n');
    
    // Step 4: Upload using PUT with Authorization header
    console.log('📤 Step 4: Uploading to Supabase Storage...');
    console.log('   Method: PUT');
    console.log('   Headers: Authorization Bearer token');
    console.log('   Body: Raw file bytes\n');
    
    const uploadResponse = await fetch(avatarData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${avatarData.token}`,
        'Content-Type': 'image/gif'
      },
      body: testImage
    });
    
    console.log('Upload Response:');
    console.log('   Status:', uploadResponse.status);
    console.log('   Status Text:', uploadResponse.statusText);
    
    if (uploadResponse.ok) {
      console.log('\n✅ SUCCESS! File uploaded to Supabase Storage!');
      console.log('🔗 File accessible at:', avatarData.publicUrl);
      console.log('\n📌 INSTRUCTIONS:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to Storage > avatars bucket');
      console.log('3. You should see the uploaded file');
      console.log('4. Try uploading through the profile page UI now!\n');
    } else {
      const errorText = await uploadResponse.text();
      console.error('\n❌ Upload failed with status:', uploadResponse.status);
      console.error('Error:', errorText);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testCompleteUpload();