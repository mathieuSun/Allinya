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

console.log('🔍 Testing Supabase Upload Configuration...\n');

async function testSignedUrl() {
  try {
    // Create a test signed upload URL
    const fileName = `test/${Date.now()}_test.txt`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUploadUrl(fileName);

    if (error) {
      console.error('❌ Failed to create signed URL:', error.message);
      return false;
    }

    if (!data || !data.signedUrl) {
      console.error('❌ No signed URL returned');
      return false;
    }

    console.log('✅ Signed URL created successfully');
    
    // Parse the URL to extract the token
    const urlObj = new URL(data.signedUrl);
    const token = urlObj.searchParams.get('token');
    
    if (!token) {
      console.error('❌ No token found in signed URL');
      console.log('   URL:', data.signedUrl);
      return false;
    }

    console.log('✅ Token found in signed URL');
    console.log('   Token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Verify the upload format requirements
    console.log('\n📋 Correct Supabase Upload Format:');
    console.log('   ✓ Method: PUT (not POST)');
    console.log('   ✓ Body: Raw file binary data (not FormData)');
    console.log('   ✓ Headers: Authorization: Bearer ' + token.substring(0, 20) + '...');
    console.log('   ✓ URL:', urlObj.origin + urlObj.pathname);
    
    // Test with a small file upload using the correct format
    console.log('\n🚀 Testing actual upload with correct format...');
    
    const testContent = 'Test upload content - ' + new Date().toISOString();
    const blob = new Blob([testContent], { type: 'text/plain' });
    
    // This is the CORRECT way to upload to Supabase
    const uploadResponse = await fetch(data.signedUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain'
      }
    });

    if (uploadResponse.ok) {
      console.log('✅ Upload successful with correct format!');
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);
      
      if (!deleteError) {
        console.log('✅ Test file cleaned up');
      }
      
      return true;
    } else {
      console.error('❌ Upload failed:', uploadResponse.status, await uploadResponse.text());
      return false;
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    return false;
  }
}

// Run the test
testSignedUrl().then(success => {
  if (success) {
    console.log('\n✨ Upload configuration is now correct!');
    console.log('The Supabase upload system should work properly.');
  } else {
    console.log('\n⚠️ Upload configuration still has issues.');
  }
  process.exit(success ? 0 : 1);
});