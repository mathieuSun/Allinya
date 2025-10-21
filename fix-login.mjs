#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

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

async function fixLogin() {
  console.log('Checking and fixing login for chefmat2018@gmail.com...\n');

  try {
    // List all users to find the practitioner
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    // Find the user
    const practitioner = users.users.find(u => u.email === 'chefmat2018@gmail.com');
    
    if (!practitioner) {
      console.log('User not found! Creating new user...');
      
      // Delete any existing profile first
      await supabase.from('profiles').delete().eq('display_name', 'Chef Mat');
      await supabase.from('practitioners').delete().match({ user_id: practitioner?.id });
      
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'chefmat2018@gmail.com',
        password: 'Rickrick01',
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return;
      }

      console.log('✅ User created successfully!');
      console.log('Email: chefmat2018@gmail.com');
      console.log('Password: Rickrick01');
      return;
    }

    console.log(`Found user: ${practitioner.email}`);
    console.log(`User ID: ${practitioner.id}`);
    console.log(`Email confirmed: ${practitioner.email_confirmed_at ? 'Yes' : 'No'}`);

    // Reset the password
    console.log('\nResetting password to: Rickrick01');
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      practitioner.id,
      { 
        password: 'Rickrick01',
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('Error updating user:', updateError);
      return;
    }

    console.log('✅ Password reset successfully!');
    
    // Check profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', practitioner.id)
      .single();

    if (!profile) {
      console.log('\nProfile missing, creating profile...');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: practitioner.id,
          role: 'practitioner',
          display_name: 'Chef Mat',
          bio: 'Experienced healer specializing in energy work',
          specialties: ['Reiki', 'Meditation', 'Crystal Healing'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (!insertError) {
        console.log('✅ Profile created!');
      }
    } else {
      console.log('✅ Profile exists');
    }

    // Check practitioner record
    const { data: practRecord } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', practitioner.id)
      .single();

    if (!practRecord) {
      console.log('\nPractitioner record missing, creating...');
      const { error: practError } = await supabase
        .from('practitioners')
        .insert({
          user_id: practitioner.id,
          online: false,
          in_service: false,
          rating: 5.0,
          review_count: 0,
          updated_at: new Date().toISOString()
        });
      
      if (!practError) {
        console.log('✅ Practitioner record created!');
      }
    } else {
      console.log('✅ Practitioner record exists');
    }

    console.log('\n========================================');
    console.log('Login credentials:');
    console.log('Email: chefmat2018@gmail.com');
    console.log('Password: Rickrick01');
    console.log('========================================\n');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixLogin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });