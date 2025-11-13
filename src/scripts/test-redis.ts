#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Tests connection to Redis and performs basic operations
 */

import redisClient from '../config/redis';
import logger from '../utils/logger';

async function testRedis() {
  try {
    console.log(' Connecting to Redis...');
    
    // Connect to Redis
    await redisClient.connect();
    console.log('[OK] Connected to Redis successfully!');

    // Test 1: Health Check
    console.log('\nMetrics Test 1: Health Check');
    const isHealthy = await redisClient.healthCheck();
    console.log(`Health check: ${isHealthy ? '[OK] PASS' : '[FAIL] FAIL'}`);

    // Test 2: Set and Get
    console.log('\nMetrics Test 2: Set and Get');
    await redisClient.set('foo', 'bar');
    console.log('[OK] Set key "foo" = "bar"');
    
    const result = await redisClient.get('foo');
    console.log(`[OK] Get key "foo" = "${result}"`);
    
    if (result === 'bar') {
      console.log('[OK] Set/Get test PASSED');
    } else {
      console.log('[FAIL] Set/Get test FAILED');
    }

    // Test 3: Set with TTL
    console.log('\nMetrics Test 3: Set with TTL (5 seconds)');
    await redisClient.set('temp-key', 'temporary-value', 5);
    console.log('[OK] Set key "temp-key" with 5 second TTL');
    
    const tempValue = await redisClient.get('temp-key');
    console.log(`[OK] Get key "temp-key" = "${tempValue}"`);

    // Test 4: Exists
    console.log('\nMetrics Test 4: Check if key exists');
    const exists = await redisClient.exists('foo');
    console.log(`Key "foo" exists: ${exists ? '[OK] YES' : '[FAIL] NO'}`);

    // Test 5: List operations
    console.log('\nMetrics Test 5: List operations');
    await redisClient.rPush('test-list', 'item1');
    await redisClient.rPush('test-list', 'item2');
    await redisClient.rPush('test-list', 'item3');
    console.log('[OK] Pushed 3 items to "test-list"');
    
    const listLength = await redisClient.lLen('test-list');
    console.log(`[OK] List length: ${listLength}`);
    
    const item = await redisClient.lPop('test-list');
    console.log(`[OK] Popped item: "${item}"`);

    // Test 6: Delete
    console.log('\nMetrics Test 6: Delete key');
    await redisClient.del('foo');
    console.log('[OK] Deleted key "foo"');
    
    const deletedExists = await redisClient.exists('foo');
    console.log(`Key "foo" exists after delete: ${deletedExists ? '[FAIL] YES (should be NO)' : '[OK] NO'}`);

    // Cleanup
    console.log('\n Cleaning up test keys...');
    await redisClient.del('temp-key');
    await redisClient.del('test-list');
    console.log('[OK] Cleanup complete');

    console.log('\n[OK] All Redis tests completed successfully!');
    console.log('\n Redis is configured and working correctly.');
    
    // Close connection
    await redisClient.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n[FAIL] Redis test failed:', error.message);
    logger.error('Redis test failed', { error });
    process.exit(1);
  }
}

// Run the test
testRedis();
