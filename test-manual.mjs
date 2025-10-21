import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testGuestLogin() {
  console.log('\n🔐 Testing Guest Login...');
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cheekyma@hotmail.com',
      password: 'Rickrick01'
    })
  });
  
  if (!response.ok) {
    console.error('❌ Guest login failed:', response.status);
    return null;
  }
  
  const data = await response.json();
  console.log('✅ Guest login successful');
  console.log('   User:', data.user?.email);
  console.log('   Role:', data.profile?.role);
  console.log('   Display Name:', data.profile?.displayName);
  
  // Check for camelCase compliance
  const keys = Object.keys(data);
  const snakeCase = keys.filter(k => k.includes('_'));
  if (snakeCase.length === 0) {
    console.log('✅ CamelCase compliant in login response');
  } else {
    console.log('❌ Snake_case found:', snakeCase);
  }
  
  return data.accessToken;
}

async function testPractitionerLogin() {
  console.log('\n👩‍⚕️ Testing Practitioner Login...');
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'chefmat2018@gmail.com',
      password: 'Rickrick01'
    })
  });
  
  if (!response.ok) {
    console.error('❌ Practitioner login failed:', response.status);
    return null;
  }
  
  const data = await response.json();
  console.log('✅ Practitioner login successful');
  console.log('   User:', data.user?.email);
  console.log('   Role:', data.profile?.role);
  console.log('   Display Name:', data.profile?.displayName);
  
  return data.accessToken;
}

async function testExplore() {
  console.log('\n🔍 Testing Explore Practitioners...');
  const response = await fetch(`${API_URL}/practitioners`);
  
  if (!response.ok) {
    console.error('❌ Failed to get practitioners:', response.status);
    return;
  }
  
  const practitioners = await response.json();
  console.log(`✅ Found ${practitioners.length} practitioners`);
  
  // Count states
  const states = {
    offline: 0,
    online: 0,
    inService: 0
  };
  
  practitioners.forEach((p) => {
    const status = !p.isOnline ? 'Offline' :
                   p.inService ? 'In Service' :
                   'Online';
    
    if (!p.isOnline) states.offline++;
    else if (p.inService) states.inService++;
    else states.online++;
    
    console.log(`   - ${p.profile?.displayName || 'Unknown'}: ${status}`);
  });
  
  console.log('\n📊 Status Summary:');
  console.log(`   Offline: ${states.offline}`);
  console.log(`   Online: ${states.online}`);
  console.log(`   In Service: ${states.inService}`);
}

async function testPractitionerStatusUpdate(token) {
  console.log('\n🔄 Testing Practitioner Status Updates...');
  
  // First get current status
  const currentResponse = await fetch(`${API_URL}/practitioners/get-status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (currentResponse.ok) {
    const current = await currentResponse.json();
    console.log('Current status:', { isOnline: current.isOnline, inService: current.inService });
  }
  
  // Test status changes
  const statusTests = [
    { isOnline: false, inService: false, name: 'Offline' },
    { isOnline: true, inService: false, name: 'Online' },
    { isOnline: true, inService: true, name: 'In Service' },
    { isOnline: false, inService: false, name: 'Offline (Reset)' }
  ];
  
  for (const status of statusTests) {
    console.log(`\n   Testing: ${status.name}`);
    const response = await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(status)
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        const actualStatus = !result.isOnline ? 'Offline' :
                           result.inService ? 'In Service' :
                           'Online';
        console.log(`   ✅ Status changed to: ${actualStatus}`);
      } else {
        console.log(`   ❌ Response is not JSON. Content-Type: ${contentType}`);
      }
    } else {
      console.log(`   ❌ Failed to update status. HTTP: ${response.status}`);
    }
    
    await sleep(500); // Small delay between status changes
  }
}

async function runTests() {
  console.log('=======================================');
  console.log('  ALLINYA MANUAL TESTING SUITE');
  console.log('=======================================');
  console.log('Started:', new Date().toLocaleString());
  
  try {
    // Test 1: Guest Login
    const guestToken = await testGuestLogin();
    
    // Test 2: Explore
    await testExplore();
    
    // Test 3: Practitioner Login
    const practToken = await testPractitionerLogin();
    
    // Test 4: Practitioner Status Update
    if (practToken) {
      await testPractitionerStatusUpdate(practToken);
    }
    
    // Test 5: Verify final state
    console.log('\n📋 Final State Verification...');
    await testExplore();
    
    console.log('\n=======================================');
    console.log('✅ Testing Complete');
    console.log('=======================================');
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  }
}

runTests();
