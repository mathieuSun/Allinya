import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUpdate() {
  console.log('Testing practitioners table update...\n');
  
  // Test practitioners table
  const { data, error } = await supabase
    .from('practitioners')
    .update({ is_online: true })
    .eq('user_id', '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6')
    .select()
    .single();
    
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } else {
    console.log('✅ Success! Updated practitioner:', data);
  }
}

testUpdate();
