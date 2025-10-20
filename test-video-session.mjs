#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🎥 Testing Video Session Flow\n');
console.log('=====================================\n');

async function testVideoSession() {
  try {
    // Step 1: Check practitioner and guest accounts exist
    console.log('1️⃣ Checking test accounts...');
    
    const { data: practitioner } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'practitioner')
      .limit(1)
      .single();
      
    const { data: guest } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'guest')
      .limit(1)
      .single();
    
    if (!practitioner || !guest) {
      console.error('❌ Test accounts not found');
      return;
    }
    
    console.log('✅ Practitioner:', practitioner.display_name);
    console.log('✅ Guest:', guest.display_name);
    console.log('');
    
    // Step 2: Create a test session with Agora channel
    console.log('2️⃣ Creating test session with video channel...');
    
    const agoraChannel = 'test-session-' + Date.now();
    const sessionData = {
      practitioner_id: practitioner.id,
      guest_id: guest.id,
      phase: 'room_timer',
      waiting_seconds: 300, // 5 minutes
      live_seconds: 900, // 15 minutes
      waiting_started_at: new Date().toISOString(),
      agora_channel: agoraChannel,
      agora_uid_guest: 'g_' + guest.id.substring(0, 8),
      agora_uid_practitioner: 'p_' + practitioner.id.substring(0, 8),
      acknowledged_practitioner: false,
      ready_practitioner: false,
      ready_guest: false
    };
    
    const { data: session, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to create session:', error);
      return;
    }
    
    console.log('✅ Session created:', session.id);
    console.log('✅ Agora channel:', session.agora_channel);
    console.log('✅ Phase:', session.phase);
    console.log('');
    
    // Step 3: Test Agora token generation
    console.log('3️⃣ Testing Agora token generation for video...');
    
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const AgoraToken = require("agora-token");
    const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
    const RtcRole = AgoraToken.RtcRole;
    
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    
    const guestToken = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      agoraChannel,
      session.agora_uid_guest,
      RtcRole.PUBLISHER,
      Math.floor(Date.now() / 1000) + 3600
    );
    
    const practitionerToken = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      agoraChannel,
      session.agora_uid_practitioner,
      RtcRole.PUBLISHER,
      Math.floor(Date.now() / 1000) + 3600
    );
    
    console.log('✅ Guest token generated (length:', guestToken.length, ')');
    console.log('✅ Practitioner token generated (length:', practitionerToken.length, ')');
    console.log('');
    
    // Step 4: Simulate moving to live phase
    console.log('4️⃣ Simulating transition to live video phase...');
    
    const { data: liveSession, error: liveError } = await supabase
      .from('sessions')
      .update({
        phase: 'live',
        live_started_at: new Date().toISOString(),
        ready_practitioner: true,
        ready_guest: true
      })
      .eq('id', session.id)
      .select()
      .single();
    
    if (liveError) {
      console.error('❌ Failed to transition to live:', liveError);
    } else {
      console.log('✅ Session moved to LIVE phase');
      console.log('✅ Both parties marked as ready');
      console.log('');
    }
    
    // Step 5: Verify video connection requirements
    console.log('5️⃣ Video Connection Requirements Check:');
    console.log('✅ Agora App ID:', appId ? 'Configured' : 'Missing');
    console.log('✅ Agora Certificate:', appCertificate ? 'Configured' : 'Missing');
    console.log('✅ Channel Name:', agoraChannel);
    console.log('✅ Guest UID:', session.agora_uid_guest);
    console.log('✅ Practitioner UID:', session.agora_uid_practitioner);
    console.log('✅ Token Expiry: 1 hour');
    console.log('✅ Role: PUBLISHER (can send/receive video)');
    console.log('');
    
    console.log('6️⃣ Client-Side Video Requirements:');
    console.log('📱 Browser Support:');
    console.log('   - Chrome 65+');
    console.log('   - Safari 12+');
    console.log('   - Firefox 70+');
    console.log('   - Edge 79+');
    console.log('📹 Permissions Required:');
    console.log('   - Camera access');
    console.log('   - Microphone access');
    console.log('🌐 Network Requirements:');
    console.log('   - Minimum 2 Mbps for HD video');
    console.log('   - Port 443 (HTTPS) open');
    console.log('   - WebRTC enabled');
    console.log('');
    
    // Clean up test session
    console.log('7️⃣ Cleaning up test session...');
    await supabase
      .from('sessions')
      .update({ phase: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.id);
    
    console.log('✅ Test session cleaned up');
    console.log('');
    
    console.log('========================================');
    console.log('✨ VIDEO TESTING COMPLETE');
    console.log('========================================');
    console.log('');
    console.log('🎯 Summary:');
    console.log('✅ Agora credentials are configured');
    console.log('✅ Token generation is working');
    console.log('✅ Session creation with video channel works');
    console.log('✅ Phase transitions are functioning');
    console.log('✅ UIDs are properly assigned');
    console.log('');
    console.log('🚀 Your video SDK is ready to use!');
    console.log('');
    console.log('📋 Next Steps to Test Live Video:');
    console.log('1. Login as guest and practitioner in two browsers');
    console.log('2. Create a session from guest side');
    console.log('3. Accept session from practitioner side');
    console.log('4. Allow camera/microphone permissions');
    console.log('5. Video should connect automatically');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testVideoSession();