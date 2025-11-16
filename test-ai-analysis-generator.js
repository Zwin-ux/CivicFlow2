/**
 * Test script for AI Analysis Complete Event Generator
 * Tests the generateAIAnalysisComplete method
 */

// Load the EventGenerators class
const EventGenerators = require('./public/js/demo/event-generators.js');

console.log('=== AI Analysis Complete Event Generator Test ===\n');

// Create instance
const generators = new EventGenerators();

// Test 1: Generate AI analysis without existing application
console.log('Test 1: Generate AI analysis (no existing application)');
console.log('---------------------------------------------------');
const analysis1 = generators.generateAIAnalysisComplete();
console.log('Analysis ID:', analysis1.analysisId);
console.log('Application ID:', analysis1.applicationId);
console.log('Business Name:', analysis1.businessName);
console.log('Loan Amount:', generators.formatCurrency(analysis1.loanAmount));
console.log('Risk Score:', analysis1.riskScore, '/ 100');
console.log('Risk Level:', analysis1.riskLevel);
console.log('Confidence:', analysis1.confidence + '%');
console.log('Approval Probability:', analysis1.approvalProbability + '%');
console.log('Requires Manual Review:', analysis1.requiresManualReview);
console.log('Processing Time:', analysis1.processingTimeMs + 'ms');
console.log('\nRisk Factors:', analysis1.riskFactors.length);
analysis1.riskFactors.forEach((factor, i) => {
  console.log(`  ${i + 1}. ${factor.factor} (Impact: ${factor.impact}, Severity: ${factor.severity})`);
});
console.log('\nPositive Indicators:', analysis1.positiveIndicators.length);
analysis1.positiveIndicators.forEach((indicator, i) => {
  console.log(`  ${i + 1}. ${indicator.indicator} (Impact: +${indicator.impact}, Strength: ${indicator.strength})`);
});
console.log('\nRecommendations:', analysis1.recommendations.length);
analysis1.recommendations.forEach((rec, i) => {
  console.log(`  ${i + 1}. ${rec.action} (Priority: ${rec.priority})`);
  console.log(`     Rationale: ${rec.rationale}`);
});
console.log('\nFinancial Analysis:');
console.log('  Debt-to-Income Ratio:', analysis1.financialAnalysis.debtToIncomeRatio);
console.log('  Debt Service Coverage:', analysis1.financialAnalysis.debtServiceCoverageRatio);
console.log('  Current Ratio:', analysis1.financialAnalysis.currentRatio);
console.log('  Profit Margin:', analysis1.financialAnalysis.profitMargin);
console.log('  Revenue Growth:', analysis1.financialAnalysis.revenueGrowth);
console.log('  Overall Financial Health:', analysis1.financialAnalysis.overallFinancialHealth);
console.log('\nCredit Assessment:');
console.log('  Estimated Credit Score:', analysis1.creditAssessment.estimatedCreditScore);
console.log('  Credit Rating:', analysis1.creditAssessment.creditRating);
console.log('  Payment History:', analysis1.creditAssessment.paymentHistory);
console.log('  Credit Utilization:', analysis1.creditAssessment.creditUtilization);
console.log('\nKey Insights:', analysis1.keyInsights.length);
analysis1.keyInsights.forEach((insight, i) => {
  console.log(`  ${i + 1}. ${insight}`);
});
console.log('\nFlags:', analysis1.flags.length);
analysis1.flags.forEach((flag, i) => {
  console.log(`  ${i + 1}. [${flag.severity.toUpperCase()}] ${flag.message}`);
  console.log(`     Action: ${flag.action}`);
});
console.log('\nNext Actions:', analysis1.nextActions.length);
analysis1.nextActions.forEach((action, i) => {
  console.log(`  ${i + 1}. ${action}`);
});
console.log('\nDescription:', generators.generateAIAnalysisCompleteDescription(analysis1));
console.log('\n');

// Test 2: Generate AI analysis with existing application
console.log('Test 2: Generate AI analysis (with existing application)');
console.log('--------------------------------------------------------');
const mockApplication = {
  applicationId: 'APP-TEST-12345',
  businessName: 'Test Manufacturing LLC',
  status: 'UNDER_REVIEW',
  loanAmount: 150000,
  location: 'Springfield, IL',
  industry: 'Manufacturing',
  applicantName: 'John Smith',
  businessAge: 5,
  employeeCount: 15,
  annualRevenue: 750000
};

const analysis2 = generators.generateAIAnalysisComplete(mockApplication);
console.log('Analysis ID:', analysis2.analysisId);
console.log('Application ID:', analysis2.applicationId);
console.log('Business Name:', analysis2.businessName);
console.log('Applicant Name:', analysis2.applicantName);
console.log('Loan Amount:', generators.formatCurrency(analysis2.loanAmount));
console.log('Industry:', analysis2.industry);
console.log('Risk Score:', analysis2.riskScore, '/ 100');
console.log('Risk Level:', analysis2.riskLevel);
console.log('Confidence:', analysis2.confidence + '%');
console.log('Viability Score:', analysis2.viabilityScore);
console.log('Approval Probability:', analysis2.approvalProbability + '%');
console.log('\nMarket Analysis:');
console.log('  Industry Growth Rate:', analysis2.marketAnalysis.industryGrowthRate);
console.log('  Market Saturation:', analysis2.marketAnalysis.marketSaturation);
console.log('  Competitive Position:', analysis2.marketAnalysis.competitivePosition);
console.log('  Market Trends:', analysis2.marketAnalysis.marketTrends);
console.log('  Industry Outlook:', analysis2.marketAnalysis.industryOutlook);
console.log('\nDocument Analysis:');
console.log('  Total Documents:', analysis2.documentAnalysis.totalDocuments);
console.log('  Documents Verified:', analysis2.documentAnalysis.documentsVerified);
console.log('  Verification Rate:', analysis2.documentAnalysis.verificationRate);
console.log('  Average Quality Score:', analysis2.documentAnalysis.averageQualityScore);
console.log('  Issues Detected:', analysis2.documentAnalysis.issuesDetected);
console.log('\nBenchmark Comparison:');
console.log('  Similar Applications:', analysis2.benchmarkComparison.similarApplications);
console.log('  Average Risk Score:', analysis2.benchmarkComparison.averageRiskScore);
console.log('  Approval Rate:', analysis2.benchmarkComparison.approvalRate);
console.log('  Industry Comparison:', analysis2.benchmarkComparison.industryComparison);
console.log('  Percentile Ranking:', analysis2.benchmarkComparison.percentileRanking);
console.log('\nModel Information:');
console.log('  Model Name:', analysis2.modelInfo.modelName);
console.log('  Model Version:', analysis2.modelInfo.modelVersion);
console.log('  Algorithms Used:', analysis2.modelInfo.algorithmsUsed.join(', '));
console.log('  Features Analyzed:', analysis2.modelInfo.featuresAnalyzed);
console.log('\nDescription:', generators.generateAIAnalysisCompleteDescription(analysis2));
console.log('\n');

// Test 3: Generate multiple analyses to verify variety
console.log('Test 3: Generate multiple analyses (variety check)');
console.log('---------------------------------------------------');
const riskScores = [];
const riskLevels = { low: 0, medium: 0, high: 0, very_high: 0 };
const requiresReview = { yes: 0, no: 0 };

for (let i = 0; i < 20; i++) {
  const analysis = generators.generateAIAnalysisComplete();
  riskScores.push(analysis.riskScore);
  riskLevels[analysis.riskLevel]++;
  requiresReview[analysis.requiresManualReview ? 'yes' : 'no']++;
}

console.log('Generated 20 analyses:');
console.log('Risk Score Range:', Math.min(...riskScores), '-', Math.max(...riskScores));
console.log('Average Risk Score:', (riskScores.reduce((a, b) => a + b, 0) / riskScores.length).toFixed(1));
console.log('\nRisk Level Distribution:');
console.log('  Low:', riskLevels.low);
console.log('  Medium:', riskLevels.medium);
console.log('  High:', riskLevels.high);
console.log('  Very High:', riskLevels.very_high);
console.log('\nManual Review Required:');
console.log('  Yes:', requiresReview.yes);
console.log('  No:', requiresReview.no);
console.log('\n');

// Test 4: Verify all required fields are present
console.log('Test 4: Verify data structure completeness');
console.log('-------------------------------------------');
const testAnalysis = generators.generateAIAnalysisComplete();
const requiredFields = [
  'analysisId', 'applicationId', 'businessName', 'applicantName', 'loanAmount',
  'location', 'industry', 'riskScore', 'riskLevel', 'confidence', 'analyzedAt',
  'processingTimeMs', 'riskFactors', 'positiveIndicators', 'recommendations',
  'financialAnalysis', 'creditAssessment', 'viabilityScore', 'marketAnalysis',
  'documentAnalysis', 'approvalProbability', 'keyInsights', 'requiresManualReview',
  'flags', 'benchmarkComparison', 'nextActions', 'modelInfo', 'metadata'
];

let allFieldsPresent = true;
const missingFields = [];

requiredFields.forEach(field => {
  if (!(field in testAnalysis)) {
    allFieldsPresent = false;
    missingFields.push(field);
  }
});

if (allFieldsPresent) {
  console.log('✓ All required fields are present');
  console.log('✓ Total fields:', Object.keys(testAnalysis).length);
} else {
  console.log('✗ Missing fields:', missingFields.join(', '));
}

// Verify nested objects
console.log('\nNested Object Verification:');
console.log('  Financial Analysis fields:', Object.keys(testAnalysis.financialAnalysis).length);
console.log('  Credit Assessment fields:', Object.keys(testAnalysis.creditAssessment).length);
console.log('  Market Analysis fields:', Object.keys(testAnalysis.marketAnalysis).length);
console.log('  Document Analysis fields:', Object.keys(testAnalysis.documentAnalysis).length);
console.log('  Benchmark Comparison fields:', Object.keys(testAnalysis.benchmarkComparison).length);
console.log('  Model Info fields:', Object.keys(testAnalysis.modelInfo).length);
console.log('  Metadata fields:', Object.keys(testAnalysis.metadata).length);

console.log('\n=== All Tests Complete ===');
