import { createClient } from '@supabase/supabase-js';

// Test RPC functions directly
const supabase = createClient(
  'https://tkswishecwcllxgyhqox.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testRPCFunctions() {
  console.log('Testing RPC functions directly...\n');
  
  // Test 1: Try calling with empty object
  console.log('1. Testing get_all_practitioners with empty object:');
  try {
    const { data, error } = await supabase
      .rpc('get_all_practitioners', {});
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Retrieved', data?.length, 'practitioners');
      if (data?.length > 0) {
        console.log('   First practitioner:', data[0]);
      }
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Test 2: Try calling without parameters
  console.log('\n2. Testing get_all_practitioners without parameters:');
  try {
    const { data, error } = await supabase
      .rpc('get_all_practitioners');
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Retrieved', data?.length, 'practitioners');
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Test 3: Try a function with parameters
  console.log('\n3. Testing get_practitioner_by_user_id:');
  try {
    // Use a test user ID
    const testUserId = '11111111-1111-1111-1111-111111111111';
    const { data, error } = await supabase
      .rpc('get_practitioner_by_user_id', { p_user_id: testUserId });
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Retrieved:', data);
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Test 4: Try get_online_practitioners
  console.log('\n4. Testing get_online_practitioners:');
  try {
    const { data, error } = await supabase
      .rpc('get_online_practitioners');
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Retrieved', data?.length, 'online practitioners');
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Test 5: Force schema reload by reconnecting
  console.log('\n5. Attempting to force schema reload...');
  const newSupabase = createClient(
    'https://tkswishecwcllxgyhqox.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
    {
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'x-pgrst-cache': 'no-cache'
        }
      }
    }
  );
  
  try {
    const { data, error } = await newSupabase
      .rpc('get_all_practitioners');
    
    if (error) {
      console.log('   Still error after reload attempt:', error.message);
    } else {
      console.log('   Success after reload! Retrieved', data?.length, 'practitioners');
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
}

testRPCFunctions();