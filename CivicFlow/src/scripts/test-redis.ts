#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Tests connection to Redis and performs basic operations
 */

import redisClient from '../config/redis';
import logger from '../utils/logger';

async function testRedis() {
  try {
    console.log('🔄 Connecting to Redis...');
    
    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Connected to Redis successfully!');

    // Test 1: Health Check
    console.log('\n📊 Test 1: Health Check');
    const isHealthy = await redisClient.healthCheck();
    console.log(`Health check: ${isHealthy ? '✅ PASS' : '❌ FAIL'}`);

    // Test 2: Set and Get
    console.log('\n📊 Test 2: Set and Get');
    await redisClient.set('foo', 'bar');
    console.log('✅ Set key "foo" = "bar"');
    
    const result = await redisClient.get('foo');
    console.log(`✅ Get key "foo" = "${result}"`);
    
    if (result === 'bar') {
      console.log('✅ Set/Get test PASSED');
    } else {
      console.log('❌ Set/Get test FAILED');
    }

    // Test 3: Set with TTL
    console.log('\n📊 Test 3: Set with TTL (5 seconds)');
    await redisClient.set('temp-key', 'temporary-value', 5);
    console.log('✅ Set key "temp-key" with 5 second TTL');
    
    const tempValue = await redisClient.get('temp-key');
    console.log(`✅ Get key "temp-key" = "${tempValue}"`);

    // Test 4: Exists
    console.log('\n📊 Test 4: Check if key exists');
    const exists = await redisClient.exists('foo');
    console.log(`Key "foo" exists: ${exists ? '✅ YES' : '❌ NO'}`);

    // Test 5: List operations
    console.log('\n📊 Test 5: List operations');
    await redisClient.rPush('test-list', 'item1');
    await redisClient.rPush('test-list', 'item2');
    await redisClient.rPush('test-list', 'item3');
    console.log('✅ Pushed 3 items to "test-list"');
    
    const listLength = await redisClient.lLen('test-list');
    console.log(`✅ List length: ${listLength}`);
    
    const item = await redisClient.lPop('test-list');
    console.log(`✅ Popped item: "${item}"`);

    // Test 6: Delete
    console.log('\n📊 Test 6: Delete key');
    await redisClient.del('foo');
    console.log('✅ Deleted key "foo"');
    
    const deletedExists = await redisClient.exists('foo');
    console.log(`Key "foo" exists after delete: ${deletedExists ? '❌ YES (should be NO)' : '✅ NO'}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test keys...');
    await redisClient.del('temp-key');
    await redisClient.del('test-list');
    console.log('✅ Cleanup complete');

    console.log('\n✅ All Redis tests completed successfully!');
    console.log('\n📝 Redis is configured and working correctly.');
    
    // Close connection
    await redisClient.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Redis test failed:', error.message);
    logger.error('Redis test failed', { error });
    process.exit(1);
  }
}

// Run the test
testRedis();
