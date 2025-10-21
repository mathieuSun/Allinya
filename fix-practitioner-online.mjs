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

async function fixPractitionerOnlineStatus() {
  console.log('🔧 Fixing practitioner online status for chefmat2018@gmail.com...\n');

  try {
    // Find the user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const practitioner = users.users.find(u => u.email === 'chefmat2018@gmail.com');
    
    if (!practitioner) {
      console.log('❌ User not found!');
      return;
    }

    console.log(`✅ User found: ${practitioner.email}`);
    console.log(`   ID: ${practitioner.id}`);

    // Check practitioner record
    const { data: practRecord, error: practError } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', practitioner.id)
      .single();

    if (practError || !practRecord) {
      console.log('❌ Practitioner record missing! Creating...');
      
      // Create new practitioner record
      const { error: insertError } = await supabase
        .from('practitioners')
        .insert({
          user_id: practitioner.id,
          is_online: true,  // Using correct column name
          in_service: false,
          rating: 5.0,
          review_count: 0,
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating practitioner record:', insertError);
        return;
      } else {
        console.log('✅ Created new practitioner record and set to ONLINE!');
      }
    } else {
      console.log('\n📊 Current practitioner status:');
      console.log(`   Online (is_online): ${practRecord.is_online ? '✅ YES' : '❌ NO'}`);
      console.log(`   In Service: ${practRecord.in_service ? '⚠️ YES (busy)' : '✅ NO (available)'}`);
      console.log(`   Rating: ${practRecord.rating || 'N/A'}`);
      console.log(`   Review Count: ${practRecord.review_count || 0}`);
      console.log(`   Last Updated: ${practRecord.updated_at}`);

      // Update to be online and not in service
      if (!practRecord.is_online || practRecord.in_service) {
        console.log('\n🔧 Fixing status...');
        const { error: updateError } = await supabase
          .from('practitioners')
          .update({
            is_online: true,  // Using correct column name
            in_service: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', practitioner.id);

        if (updateError) {
          console.error('Error updating status:', updateError);
          return;
        } else {
          console.log('✅ Status updated successfully!');
        }
      } else {
        console.log('\n✅ Practitioner is already ONLINE and AVAILABLE!');
      }
    }

    // Verify the fix
    const { data: finalCheck, error: finalError } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', practitioner.id)
      .single();

    if (finalError) {
      console.error('Error checking final status:', finalError);
      return;
    }

    console.log('\n========================================');
    console.log('✨ FINAL STATUS:');
    console.log('========================================');
    console.log(`📧 Email: chefmat2018@gmail.com`);
    console.log(`🟢 Status: ${finalCheck.is_online ? 'ONLINE' : 'OFFLINE'}`);
    console.log(`✅ Available: ${!finalCheck.in_service ? 'YES (Ready for sessions)' : 'NO (Currently in service)'}`);
    console.log(`⭐ Rating: ${finalCheck.rating || 'N/A'}`);
    console.log('========================================\n');
    
    if (finalCheck.is_online && !finalCheck.in_service) {
      console.log('🎉 SUCCESS! The practitioner is now ONLINE and AVAILABLE!');
      console.log('\n📝 Instructions for the guest:');
      console.log('1. Go to the Explore page');
      console.log('2. Click on the practitioner "Chef Mat" (chefmat2018@gmail.com)');
      console.log('3. Click the "Start Session" button at the bottom');
      console.log('4. Select a duration (5 min, 15 min, 30 min, or 60 min)');
      console.log('5. Click "Confirm & Start" to send the request');
      console.log('\nThe practitioner will then receive a notification to accept the session.');
    } else {
      console.log('⚠️ There might still be an issue. Please check the status above.');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixPractitionerOnlineStatus()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });