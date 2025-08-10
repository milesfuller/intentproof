#!/usr/bin/env ts-node

/**
 * Test IntentProof - Verify it actually works!
 * This proves IntentProof can verify its own claims.
 */

import { Intent } from './packages/core/src/intent';
import * as fs from 'fs';

async function testIntentProof() {
  console.log('🧪 Testing IntentProof...\n');
  
  // Test 1: Successful verification
  console.log('Test 1: Successful file creation verification');
  const successIntent = new Intent('Create test file')
    .step('Create file', {
      action: async () => {
        fs.writeFileSync('/tmp/test.txt', 'IntentProof works!');
      },
      verify: 'test -f /tmp/test.txt'
    })
    .step('Verify content', {
      verify: 'grep "IntentProof" /tmp/test.txt',
      expect: 'IntentProof works!'
    })
    .ensures('test -f /tmp/test.txt');
  
  const result1 = await successIntent.execute();
  console.log('Result:', result1.success ? '✅ PASSED' : '❌ FAILED');
  console.log(successIntent.visualize());
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Failed verification (intentional)
  console.log('Test 2: Failed verification detection');
  const failIntent = new Intent('Verify nonexistent file')
    .step('Check for file that does not exist', {
      verify: 'test -f /tmp/nonexistent.txt'
    });
  
  const result2 = await failIntent.execute();
  console.log('Result:', !result2.success ? '✅ CORRECTLY FAILED' : '❌ SHOULD HAVE FAILED');
  console.log('Failed at:', result2.failedStep);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Precondition and postcondition
  console.log('Test 3: Contract verification');
  const contractIntent = new Intent('Test with conditions')
    .requires('test -f /tmp/test.txt')  // File must exist (from test 1)
    .step('Modify file', {
      action: async () => {
        fs.appendFileSync('/tmp/test.txt', '\nModified!');
      },
      verify: 'grep "Modified" /tmp/test.txt',
      expect: 'Modified!'
    })
    .ensures('grep "Modified" /tmp/test.txt', 'Modified!');
  
  const result3 = await contractIntent.execute();
  console.log('Result:', result3.success ? '✅ PASSED' : '❌ FAILED');
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Clean up
  if (fs.existsSync('/tmp/test.txt')) {
    fs.unlinkSync('/tmp/test.txt');
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`Test 1 (Success): ${result1.success ? '✅' : '❌'}`);
  console.log(`Test 2 (Failure detection): ${!result2.success ? '✅' : '❌'}`);
  console.log(`Test 3 (Contracts): ${result3.success ? '✅' : '❌'}`);
  
  const allPassed = result1.success && !result2.success && result3.success;
  console.log(`\n${allPassed ? '✨ All tests passed!' : '❌ Some tests failed'}`);
  
  return allPassed;
}

// Run tests
testIntentProof()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });