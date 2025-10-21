import { createClient } from '@supabase/supabase-js';

// Test different approaches to handle camelCase columns
const supabase = createClient(
  'https://tkswishecwcllxgyhqox.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public'
    }
  }
);

async function testApproaches() {
  console.log('Testing different approaches to handle camelCase columns...\n');
  
  // Approach 1: Try raw SQL via postgrest
  console.log('1. Testing direct practitioners table with default query:');
  try {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Data:', data);
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Approach 2: Try with explicit column names (no quotes)
  console.log('\n2. Testing with explicit column names (no quotes):');
  try {
    const { data, error } = await supabase
      .from('practitioners')
      .select('userId, isOnline, inService, rating')
      .limit(1);
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Data:', data);
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Approach 3: Test if schema cache is the issue by checking tables
  console.log('\n3. Checking what tables PostgREST sees:');
  try {
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      console.log('   Error checking tables:', error.message);
    } else {
      console.log('   Tables found:', data?.map(t => t.tablename).join(', '));
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Approach 4: Test view access
  console.log('\n4. Testing practitioners_view:');
  try {
    const { data, error } = await supabase
      .from('practitioners_view')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Data:', data);
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
  
  // Approach 5: Test with transforming keys
  console.log('\n5. Testing if using snake_case query on camelCase table works:');
  try {
    const { data, error } = await supabase
      .from('practitioners')
      .select('user_id, is_online, in_service')
      .limit(1);
    
    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Success! Data:', data);
    }
  } catch (e) {
    console.log('   Exception:', e.message);
  }
}

testApproaches();