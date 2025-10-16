import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('Checking practitioners table schema...\n');
  
  // Get a sample row to see structure
  const { data, error } = await supabase
    .from('practitioners')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('❌ Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ Practitioners table columns:');
    console.log(Object.keys(data[0]));
    console.log('\nSample data:', data[0]);
  } else {
    console.log('No data found in practitioners table');
  }
}

checkSchema();
