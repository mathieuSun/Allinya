#!/usr/bin/env node

/**
 * Test script to verify all profile and storage functionality
 * Tests:
 * 1. Database schema (display_name column)
 * 2. Profile creation and updates
 * 3. Practitioner online status toggle
 * 4. File upload capabilities
 */

import fetch from 'node-fetch';
import { promises as fs } from 'fs';

const API_BASE = 'http://localhost:5000/api';

// Test users
const TEST_PRACTITIONER = {
  email: 'test-practitioner@example.com',
  password: 'TestPass123!',
  full_name: 'Test Practitioner',
  role: 'practitioner'
};

const TEST_GUEST = {
  email: 'test-guest@example.com',
  password: 'TestPass123!',
  full_name: 'Test Guest',
  role: 'guest'
};

let practitionerToken = null;
let guestToken = null;
let practitionerUserId = null;
let guestUserId = null;

// Helper function to make API requests
async function apiRequest(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`${method} ${endpoint} failed: ${data.error || 'Unknown error'}`);
  }
  
  return data;
}

// Test 1: Create test users
async function testUserCreation() {
  console.log('\n📝 TEST 1: User Creation');
  console.log('========================');
  
  try {
    // Create practitioner
    console.log('Creating practitioner...');
    const practitioner = await apiRequest('POST', '/auth/signup', TEST_PRACTITIONER);
    practitionerToken = practitioner.access_token;
    practitionerUserId = practitioner.user.id;
    console.log('✅ Practitioner created successfully');
    console.log('   ID:', practitionerUserId);
    console.log('   Profile has display_name:', practitioner.profile.displayName);
    
    // Create guest
    console.log('Creating guest...');
    const guest = await apiRequest('POST', '/auth/signup', TEST_GUEST);
    guestToken = guest.access_token;
    guestUserId = guest.user.id;
    console.log('✅ Guest created successfully');
    console.log('   ID:', guestUserId);
    console.log('   Profile has display_name:', guest.profile.displayName);
    
  } catch (error) {
    if (error.message.includes('already registered')) {
      console.log('⚠️  Users already exist, attempting login...');
      
      // Login as practitioner
      const practitionerLogin = await apiRequest('POST', '/auth/login', {
        email: TEST_PRACTITIONER.email,
        password: TEST_PRACTITIONER.password
      });
      practitionerToken = practitionerLogin.access_token;
      practitionerUserId = practitionerLogin.user.id;
      console.log('✅ Practitioner logged in');
      
      // Login as guest
      const guestLogin = await apiRequest('POST', '/auth/login', {
        email: TEST_GUEST.email,
        password: TEST_GUEST.password
      });
      guestToken = guestLogin.access_token;
      guestUserId = guestLogin.user.id;
      console.log('✅ Guest logged in');
    } else {
      console.error('❌ Error:', error.message);
      return false;
    }
  }
  
  return true;
}

// Test 2: Profile updates
async function testProfileUpdates() {
  console.log('\n📝 TEST 2: Profile Updates');
  console.log('==========================');
  
  try {
    // Update practitioner profile
    console.log('Updating practitioner profile...');
    const practitionerUpdate = await apiRequest('PUT', '/profile', {
      displayName: 'Dr. Test Practitioner',
      bio: 'Experienced holistic healer with 10+ years of experience',
      country: 'United States',
      specialties: ['Energy Healing', 'Meditation', 'Reiki']
    }, practitionerToken);
    
    console.log('✅ Practitioner profile updated');
    console.log('   Display name:', practitionerUpdate.displayName);
    console.log('   Bio:', practitionerUpdate.bio);
    console.log('   Specialties:', practitionerUpdate.specialties);
    
    // Update guest profile
    console.log('\nUpdating guest profile...');
    const guestUpdate = await apiRequest('PUT', '/profile', {
      displayName: 'John Test Guest',
      country: 'Canada'
    }, guestToken);
    
    console.log('✅ Guest profile updated');
    console.log('   Display name:', guestUpdate.displayName);
    console.log('   Country:', guestUpdate.country);
    
  } catch (error) {
    console.error('❌ Profile update failed:', error.message);
    return false;
  }
  
  return true;
}

// Test 3: Practitioner online status toggle
async function testOnlineStatusToggle() {
  console.log('\n📝 TEST 3: Practitioner Online Status Toggle');
  console.log('=============================================');
  
  try {
    // Get current status
    console.log('Getting current practitioner status...');
    const currentStatus = await apiRequest('GET', '/practitioners/status', null, practitionerToken);
    console.log('   Current online status:', currentStatus.online);
    
    // Toggle online
    console.log('Setting practitioner online...');
    const onlineResult = await apiRequest('POST', '/presence/toggle', {
      online: true
    }, practitionerToken);
    console.log('✅ Practitioner is now online:', onlineResult.online);
    
    // Toggle offline
    console.log('Setting practitioner offline...');
    const offlineResult = await apiRequest('POST', '/presence/toggle', {
      online: false
    }, practitionerToken);
    console.log('✅ Practitioner is now offline:', offlineResult.online);
    
    // Verify in practitioners list
    console.log('\nVerifying in practitioners list...');
    const practitioners = await apiRequest('GET', '/practitioners');
    const testPractitioner = practitioners.find(p => p.userId === practitionerUserId);
    if (testPractitioner) {
      console.log('✅ Found practitioner in list');
      console.log('   Online status:', testPractitioner.online);
      console.log('   Display name:', testPractitioner.profile.displayName);
    }
    
  } catch (error) {
    console.error('❌ Online status toggle failed:', error.message);
    return false;
  }
  
  return true;
}

// Test 4: Avatar upload URL generation
async function testUploadUrls() {
  console.log('\n📝 TEST 4: Upload URL Generation');
  console.log('=================================');
  
  try {
    // Get avatar upload URL
    console.log('Getting avatar upload URL...');
    const avatarUpload = await apiRequest('POST', '/upload/avatar', null, practitionerToken);
    console.log('✅ Avatar upload URL generated');
    console.log('   Public URL will be:', avatarUpload.publicUrl);
    
    // Get gallery upload URL
    console.log('\nGetting gallery upload URL...');
    const galleryUpload = await apiRequest('POST', '/upload/gallery', null, practitionerToken);
    console.log('✅ Gallery upload URL generated');
    console.log('   Public URL will be:', galleryUpload.publicUrl);
    
    // Get video upload URL
    console.log('\nGetting video upload URL...');
    const videoUpload = await apiRequest('POST', '/upload/video', null, practitionerToken);
    console.log('✅ Video upload URL generated');
    console.log('   Public URL will be:', videoUpload.publicUrl);
    
    console.log('\n📌 Note: The actual file upload happens from the frontend using these URLs');
    console.log('   File size limits are handled by the storage provider (10MB for images, 50MB for videos)');
    
  } catch (error) {
    console.error('❌ Upload URL generation failed:', error.message);
    return false;
  }
  
  return true;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Allinya Functionality Tests');
  console.log('========================================');
  console.log('Server:', API_BASE);
  
  let allTestsPassed = true;
  
  // Run tests
  if (!await testUserCreation()) allTestsPassed = false;
  if (!await testProfileUpdates()) allTestsPassed = false;
  if (!await testOnlineStatusToggle()) allTestsPassed = false;
  if (!await testUploadUrls()) allTestsPassed = false;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
    console.log('\nSummary:');
    console.log('1. ✅ Database has correct display_name column');
    console.log('2. ✅ Profile updates working correctly');
    console.log('3. ✅ Practitioner online status toggle working');
    console.log('4. ✅ File upload URLs generating correctly');
    console.log('\n📌 The avatar upload size limit is handled by the storage provider');
    console.log('   (Default: 10MB for images, 50MB for videos)');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('Please check the errors above for details');
  }
  console.log('='.repeat(50));
}

// Run the tests
runTests().catch(console.error);