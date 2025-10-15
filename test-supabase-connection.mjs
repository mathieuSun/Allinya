#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Load the secrets
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Testing Supabase Connection...\n');

// Check if secrets exist
console.log('1. Checking if secrets are configured:');
console.log('   SUPABASE_URL:', SUPABASE_URL ? `✅ Set (${SUPABASE_URL.substring(0, 30)}...)` : '❌ Missing');
console.log('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `✅ Set (${SUPABASE_ANON_KEY.substring(0, 20)}...)` : '❌ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? `✅ Set (${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...)` : '❌ Missing');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ Missing required environment variables!');
  process.exit(1);
}

async function testConnection() {
  console.log('\n2. Testing ANON KEY (frontend auth):');
  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await anonClient.from('profiles').select('id').limit(1);
    if (error) {
      console.log('   ❌ ANON KEY failed:', error.message);
    } else {
      console.log('   ✅ ANON KEY works! Can read public data');
    }
  } catch (err) {
    console.log('   ❌ ANON KEY error:', err.message);
  }

  console.log('\n3. Testing SERVICE ROLE KEY (backend operations):');
  try {
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Test reading from sessions table (requires service role)
    const { data, error } = await serviceClient
      .from('sessions')
      .select('id')
      .limit(1);
      
    if (error) {
      console.log('   ❌ SERVICE ROLE KEY failed:', error.message);
      console.log('      This is why sessions cannot be created!');
    } else {
      console.log('   ✅ SERVICE ROLE KEY works! Can perform backend operations');
    }
  } catch (err) {
    console.log('   ❌ SERVICE ROLE KEY error:', err.message);
  }

  console.log('\n4. Testing if keys match the database:');
  try {
    // Extract project ID from URL
    const urlMatch = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (urlMatch) {
      const projectId = urlMatch[1];
      console.log('   Project ID from URL:', projectId);
      
      // The project ID should be in your keys as well
      if (SUPABASE_ANON_KEY.includes('eyJ') && SUPABASE_SERVICE_ROLE_KEY.includes('eyJ')) {
        console.log('   ✅ Keys appear to be JWT tokens (correct format)');
        
        // Test if we can actually create a session
        console.log('\n5. Testing session creation capability:');
        const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        
        // Try to fetch practitioners to simulate what happens during session creation
        const { data: practitioner, error: practError } = await serviceClient
          .from('practitioners')
          .select('*')
          .limit(1)
          .single();
          
        if (practError) {
          console.log('   ❌ Cannot read practitioners table:', practError.message);
        } else {
          console.log('   ✅ Can read practitioners table');
        }
        
        // Now test actual session creation
        console.log('\n6. Testing actual session INSERT:');
        const testSession = {
          guest_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
          practitioner_id: '00000000-0000-0000-0000-000000000001', // Fake UUID
          phase: 'waiting_room',
          live_seconds: 300
        };
        
        const { data: sessionData, error: sessionError } = await serviceClient
          .from('sessions')
          .insert(testSession)
          .select()
          .single();
          
        if (sessionError) {
          console.log('   ❌ Cannot INSERT into sessions:', sessionError.message);
          console.log('      Error details:', JSON.stringify(sessionError, null, 2));
        } else {
          console.log('   ✅ Successfully created test session!');
          // Clean up the test session
          await serviceClient.from('sessions').delete().eq('id', sessionData.id);
          console.log('   ✅ Test session cleaned up');
        }
      } else {
        console.log('   ❌ Keys do not appear to be valid JWT tokens');
      }
    }
  } catch (err) {
    console.log('   Error checking key format:', err.message);
  }
}

testConnection().then(() => {
  console.log('\n========================================');
  console.log('Test complete! Check the results above.');
  console.log('If SERVICE ROLE KEY fails, that\'s why sessions aren\'t being created.');
  console.log('========================================\n');
});