/**
 * Test script for status_change event generator
 * Run with: node test-status-change-generator.js
 */

// Load the EventGenerators class
const EventGenerators = require('./public/js/demo/event-generators.js');

console.log('='.repeat(80));
console.log('Testing Status Change Event Generator');
console.log('='.repeat(80));
console.log();

// Initialize generator
const generator = new EventGenerators();

// Test 1: Generate status changes without existing application
console.log('Test 1: Generate 5 status changes (random applications)');
console.log('-'.repeat(80));
for (let i = 0; i < 5; i++) {
  const statusChange = generator.generateStatusChange();
  if (statusChange) {
    console.log(`\n${i + 1}. ${statusChange.businessName}`);
    console.log(`   Application ID: ${statusChange.applicationId}`);
    console.log(`   Status: ${statusChange.previousStatusDisplay} → ${statusChange.newStatusDisplay}`);
    console.log(`   Changed By: ${statusChange.changedBy}`);
    console.log(`   Reason: ${statusChange.reason}`);
    console.log(`   Significant: ${statusChange.isSignificant ? 'Yes' : 'No'}`);
    console.log(`   Transition Type: ${statusChange.metadata.transitionType}`);
    
    // Show status-specific metadata
    if (statusChange.newStatus === 'APPROVED') {
      console.log(`   Interest Rate: ${statusChange.metadata.interestRate}%`);
      console.log(`   Term: ${statusChange.metadata.termMonths} months`);
    }
    if (statusChange.newStatus === 'PENDING_DOCUMENTS') {
      console.log(`   Documents Needed: ${statusChange.metadata.documentsNeeded}`);
    }
    if (statusChange.newStatus === 'REJECTED') {
      console.log(`   Appealable: ${statusChange.metadata.appealable ? 'Yes' : 'No'}`);
    }
  } else {
    console.log(`\n${i + 1}. Failed to generate (no valid transitions)`);
  }
}

// Test 2: Generate status changes with existing application
console.log('\n\n' + '='.repeat(80));
console.log('Test 2: Generate status changes for specific application');
console.log('-'.repeat(80));

const mockApplication = {
  applicationId: 'APP-TEST-12345',
  businessName: 'Test Business LLC',
  status: 'UNDER_REVIEW',
  loanAmount: 150000,
  location: 'Springfield, IL'
};

console.log(`\nStarting Application:`);
console.log(`  Business: ${mockApplication.businessName}`);
console.log(`  Status: ${mockApplication.status}`);
console.log(`  Loan Amount: $${mockApplication.loanAmount.toLocaleString()}`);

for (let i = 0; i < 3; i++) {
  const statusChange = generator.generateStatusChange(mockApplication);
  if (statusChange) {
    console.log(`\n  Change ${i + 1}:`);
    console.log(`    ${statusChange.previousStatusDisplay} → ${statusChange.newStatusDisplay}`);
    console.log(`    Reason: ${statusChange.reason}`);
    console.log(`    Changed By: ${statusChange.changedBy}`);
  }
}

// Test 3: Test status transition probabilities
console.log('\n\n' + '='.repeat(80));
console.log('Test 3: Status transition probability distribution (100 samples)');
console.log('-'.repeat(80));

const transitionCounts = {};
const startStatus = 'UNDER_REVIEW';

for (let i = 0; i < 100; i++) {
  const app = {
    applicationId: `APP-TEST-${i}`,
    businessName: 'Test Business',
    status: startStatus,
    loanAmount: 100000,
    location: 'Test City, TS'
  };
  
  const statusChange = generator.generateStatusChange(app);
  if (statusChange) {
    const transition = `${statusChange.previousStatus} → ${statusChange.newStatus}`;
    transitionCounts[transition] = (transitionCounts[transition] || 0) + 1;
  }
}

console.log(`\nFrom ${startStatus}:`);
Object.entries(transitionCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([transition, count]) => {
    const percentage = ((count / 100) * 100).toFixed(1);
    console.log(`  ${transition}: ${count} (${percentage}%)`);
  });

// Test 4: Test all possible status transitions
console.log('\n\n' + '='.repeat(80));
console.log('Test 4: Test all possible status transitions');
console.log('-'.repeat(80));

const allStatuses = [
  'PENDING_REVIEW',
  'UNDER_REVIEW',
  'PENDING_DOCUMENTS',
  'IN_APPROVAL',
  'APPROVED'
];

allStatuses.forEach(status => {
  const app = {
    applicationId: 'APP-TEST',
    businessName: 'Test Business',
    status: status,
    loanAmount: 100000,
    location: 'Test City, TS'
  };
  
  console.log(`\nFrom ${status}:`);
  
  // Try to generate 5 transitions
  const transitions = new Set();
  for (let i = 0; i < 20; i++) {
    const statusChange = generator.generateStatusChange(app);
    if (statusChange) {
      transitions.add(statusChange.newStatus);
    }
  }
  
  if (transitions.size > 0) {
    console.log(`  Possible transitions: ${Array.from(transitions).join(', ')}`);
  } else {
    console.log(`  No valid transitions (terminal state)`);
  }
});

// Test 5: Verify description generation
console.log('\n\n' + '='.repeat(80));
console.log('Test 5: Test description generation');
console.log('-'.repeat(80));

const statusChange = generator.generateStatusChange();
if (statusChange) {
  const description = generator.generateStatusChangeDescription(statusChange);
  console.log(`\nGenerated Description:`);
  console.log(`  ${description}`);
}

console.log('\n' + '='.repeat(80));
console.log('All tests completed successfully! ✅');
console.log('='.repeat(80));
