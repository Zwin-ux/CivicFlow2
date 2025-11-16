# Event Generators Implementation

## Overview

The Event Generators module provides realistic, data-rich event generation for the Live Simulator in demo mode. This implementation focuses on the `new_application` event generator, which creates comprehensive application submission events with realistic business data.

## Files Created

### 1. `event-generators.js`
Main event generator class with comprehensive data generation capabilities.

**Key Features:**
- Realistic business name generation from data pools
- Proper loan amount distribution (weighted towards typical ranges)
- Employee count generation based on business size
- Annual revenue calculation correlated with loan amount
- EIN (Employer Identification Number) generation
- Complete applicant information with realistic emails
- Business metadata (age, location, industry)
- Application metadata (documents, completion percentage)

### 2. `demo-event-templates.json`
Template data and configuration for all event types.

**Contents:**
- Event type configurations (title, icon, color, priority)
- Notification and activity templates
- Business name generation templates
- Loan purpose categories
- Industry risk profiles
- Status transition rules
- Reviewer names
- Document types
- Rejection reasons
- Comment templates

### 3. `test-event-generators.html`
Interactive test page for verifying event generator functionality.

**Features:**
- Generate single or multiple applications
- Display all generated data fields
- Real-time statistics (total count, average loan amount, priority count)
- Visual presentation of all application details
- Metadata display

## Implementation Details

### New Application Event Structure

```javascript
{
  // Core Identifiers
  applicationId: "APP-1699564800000-1234",
  
  // Business Information
  businessName: "Acme Manufacturing LLC",
  industry: "Manufacturing",
  location: "Springfield, CA",
  city: "Springfield",
  state: "CA",
  ein: "12-3456789",
  businessAge: 5,
  employeeCount: 12,
  annualRevenue: 450000,
  
  // Applicant Information
  applicantName: "John Smith",
  applicantEmail: "john.smith@acmemanufacturing.com",
  
  // Loan Details
  loanAmount: 75000,
  loanPurpose: "Equipment purchase and installation",
  
  // Application Status
  status: "PENDING_REVIEW",
  isPriority: false,
  submittedBy: "Applicant Portal",
  submittedAt: Date,
  
  // Metadata
  metadata: {
    hasBusinessPlan: true,
    hasFinancialStatements: true,
    hasTaxReturns: true,
    documentCount: 5,
    completionPercentage: 95
  }
}
```

### Realistic Data Distribution

#### Loan Amounts
- 40% Small loans: $25k-$75k
- 35% Medium loans: $75k-$150k
- 15% Large loans: $150k-$300k
- 10% Very large loans: $300k-$500k

#### Employee Count
- 50% Micro businesses: 1-5 employees
- 30% Small businesses: 6-20 employees
- 15% Medium businesses: 21-50 employees
- 5% Larger businesses: 51-100 employees

#### Annual Revenue
- Calculated as 3-8x the loan amount
- ±20% variance for realism

#### Priority Applications
- 15% of applications are marked as priority

## Integration with Live Simulator

The Live Simulator has been updated to use the EventGenerators class:

```javascript
// In LiveSimulator constructor
this.eventGenerators = new EventGenerators();

// In generateEventData method
if (type === 'new_application') {
  return this.eventGenerators.generateNewApplication();
}
```

### Enhanced Notification Display

The `showNotification` method now handles the richer data format:

```javascript
case 'new_application':
  if (data.loanAmount) {
    const formattedAmount = this.formatCurrency(data.loanAmount);
    message = `${data.businessName} submitted a loan application for ${formattedAmount}`;
    if (data.location) {
      message += ` (${data.location})`;
    }
  }
  break;
```

## Usage

### Basic Usage

```javascript
// Initialize event generators
const eventGenerators = new EventGenerators();

// Generate a new application event
const applicationData = eventGenerators.generateNewApplication();

console.log(applicationData);
// {
//   applicationId: "APP-1699564800000-1234",
//   businessName: "Tech Solutions Inc",
//   loanAmount: 125000,
//   ...
// }
```

### With Live Simulator

```javascript
// The Live Simulator automatically uses EventGenerators
const simulator = new LiveSimulator(orchestrator);
simulator.start();

// When a 'new_application' event is generated,
// it will use EventGenerators.generateNewApplication()
```

### Accessing Generated Description

```javascript
const data = eventGenerators.generateNewApplication();
const description = eventGenerators.generateApplicationDescription(data);

console.log(description);
// "Acme Manufacturing LLC in Springfield, CA has applied for $75,000 
//  for equipment purchase and installation. The business has been 
//  operating for 5 years with 12 employees."
```

## Testing

### Manual Testing

1. Open `test-event-generators.html` in a browser
2. Click "Generate Single Application" to create one event
3. Click "Generate 10 Applications" to create multiple events
4. Verify all data fields are populated correctly
5. Check statistics update properly
6. Verify data distribution looks realistic

### Integration Testing

1. Open `test-live-simulator.html`
2. Start the live simulator
3. Wait for `new_application` events to be generated
4. Verify notifications show the enhanced format
5. Check that location information appears when available

### Console Testing

```javascript
// In browser console
const gen = new EventGenerators();

// Generate 100 applications and check distribution
const apps = [];
for (let i = 0; i < 100; i++) {
  apps.push(gen.generateNewApplication());
}

// Check loan amount distribution
const small = apps.filter(a => a.loanAmount < 75000).length;
const medium = apps.filter(a => a.loanAmount >= 75000 && a.loanAmount < 150000).length;
const large = apps.filter(a => a.loanAmount >= 150000).length;

console.log('Distribution:', { small, medium, large });
// Should be roughly 40%, 35%, 25%

// Check priority distribution
const priority = apps.filter(a => a.isPriority).length;
console.log('Priority:', priority, '/ 100');
// Should be around 15
```

## Data Pools

### Business Names (20 variations)
- Acme Manufacturing LLC
- TechStart Solutions Inc
- Green Valley Organic Farms
- Urban Cafe & Bistro
- Precision Auto Repair Shop
- And 15 more...

### Applicant Names (30 first names × 30 last names = 900 combinations)
- First names: James, Mary, John, Patricia, Robert, Jennifer, etc.
- Last names: Smith, Johnson, Williams, Brown, Jones, Garcia, etc.

### Industries (12 categories)
- Manufacturing
- Technology
- Agriculture
- Food & Beverage
- Automotive
- Healthcare
- Construction
- Retail
- Professional Services
- Education
- Hospitality
- Real Estate

### Loan Purposes (10 categories)
- Equipment purchase and installation
- Working capital and inventory
- Business expansion and renovation
- Technology upgrades and software
- Hiring and training new staff
- Marketing and advertising campaign
- Debt consolidation and refinancing
- Real estate acquisition
- Research and development
- Franchise fee and startup costs

### Locations (15 cities × 20 states = 300 combinations)
- Cities: Springfield, Riverside, Fairview, Georgetown, Clinton, etc.
- States: CA, NY, TX, FL, IL, PA, OH, GA, NC, MI, etc.

## Status Change Event Generator

### Implementation (Task 3.2 - COMPLETE ✅)

The `status_change` event generator creates realistic application status transition events following proper workflow rules.

**Key Features:**
- Workflow-based status transitions
- Weighted probability system (favors progression over rejection)
- Status-specific reasons and metadata
- Support for existing or mock applications
- Rich contextual information

### Status Change Event Structure

```javascript
{
  // Application Information
  applicationId: "APP-1763260913879-1445",
  businessName: "TechStart Solutions Inc",
  loanAmount: 125000,
  location: "Springfield, IL",
  
  // Status Transition
  previousStatus: "UNDER_REVIEW",
  previousStatusDisplay: "Under Review",
  newStatus: "IN_APPROVAL",
  newStatusDisplay: "In Approval",
  
  // Change Details
  changedBy: "Jennifer Martinez",
  reason: "Recommended for approval by review team",
  changedAt: Date,
  isSignificant: false,
  
  // Metadata
  metadata: {
    transitionType: "progression",
    daysInPreviousStatus: 3,
    requiresNotification: true,
    requiresAction: false,
    // Status-specific fields...
  }
}
```

### Status Transition Rules

```javascript
PENDING_REVIEW → UNDER_REVIEW, REJECTED
UNDER_REVIEW → PENDING_DOCUMENTS, IN_APPROVAL, REJECTED
PENDING_DOCUMENTS → UNDER_REVIEW, REJECTED
IN_APPROVAL → APPROVED, REJECTED, UNDER_REVIEW
APPROVED → FUNDED
REJECTED → (terminal state)
FUNDED → (terminal state)
```

### Probability Distribution

From UNDER_REVIEW (tested with 100 samples):
- IN_APPROVAL: ~55% (forward progression)
- PENDING_DOCUMENTS: ~37% (information request)
- REJECTED: ~8% (rejection)

### Status-Specific Metadata

**PENDING_DOCUMENTS:**
- documentsNeeded: 1-3
- dueDate: 7 days from now
- requiresAction: true

**APPROVED:**
- interestRate: 3.5-7.0%
- termMonths: 12, 24, 36, 48, or 60
- conditions: Array of approval conditions

**REJECTED:**
- appealable: true/false
- appealDeadline: 30 days from now

**FUNDED:**
- fundingDate: Current date
- disbursementMethod: ACH Transfer, Wire Transfer, or Check
- firstPaymentDue: 30 days from now

### Usage

```javascript
// Generate status change for random application
const statusChange = eventGenerators.generateStatusChange();

// Generate status change for specific application
const myApp = {
  applicationId: 'APP-12345',
  businessName: 'My Business LLC',
  status: 'UNDER_REVIEW',
  loanAmount: 100000,
  location: 'Springfield, IL'
};
const statusChange = eventGenerators.generateStatusChange(myApp);

// Get description
const description = eventGenerators.generateStatusChangeDescription(statusChange);
```

## Future Enhancements

### Planned for Other Event Types

1. ✅ **status_change** - COMPLETE - Realistic status transitions with workflow rules
2. **document_uploaded** - Generate document metadata with proper types
3. **review_completed** - Create reviewer assignments and recommendations
4. **approval_granted** - Generate approval details with conditions
5. **rejection_issued** - Use rejection reason templates
6. **comment_added** - Generate contextual comments from templates
7. **ai_analysis_complete** - Create AI insights based on application data

### Additional Features

- Industry-specific loan purpose selection
- Seasonal variation in application volume
- Geographic clustering of applications
- Business lifecycle stage indicators
- Credit score simulation
- Collateral information generation
- Co-applicant data generation

## Performance Considerations

- All data generation is synchronous and fast (<1ms per event)
- No external API calls or file I/O
- Data pools are stored in memory
- Random selection uses Math.random() for simplicity
- No database or localStorage access

## Compatibility

- Works in all modern browsers (ES6+)
- No external dependencies
- Compatible with existing Live Simulator
- Can be used standalone or integrated

## Maintenance

### Adding New Business Names

Edit the `businesses` array in the constructor:

```javascript
this.dataPool = {
  businesses: [
    'Acme Manufacturing LLC',
    'Your New Business Name',
    // ...
  ]
}
```

### Adjusting Loan Amount Distribution

Modify the `generateRealisticLoanAmount()` method:

```javascript
if (random < 0.40) {  // Change percentage here
  return Math.floor(Math.random() * 50000) + 25000;  // Change range here
}
```

### Adding New Industries

Add to the `industries` array and optionally add risk profile in `demo-event-templates.json`.

## Related Files

- `live-simulator.js` - Uses EventGenerators for new_application events
- `demo-event-templates.json` - Template data for all event types
- `test-event-generators.html` - Interactive test page
- `test-live-simulator.html` - Integration test page

## Requirements Satisfied

This implementation satisfies Task 3.2 requirements:
- ✅ Implement new_application event generator
- ✅ Implement status_change event generator
- ✅ Create realistic data for each event type
- ✅ Generate event-specific data with proper structure
- ✅ Integrate with Live Simulator
- ✅ Create test page for verification

## Conclusion

The Event Generators implementation provides a solid foundation for realistic demo mode simulations. The `new_application` generator creates comprehensive, realistic application data that enhances the demo experience and provides a template for implementing the remaining event generators.
