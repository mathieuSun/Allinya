#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧹 Cleaning up sessions for practitioner chefmat2018@gmail.com\n');
console.log('=========================================================\n');

async function cleanupPractitionerSessions() {
  try {
    // Step 1: Find the practitioner by email using auth admin API
    console.log('1️⃣ Finding practitioner by email...');
    
    // Use Supabase auth admin to find user by email
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError);
      return;
    }
    
    const authUser = users?.find(u => u.email === 'chefmat2018@gmail.com');
    
    if (!authUser) {
      console.error('❌ No auth user found for chefmat2018@gmail.com');
      return;
    }
    
    console.log('✅ Found auth user:');
    console.log('   Auth ID:', authUser.id);
    console.log('   Email:', authUser.email);
    
    // Now get the profile for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', authUser.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error finding practitioner profile:', profileError);
      return;
    }
    
    if (!profile) {
      console.error('❌ No profile found for user ID:', authUser.id);
      return;
    }
    
    console.log('✅ Found practitioner profile:');
    console.log('   Profile ID:', profile.id);
    console.log('   Display Name:', profile.display_name);
    console.log('   Role:', profile.role);
    console.log();
    
    // Step 2: Find all pending sessions for this practitioner
    console.log('2️⃣ Finding pending sessions...');
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('practitioner_id', profile.id)
      .in('phase', ['waiting', 'room_timer', 'live']);
    
    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
      return;
    }
    
    if (!sessions || sessions.length === 0) {
      console.log('✅ No pending sessions found for this practitioner');
      console.log();
    } else {
      console.log(`📋 Found ${sessions.length} active/pending session(s):`);
      sessions.forEach(session => {
        console.log(`   - Session ${session.id}`);
        console.log(`     Phase: ${session.phase}`);
        console.log(`     Created: ${new Date(session.created_at).toLocaleString()}`);
        console.log(`     Duration: ${session.live_seconds}s`);
      });
      console.log();
      
      // Step 3: End all these sessions
      console.log('3️⃣ Ending all pending sessions...');
      
      for (const session of sessions) {
        // Just update the phase to 'ended' - don't touch ended_at to avoid cache issues
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            phase: 'ended'
          })
          .eq('id', session.id);
        
        if (updateError) {
          console.error(`   ❌ Failed to end session ${session.id}:`, updateError);
        } else {
          console.log(`   ✅ Ended session ${session.id}`);
        }
      }
      console.log();
    }
    
    // Step 4: Ensure practitioner is marked as not in service
    console.log('4️⃣ Updating practitioner status...');
    
    const { data: practitioner, error: practError } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', profile.id)
      .single();
    
    if (practError) {
      console.error('❌ Error fetching practitioner record:', practError);
    } else if (practitioner) {
      const { error: updatePractError } = await supabase
        .from('practitioners')
        .update({ in_service: false })
        .eq('user_id', profile.id);
      
      if (updatePractError) {
        console.error('❌ Failed to update practitioner status:', updatePractError);
      } else {
        console.log('✅ Practitioner marked as not in service');
      }
    }
    
    console.log();
    console.log('========================================');
    console.log('✨ CLEANUP COMPLETE');
    console.log('========================================');
    console.log();
    console.log('Summary:');
    console.log('- All pending sessions for chefmat2018@gmail.com have been ended');
    console.log('- Practitioner is marked as not in service');
    console.log('- The practitioner can now receive new session requests');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
cleanupPractitionerSessions();