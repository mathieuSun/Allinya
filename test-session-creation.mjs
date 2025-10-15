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

console.log('\n🔍 Checking Production Session Creation...\n');

async function checkSessions() {
  // 1. Check if any sessions exist
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (sessionsError) {
    console.log('❌ Error fetching sessions:', sessionsError);
    return;
  }
  
  console.log('📊 Recent sessions in database:', sessions.length);
  if (sessions.length > 0) {
    sessions.forEach(s => {
      console.log(`  - Session ${s.id}:`);
      console.log(`    Phase: ${s.phase}`);
      console.log(`    Agora Channel: ${s.agora_channel || '❌ MISSING'}`);
      console.log(`    Created: ${s.created_at}`);
      console.log(`    Guest ID: ${s.guest_id}`);
      console.log(`    Practitioner ID: ${s.practitioner_id}`);
      console.log('');
    });
  } else {
    console.log('  ❌ No sessions found in database!');
  }
  
  // 2. Check if practitioner is online
  const { data: practitioner, error: practError } = await supabase
    .from('practitioners')
    .select('*')
    .eq('id', '47e8c6e8-6146-489f-8e58-39bc06c66666') // Chef Mat's ID
    .single();
    
  if (practError) {
    console.log('❌ Error fetching practitioner:', practError);
  } else {
    console.log(`\n👨‍⚕️ Practitioner Status (Chef Mat):`);
    console.log(`  Online: ${practitioner.is_online ? '✅ Yes' : '❌ No'}`);
    console.log(`  Last Active: ${practitioner.updated_at}`);
  }
  
  // 3. Check for sessions in waiting or live state
  const { data: activeSessions, error: activeError } = await supabase
    .from('sessions')
    .select('*')
    .in('phase', ['waiting_room', 'live'])
    .order('created_at', { ascending: false });
    
  if (!activeError) {
    console.log(`\n📺 Active Sessions (waiting/live): ${activeSessions.length}`);
    activeSessions.forEach(s => {
      console.log(`  - ${s.phase}: Created ${s.created_at}`);
    });
  }
}

checkSessions().then(() => {
  console.log('\n========================================\n');
});