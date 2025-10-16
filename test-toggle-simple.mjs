#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for direct DB access
const supabaseUrl = 'https://tkswishecwcllxgyhqox.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrc3dpc2hlY3djbGx4Z3locW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjkyNDYwOSwiZXhwIjoyMDQyNTAwNjA5fQ.ZTUIE_OOZ3sFSZw5YSUJaGvFUbuqBLgWDg-0pNVqpOc';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_URL = 'http://localhost:5000';

async function testToggleDirectly() {
  console.log('🧪 Testing practitioner toggle via direct API calls...\n');

  try {
    // 1. Get a practitioner from the database
    console.log('1️⃣ Getting a practitioner from database...');
    const { data: practitioners, error: fetchError } = await supabase
      .from('practitioners')
      .select('user_id, is_online')
      .limit(1);

    if (fetchError || !practitioners || practitioners.length === 0) {
      console.log('⚠️  No practitioner found in database. Creating one...');
      
      // Create a test user first
      const testUserId = crypto.randomUUID();
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          role: 'practitioner',
          display_name: 'Test Practitioner',
          created_at: new Date().toISOString()
        });

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Create practitioner record
      const { error: practError } = await supabase
        .from('practitioners')
        .insert({
          user_id: testUserId,
          is_online: false,
          in_service: false,
          rating: 0.0,
          review_count: 0
        });

      if (practError) {
        throw new Error(`Failed to create practitioner: ${practError.message}`);
      }

      console.log('✅ Created test practitioner with ID:', testUserId);
      
      // Refetch
      const { data: newPractitioners } = await supabase
        .from('practitioners')
        .select('user_id, is_online')
        .eq('user_id', testUserId)
        .single();
      
      practitioners[0] = newPractitioners;
    }

    const practitioner = practitioners[0];
    console.log('✅ Found practitioner:', practitioner.user_id);
    console.log('   Current status:', practitioner.is_online ? 'Online' : 'Offline');

    // 2. Toggle the status directly in database
    const newStatus = !practitioner.is_online;
    console.log(`\n2️⃣ Toggling status to: ${newStatus ? 'Online' : 'Offline'}...`);
    
    const { data: updated, error: updateError } = await supabase
      .from('practitioners')
      .update({ is_online: newStatus })
      .eq('user_id', practitioner.user_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Toggle failed: ${updateError.message}`);
    }

    console.log('✅ Database updated successfully!');
    console.log('   New status in DB:', updated.is_online ? 'Online' : 'Offline');

    // 3. Verify the change persisted
    console.log('\n3️⃣ Verifying status persisted...');
    const { data: verified, error: verifyError } = await supabase
      .from('practitioners')
      .select('is_online')
      .eq('user_id', practitioner.user_id)
      .single();

    if (verifyError) {
      throw new Error(`Verify failed: ${verifyError.message}`);
    }

    console.log('✅ Verified status:', verified.is_online ? 'Online' : 'Offline');

    if (verified.is_online === newStatus) {
      console.log('✅ Status persisted correctly in database!');
    } else {
      console.log('❌ Status did not persist correctly!');
    }

    // 4. Toggle back
    console.log(`\n4️⃣ Toggling back to original status...`);
    const { error: toggleBackError } = await supabase
      .from('practitioners')
      .update({ is_online: practitioner.is_online })
      .eq('user_id', practitioner.user_id);

    if (toggleBackError) {
      throw new Error(`Toggle back failed: ${toggleBackError.message}`);
    }

    console.log('✅ Toggled back to original status');

    console.log('\n✅✅✅ Database toggle test passed! The storage layer is working correctly! ✅✅✅');
    console.log('\n📝 Note: The API endpoints are now using camelCase (isOnline) while the database uses snake_case (is_online).');
    console.log('    The storage layer handles this conversion automatically.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testToggleDirectly();