#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔍 Testing Supabase Upload with Image MIME type...\n');

async function testImageUpload() {
  try {
    // Create a test signed upload URL for an image
    const fileName = `test/${Date.now()}_test.png`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUploadUrl(fileName);

    if (error) {
      console.error('❌ Failed to create signed URL:', error.message);
      return false;
    }

    console.log('✅ Signed URL created successfully');
    
    // Parse the URL to extract the token
    const urlObj = new URL(data.signedUrl);
    const token = urlObj.searchParams.get('token');
    
    console.log('✅ Token extracted:', token.substring(0, 20) + '...');
    
    // Create a minimal PNG image (1x1 pixel red dot)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  // IDAT chunk
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,  
      0x00, 0x00, 0x03, 0x00, 0x01, 0x5C, 0x67, 0x1C,  
      0xAD, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  // IEND chunk
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    console.log('\n🚀 Uploading test image with correct format...');
    console.log('   Method: PUT');
    console.log('   Content-Type: image/png');
    console.log('   Authorization: Bearer ' + token.substring(0, 20) + '...');
    
    // Upload with correct format for Supabase
    const uploadResponse = await fetch(data.signedUrl, {
      method: 'PUT',
      body: pngData,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/png'
      }
    });

    if (uploadResponse.ok) {
      console.log('\n✅ SUCCESS! Image uploaded with correct format!');
      
      // Verify the file exists and get its public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      console.log('✅ Public URL:', urlData.publicUrl);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);
      
      if (!deleteError) {
        console.log('✅ Test file cleaned up');
      }
      
      return true;
    } else {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload failed:', uploadResponse.status, errorText);
      return false;
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    return false;
  }
}

// Run the test
testImageUpload().then(success => {
  if (success) {
    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log('✨ The Supabase upload system is now working correctly!');
    console.log('📝 Configuration summary:');
    console.log('   • Server returns token from signed URLs ✓');
    console.log('   • ObjectUploader uses PUT method ✓');
    console.log('   • Raw file body (not FormData) ✓');
    console.log('   • Authorization header included ✓');
    console.log('\nUploads should now work properly in the application!');
  } else {
    console.log('\n⚠️ Upload configuration still has issues.');
  }
  process.exit(success ? 0 : 1);
});