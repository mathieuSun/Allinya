#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test accounts we want to create/update
const TEST_ACCOUNTS = [
  {
    email: 'guest.test@example.com',
    password: 'test123456',
    full_name: 'Test Guest',
    role: 'guest'
  },
  {
    email: 'practitioner.test@example.com',
    password: 'test123456',
    full_name: 'Test Practitioner',
    role: 'practitioner'
  }
];

async function signupUser(account) {
  console.log(`\n📝 Creating account for ${account.email}...`);
  
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.error && data.error.includes('already registered')) {
        console.log(`   ⚠️  User already exists, trying to login...`);
        return await loginUser(account);
      }
      throw new Error(`Signup failed: ${data.error}`);
    }
    
    console.log(`✅ Account created successfully`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Role: ${data.profile.role}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to create account: ${error.message}`);
    // Try to login if signup fails
    return await loginUser(account);
  }
}

async function loginUser(account) {
  console.log(`   🔐 Attempting to login...`);
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: account.email,
      password: account.password
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.log(`   ❌ Login also failed: ${data.error}`);
    return null;
  }
  
  console.log(`   ✅ Logged in successfully`);
  console.log(`   User ID: ${data.user.id}`);
  console.log(`   Role: ${data.profile.role}`);
  return data;
}

async function setupTestAccounts() {
  console.log('🚀 Setting up test accounts');
  console.log('============================');
  
  const results = [];
  
  for (const account of TEST_ACCOUNTS) {
    const result = await signupUser(account);
    if (result) {
      results.push(result);
    }
  }
  
  console.log('\n📊 Summary');
  console.log('===========');
  console.log(`Successfully set up ${results.length} out of ${TEST_ACCOUNTS.length} accounts`);
  
  if (results.length === TEST_ACCOUNTS.length) {
    console.log('\n✅ All test accounts are ready!');
    console.log('\n📋 Account Details:');
    console.log('-------------------');
    for (let i = 0; i < TEST_ACCOUNTS.length; i++) {
      const account = TEST_ACCOUNTS[i];
      const result = results[i];
      if (result) {
        console.log(`\n${account.role.toUpperCase()}:`);
        console.log(`   Email: ${account.email}`);
        console.log(`   Password: ${account.password}`);
        console.log(`   User ID: ${result.user.id}`);
      }
    }
  } else {
    console.log('\n⚠️  Some accounts could not be set up');
  }
}

// Run the setup
setupTestAccounts().catch(console.error);