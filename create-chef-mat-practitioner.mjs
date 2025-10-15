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

console.log('\n🔧 Creating Chef Mat as a Practitioner...\n');

async function createChefMatPractitioner() {
  // 1. Find Chef Mat's profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', 'Chef Mat');
    
  if (!profiles || profiles.length === 0) {
    console.log('❌ No profile found with display name "Chef Mat"');
    console.log('Looking for profiles with "chef" in the name...');
    
    const { data: chefProfiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('display_name', '%chef%');
      
    if (chefProfiles && chefProfiles.length > 0) {
      console.log('\nFound profiles with "chef":');
      chefProfiles.forEach(p => {
        console.log(`  - ${p.display_name} (ID: ${p.id}, Role: ${p.role})`);
      });
      
      // Use the first one
      const chefProfile = chefProfiles[0];
      console.log(`\n📝 Using profile: ${chefProfile.display_name}`);
      
      // Create practitioner record
      const { data: practitioner, error } = await supabase
        .from('practitioners')
        .upsert({
          user_id: chefProfile.id,
          online: true,
          in_service: false,
          rating: 4.5,
          review_count: 0,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.log('❌ Error creating practitioner:', error);
      } else {
        console.log('✅ Practitioner record created for Chef Mat!');
        console.log('  User ID:', practitioner.user_id);
        console.log('  Online:', practitioner.online);
        
        // Update existing sessions to use Chef Mat's ID
        const { count } = await supabase
          .from('sessions')
          .update({ practitioner_id: chefProfile.id })
          .eq('practitioner_id', '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6')
          .eq('phase', 'waiting');
          
        console.log(`\n✅ Updated ${count || 0} waiting sessions to Chef Mat`);
      }
    }
  } else {
    const chefProfile = profiles[0];
    console.log(`Found Chef Mat profile: ${chefProfile.id}`);
    
    // Create or update practitioner record
    const { data: practitioner, error } = await supabase
      .from('practitioners')
      .upsert({
        user_id: chefProfile.id,
        online: true,
        in_service: false,
        rating: 4.5,
        review_count: 0,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.log('❌ Error creating practitioner:', error);
    } else {
      console.log('✅ Practitioner record created!');
      
      // Update existing sessions
      const { count } = await supabase
        .from('sessions')
        .update({ practitioner_id: chefProfile.id })
        .eq('practitioner_id', '1a20c2b4-469d-4187-96ff-3e3da2a1d3a6')
        .eq('phase', 'waiting');
        
      console.log(`\n✅ Updated ${count || 0} waiting sessions to Chef Mat`);
    }
  }
}

createChefMatPractitioner().then(() => {
  console.log('\n========================================\n');
});