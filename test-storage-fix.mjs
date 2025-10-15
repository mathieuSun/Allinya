#!/usr/bin/env node

/**
 * Test script to verify Supabase Storage RLS fix
 * Run this after applying fix-storage-rls.sql to verify uploads work
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testStorageFix() {
  console.log('🧪 Testing Supabase Storage RLS Fix...\n');

  try {
    // Step 1: Authenticate as a test user
    const testEmail = 'cheekyma@hotmail.com'; // Guest user
    const testPassword = 'password123'; // You'll need the actual password
    
    console.log(`1. Authenticating as ${testEmail}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('\nPlease update the test credentials in the script.');
      return;
    }

    const userId = authData.user.id;
    console.log(`✅ Authenticated successfully. User ID: ${userId}\n`);

    // Step 2: Test uploading to each bucket
    const buckets = ['avatars', 'gallery', 'videos'];
    const testFile = new Blob(['Test content for RLS fix'], { type: 'text/plain' });
    
    for (const bucket of buckets) {
      console.log(`2. Testing upload to '${bucket}' bucket...`);
      
      const fileName = `${userId}/test-${Date.now()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, testFile, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) {
        console.error(`❌ Upload to ${bucket} failed:`, uploadError.message);
        console.log('   This indicates RLS policies need to be fixed.\n');
      } else {
        console.log(`✅ Upload to ${bucket} successful!`);
        console.log(`   File path: ${uploadData.path}`);
        
        // Test reading the file
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        console.log(`   Public URL: ${urlData.publicUrl}`);
        
        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([fileName]);
        
        if (!deleteError) {
          console.log(`   ✅ Test file cleaned up successfully\n`);
        }
      }
    }

    // Step 3: Test public read access (without auth)
    console.log('3. Testing public read access...');
    
    // Create a new client without auth
    const publicSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Try to list files in a bucket (should work for public buckets)
    const { data: listData, error: listError } = await publicSupabase.storage
      .from('avatars')
      .list();

    if (listError) {
      console.log('⚠️  Public listing blocked (this is expected for security)');
    } else {
      console.log('✅ Public bucket is accessible');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Storage RLS test complete!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. If any tests failed, run the SQL script in Supabase:');
    console.log('   - Go to Supabase Dashboard > SQL Editor');
    console.log('   - Copy contents of server/fix-storage-rls.sql');
    console.log('   - Run the script');
    console.log('2. Re-run this test to verify the fix worked');
    console.log('3. Test file uploads from the application UI');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }

  // Sign out
  await supabase.auth.signOut();
}

// Run the test
testStorageFix().catch(console.error);