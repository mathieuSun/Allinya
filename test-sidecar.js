#!/usr/bin/env node

/**
 * Test the Replit sidecar service directly
 */

async function testSidecar() {
  console.log('========================================');
  console.log('    REPLIT SIDECAR SERVICE TEST');
  console.log('========================================\n');

  const SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
  
  console.log(`🔍 Testing sidecar at ${SIDECAR_ENDPOINT}`);
  
  try {
    // Test 1: Check if sidecar is responding
    console.log('\n📡 Checking sidecar health...');
    const healthRes = await fetch(`${SIDECAR_ENDPOINT}/health`, {
      method: 'GET'
    }).catch(err => null);
    
    if (!healthRes) {
      console.log('❌ Sidecar not reachable - Are you running on Replit?');
      console.log('   This is expected in local development.');
      return;
    }
    
    console.log(`✅ Sidecar responded: ${healthRes.status}`);
    
    // Test 2: Try to get credentials
    console.log('\n🔐 Checking credentials endpoint...');
    const credRes = await fetch(`${SIDECAR_ENDPOINT}/credential`, {
      method: 'GET'
    });
    
    if (!credRes.ok) {
      console.log(`⚠️  Credentials endpoint returned: ${credRes.status}`);
    } else {
      const cred = await credRes.json();
      console.log('✅ Credentials available');
      console.log('   Token type:', cred.access_token ? 'Present' : 'Missing');
    }
    
    // Test 3: Try to sign an object URL directly
    console.log('\n📝 Testing signed URL generation...');
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    console.log('   Bucket ID:', bucketId || 'NOT SET');
    
    if (!bucketId) {
      console.log('⚠️  DEFAULT_OBJECT_STORAGE_BUCKET_ID not set');
      return;
    }
    
    const signRequest = {
      bucket_name: bucketId,
      object_name: 'test-object-' + Date.now(),
      method: 'PUT',
      expires_at: new Date(Date.now() + 900000).toISOString()
    };
    
    const signRes = await fetch(
      `${SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signRequest)
      }
    );
    
    if (!signRes.ok) {
      const errorText = await signRes.text();
      console.log(`❌ Sign URL failed: ${signRes.status}`);
      console.log(`   Error: ${errorText}`);
      
      // Common issues
      if (signRes.status === 401) {
        console.log('\n⚠️  401 Error - Possible causes:');
        console.log('   1. Not running on Replit');
        console.log('   2. Bucket permissions not configured');
        console.log('   3. Object storage not initialized');
      }
    } else {
      const { signed_url } = await signRes.json();
      console.log('✅ Signed URL generated successfully!');
      console.log('   URL starts with:', signed_url.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n========================================');
  console.log('           ENVIRONMENT INFO');
  console.log('========================================');
  console.log('REPL_ID:', process.env.REPL_ID || 'NOT SET');
  console.log('REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN || 'NOT SET');
  console.log('DEFAULT_OBJECT_STORAGE_BUCKET_ID:', process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || 'NOT SET');
  console.log('PUBLIC_OBJECT_SEARCH_PATHS:', process.env.PUBLIC_OBJECT_SEARCH_PATHS || 'NOT SET');
  console.log('PRIVATE_OBJECT_DIR:', process.env.PRIVATE_OBJECT_DIR || 'NOT SET');
  console.log('========================================');
}

testSidecar();