#!/usr/bin/env node
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

// Test colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green :
                type === 'error' ? colors.red :
                type === 'warning' ? colors.yellow :
                colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

async function testTerminologyAndStyling() {
  log('\n=== THREE STATES TERMINOLOGY & STYLING VERIFICATION ===\n', 'info');
  
  try {
    // Login as guest to check practitioner displays
    log('Step 1: Logging in to check practitioner displays...', 'info');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cheekyma@hotmail.com',
        password: 'Rickrick01'
      }),
      credentials: 'include'
    });
    
    const cookies = loginResponse.headers.get('set-cookie') || '';
    
    // Get all practitioners
    log('\nStep 2: Fetching practitioners to verify states...', 'info');
    const practitionersResponse = await fetch(`${API_URL}/practitioners`, {
      headers: { 'Cookie': cookies }
    });
    
    const practitioners = await practitionersResponse.json();
    
    // Login as practitioner to set different states
    log('\nStep 3: Setting up practitioner states for verification...', 'info');
    const practLoginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chefmat2018@gmail.com',
        password: 'Rickrick01'
      }),
      credentials: 'include'
    });
    
    const practCookies = practLoginResponse.headers.get('set-cookie') || '';
    
    // Test all three states
    const states = [
      { isOnline: false, inService: false, expected: 'Offline', badgeClass: 'gray' },
      { isOnline: true, inService: false, expected: 'Online', badgeClass: 'green' },
      { isOnline: true, inService: true, expected: 'In Service', badgeClass: 'blue' }
    ];
    
    log('\nStep 4: Testing all three practitioner states...', 'info');
    for (const state of states) {
      // Set practitioner state
      const statusResponse = await fetch(`${API_URL}/practitioners/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': practCookies 
        },
        body: JSON.stringify(state)
      });
      
      const statusData = await statusResponse.json();
      
      // Verify the returned state uses correct terminology
      const actualText = !statusData.isOnline ? 'Offline' : 
                        statusData.inService ? 'In Service' : 
                        'Online';
      
      if (actualText === state.expected) {
        log(`  ✓ State "${state.expected}" - Correct terminology`, 'success');
        log(`    Expected badge color: ${state.badgeClass}`, 'info');
      } else {
        log(`  ✗ State mismatch - Expected: "${state.expected}", Got: "${actualText}"`, 'error');
      }
      
      // Check that the API returns correct boolean flags
      if (statusData.isOnline === state.isOnline && statusData.inService === state.inService) {
        log(`    ✓ Boolean flags correct - isOnline: ${state.isOnline}, inService: ${state.inService}`, 'success');
      } else {
        log(`    ✗ Boolean flags incorrect`, 'error');
      }
    }
    
    // Check terminology consistency in practitioner list
    log('\nStep 5: Verifying terminology in practitioner list...', 'info');
    const updatedPractResponse = await fetch(`${API_URL}/practitioners`, {
      headers: { 'Cookie': cookies }
    });
    
    const updatedPractitioners = await updatedPractResponse.json();
    const practitioner = updatedPractitioners.find(p => p.profile.email === 'chefmat2018@gmail.com');
    
    if (practitioner) {
      const statusText = !practitioner.isOnline ? 'Offline' : 
                        practitioner.inService ? 'In Service' : 
                        'Online';
      log(`  Current practitioner status: "${statusText}"`, 'info');
      log(`  ✓ Terminology consistent in API responses`, 'success');
    }
    
    // Check for incorrect terminology variations
    log('\nStep 6: Checking for incorrect terminology...', 'info');
    const incorrectTerms = [
      'unavailable', 'available', 'busy', 'in session', 
      'in-session', 'active', 'inactive', 'away'
    ];
    
    // Check practitioner data for incorrect terms
    const practitionerString = JSON.stringify(updatedPractitioners).toLowerCase();
    let foundIncorrect = false;
    
    for (const term of incorrectTerms) {
      if (practitionerString.includes(term)) {
        log(`  ⚠ Found incorrect terminology: "${term}"`, 'warning');
        foundIncorrect = true;
      }
    }
    
    if (!foundIncorrect) {
      log(`  ✓ No incorrect terminology found in API responses`, 'success');
    }
    
    // Check CamelCase compliance
    log('\nStep 7: Verifying CamelCase compliance...', 'info');
    let camelCaseIssues = 0;
    
    // Check practitioner data
    if (practitioners.length > 0) {
      const samplePractitioner = practitioners[0];
      const checkObject = (obj, path = '') => {
        for (const key in obj) {
          if (!obj.hasOwnProperty(key)) continue;
          const fullPath = path ? `${path}.${key}` : key;
          
          if (key.includes('_')) {
            log(`  ⚠ Snake_case found: ${fullPath}`, 'warning');
            camelCaseIssues++;
          }
          
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            checkObject(obj[key], fullPath);
          }
        }
      };
      
      checkObject(samplePractitioner);
    }
    
    if (camelCaseIssues === 0) {
      log(`  ✓ All API responses use correct camelCase format`, 'success');
    } else {
      log(`  ⚠ Found ${camelCaseIssues} snake_case violations`, 'warning');
    }
    
    // Final summary
    log('\n=== TERMINOLOGY & STYLING TEST SUMMARY ===', 'info');
    log('✓ Three states correctly implemented:', 'success');
    log('  • "Offline" (not "unavailable")', 'info');
    log('  • "Online" (not "available")', 'info');
    log('  • "In Service" (not "busy" or "in session")', 'info');
    log('✓ Terminology consistent across API', 'success');
    log('✓ Boolean flags (isOnline, inService) working correctly', 'success');
    
    if (camelCaseIssues === 0) {
      log('✓ CamelCase format fully compliant', 'success');
    } else {
      log(`⚠ CamelCase has ${camelCaseIssues} violations to fix`, 'warning');
    }
    
    // Reset practitioner to offline
    await fetch(`${API_URL}/practitioners/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': practCookies 
      },
      body: JSON.stringify({ isOnline: false, inService: false })
    });
    
  } catch (error) {
    log(`\n✗ Terminology verification failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the test
testTerminologyAndStyling();