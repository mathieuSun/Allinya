#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

console.log('\n🔍 Testing Direct Practitioner Query...\n');

async function testPractitioner() {
  const userId = '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6';
  
  console.log('Querying practitioners table for user_id:', userId);
  
  // Try direct query
  const { data, error, count } = await supabase
    .from('practitioners')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);
  
  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Query successful');
    console.log('   Count:', count);
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
  
  // Try single query
  console.log('\nTrying single query...');
  const { data: singleData, error: singleError } = await supabase
    .from('practitioners')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (singleError) {
    console.log('❌ Single query error:', singleError);
  } else {
    console.log('✅ Single query successful:', singleData);
  }
}

testPractitioner().then(() => {
  console.log('\n========================================\n');
});