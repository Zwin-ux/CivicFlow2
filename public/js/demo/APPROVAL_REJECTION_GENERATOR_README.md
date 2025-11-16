# Approval and Rejection Event Generators

## Overview

The approval and rejection event generators create realistic loan application approval and rejection events for demo mode. These generators produce detailed events with proper loan terms, rejection reasons, appeal information, and all necessary metadata.

## Features

### Approval Generator (`generateApprovalGranted`)

Creates realistic loan approval events with:
- **Loan Terms**: Interest rates (3.5-7.0%), terms (12-120 months), monthly payments
- **Approval Types**: Full Approval, Partial Approval, Conditional Approval
- **Funding Details**: Funding dates, disbursement methods, first payment dates
- **Requirements**: Collateral, guarantors, required documents
- **Committee Approval**: For loans > $200k, includes committee vote details
- **Conditions**: Optional approval conditions (40% of approvals)
- **Next Steps**: Detailed action items for funding process

### Rejection Generator (`generateRejectionIssued`)

Creates detailed rejection events with:
- **Rejection Reasons**: Primary and secondary reasons from 10 realistic categories
- **Categories**: Credit, Documentation, Viability, Financial, Risk
- **Appeal Information**: Appeal deadlines, requirements, and process (70% appealable)
- **Reapplication Guidance**: Waiting periods, recommendations, improvement areas
- **Risk Assessment**: Detailed risk scores across multiple dimensions
- **Alternative Options**: Suggested alternative financing options
- **Next Steps**: Guidance for applicants after rejection

## Usage

### Basic Usage

```javascript
// Initialize generators
const generators = new EventGenerators();

// Generate approval event
const approval = generators.generateApprovalGranted();
console.log(approval.businessName, 'approved for', approval.approvedAmount);

// Generate rejection event
const rejection = generators.generateRejectionIssued();
console.log(rejection.businessName, 'rejected:', rejection.primaryReason);
```

### With Existing Application

```javascript
// Use with existing application data
const application = {
  applicationId: 'APP-12345',
  businessName: 'Acme Manufacturing LLC',
  status: 'IN_APPROVAL',
  loanAmount: 150000,
  location: 'Springfield, IL',
  industry: 'Manufacturing',
  applicantName: 'John Smith'
};

// Generate approval for this application
const approval = generators.generateApprovalGranted(application);

// Generate rejection for this application
const rejection = generators.generateRejectionIssued(application);
```

### Generate Descriptions

```javascript
// Generate human-readable descriptions
const approval = generators.generateApprovalGranted();
const description = generators.generateApprovalGrantedDescription(approval);
console.log(description);
// "Acme Manufacturing LLC approved for $150,000 by Sarah Johnson. 
//  Full Approval. Interest rate: 5.25%, Term: 48 months. 
//  Funding scheduled for 11/20/2025."

const rejection = generators.generateRejectionIssued();
const rejDescription = generators.generateRejectionIssuedDescription(rejection);
console.log(rejDescription);
// "Pet Paradise Grooming application rejected by Robert Taylor. 
//  Primary reason: Insufficient credit history. 
//  Appeal allowed within 30 days. Can reapply after 90 days."
```

## Approval Event Structure

```javascript
{
  approvalId: "APR-1234567890-12345",
  applicationId: "APP-1234567890-67890",
  businessName: "Acme Manufacturing LLC",
  applicantName: "John Smith",
  requestedAmount: 150000,
  approvedAmount: 150000,
  isFullAmount: true,
  interestRate: 5.25,
  termMonths: 48,
  monthlyPayment: 3456.78,
  approvedBy: "Sarah Johnson",
  approvedAt: Date,
  fundingDate: Date,
  firstPaymentDue: Date,
  hasConditions: false,
  conditions: [],
  notes: "Application approved for full requested amount...",
  requiredDocuments: ["Signed loan agreement", "Proof of insurance"],
  approvalType: "Full Approval",
  committeeApproval: {
    committeeMembers: 5,
    votesFor: 5,
    votesAgainst: 0,
    abstentions: 0
  },
  disbursementMethod: "ACH Transfer",
  requiresCollateral: true,
  collateralDetails: {
    required: true,
    type: "Equipment",
    valuationRequired: true,
    insuranceRequired: true
  },
  requiresGuarantor: true,
  guarantorDetails: {
    required: true,
    type: "Personal Guarantee",
    creditCheckRequired: true
  },
  priority: "high",
  nextSteps: [...],
  metrics: {
    daysToApproval: 12,
    reviewsCompleted: 3,
    documentsReviewed: 8,
    approvalScore: 92
  },
  location: "Springfield, IL",
  industry: "Manufacturing",
  metadata: {...}
}
```

## Rejection Event Structure

```javascript
{
  rejectionId: "REJ-1234567890-12345",
  applicationId: "APP-1234567890-67890",
  businessName: "Pet Paradise Grooming",
  applicantName: "Jane Doe",
  requestedAmount: 75000,
  primaryReason: "Insufficient credit history",
  secondaryReasons: ["Debt-to-income ratio exceeds limits"],
  category: "credit",
  rejectedBy: "Robert Taylor",
  rejectedAt: Date,
  notes: "After careful review, we are unable to approve...",
  appealable: true,
  appealDetails: {
    allowed: true,
    deadline: Date,
    process: "Submit written appeal with additional documentation",
    reviewedBy: "Appeals Committee",
    estimatedReviewTime: "10-15 business days",
    requirements: [
      "Updated credit report",
      "Explanation of credit issues",
      "Evidence of credit improvement"
    ]
  },
  canReapply: true,
  reapplicationGuidance: {
    allowed: true,
    waitingPeriod: 90,
    recommendations: [
      "Improve personal and business credit scores",
      "Reduce existing debt obligations"
    ],
    improvementAreas: ["Credit Score", "Payment History", "Debt Management"]
  },
  riskAssessment: {
    overallRiskScore: 75,
    creditRisk: 80,
    businessRisk: 70,
    financialRisk: 72,
    industryRisk: 65
  },
  metrics: {
    daysInReview: 10,
    reviewsCompleted: 2,
    documentsReviewed: 6,
    followUpAttempts: 2
  },
  alternativeOptions: [
    {
      type: "Microloan Program",
      description: "Explore microloan programs with less stringent requirements",
      likelihood: "High"
    }
  ],
  priority: "high",
  nextSteps: [...],
  location: "Springfield, IL",
  industry: "Retail",
  metadata: {...}
}
```

## Approval Types

1. **Full Approval** (70% of approvals)
   - Full requested amount approved
   - Standard terms and conditions
   - No amount reduction

2. **Partial Approval** (20% of approvals)
   - Reduced amount (60-95% of requested)
   - Based on cash flow analysis
   - May have adjusted terms

3. **Conditional Approval** (40% chance)
   - Approval with specific conditions
   - Requires additional documentation or actions
   - Conditions must be met before funding

## Rejection Categories

1. **Credit** (Insufficient credit history, high debt-to-income ratio)
2. **Documentation** (Incomplete or missing documents)
3. **Viability** (Unable to verify business viability)
4. **Financial** (Inadequate cash flow, insufficient collateral)
5. **Risk** (High industry risk, lack of experience)

## Realistic Features

### Approval Features
- **Interest Rates**: 3.5-7.0% based on risk
- **Loan Terms**: 12, 24, 36, 48, 60, 84, or 120 months
- **Monthly Payment Calculation**: Accurate amortization formula
- **Funding Timeline**: 3-10 days after approval
- **Committee Approval**: For loans > $200k
- **Collateral Requirements**: For loans > $100k (50% chance)
- **Guarantor Requirements**: For loans > $75k (60% chance)

### Rejection Features
- **Multiple Reasons**: Primary + 0-2 secondary reasons
- **Appeal Process**: 70% of rejections are appealable
- **Reapplication**: 60% can reapply after waiting period
- **Risk Scores**: High risk scores (70-100) for rejections
- **Alternative Options**: 2-4 alternative financing suggestions
- **Improvement Guidance**: Specific areas to improve

## Integration with Live Simulator

```javascript
// In live-simulator.js
generateEvent() {
  const eventType = this.selectEventType();
  
  if (eventType === 'approval_granted') {
    return this.eventGenerators.generateApprovalGranted();
  }
  
  if (eventType === 'rejection_issued') {
    return this.eventGenerators.generateRejectionIssued();
  }
  
  // ... other event types
}
```

## Performance

- **Generation Speed**: ~0.9ms per event
- **Throughput**: ~1,100 events per second
- **Memory**: Minimal overhead, no memory leaks
- **Scalability**: Can generate thousands of events without performance degradation

## Testing

Run the test suite:
```bash
node test-approval-rejection-generators.js
```

Tests verify:
- ✓ Approval event generation with all fields
- ✓ Rejection event generation with all fields
- ✓ Integration with existing applications
- ✓ Data variety and randomization
- ✓ Data integrity (valid dates, amounts, calculations)
- ✓ Performance benchmarks

## Best Practices

1. **Use with Existing Applications**: Pass existing application data for consistency
2. **Check Approval Type**: Handle Full, Partial, and Conditional approvals differently
3. **Display Appeal Information**: Show appeal options prominently for rejections
4. **Show Alternative Options**: Help rejected applicants with alternatives
5. **Respect Timelines**: Use funding dates and appeal deadlines in UI
6. **Display Risk Scores**: Show risk assessment for transparency
7. **Track Metrics**: Use metrics for analytics and reporting

## Future Enhancements

- [ ] Add approval modification events (amount changes, term adjustments)
- [ ] Add appeal decision events
- [ ] Add reapplication tracking
- [ ] Add approval expiration events
- [ ] Add funding completion events
- [ ] Add first payment events

## Related Files

- `event-generators.js` - Main generator class
- `demo-event-templates.json` - Event templates and data
- `live-simulator.js` - Live simulation engine
- `test-approval-rejection-generators.js` - Test suite

## Support

For issues or questions about the approval/rejection generators, see:
- Event Generators README: `EVENT_GENERATORS_README.md`
- Live Simulator README: `LIVE_SIMULATOR_README.md`
- Demo Mode Documentation: `docs/DEMO_MODE.md`
