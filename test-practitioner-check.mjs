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

console.log('\n🔍 Checking Practitioner Setup...\n');

async function checkPractitioner() {
  // 1. Find Chef Mat's profile
  const { data: chefProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'chefmat2018@gmail.com')
    .single();
    
  if (profileError) {
    console.log('❌ Error fetching Chef Mat profile:', profileError);
    return;
  }
  
  console.log('👨‍⚕️ Chef Mat Profile:');
  console.log('  User ID:', chefProfile.id);
  console.log('  Email:', chefProfile.email);
  console.log('  Role:', chefProfile.role);
  console.log('  Display Name:', chefProfile.display_name);
  
  // 2. Check if practitioner record exists
  const { data: practitioner, error: practError } = await supabase
    .from('practitioners')
    .select('*')
    .eq('user_id', chefProfile.id)
    .single();
    
  if (practError) {
    console.log('\n❌ No practitioner record for Chef Mat!');
    console.log('  Error:', practError.message);
  } else {
    console.log('\n✅ Practitioner Record:');
    console.log('  Online:', practitioner.online ? 'Yes' : 'No');
    console.log('  In Service:', practitioner.in_service ? 'Yes' : 'No');
  }
  
  // 3. Check sessions for Chef Mat
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('practitioner_id', chefProfile.id)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (sessionsError) {
    console.log('\n❌ Error fetching sessions:', sessionsError);
  } else {
    console.log(`\n📋 Sessions for Chef Mat (${chefProfile.id}):`, sessions?.length || 0);
    if (sessions && sessions.length > 0) {
      sessions.forEach(s => {
        console.log(`  - ${s.phase} session created ${s.created_at}`);
      });
    }
  }
  
  // 4. Check if the sessions with wrong practitioner ID
  const { data: wrongSessions } = await supabase
    .from('sessions')
    .select('practitioner_id, COUNT(*)', { count: 'exact' })
    .eq('practitioner_id', '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6')
    .limit(1);
    
  if (wrongSessions && wrongSessions.length > 0) {
    console.log('\n⚠️  Found sessions with practitioner ID: 1a20c2b4-469d-4187-96ff-3e3da2a1d3a6');
    console.log('   This is NOT Chef Mat\'s ID!');
    
    // Check who this practitioner is
    const { data: wrongPractitioner } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6')
      .single();
      
    if (wrongPractitioner) {
      console.log('   This practitioner is:', wrongPractitioner.display_name || wrongPractitioner.email);
    }
  }
}

checkPractitioner().then(() => {
  console.log('\n========================================\n');
});