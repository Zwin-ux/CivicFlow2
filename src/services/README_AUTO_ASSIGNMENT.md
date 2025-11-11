# Auto-Assignment Service

## Overview

The Auto-Assignment Service automatically distributes loan applications to loan officers based on configurable rules. It supports multiple assignment strategies and priority-based rule evaluation.

## Features

### Assignment Strategies

1. **Direct User Assignment (USER)**
   - Assigns applications to a specific user
   - Use case: Dedicated loan officers for specific programs

2. **Round-Robin (ROUND_ROBIN)**
   - Distributes applications evenly across a pool of users
   - Tracks last assignment to ensure fair rotation
   - Use case: Equal distribution among team members

3. **Least-Loaded (LEAST_LOADED)**
   - Assigns to the user with the fewest active applications
   - Dynamically balances workload
   - Use case: Optimal resource utilization

### Rule Conditions

Rules can match applications based on:
- **Program Types**: Array of program type strings
- **Amount Range**: Min/max requested amount
- **Risk Score Range**: Min/max risk score (calculated from fraud flags)
- **Specialization**: Required user specializations (future)

### Priority-Based Evaluation

- Rules are evaluated in priority order (highest first)
- First matching rule is applied
- Applications remain unassigned if no rules match

## Usage

### Basic Assignment

```typescript
import autoAssignmentService from './services/autoAssignmentService';

// Automatically assign an application
const assignedUserId = await autoAssignmentService.assignApplication(application);

if (assignedUserId) {
  console.log(`Application assigned to user: ${assignedUserId}`);
} else {
  console.log('No matching assignment rule found');
}
```

### Creating Assignment Rules

```typescript
import assignmentRuleRepository from './repositories/assignmentRuleRepository';

// Direct user assignment
const directRule = await assignmentRuleRepository.create({
  name: 'High-Value Loans to Senior Officer',
  priority: 100,
  condition: {
    programTypes: ['BUSINESS_LOAN'],
    amountRange: { min: 100000, max: 1000000 },
  },
  assignTo: {
    type: 'USER',
    userId: 'senior-officer-id',
  },
});

// Round-robin assignment
const roundRobinRule = await assignmentRuleRepository.create({
  name: 'Small Business Loans - Team Distribution',
  priority: 50,
  condition: {
    programTypes: ['SMALL_BUSINESS_GRANT'],
    amountRange: { min: 0, max: 50000 },
  },
  assignTo: {
    type: 'ROUND_ROBIN',
    userPool: ['user-1-id', 'user-2-id', 'user-3-id'],
  },
});

// Least-loaded assignment
const leastLoadedRule = await assignmentRuleRepository.create({
  name: 'General Applications - Load Balancing',
  priority: 10,
  condition: {
    programTypes: ['GENERAL_GRANT'],
  },
  assignTo: {
    type: 'LEAST_LOADED',
    userPool: ['user-1-id', 'user-2-id', 'user-3-id', 'user-4-id'],
  },
});
```

### Evaluating Rules

```typescript
// Find first matching rule
const matchingRule = await autoAssignmentService.findMatchingRule(application);

// Get all matching rules
const allMatchingRules = await autoAssignmentService.evaluateRules(application);

// Check if application matches a condition
const matches = autoAssignmentService.matchesCondition(application, condition);
```

### Managing Rules

```typescript
// Get all active rules
const activeRules = await assignmentRuleRepository.findActiveRulesByPriority();

// Deactivate a rule
await assignmentRuleRepository.deactivate(ruleId);

// Activate a rule
await assignmentRuleRepository.activate(ruleId);

// Update rule priority
await assignmentRuleRepository.update(ruleId, { priority: 75 });

// Delete a rule
await assignmentRuleRepository.delete(ruleId);
```

## Rule Condition Examples

### Program Type Matching

```typescript
{
  programTypes: ['BUSINESS_LOAN', 'EQUIPMENT_FINANCING']
}
```

### Amount Range

```typescript
{
  amountRange: {
    min: 10000,
    max: 100000
  }
}
```

### Risk Score Range

```typescript
{
  riskScoreRange: {
    min: 0,
    max: 30  // Low to medium risk only
  }
}
```

### Combined Conditions

```typescript
{
  programTypes: ['STARTUP_GRANT'],
  amountRange: { min: 25000, max: 75000 },
  riskScoreRange: { min: 0, max: 50 }
}
```

## Assignment Target Examples

### Direct Assignment

```typescript
{
  type: 'USER',
  userId: 'abc-123-def-456'
}
```

### Round-Robin

```typescript
{
  type: 'ROUND_ROBIN',
  userPool: [
    'user-1-id',
    'user-2-id',
    'user-3-id'
  ]
}
```

### Least-Loaded

```typescript
{
  type: 'LEAST_LOADED',
  userPool: [
    'user-1-id',
    'user-2-id',
    'user-3-id',
    'user-4-id'
  ]
}
```

## Integration with Application Workflow

The auto-assignment service is automatically triggered when an application is submitted:

```typescript
// In ApplicationService.submitApplication()
const updatedApplication = await applicationRepository.updateStatus(id, newStatus);

// Auto-assignment is triggered here
const assignedUserId = await autoAssignmentService.assignApplication(updatedApplication);

// Event is emitted for real-time updates
if (assignedUserId) {
  this.emit('applicationAssigned', {
    applicationId: id,
    assignedTo: assignedUserId,
    application: updatedApplication,
  });
}
```

## Workload Calculation

The service calculates user workload by counting active applications:

```typescript
const workload = await autoAssignmentService.getUserWorkload(userId);
// Returns count of applications in non-terminal states:
// - SUBMITTED
// - UNDER_REVIEW
// - PENDING_DOCUMENTS
// - DEFERRED
```

## Risk Score Calculation

Risk scores are calculated from fraud flags:

```typescript
// Severity weights:
// LOW: 20 points
// MEDIUM: 50 points
// HIGH: 80 points

// Example:
// Application with 2 fraud flags: [HIGH, MEDIUM]
// Risk Score = (80 + 50) / 2 = 65
```

## Error Handling

The service implements graceful error handling:

- **No Matching Rules**: Application remains unassigned (returns null)
- **Empty User Pool**: Returns null, logs error
- **Already Assigned**: Skips reassignment, returns existing assignment
- **Audit Log Failure**: Logs error but doesn't block assignment
- **Strategy Failure**: Falls back to first user in pool

## Performance Considerations

### Database Indexes

The service relies on these indexes for performance:
- `idx_assignment_rules_priority` - Fast rule retrieval
- `idx_applications_assigned_to` - Workload calculation
- `idx_assignment_rules_condition` - JSONB condition queries

### Caching Opportunities

Consider caching:
- Active assignment rules (Redis, 5-minute TTL)
- User workload counts (Redis, 1-minute TTL)
- Round-robin state (Redis)

### Query Optimization

- Rules are loaded once per assignment
- Workload queries use indexed fields
- Round-robin state uses single query

## Audit Logging

All assignments are logged to the audit log:

```typescript
{
  actionType: 'AUTO_ASSIGN_APPLICATION',
  entityType: 'APPLICATION',
  entityId: applicationId,
  performedBy: 'system',
  details: {
    assignedTo: userId,
    ruleId: rule.id,
    ruleName: rule.name,
    rulePriority: rule.priority,
    assignmentType: rule.assignTo.type
  }
}
```

## Testing

### Unit Tests

Test individual methods:
- `matchesCondition()` - Various condition combinations
- `calculateRiskScore()` - Different fraud flag scenarios
- `assignToUser()` - Direct assignment
- `assignRoundRobin()` - Rotation logic
- `assignLeastLoaded()` - Workload balancing

### Integration Tests

Test complete flows:
- Application submission → auto-assignment
- Multiple rules with different priorities
- Strategy switching
- Concurrent assignments

### Test Data

```typescript
// Create test rules
const testRule = await assignmentRuleRepository.create({
  name: 'Test Rule',
  priority: 100,
  condition: { programTypes: ['TEST_PROGRAM'] },
  assignTo: { type: 'USER', userId: 'test-user-id' },
});

// Create test application
const testApp = await applicationRepository.create({
  applicantId: 'test-applicant-id',
  programType: 'TEST_PROGRAM',
  requestedAmount: 50000,
});

// Test assignment
const assignedTo = await autoAssignmentService.assignApplication(testApp);
expect(assignedTo).toBe('test-user-id');
```

## Future Enhancements

### Planned Features
1. **User Specialization Matching** - Match applications to users with specific skills
2. **Time-Based Rules** - Assign based on business hours, shifts, or schedules
3. **Geographic Assignment** - Route applications based on location
4. **Skill-Based Routing** - Advanced matching based on user capabilities
5. **Assignment Simulation** - Test rules before activation
6. **Assignment Analytics** - Track assignment patterns and effectiveness

### Potential Optimizations
1. **Rule Caching** - Cache active rules in Redis
2. **Batch Assignment** - Process multiple applications at once
3. **Predictive Balancing** - Use ML to predict workload
4. **Smart Routing** - Learn from historical assignment success rates

## Troubleshooting

### Application Not Being Assigned

1. Check if any active rules exist:
   ```typescript
   const rules = await assignmentRuleRepository.findActiveRulesByPriority();
   console.log('Active rules:', rules.length);
   ```

2. Test rule matching:
   ```typescript
   const matches = autoAssignmentService.matchesCondition(application, rule.condition);
   console.log('Rule matches:', matches);
   ```

3. Check application status:
   ```typescript
   // Assignment only happens on submission
   console.log('Application status:', application.status);
   ```

### Round-Robin Not Rotating

1. Verify user pool:
   ```typescript
   console.log('User pool:', rule.assignTo.userPool);
   ```

2. Check last assigned user:
   ```typescript
   const lastUser = await autoAssignmentService.getLastAssignedUser(userPool);
   console.log('Last assigned:', lastUser);
   ```

### Least-Loaded Not Balancing

1. Check user workloads:
   ```typescript
   for (const userId of userPool) {
     const workload = await autoAssignmentService.getUserWorkload(userId);
     console.log(`User ${userId}: ${workload} applications`);
   }
   ```

2. Verify application status counts:
   ```typescript
   // Ensure applications are in countable states
   // (not APPROVED, REJECTED, or WITHDRAWN)
   ```

## API Reference

See the full API documentation in the service file:
- `src/services/autoAssignmentService.ts`
- `src/repositories/assignmentRuleRepository.ts`
- `src/models/assignmentRule.ts`
