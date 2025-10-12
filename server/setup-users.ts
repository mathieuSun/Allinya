import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass email confirmation
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUsers() {
  console.log('Creating user accounts...');

  // Create Guest Account
  console.log('Creating guest account: cheekyma@hotmail.com');
  const { data: guestAuth, error: guestAuthError } = await supabase.auth.admin.createUser({
    email: 'cheekyma@hotmail.com',
    password: 'Rickrick01',
    email_confirm: true
  });

  if (guestAuthError) {
    console.error('Error creating guest auth:', guestAuthError);
  } else if (guestAuth?.user) {
    console.log('Guest auth created, ID:', guestAuth.user.id);
    
    // Create guest profile
    const { error: guestProfileError } = await supabase
      .from('profiles')
      .insert({
        id: guestAuth.user.id,
        role: 'guest',
        display_name: 'Cheeky Ma',
        bio: 'Looking for healing and wellness sessions',
        specialties: ['Meditation', 'Energy Healing'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (guestProfileError) {
      console.error('Error creating guest profile:', guestProfileError);
    } else {
      console.log('✅ Guest profile created successfully!');
    }
  }

  // Create Practitioner Account
  console.log('\nCreating practitioner account: chefmat2018@gmail.com');
  const { data: practAuth, error: practAuthError } = await supabase.auth.admin.createUser({
    email: 'chefmat2018@gmail.com',
    password: 'Rickrick01',
    email_confirm: true
  });

  if (practAuthError) {
    console.error('Error creating practitioner auth:', practAuthError);
  } else if (practAuth?.user) {
    console.log('Practitioner auth created, ID:', practAuth.user.id);
    
    // Create practitioner profile
    const { error: practProfileError } = await supabase
      .from('profiles')
      .insert({
        id: practAuth.user.id,
        role: 'practitioner',
        display_name: 'Chef Mat',
        bio: 'Experienced healer specializing in energy work, meditation, and holistic wellness. Here to help you find balance and inner peace.',
        specialties: ['Reiki', 'Meditation', 'Crystal Healing', 'Chakra Balancing'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (practProfileError) {
      console.error('Error creating practitioner profile:', practProfileError);
    } else {
      console.log('✅ Practitioner profile created!');
      
      // Create practitioner record
      const { error: practRecordError } = await supabase
        .from('practitioners')
        .insert({
          user_id: practAuth.user.id,
          online: true,
          in_service: false,
          rating: 5.0,
          review_count: 0,
          updated_at: new Date().toISOString()
        });

      if (practRecordError) {
        console.error('Error creating practitioner record:', practRecordError);
      } else {
        console.log('✅ Practitioner record created and set to online!');
      }
    }
  }

  console.log('\n✨ User setup complete!');
  console.log('Guest: cheekyma@hotmail.com / Rickrick01');
  console.log('Practitioner: chefmat2018@gmail.com / Rickrick01');
}

// Run the setup
createUsers()
  .then(() => {
    console.log('\nAll done! You can now log in with these accounts.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
  });