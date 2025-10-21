import { createClient } from '@supabase/supabase-js';

// Test with raw SQL to bypass PostgREST conversion
const supabase = createClient(
  'https://tkswishecwcllxgyhqox.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function testRawQuery() {
  console.log('Testing raw SQL query...\n');
  
  // Test 1: Direct RPC call with raw SQL
  try {
    const { data, error } = await supabase.rpc('get_practitioners_raw', {
      sql_query: 'SELECT * FROM practitioners ORDER BY "isOnline" DESC LIMIT 5'
    });
    
    if (error) {
      console.log('RPC query error:', error);
    } else {
      console.log('RPC query success:', data);
    }
  } catch (e) {
    console.log('RPC not available, trying different approach');
  }
  
  // Test 2: Try with different quoting methods
  console.log('\nTesting different quote methods:');
  
  // Method 1: Double quotes in select
  try {
    const { data, error } = await supabase
      .from('practitioners')
      .select('"userId", "isOnline", "inService"')
      .limit(1);
    
    console.log('Method 1 (quoted select):', error ? error.message : 'Success!');
    if (data) console.log('  Data:', data);
  } catch (e) {
    console.log('Method 1 failed:', e.message);
  }
  
  // Method 2: No quotes, let it fail to see exact error
  try {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('isOnline', true)
      .limit(1);
    
    console.log('Method 2 (no quotes):', error ? error.message : 'Success!');
    if (data) console.log('  Data:', data);
  } catch (e) {
    console.log('Method 2 failed:', e.message);
  }
  
  // Method 3: Escaped quotes
  try {
    const { data, error } = await supabase
      .from('practitioners')
      .select('*')
      .eq('\\"isOnline\\"', true)
      .limit(1);
    
    console.log('Method 3 (escaped quotes):', error ? error.message : 'Success!');
    if (data) console.log('  Data:', data);
  } catch (e) {
    console.log('Method 3 failed:', e.message);
  }
}

testRawQuery();