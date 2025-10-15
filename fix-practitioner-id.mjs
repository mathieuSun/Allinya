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

console.log('\n🔍 Finding the Correct Practitioner IDs...\n');

async function findPractitionerIds() {
  // 1. Get all practitioners
  const { data: practitioners, error: practError } = await supabase
    .from('practitioners')
    .select('*');
    
  if (practError) {
    console.log('❌ Error fetching practitioners:', practError);
    return;
  }
  
  console.log('Found practitioners:', practitioners?.length || 0);
  
  // 2. For each practitioner, get their profile
  for (const practitioner of practitioners || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', practitioner.user_id)
      .single();
      
    console.log(`\n👨‍⚕️ Practitioner:`);
    console.log(`  User ID: ${practitioner.user_id}`);
    console.log(`  Display Name: ${profile?.display_name || 'Unknown'}`);
    console.log(`  Role: ${profile?.role}`);
    console.log(`  Online: ${practitioner.online ? '✅' : '❌'}`);
    
    // Check if this practitioner has sessions
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, phase, created_at')
      .eq('practitioner_id', practitioner.user_id)
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (sessions && sessions.length > 0) {
      console.log(`  Recent sessions:`);
      sessions.forEach(s => {
        console.log(`    - ${s.phase} (${s.created_at})`);
      });
    } else {
      console.log(`  No sessions found`);
    }
  }
  
  // 3. Check who has the wrong ID (1a20c2b4-469d-4187-96ff-3e3da2a1d3a6)
  const wrongId = '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6';
  const { data: wrongProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', wrongId)
    .single();
    
  if (wrongProfile) {
    console.log(`\n⚠️  Sessions are being created with practitioner ID: ${wrongId}`);
    console.log(`  This belongs to: ${wrongProfile.display_name || 'Unknown'}`);
    console.log(`  Role: ${wrongProfile.role}`);
    
    // Count sessions with wrong ID
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('practitioner_id', wrongId);
      
    console.log(`  Sessions with this wrong ID: ${count}`);
  }
  
  // 4. Get the correct Chef Mat ID
  const { data: chefProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', 'Chef Mat')
    .single();
    
  if (chefProfile) {
    console.log(`\n✅ The correct Chef Mat ID should be: ${chefProfile.id}`);
    
    // Check if Chef Mat has a practitioner record
    const { data: chefPractitioner } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', chefProfile.id)
      .single();
      
    if (!chefPractitioner) {
      console.log('  ❌ But Chef Mat has NO practitioner record!');
      console.log('  This is why he\'s not seeing sessions!');
    } else {
      console.log('  ✅ Chef Mat has a practitioner record');
    }
  }
}

findPractitionerIds().then(() => {
  console.log('\n========================================\n');
});