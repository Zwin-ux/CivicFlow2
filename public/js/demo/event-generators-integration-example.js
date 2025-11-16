/**
 * Event Generators Integration Example
 * Demonstrates how to use the EventGenerators with Live Simulator
 */

// Example 1: Basic Usage
console.log('=== Example 1: Basic Usage ===');
const eventGenerators = new EventGenerators();
const application = eventGenerators.generateNewApplication();

console.log('Generated Application:', application);
console.log('Application ID:', application.applicationId);
console.log('Business:', application.businessName);
console.log('Loan Amount:', eventGenerators.formatCurrency(application.loanAmount));
console.log('Location:', application.location);

// Example 2: Generate Multiple Applications
console.log('\n=== Example 2: Generate Multiple Applications ===');
const applications = [];
for (let i = 0; i < 5; i++) {
  applications.push(eventGenerators.generateNewApplication());
}

console.log(`Generated ${applications.length} applications`);
applications.forEach((app, index) => {
  console.log(`${index + 1}. ${app.businessName} - ${eventGenerators.formatCurrency(app.loanAmount)}`);
});

// Example 3: Analyze Distribution
console.log('\n=== Example 3: Analyze Distribution ===');
const testSet = [];
for (let i = 0; i < 100; i++) {
  testSet.push(eventGenerators.generateNewApplication());
}

// Loan amount distribution
const small = testSet.filter(a => a.loanAmount < 75000).length;
const medium = testSet.filter(a => a.loanAmount >= 75000 && a.loanAmount < 150000).length;
const large = testSet.filter(a => a.loanAmount >= 150000).length;

console.log('Loan Amount Distribution (100 applications):');
console.log(`  Small ($25k-$75k): ${small}% (expected ~40%)`);
console.log(`  Medium ($75k-$150k): ${medium}% (expected ~35%)`);
console.log(`  Large ($150k+): ${large}% (expected ~25%)`);

// Priority distribution
const priority = testSet.filter(a => a.isPriority).length;
console.log(`\nPriority Applications: ${priority}% (expected ~15%)`);

// Employee count distribution
const micro = testSet.filter(a => a.employeeCount <= 5).length;
const smallBiz = testSet.filter(a => a.employeeCount > 5 && a.employeeCount <= 20).length;
const mediumBiz = testSet.filter(a => a.employeeCount > 20).length;

console.log('\nEmployee Count Distribution:');
console.log(`  Micro (1-5): ${micro}% (expected ~50%)`);
console.log(`  Small (6-20): ${smallBiz}% (expected ~30%)`);
console.log(`  Medium+ (21+): ${mediumBiz}% (expected ~20%)`);

// Example 4: Integration with Live Simulator
console.log('\n=== Example 4: Integration with Live Simulator ===');
console.log('The Live Simulator automatically uses EventGenerators:');
console.log(`
// In LiveSimulator constructor:
this.eventGenerators = new EventGenerators();

// In generateEventData method:
if (type === 'new_application') {
  return this.eventGenerators.generateNewApplication();
}
`);

// Example 5: Generate Application Description
console.log('\n=== Example 5: Generate Application Description ===');
const sampleApp = eventGenerators.generateNewApplication();
const description = eventGenerators.generateApplicationDescription(sampleApp);
console.log('Description:', description);

// Example 6: Access Metadata
console.log('\n=== Example 6: Access Metadata ===');
const appWithMetadata = eventGenerators.generateNewApplication();
console.log('Business:', appWithMetadata.businessName);
console.log('Metadata:');
console.log('  Has Business Plan:', appWithMetadata.metadata.hasBusinessPlan);
console.log('  Has Financial Statements:', appWithMetadata.metadata.hasFinancialStatements);
console.log('  Has Tax Returns:', appWithMetadata.metadata.hasTaxReturns);
console.log('  Document Count:', appWithMetadata.metadata.documentCount);
console.log('  Completion:', appWithMetadata.metadata.completionPercentage + '%');

// Example 7: Industry Analysis
console.log('\n=== Example 7: Industry Analysis ===');
const industryCount = {};
testSet.forEach(app => {
  industryCount[app.industry] = (industryCount[app.industry] || 0) + 1;
});

console.log('Industry Distribution (100 applications):');
Object.entries(industryCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([industry, count]) => {
    console.log(`  ${industry}: ${count}`);
  });

// Example 8: Average Calculations
console.log('\n=== Example 8: Average Calculations ===');
const avgLoanAmount = testSet.reduce((sum, app) => sum + app.loanAmount, 0) / testSet.length;
const avgRevenue = testSet.reduce((sum, app) => sum + app.annualRevenue, 0) / testSet.length;
const avgEmployees = testSet.reduce((sum, app) => sum + app.employeeCount, 0) / testSet.length;
const avgBusinessAge = testSet.reduce((sum, app) => sum + app.businessAge, 0) / testSet.length;

console.log('Averages (100 applications):');
console.log('  Loan Amount:', eventGenerators.formatCurrency(avgLoanAmount));
console.log('  Annual Revenue:', eventGenerators.formatCurrency(avgRevenue));
console.log('  Employees:', avgEmployees.toFixed(1));
console.log('  Business Age:', avgBusinessAge.toFixed(1), 'years');

// Example 9: Revenue-to-Loan Ratio
console.log('\n=== Example 9: Revenue-to-Loan Ratio Analysis ===');
const ratios = testSet.map(app => app.annualRevenue / app.loanAmount);
const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
const minRatio = Math.min(...ratios);
const maxRatio = Math.max(...ratios);

console.log('Revenue-to-Loan Ratios:');
console.log('  Average:', avgRatio.toFixed(2) + 'x (expected 3-8x)');
console.log('  Min:', minRatio.toFixed(2) + 'x');
console.log('  Max:', maxRatio.toFixed(2) + 'x');

// Example 10: State Distribution
console.log('\n=== Example 10: State Distribution ===');
const stateCount = {};
testSet.forEach(app => {
  stateCount[app.state] = (stateCount[app.state] || 0) + 1;
});

console.log('Top 5 States (100 applications):');
Object.entries(stateCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([state, count]) => {
    console.log(`  ${state}: ${count}`);
  });

console.log('\n=== Integration Examples Complete ===');
console.log('Open browser console to see results');
console.log('Or open test-event-generators.html for interactive testing');
