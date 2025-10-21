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

async function checkAndFixPractitioner() {
  console.log('Checking practitioner status for chefmat2018@gmail.com...\n');

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
      console.log('❌ Practitioner record missing or error:', practError);
      
      // Create it
      const { error: insertError } = await supabase
        .from('practitioners')
        .insert({
          user_id: practitioner.id,
          online: true, // Set online
          in_service: false, // Not in service
          rating: 5.0,
          review_count: 0,
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating practitioner record:', insertError);
      } else {
        console.log('✅ Created new practitioner record and set to ONLINE!');
      }
    } else {
      console.log('\n📊 Current practitioner status:');
      console.log(`   Online: ${practRecord.online ? '✅ YES' : '❌ NO'}`);
      console.log(`   In Service: ${practRecord.in_service ? '⚠️ YES' : '✅ NO'}`);
      console.log(`   Rating: ${practRecord.rating || 'N/A'}`);
      console.log(`   Review Count: ${practRecord.review_count || 0}`);
      console.log(`   Updated: ${practRecord.updated_at}`);

      // Update to be online and not in service
      if (!practRecord.online || practRecord.in_service) {
        console.log('\n🔧 Fixing status...');
        const { error: updateError } = await supabase
          .from('practitioners')
          .update({
            online: true,
            in_service: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', practitioner.id);

        if (updateError) {
          console.error('Error updating status:', updateError);
        } else {
          console.log('✅ Status updated! Practitioner is now ONLINE and AVAILABLE!');
        }
      } else {
        console.log('\n✅ Practitioner is already ONLINE and AVAILABLE!');
      }
    }

    // Verify the fix
    const { data: finalCheck } = await supabase
      .from('practitioners')
      .select('*')
      .eq('user_id', practitioner.id)
      .single();

    console.log('\n========================================');
    console.log('FINAL STATUS:');
    console.log(`Email: chefmat2018@gmail.com`);
    console.log(`Status: ${finalCheck?.online ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
    console.log(`Available: ${!finalCheck?.in_service ? '✅ YES' : '❌ NO (In Service)'}`);
    console.log('========================================');
    console.log('\nGuests should now be able to:');
    console.log('1. Click on the practitioner');
    console.log('2. Click "Start Session" button');
    console.log('3. Select a duration (5min, 15min, 30min, 60min)');
    console.log('4. Click "Confirm & Start" to begin the session');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkAndFixPractitioner()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });