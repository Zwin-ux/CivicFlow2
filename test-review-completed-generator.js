/**
 * Test script for review_completed event generator
 * Run with: node test-review-completed-generator.js
 */

const EventGenerators = require('./public/js/demo/event-generators.js');

console.log('='.repeat(80));
console.log('REVIEW COMPLETED EVENT GENERATOR TEST');
console.log('='.repeat(80));
console.log();

// Initialize event generators
const generators = new EventGenerators();

// Test 1: Generate review without existing application
console.log('TEST 1: Generate review_completed event (no existing application)');
console.log('-'.repeat(80));
const review1 = generators.generateReviewCompleted();
console.log('Review ID:', review1.reviewId);
console.log('Application ID:', review1.applicationId);
console.log('Business Name:', review1.businessName);
console.log('Loan Amount:', generators.formatCurrency(review1.loanAmount));
console.log('Location:', review1.location);
console.log('Industry:', review1.industry);
console.log('Reviewer:', review1.reviewer);
console.log('Review Type:', review1.reviewType);
console.log('Recommendation:', review1.recommendation);
console.log('Risk Score:', `${review1.riskScore}/100`);
console.log('Confidence:', `${review1.confidence}%`);
console.log('Review Duration:', `${review1.reviewDurationMinutes} minutes`);
console.log('Priority:', review1.priority);
console.log('Is Final Review:', review1.isFinalReview);
console.log('Requires Follow-up:', review1.requiresFollowUp);
console.log();
console.log('Notes:', review1.notes);
console.log();
console.log('Findings:');
review1.findings.forEach((finding, index) => {
  console.log(`  ${index + 1}. [${finding.status.toUpperCase()}] ${finding.category}: ${finding.description}`);
});
console.log();
console.log('Checklist Completion:', `${review1.checklistCompletion}%`);
console.log('Checklist Items:');
review1.checklistItems.forEach((item, index) => {
  console.log(`  ${index + 1}. [${item.completed ? 'X' : ' '}] ${item.item}`);
});
console.log();
if (review1.conditions.length > 0) {
  console.log('Approval Conditions:');
  review1.conditions.forEach((condition, index) => {
    console.log(`  ${index + 1}. ${condition}`);
  });
  console.log();
}
if (review1.followUpDetails) {
  console.log('Follow-up Details:');
  console.log('  Type:', review1.followUpDetails.type);
  console.log('  Priority:', review1.followUpDetails.priority);
  if (review1.followUpDetails.dueDate) {
    console.log('  Due Date:', review1.followUpDetails.dueDate.toISOString());
  }
  if (review1.followUpDetails.expectedResolution) {
    console.log('  Expected Resolution:', review1.followUpDetails.expectedResolution.toISOString());
  }
  console.log();
}
console.log('Next Steps:');
review1.nextSteps.forEach((step, index) => {
  console.log(`  ${index + 1}. ${step}`);
});
console.log();
console.log('Metrics:');
console.log('  Documents Reviewed:', review1.metrics.documentsReviewed);
console.log('  Issues Identified:', review1.metrics.issuesIdentified);
console.log('  Questions Raised:', review1.metrics.questionsRaised);
console.log('  Time Spent:', `${review1.metrics.timeSpentMinutes} minutes`);
console.log('  Thoroughness Score:', `${review1.metrics.thoroughnessScore}/100`);
console.log();
console.log('Metadata:');
console.log('  Reviewer Role:', review1.metadata.reviewerRole);
console.log('  Reviewer Experience:', review1.metadata.reviewerExperience);
console.log('  Review Method:', review1.metadata.reviewMethod);
console.log('  Tools Used:', review1.metadata.toolsUsed.join(', '));
console.log('  Quality Score:', `${review1.metadata.qualityScore}/100`);
console.log();
console.log('Expertise Areas:', review1.expertiseAreas.join(', '));
console.log();
console.log('Description:', generators.generateReviewCompletedDescription(review1));
console.log();
console.log();

// Test 2: Generate review with existing application
console.log('TEST 2: Generate review_completed event (with existing application)');
console.log('-'.repeat(80));
const mockApplication = {
  applicationId: 'APP-TEST-12345',
  businessName: 'Test Manufacturing LLC',
  status: 'UNDER_REVIEW',
  loanAmount: 150000,
  location: 'Springfield, IL',
  industry: 'Manufacturing'
};
const review2 = generators.generateReviewCompleted(mockApplication);
console.log('Review ID:', review2.reviewId);
console.log('Application ID:', review2.applicationId);
console.log('Business Name:', review2.businessName);
console.log('Loan Amount:', generators.formatCurrency(review2.loanAmount));
console.log('Reviewer:', review2.reviewer);
console.log('Review Type:', review2.reviewType);
console.log('Recommendation:', review2.recommendation);
console.log('Risk Score:', `${review2.riskScore}/100`);
console.log('Description:', generators.generateReviewCompletedDescription(review2));
console.log();
console.log();

// Test 3: Generate multiple reviews to test variety
console.log('TEST 3: Generate multiple reviews to test variety');
console.log('-'.repeat(80));
const recommendations = {};
const reviewTypes = {};
const priorities = {};

for (let i = 0; i < 20; i++) {
  const review = generators.generateReviewCompleted();
  
  // Count recommendations
  recommendations[review.recommendation] = (recommendations[review.recommendation] || 0) + 1;
  
  // Count review types
  reviewTypes[review.reviewType] = (reviewTypes[review.reviewType] || 0) + 1;
  
  // Count priorities
  priorities[review.priority] = (priorities[review.priority] || 0) + 1;
}

console.log('Recommendation Distribution (20 samples):');
Object.entries(recommendations).forEach(([rec, count]) => {
  console.log(`  ${rec}: ${count} (${(count/20*100).toFixed(1)}%)`);
});
console.log();

console.log('Review Type Distribution (20 samples):');
Object.entries(reviewTypes).forEach(([type, count]) => {
  console.log(`  ${type}: ${count} (${(count/20*100).toFixed(1)}%)`);
});
console.log();

console.log('Priority Distribution (20 samples):');
Object.entries(priorities).forEach(([priority, count]) => {
  console.log(`  ${priority}: ${count} (${(count/20*100).toFixed(1)}%)`);
});
console.log();
console.log();

// Test 4: Validate data structure
console.log('TEST 4: Validate data structure');
console.log('-'.repeat(80));
const review4 = generators.generateReviewCompleted();
const requiredFields = [
  'reviewId', 'applicationId', 'businessName', 'loanAmount', 'location',
  'industry', 'reviewer', 'reviewType', 'recommendation', 'riskScore',
  'confidence', 'notes', 'findings', 'checklistItems', 'checklistCompletion',
  'requiresFollowUp', 'isFinalReview', 'nextSteps', 'metrics', 'priority',
  'expertiseAreas', 'startedAt', 'completedAt', 'reviewDurationMinutes', 'metadata'
];

console.log('Checking required fields...');
let allFieldsPresent = true;
requiredFields.forEach(field => {
  const present = review4.hasOwnProperty(field);
  if (!present) {
    console.log(`  ❌ Missing field: ${field}`);
    allFieldsPresent = false;
  }
});

if (allFieldsPresent) {
  console.log('  ✅ All required fields present');
}
console.log();

// Validate data types
console.log('Validating data types...');
const validations = [
  { field: 'reviewId', type: 'string', value: review4.reviewId },
  { field: 'applicationId', type: 'string', value: review4.applicationId },
  { field: 'businessName', type: 'string', value: review4.businessName },
  { field: 'loanAmount', type: 'number', value: review4.loanAmount },
  { field: 'riskScore', type: 'number', value: review4.riskScore },
  { field: 'confidence', type: 'number', value: review4.confidence },
  { field: 'findings', type: 'array', value: review4.findings },
  { field: 'checklistItems', type: 'array', value: review4.checklistItems },
  { field: 'nextSteps', type: 'array', value: review4.nextSteps },
  { field: 'startedAt', type: 'date', value: review4.startedAt },
  { field: 'completedAt', type: 'date', value: review4.completedAt },
  { field: 'metadata', type: 'object', value: review4.metadata }
];

let allTypesValid = true;
validations.forEach(({ field, type, value }) => {
  let valid = false;
  
  if (type === 'string') {
    valid = typeof value === 'string';
  } else if (type === 'number') {
    valid = typeof value === 'number';
  } else if (type === 'array') {
    valid = Array.isArray(value);
  } else if (type === 'date') {
    valid = value instanceof Date;
  } else if (type === 'object') {
    valid = typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  
  if (!valid) {
    console.log(`  ❌ Invalid type for ${field}: expected ${type}, got ${typeof value}`);
    allTypesValid = false;
  }
});

if (allTypesValid) {
  console.log('  ✅ All data types valid');
}
console.log();

// Validate ranges
console.log('Validating value ranges...');
const rangeValidations = [
  { field: 'riskScore', min: 0, max: 100, value: review4.riskScore },
  { field: 'confidence', min: 0, max: 100, value: review4.confidence },
  { field: 'checklistCompletion', min: 0, max: 100, value: review4.checklistCompletion },
  { field: 'reviewDurationMinutes', min: 15, max: 180, value: review4.reviewDurationMinutes }
];

let allRangesValid = true;
rangeValidations.forEach(({ field, min, max, value }) => {
  const valid = value >= min && value <= max;
  if (!valid) {
    console.log(`  ❌ ${field} out of range: ${value} (expected ${min}-${max})`);
    allRangesValid = false;
  }
});

if (allRangesValid) {
  console.log('  ✅ All value ranges valid');
}
console.log();

console.log('='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
