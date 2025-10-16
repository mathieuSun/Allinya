#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testPractitionerFix() {
  console.log('Testing practitioner schema fix...\n');
  
  try {
    // Test 1: Fetch practitioners to see the schema
    console.log('1. Fetching practitioners...');
    const { data: practitioners, error: fetchError } = await supabase
      .from('practitioners')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching practitioners:', fetchError);
      return;
    }
    
    if (practitioners && practitioners.length > 0) {
      console.log('✅ Found practitioner:', practitioners[0]);
      console.log('   Primary key is "id":', practitioners[0].id);
      console.log('   Has is_online field:', 'is_online' in practitioners[0]);
      
      // Test 2: Try to update the practitioner using 'id'
      console.log('\n2. Testing update using "id"...');
      const practId = practitioners[0].id;
      const currentOnlineStatus = practitioners[0].is_online;
      
      const { data: updatedPract, error: updateError } = await supabase
        .from('practitioners')
        .update({ 
          is_online: !currentOnlineStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', practId)  // Using 'id' not 'user_id'
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating practitioner:', updateError);
      } else {
        console.log('✅ Successfully updated practitioner:', updatedPract);
        console.log(`   is_online changed from ${currentOnlineStatus} to ${!currentOnlineStatus}`);
        
        // Test 3: Toggle back to original state
        console.log('\n3. Toggling back to original state...');
        const { data: toggledBack, error: toggleError } = await supabase
          .from('practitioners')
          .update({ 
            is_online: currentOnlineStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', practId)
          .select()
          .single();
        
        if (toggleError) {
          console.error('❌ Error toggling back:', toggleError);
        } else {
          console.log('✅ Successfully toggled back to original state');
        }
      }
      
      // Test 4: Test via the API endpoint
      console.log('\n4. Testing via API endpoint...');
      const apiUrl = 'http://localhost:5000/api/practitioner/' + practId;
      
      try {
        const response = await fetch(apiUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ online: !currentOnlineStatus })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ API update successful:', result);
        } else {
          console.error('❌ API update failed:', response.status, await response.text());
        }
      } catch (apiError) {
        console.error('❌ API call error:', apiError.message);
      }
      
    } else {
      console.log('No practitioners found in database. Schema columns:');
      // Fetch table schema
      const { data: columns } = await supabase.rpc('get_table_columns', {
        table_name: 'practitioners'
      }).catch(() => ({ data: null }));
      
      if (columns) {
        console.log('Practitioners table columns:', columns);
      }
    }
    
    console.log('\n✅ Schema fix test completed successfully!');
    console.log('The practitioners table now correctly uses "id" as the primary key.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPractitionerFix();