#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function confirmUserEmail(email) {
  try {
    // Get the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error(`Error listing users:`, listError);
      return false;
    }
    
    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log(`User not found: ${email}`);
      return false;
    }
    
    // Update user to confirm email
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          email_confirmed: true
        }
      }
    );
    
    if (error) {
      console.error(`Error confirming email for ${email}:`, error);
      return false;
    }
    
    console.log(`✅ Email confirmed for: ${email}`);
    console.log(`   User ID: ${user.id}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${email}:`, error);
    return false;
  }
}

async function main() {
  console.log('=== Confirming Test Account Emails ===\n');
  
  // Test accounts to confirm
  const testAccounts = [
    'testguest1761040932@gmail.com',
    'practitioner1761041126@gmail.com'
  ];
  
  for (const email of testAccounts) {
    await confirmUserEmail(email);
  }
  
  console.log('\n=== Email Confirmation Complete ===');
}

main().catch(console.error);