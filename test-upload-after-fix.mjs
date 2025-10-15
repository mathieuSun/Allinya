import fs from 'fs';

// Create a small test image
const testImagePath = 'test-image.png';
const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(testImagePath, imageBuffer);

async function testUploadAfterFix() {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🧪 TESTING UPLOADS AFTER RLS FIX');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Login to get auth token
    console.log('\n📋 STEP 1: Logging in as practitioner...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'chefmat2018@gmail.com', 
        password: 'Rickrick01' 
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${await loginRes.text()}`);
    }
    
    const loginData = await loginRes.json();
    const supabaseToken = loginData.session?.access_token;
    
    if (!supabaseToken) {
      throw new Error('No Supabase token received from login!');
    }
    
    console.log('✅ Login successful');
    console.log('   Token length:', supabaseToken.length);
    
    // Step 2: Test upload to each bucket
    const buckets = ['avatars', 'gallery', 'videos'];
    const supabaseUrl = 'https://tkswishecwcllxgyhqox.supabase.co';
    
    console.log('\n📋 STEP 2: Testing uploads to each bucket...');
    
    for (const bucket of buckets) {
      const fileName = `test-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      console.log(`\nTesting ${bucket} bucket...`);
      
      // Direct Supabase upload
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseToken}`,
          'Content-Type': 'image/png'
        },
        body: imageBuffer
      });
      
      console.log(`   Upload status: ${uploadRes.status}`);
      
      if (uploadRes.ok) {
        console.log(`   ✅ Upload to ${bucket} SUCCESSFUL!`);
        
        // Test public access
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
        const checkRes = await fetch(publicUrl);
        console.log(`   Public access: ${checkRes.ok ? '✅ Working' : '❌ Not accessible'}`);
        
        // Clean up - delete test file
        const deleteRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseToken}`
          }
        });
        console.log(`   Cleanup: ${deleteRes.ok ? '✅ Deleted test file' : '⚠️ Could not delete'}`);
      } else {
        const error = await uploadRes.text();
        console.log(`   ❌ Upload to ${bucket} FAILED: ${error}`);
      }
    }
    
    // Step 3: Test backend upload endpoint
    console.log('\n📋 STEP 3: Testing backend upload endpoint...');
    
    const backendFileName = `backend-test-${Date.now()}.png`;
    const backendUploadRes = await fetch(`${BASE_URL}/api/objects/upload`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${supabaseToken}`,
        'Content-Type': 'image/png',
        'x-bucket-name': 'avatars',
        'x-file-name': backendFileName
      },
      body: imageBuffer
    });
    
    console.log(`Backend upload status: ${backendUploadRes.status}`);
    
    if (backendUploadRes.ok) {
      const result = await backendUploadRes.json();
      console.log('✅ Backend upload endpoint WORKING!');
      console.log(`   Public URL: ${result.publicUrl}`);
    } else {
      console.log(`❌ Backend upload failed: ${await backendUploadRes.text()}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nIf all uploads show ✅, your storage is fully working!');
    console.log('If you see ❌, check the error messages above.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
}

testUploadAfterFix();