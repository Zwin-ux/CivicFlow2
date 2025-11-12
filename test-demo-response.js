/**
 * Test script to verify demo mode response indicators
 * Run with: DEMO_MODE=true node test-demo-response.js
 */

const http = require('http');

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

console.log('🧪 Testing Demo Mode Response Indicators\n');
console.log(`Demo Mode: ${DEMO_MODE ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`Testing against: ${BASE_URL}\n`);

// Helper function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const headers = res.headers;
          const body = JSON.parse(data);
          resolve({ statusCode: res.statusCode, headers, body });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Test cases
async function runTests() {
  const tests = [
    {
      name: 'Health Check - Basic',
      path: '/api/v1/health',
      checks: [
        (res) => res.body.isDemo !== undefined ? '✅' : '❌',
        (res) => res.headers['x-demo-mode'] ? '✅' : '❌',
      ],
    },
    {
      name: 'Health Check - Detailed',
      path: '/api/v1/health/detailed',
      checks: [
        (res) => res.body.isDemo !== undefined ? '✅' : '❌',
        (res) => res.body.demoMode ? '✅' : '❌',
        (res) => res.headers['x-demo-mode'] ? '✅' : '❌',
      ],
    },
    {
      name: 'Health Check - Circuit Breakers',
      path: '/api/v1/health/circuit-breakers',
      checks: [
        (res) => res.body.isDemo !== undefined ? '✅' : '❌',
        (res) => res.headers['x-demo-mode'] ? '✅' : '❌',
      ],
    },
  ];

  console.log('Running tests...\n');

  for (const test of tests) {
    try {
      console.log(`📋 ${test.name}`);
      console.log(`   Path: ${test.path}`);
      
      const response = await makeRequest(test.path);
      
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Has isDemo flag: ${test.checks[0](response)}`);
      if (test.checks[1]) {
        console.log(`   Has demo mode data: ${test.checks[1](response)}`);
      }
      if (test.checks[2]) {
        console.log(`   Has X-Demo-Mode header: ${test.checks[2](response)}`);
      }
      
      if (DEMO_MODE) {
        console.log(`   isDemo value: ${response.body.isDemo}`);
        console.log(`   X-Demo-Mode header: ${response.headers['x-demo-mode']}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log('✅ Tests complete!\n');
  console.log('Expected behavior:');
  console.log('- All responses should have isDemo flag');
  console.log('- When DEMO_MODE=true, isDemo should be true');
  console.log('- When DEMO_MODE=true, X-Demo-Mode header should be present');
  console.log('- Health endpoints should include comprehensive demo mode status');
}

// Wait a bit for server to be ready, then run tests
setTimeout(() => {
  runTests().catch(console.error);
}, 2000);
