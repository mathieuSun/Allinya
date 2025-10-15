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

console.log('\n🔍 Finding the Practitioner Auth Details...\n');

async function findAuth() {
  // The practitioner ID that has all the sessions
  const practitionerId = '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6';
  
  // Get the auth user details using service role
  const { data: { user }, error } = await supabase.auth.admin.getUserById(practitionerId);
  
  if (error) {
    console.log('❌ Error fetching auth user:', error);
  } else if (user) {
    console.log('✅ Found the practitioner account:');
    console.log('  Email:', user.email);
    console.log('  ID:', user.id);
    console.log('  Created:', user.created_at);
    console.log('\n📱 Use these credentials to login:');
    console.log('  Email:', user.email);
    console.log('  Password: Rickrick01 (or whatever password you set)');
  }
  
  // Also check the other test email
  console.log('\n\nChecking chefmat2018@gmail.com...');
  const { data: { users: chefUsers } } = await supabase.auth.admin.listUsers();
  
  const chefUser = chefUsers?.find(u => u.email === 'chefmat2018@gmail.com');
  if (chefUser) {
    console.log('Found chefmat2018@gmail.com:');
    console.log('  ID:', chefUser.id);
    
    // Check if this user has a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', chefUser.id)
      .single();
      
    if (profile) {
      console.log('  Display Name:', profile.display_name);
      console.log('  Role:', profile.role);
      
      // Check if has practitioner record
      const { data: practitioner } = await supabase
        .from('practitioners')
        .select('*')
        .eq('user_id', chefUser.id)
        .single();
        
      if (practitioner) {
        console.log('  ✅ Has practitioner record');
      } else {
        console.log('  ❌ No practitioner record - cannot receive sessions!');
      }
    }
  }
}

findAuth().then(() => {
  console.log('\n========================================\n');
});