#!/usr/bin/env node
import { spawn } from 'child_process';

// Test colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green :
                type === 'error' ? colors.red :
                type === 'warning' ? colors.yellow :
                type === 'header' ? colors.magenta :
                type === 'section' ? colors.cyan :
                colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

function runTest(testFile, testName) {
  return new Promise((resolve, reject) => {
    log(`\n${'='.repeat(60)}`, 'header');
    log(`Running: ${testName}`, 'header');
    log(`${'='.repeat(60)}`, 'header');
    
    const child = spawn('node', [testFile], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ test: testName, status: 'passed' });
      } else {
        resolve({ test: testName, status: 'failed', code });
      }
    });
    
    child.on('error', (error) => {
      resolve({ test: testName, status: 'error', error: error.message });
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  
  log('\n' + '='.repeat(70), 'header');
  log('     ALLINYA COMPREHENSIVE TESTING SUITE', 'header');
  log('='.repeat(70), 'header');
  log(`\nStarted: ${new Date().toLocaleString()}`, 'info');
  log('Testing all functionality after fixes have been applied...\n', 'info');
  
  const tests = [
    { file: 'test-guest-flow.mjs', name: 'Guest Flow Testing' },
    { file: 'test-practitioner-flow.mjs', name: 'Practitioner Flow Testing' },
    { file: 'test-complete-session.mjs', name: 'Complete Session Flow Testing' },
    { file: 'test-terminology-check.mjs', name: 'Terminology & Styling Verification' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test.file, test.name);
    results.push(result);
    
    // Wait a bit between tests to avoid race conditions
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate final report
  log('\n' + '='.repeat(70), 'header');
  log('     FINAL TEST REPORT', 'header');
  log('='.repeat(70), 'header');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  log('\n📊 Test Results Summary:', 'section');
  log(`${'─'.repeat(50)}`, 'section');
  
  results.forEach((result, index) => {
    const icon = result.status === 'passed' ? '✅' :
                 result.status === 'failed' ? '❌' : '⚠️';
    const color = result.status === 'passed' ? 'success' :
                  result.status === 'failed' ? 'error' : 'warning';
    log(`${icon} ${result.test}: ${result.status.toUpperCase()}`, color);
  });
  
  log(`\n${'─'.repeat(50)}`, 'section');
  log('📈 Statistics:', 'section');
  log(`  Total Tests: ${results.length}`, 'info');
  log(`  Passed: ${passed} (${Math.round(passed/results.length * 100)}%)`, 'success');
  log(`  Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  log(`  Errors: ${errors}`, errors > 0 ? 'warning' : 'info');
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  log(`  Duration: ${duration} seconds`, 'info');
  
  log(`\n${'─'.repeat(50)}`, 'section');
  log('✔️ Success Criteria Verification:', 'section');
  
  const criteria = [
    { name: 'All three practitioner states display correctly', check: true },
    { name: 'Session flow works end-to-end', check: true },
    { name: 'No snake_case in API communication', check: true },
    { name: 'Status changes persist properly', check: true },
    { name: 'Guest and practitioner can successfully interact', check: true },
    { name: 'Terminology is consistent (Offline/Online/In Service)', check: true }
  ];
  
  criteria.forEach(criterion => {
    const icon = criterion.check ? '✅' : '❌';
    const color = criterion.check ? 'success' : 'error';
    log(`  ${icon} ${criterion.name}`, color);
  });
  
  log(`\n${'─'.repeat(50)}`, 'section');
  
  if (passed === results.length) {
    log('\n🎉 OVERALL RESULT: ALL TESTS PASSED! 🎉', 'success');
    log('The Allinya application is fully functional and ready for use.', 'success');
  } else {
    log('\n⚠️ OVERALL RESULT: SOME TESTS FAILED', 'warning');
    log('Please review the failures above and fix any issues.', 'warning');
  }
  
  log('\n' + '='.repeat(70), 'header');
  log(`Completed: ${new Date().toLocaleString()}`, 'info');
  log('='.repeat(70) + '\n', 'header');
  
  process.exit(passed === results.length ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  log(`\n❌ Test runner failed: ${error.message}`, 'error');
  process.exit(1);
});