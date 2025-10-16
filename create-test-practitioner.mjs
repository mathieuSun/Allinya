#!/usr/bin/env node

const API_URL = 'http://localhost:5000';

async function createTestPractitioner() {
  console.log('🔨 Creating test practitioner account...\n');

  try {
    // Create practitioner account via signup
    console.log('Creating practitioner account...');
    const signupResponse = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.practitioner@example.com',
        password: 'TestPass123!',
        full_name: 'Test Practitioner',
        role: 'practitioner'
      })
    });

    const responseText = await signupResponse.text();
    
    if (!signupResponse.ok) {
      // Check if it's already exists error
      if (responseText.includes('already registered') || responseText.includes('User already registered')) {
        console.log('✅ Practitioner account already exists');
        return;
      }
      throw new Error(`Signup failed: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('✅ Practitioner account created successfully!');
    console.log('   Email: test.practitioner@example.com');
    console.log('   Password: TestPass123!');
    console.log('   Name:', data.profile.displayName);
    console.log('   ID:', data.profile.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the setup
createTestPractitioner();