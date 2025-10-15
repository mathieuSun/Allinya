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

console.log('\n🔍 Testing Practitioner Session API Logic...\n');

async function testAPI() {
  const practitionerId = '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6'; // Chef Mat's ID
  
  console.log('1. Testing getSessionsForPractitioner logic:');
  
  // Simulate what the API does
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      practitioner:profiles!practitioner_id (*),
      guest:profiles!guest_id (*)
    `)
    .eq('practitioner_id', practitionerId)
    .in('phase', ['waiting', 'live'])
    .order('created_at', { ascending: false });
    
  if (error) {
    console.log('❌ Error fetching sessions:', error);
    console.log('\nDetailed error:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Sessions found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('\nSession details:');
      data.forEach(s => {
        console.log(`  - Session ${s.id.substring(0, 8)}...`);
        console.log(`    Phase: ${s.phase}`);
        console.log(`    Created: ${s.created_at}`);
        console.log(`    Guest: ${s.guest?.display_name || 'Unknown'}`);
      });
    }
  }
  
  // Check if the problem is with the 'waiting' vs 'waiting_room' phase name
  console.log('\n2. Checking phase names in database:');
  const { data: phaseCheck } = await supabase
    .from('sessions')
    .select('phase, COUNT(*)', { count: 'exact' })
    .limit(10);
    
  if (phaseCheck) {
    const phaseCounts = {};
    for (const row of phaseCheck) {
      if (!phaseCounts[row.phase]) phaseCounts[row.phase] = 0;
      phaseCounts[row.phase]++;
    }
    console.log('Phase distribution:');
    Object.entries(phaseCounts).forEach(([phase, count]) => {
      console.log(`  ${phase}: ${count} sessions`);
    });
  }
  
  // Try with 'waiting_room' instead
  console.log('\n3. Testing with "waiting_room" phase:');
  const { data: waitingRoomData } = await supabase
    .from('sessions')
    .select(`*`)
    .eq('practitioner_id', practitionerId)
    .in('phase', ['waiting_room', 'live'])
    .order('created_at', { ascending: false });
    
  console.log('Sessions found with "waiting_room":', waitingRoomData?.length || 0);
  
  // Check what phases exist for this practitioner
  console.log('\n4. All sessions for practitioner:');
  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, phase, created_at')
    .eq('practitioner_id', practitionerId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (allSessions) {
    allSessions.forEach(s => {
      console.log(`  - ${s.phase}: ${s.created_at}`);
    });
  }
}

testAPI().then(() => {
  console.log('\n========================================\n');
});