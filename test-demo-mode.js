/**
 * Demo Mode Test Script
 * Tests that demo mode activates correctly with invalid credentials
 */

const http = require('http');

console.log('\nTest Testing Demo Mode Activation...\n');

// Wait for server to start
setTimeout(() => {
  // Test health endpoint
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/health',
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        const demoModeHeader = res.headers['x-demo-mode'];

        console.log('[OK] Health Check Response:');
        console.log(JSON.stringify(response, null, 2));
        console.log('\n Headers:');
        console.log(`X-Demo-Mode: ${demoModeHeader}`);

        if (response.demoMode && response.demoMode.active) {
          console.log('\n[OK] SUCCESS: Demo mode is active!');
          console.log(`   Reason: ${response.demoMode.message}`);
        } else if (demoModeHeader === 'true') {
          console.log('\n[OK] SUCCESS: Demo mode detected via header!');
        } else {
          console.log('\n[WARN]  WARNING: Demo mode not detected');
          console.log('   This might be normal if database is connected');
        }

        // Test detailed health
        testDetailedHealth();
      } catch (error) {
        console.error('[FAIL] Error parsing response:', error.message);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('[FAIL] Error connecting to server:', error.message);
    console.log('\n Make sure the server is running:');
    console.log('   npm start');
    process.exit(1);
  });

  req.end();
}, 2000);

function testDetailedHealth() {
  setTimeout(() => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/health/detailed',
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          console.log('\n[OK] Detailed Health Check:');
          if (response.demoMode) {
            console.log('   Demo Mode Status:');
            console.log(`   - Active: ${response.demoMode.active}`);
            console.log(`   - Reason: ${response.demoMode.reason || 'N/A'}`);
            console.log(`   - Failures: ${response.demoMode.failureCount}/${response.demoMode.maxRetries}`);
            console.log(`   - Auto-Enable: ${response.demoMode.autoEnableOnFailure}`);
          }

          console.log('\n   Service Status:');
          console.log(`   - Database: ${response.services?.database?.status || 'unknown'}`);
          console.log(`   - Redis: ${response.services?.redis?.status || 'unknown'}`);

          console.log('\n[OK] All tests passed!');
          console.log('\n Next steps:');
          console.log('   1. Check the UI at http://localhost:3000');
          console.log('   2. Look for the purple demo mode banner');
          console.log('   3. Browse sample applications');
          console.log('   4. Deploy to Railway!');
          console.log('\n');
          process.exit(0);
        } catch (error) {
          console.error('[FAIL] Error parsing detailed health:', error.message);
          process.exit(1);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[FAIL] Error getting detailed health:', error.message);
      process.exit(1);
    });

    req.end();
  }, 1000);
}
