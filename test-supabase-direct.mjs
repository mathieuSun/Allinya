#!/usr/bin/env node

/**
 * Direct test of Supabase responses to debug snake_case issues
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://tkswishecwcllxgyhqox.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSupabaseResponse() {
  console.log('=== Testing Supabase Direct Response ===\n');
  
  try {
    // Test 1: Get a profile directly from Supabase
    console.log('Fetching profile from Supabase...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    
    console.log('\n📥 Raw Supabase Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check for snake_case keys
    console.log('\n🔍 Key Analysis:');
    for (const key in data) {
      if (key.includes('_')) {
        console.log(`  ❌ Snake_case key found: ${key}`);
      } else {
        console.log(`  ✅ CamelCase key: ${key}`);
      }
    }
    
    // Test 2: Check database column names
    console.log('\n📊 Database Column Names:');
    const { data: columns, error: colError } = await supabase.rpc('get_column_names', {
      table_name: 'profiles'
    }).single();
    
    if (colError) {
      console.log('Could not fetch column names (RPC function may not exist)');
    } else {
      console.log(columns);
    }
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testSupabaseResponse();