#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: node reset-password.mjs <email> <new-password>');
    console.log('Example: node reset-password.mjs chefmat2018@gmail.com NewPassword123');
    process.exit(1);
  }

  console.log(`Resetting password for: ${email}`);

  try {
    // Update the password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      '', // We need to get the user ID first
      { password: newPassword }
    );

    // First get the user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    // Now update the password
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      process.exit(1);
    }

    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`New password: ${newPassword}`);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

resetPassword();