#!/usr/bin/env node

/**
 * Simple test to check login response structure
 */

const BASE_URL = 'http://localhost:5000';

async function testLogin() {
  console.log('=== Testing Login Response ===\n');
  
  const credentials = {
    email: 'chefmat2018@gmail.com',
    password: 'Rickrick01'
  };
  
  try {
    console.log('Attempting login...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const text = await response.text();
    console.log('\n📥 Raw Response:');
    console.log(text);
    
    try {
      const data = JSON.parse(text);
      
      console.log('\n🔍 Response Analysis:');
      console.log('Status:', response.status);
      console.log('Has profile:', !!data.profile);
      console.log('Has user:', !!data.user);
      console.log('Has session:', !!data.session);
      
      if (data.profile) {
        console.log('\n📋 Profile Keys:');
        for (const key in data.profile) {
          console.log(`  - ${key}: ${typeof data.profile[key]}`);
        }
      }
      
      // Check for snake_case
      console.log('\n🐍 Snake_case Check:');
      function checkSnakeCase(obj, path = '') {
        for (const key in obj) {
          if (key.includes('_')) {
            console.log(`  ❌ Snake_case found: ${path}.${key}`);
          }
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            checkSnakeCase(obj[key], path ? `${path}.${key}` : key);
          }
        }
      }
      checkSnakeCase(data);
      
    } catch (e) {
      console.log('Could not parse as JSON');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLogin();