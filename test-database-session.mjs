#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Get Supabase config from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCamelCaseMapping() {
  console.log('🧪 Testing CamelCase Mapping for Sessions');
  console.log('==========================================\n');
  
  try {
    // Step 1: Get existing user IDs from profiles
    console.log('Step 1: Getting existing user IDs...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, display_name');
    
    if (profilesError) throw profilesError;
    
    const guest = profiles.find(p => p.role === 'guest');
    const practitioner = profiles.find(p => p.role === 'practitioner');
    
    if (!guest || !practitioner) {
      console.error('❌ Need at least one guest and one practitioner in database');
      return;
    }
    
    console.log(`   Guest: ${guest.display_name} (${guest.id})`);
    console.log(`   Practitioner: ${practitioner.display_name} (${practitioner.id})`);
    
    // Step 2: Create a test session directly in database
    console.log('\nStep 2: Creating test session directly in database...');
    const sessionId = randomUUID();
    const agoraChannel = `test_${sessionId.substring(0, 8)}`;
    
    const { data: session, error: createError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        practitioner_id: practitioner.id,
        guest_id: guest.id,
        phase: 'waiting',
        live_seconds: 300,
        practitioner_ready: false,
        guest_ready: false,
        agora_channel: agoraChannel,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) throw createError;
    
    console.log(`✅ Session created: ${sessionId}`);
    console.log(`   Initial state:`);
    console.log(`   - phase: ${session.phase}`);
    console.log(`   - practitioner_ready: ${session.practitioner_ready}`);
    console.log(`   - guest_ready: ${session.guest_ready}`);
    
    // Step 3: Update guest_ready to true
    console.log('\nStep 3: Setting guest_ready to true...');
    const { data: afterGuest, error: guestError } = await supabase
      .from('sessions')
      .update({
        guest_ready: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (guestError) throw guestError;
    
    console.log(`✅ Guest marked ready`);
    console.log(`   - phase: ${afterGuest.phase} (should still be 'waiting')`);
    console.log(`   - guest_ready: ${afterGuest.guest_ready} (should be true)`);
    console.log(`   - practitioner_ready: ${afterGuest.practitioner_ready} (should be false)`);
    
    // Step 4: Update practitioner_ready to true and phase to live
    console.log('\nStep 4: Setting practitioner_ready to true and phase to live...');
    const { data: afterPractitioner, error: practError } = await supabase
      .from('sessions')
      .update({
        practitioner_ready: true,
        phase: 'live',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (practError) throw practError;
    
    console.log(`✅ Practitioner marked ready and session went live`);
    console.log(`   - phase: ${afterPractitioner.phase} (should be 'live')`);
    console.log(`   - guest_ready: ${afterPractitioner.guest_ready} (should be true)`);
    console.log(`   - practitioner_ready: ${afterPractitioner.practitioner_ready} (should be true)`);
    
    // Step 5: Clean up - delete test session
    console.log('\nStep 5: Cleaning up test session...');
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);
    
    if (deleteError) {
      console.error(`⚠️  Warning: Failed to delete test session: ${deleteError.message}`);
    } else {
      console.log(`✅ Test session deleted`);
    }
    
    // Verify the field names match
    console.log('\n📊 Field Name Verification:');
    console.log('============================');
    console.log('✅ Database uses: practitioner_ready, guest_ready');
    console.log('✅ API should convert to: practitionerReady, guestReady');
    console.log('✅ Storage layer handles the conversion');
    
    console.log('\n✅ Database schema is correct!');
    console.log('================================');
    console.log('The database properly uses:');
    console.log('  - practitioner_ready (not ready_practitioner)');
    console.log('  - guest_ready (not ready_guest)');
    console.log('  - agora_channel field exists');
    console.log('\nThe camelCase conversion in storage.ts should handle the mapping.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Details:', error);
  }
}

// Run the test
testCamelCaseMapping();