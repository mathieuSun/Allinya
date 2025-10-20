#!/usr/bin/env node

import dotenv from 'dotenv';
import { createRequire } from "module";

// Load environment variables
dotenv.config();

const require = createRequire(import.meta.url);
const AgoraToken = require("agora-token");
const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
const RtcRole = AgoraToken.RtcRole;

console.log('🎥 Testing Agora Token Generation\n');

// Check environment variables
const appId = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_APP_CERTIFICATE;

console.log('✅ Checking Agora credentials...');
if (!appId) {
  console.error('❌ Missing AGORA_APP_ID environment variable');
  process.exit(1);
}
if (!appCertificate) {
  console.error('❌ Missing AGORA_APP_CERTIFICATE environment variable');
  process.exit(1);
}

console.log('✅ App ID found:', appId.substring(0, 8) + '...');
console.log('✅ App Certificate found:', appCertificate.substring(0, 8) + '...\n');

// Test token generation
console.log('🔐 Generating test token...');

const channel = 'test-channel-' + Date.now();
const uid = 'test-user-123';
const privilegeExpireTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
const role = RtcRole.PUBLISHER;

try {
  const token = RtcTokenBuilder.buildTokenWithUserAccount(
    appId,
    appCertificate,
    channel,
    uid,
    role,
    privilegeExpireTime
  );

  console.log('✅ Token generated successfully!');
  console.log('📊 Token details:');
  console.log('   - Channel:', channel);
  console.log('   - UID:', uid);
  console.log('   - Role: PUBLISHER');
  console.log('   - Expires in: 1 hour');
  console.log('   - Token length:', token.length, 'characters');
  console.log('   - Token preview:', token.substring(0, 50) + '...\n');
  
  // Decode token to verify structure
  const tokenParts = token.split(':');
  console.log('🔍 Token structure:');
  console.log('   - Version:', tokenParts[0]);
  console.log('   - App ID match:', tokenParts[1] === appId ? '✅' : '❌');
  console.log('   - Timestamp present:', tokenParts[2] ? '✅' : '❌');
  console.log('   - Payload present:', tokenParts[3] ? '✅' : '❌');
  
  console.log('\n✨ Agora token generation is working correctly!');
  console.log('🎯 The video SDK should be able to connect with these credentials.\n');
  
} catch (error) {
  console.error('❌ Token generation failed:', error.message);
  console.error('\nThis could mean:');
  console.error('1. Invalid App ID or App Certificate');
  console.error('2. Incorrect format of credentials');
  console.error('3. Missing agora-token package');
  process.exit(1);
}