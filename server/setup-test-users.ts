import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

// Create Supabase admin client with service role key
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestUser {
  email: string;
  password: string;
  role: 'guest' | 'practitioner';
  profile: {
    displayName: string;
    country: string;
    bio: string;
    avatarUrl?: string;
    specialties?: string[];
  };
}

const testUsers: TestUser[] = [
  {
    email: 'chefmat2018@gmail.com',
    password: '12345678',
    role: 'practitioner',
    profile: {
      displayName: 'Dr. Sarah Chen',
      country: 'USA',
      bio: 'Holistic healing practitioner specializing in energy work and meditation',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      specialties: ['Reiki', 'Meditation', 'Energy Healing']
    }
  },
  {
    email: 'cheekyma@hotmail.com',
    password: '12345678',
    role: 'guest',
    profile: {
      displayName: 'John Matthews',
      country: 'Canada',
      bio: 'Seeking healing and wellness guidance',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john'
    }
  }
];

async function setupTestUsers() {
  console.log('🚀 Setting up test users in Supabase...\n');

  for (const testUser of testUsers) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(testUser.email);
      
      let userId: string;
      
      if (existingUser?.user) {
        console.log(`✅ User ${testUser.email} already exists`);
        userId = existingUser.user.id;
      } else {
        // Create user with admin API
        const { data, error } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true // Auto-confirm email
        });

        if (error) {
          console.error(`❌ Error creating user ${testUser.email}:`, error.message);
          continue;
        }

        userId = data.user!.id;
        console.log(`✅ Created user ${testUser.email}`);
      }

      // Create or update profile
      const profileData = {
        id: userId,
        role: testUser.role,
        display_name: testUser.profile.displayName,
        country: testUser.profile.country,
        bio: testUser.profile.bio,
        avatar_url: testUser.profile.avatarUrl || null,
        specialties: testUser.profile.specialties || [],
        gallery_urls: [],
        video_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        console.error(`❌ Error creating profile for ${testUser.email}:`, profileError.message);
        continue;
      }

      console.log(`✅ Created/updated profile for ${testUser.email}`);

      // If practitioner, create practitioner record
      if (testUser.role === 'practitioner') {
        const practitionerData = {
          user_id: userId,
          online: false,
          in_service: false,
          rating: 4.85,
          total_reviews: 12,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: practError } = await supabase
          .from('practitioners')
          .upsert(practitionerData, { onConflict: 'user_id' });

        if (practError) {
          console.error(`❌ Error creating practitioner record:`, practError.message);
        } else {
          console.log(`✅ Created/updated practitioner record for ${testUser.email}`);
        }
      }

    } catch (error) {
      console.error(`❌ Unexpected error for ${testUser.email}:`, error);
    }
  }

  console.log('\n✨ Test user setup complete!');
  console.log('\nYou can now login with:');
  console.log('  Practitioner: chefmat2018@gmail.com / 12345678');
  console.log('  Guest: cheekyma@hotmail.com / 12345678');
}

// Run the setup
setupTestUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });