#!/usr/bin/env node

import fetch from 'node-fetch';

async function testSchemaChanges() {
  const baseURL = 'http://localhost:5000';
  console.log('\n🧪 Testing Schema Changes...\n');
  
  try {
    // Test 1: Check practitioners endpoint returns camelCase
    console.log('1. Testing practitioners endpoint...');
    const practResponse = await fetch(`${baseURL}/api/practitioners`);
    const practitioners = await practResponse.json();
    
    if (practitioners.length > 0) {
      const practitioner = practitioners[0];
      console.log('   Sample practitioner object keys:', Object.keys(practitioner));
      
      // Check for camelCase properties
      const hasCorrectKeys = practitioner.hasOwnProperty('userId') || practitioner.hasOwnProperty('isOnline');
      if (hasCorrectKeys) {
        console.log('   ✅ Practitioner has correct camelCase properties (userId/isOnline)');
      } else {
        console.log('   ⚠️  Practitioner might still be using old property names');
      }
      
      if (practitioner.profile) {
        console.log('   Profile keys:', Object.keys(practitioner.profile));
        if (practitioner.profile.hasOwnProperty('displayName')) {
          console.log('   ✅ Profile has camelCase properties (displayName)');
        }
      }
    } else {
      console.log('   ℹ️  No practitioners in database to verify');
    }
    
    // Test 2: Check profiles endpoint
    console.log('\n2. Testing profiles endpoint...');
    const profilesResponse = await fetch(`${baseURL}/api/profiles`);
    const profiles = await profilesResponse.json();
    
    if (profiles.length > 0) {
      const profile = profiles[0];
      const hasSnakeCase = profile.hasOwnProperty('display_name') || profile.hasOwnProperty('avatar_url');
      const hasCamelCase = profile.hasOwnProperty('displayName') || profile.hasOwnProperty('avatarUrl');
      
      console.log('   Profile uses snake_case:', hasSnakeCase);
      console.log('   Profile uses camelCase:', hasCamelCase);
      
      if (hasCamelCase && !hasSnakeCase) {
        console.log('   ✅ Profile correctly uses camelCase');
      }
    }
    
    console.log('\n✨ Schema test complete!\n');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    process.exit(1);
  }
}

testSchemaChanges();