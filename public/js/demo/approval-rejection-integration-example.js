/**
 * Approval and Rejection Event Generators - Integration Example
 * 
 * This file demonstrates how to integrate the approval and rejection
 * event generators into your application.
 */

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================

// Initialize event generators
const generators = new EventGenerators();

// Generate a random approval event
const approval = generators.generateApprovalGranted();
console.log('Approval generated:', approval.businessName);
console.log('Approved amount:', generators.formatCurrency(approval.approvedAmount));
console.log('Interest rate:', approval.interestRate + '%');
console.log('Monthly payment:', generators.formatCurrency(approval.monthlyPayment));

// Generate a random rejection event
const rejection = generators.generateRejectionIssued();
console.log('Rejection generated:', rejection.businessName);
console.log('Reason:', rejection.primaryReason);
console.log('Appealable:', rejection.appealable);

// ============================================================================
// EXAMPLE 2: Integration with Existing Application
// ============================================================================

// Scenario: User is viewing an application and you want to simulate approval
function simulateApprovalForApplication(applicationData) {
  // Generate approval using existing application data
  const approval = generators.generateApprovalGranted({
    applicationId: applicationData.id,
    businessName: applicationData.businessName,
    status: 'IN_APPROVAL',
    loanAmount: applicationData.requestedAmount,
    location: applicationData.location,
    industry: applicationData.industry,
    applicantName: applicationData.applicantName
  });
  
  // Update UI with approval details
  displayApprovalNotification(approval);
  updateApplicationStatus(applicationData.id, 'APPROVED');
  showApprovalDetails(approval);
  
  return approval;
}

// Scenario: Simulate rejection for an application
function simulateRejectionForApplication(applicationData) {
  // Generate rejection using existing application data
  const rejection = generators.generateRejectionIssued({
    applicationId: applicationData.id,
    businessName: applicationData.businessName,
    status: 'UNDER_REVIEW',
    loanAmount: applicationData.requestedAmount,
    location: applicationData.location,
    industry: applicationData.industry,
    applicantName: applicationData.applicantName
  });
  
  // Update UI with rejection details
  displayRejectionNotification(rejection);
  updateApplicationStatus(applicationData.id, 'REJECTED');
  showRejectionDetails(rejection);
  
  return rejection;
}

// ============================================================================
// EXAMPLE 3: Display Approval in UI
// ============================================================================

function displayApprovalNotification(approval) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification notification-success';
  notification.innerHTML = `
    <div class="notification-icon">🎉</div>
    <div class="notification-content">
      <div class="notification-title">Application Approved!</div>
      <div class="notification-message">
        ${approval.businessName} has been approved for 
        ${generators.formatCurrency(approval.approvedAmount)}
      </div>
      <div class="notification-meta">
        Approved by ${approval.approvedBy} • ${approval.approvalType}
      </div>
    </div>
  `;
  
  // Add to notification container
  document.getElementById('notifications').appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => notification.remove(), 5000);
}

function showApprovalDetails(approval) {
  // Update approval details panel
  const detailsHTML = `
    <div class="approval-details">
      <h3>Approval Details</h3>
      
      <div class="approval-summary">
        <div class="approval-badge ${approval.approvalType.toLowerCase().replace(' ', '-')}">
          ${approval.approvalType}
        </div>
        <div class="approval-amount">
          ${generators.formatCurrency(approval.approvedAmount)}
        </div>
      </div>
      
      <div class="loan-terms">
        <h4>Loan Terms</h4>
        <div class="term-row">
          <span class="term-label">Interest Rate:</span>
          <span class="term-value">${approval.interestRate}%</span>
        </div>
        <div class="term-row">
          <span class="term-label">Term:</span>
          <span class="term-value">${approval.termMonths} months</span>
        </div>
        <div class="term-row">
          <span class="term-label">Monthly Payment:</span>
          <span class="term-value">${generators.formatCurrency(approval.monthlyPayment)}</span>
        </div>
        <div class="term-row">
          <span class="term-label">Funding Date:</span>
          <span class="term-value">${approval.fundingDate.toLocaleDateString()}</span>
        </div>
        <div class="term-row">
          <span class="term-label">First Payment Due:</span>
          <span class="term-value">${approval.firstPaymentDue.toLocaleDateString()}</span>
        </div>
      </div>
      
      ${approval.hasConditions ? `
        <div class="approval-conditions">
          <h4>Conditions</h4>
          <ul>
            ${approval.conditions.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="required-documents">
        <h4>Required Documents</h4>
        <ul>
          ${approval.requiredDocuments.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>
      
      <div class="next-steps">
        <h4>Next Steps</h4>
        <ol>
          ${approval.nextSteps.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>
      
      <div class="approval-notes">
        <h4>Notes</h4>
        <p>${approval.notes}</p>
      </div>
    </div>
  `;
  
  document.getElementById('approval-details-container').innerHTML = detailsHTML;
}

// ============================================================================
// EXAMPLE 4: Display Rejection in UI
// ============================================================================

function displayRejectionNotification(rejection) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification notification-error';
  notification.innerHTML = `
    <div class="notification-icon">❌</div>
    <div class="notification-content">
      <div class="notification-title">Application Rejected</div>
      <div class="notification-message">
        ${rejection.businessName} application has been rejected
      </div>
      <div class="notification-meta">
        Rejected by ${rejection.rejectedBy} • ${rejection.category}
      </div>
    </div>
  `;
  
  // Add to notification container
  document.getElementById('notifications').appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => notification.remove(), 5000);
}

function showRejectionDetails(rejection) {
  // Update rejection details panel
  const detailsHTML = `
    <div class="rejection-details">
      <h3>Rejection Details</h3>
      
      <div class="rejection-summary">
        <div class="rejection-badge">${rejection.category}</div>
        <div class="rejection-amount">
          Requested: ${generators.formatCurrency(rejection.requestedAmount)}
        </div>
      </div>
      
      <div class="rejection-reasons">
        <h4>Rejection Reasons</h4>
        <div class="primary-reason">
          <strong>Primary:</strong> ${rejection.primaryReason}
        </div>
        ${rejection.secondaryReasons.length > 0 ? `
          <div class="secondary-reasons">
            <strong>Additional concerns:</strong>
            <ul>
              ${rejection.secondaryReasons.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
      
      <div class="risk-assessment">
        <h4>Risk Assessment</h4>
        <div class="risk-score">
          <span class="risk-label">Overall Risk:</span>
          <span class="risk-value">${rejection.riskAssessment.overallRiskScore}/100</span>
        </div>
        <div class="risk-breakdown">
          <div class="risk-item">
            <span>Credit Risk:</span>
            <span>${rejection.riskAssessment.creditRisk}/100</span>
          </div>
          <div class="risk-item">
            <span>Business Risk:</span>
            <span>${rejection.riskAssessment.businessRisk}/100</span>
          </div>
          <div class="risk-item">
            <span>Financial Risk:</span>
            <span>${rejection.riskAssessment.financialRisk}/100</span>
          </div>
        </div>
      </div>
      
      ${rejection.appealable ? `
        <div class="appeal-information">
          <h4>Appeal Information</h4>
          <p><strong>You can appeal this decision!</strong></p>
          <p>Deadline: ${rejection.appealDetails.deadline.toLocaleDateString()}</p>
          <p>Process: ${rejection.appealDetails.process}</p>
          <div class="appeal-requirements">
            <strong>Required for appeal:</strong>
            <ul>
              ${rejection.appealDetails.requirements.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
          <button class="btn btn-primary" onclick="startAppealProcess('${rejection.rejectionId}')">
            File an Appeal
          </button>
        </div>
      ` : ''}
      
      ${rejection.canReapply ? `
        <div class="reapplication-guidance">
          <h4>Reapplication Guidance</h4>
          <p>You may reapply after <strong>${rejection.reapplicationGuidance.waitingPeriod} days</strong></p>
          <div class="recommendations">
            <strong>Recommendations:</strong>
            <ul>
              ${rejection.reapplicationGuidance.recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
          <div class="improvement-areas">
            <strong>Areas to improve:</strong>
            <ul>
              ${rejection.reapplicationGuidance.improvementAreas.map(a => `<li>${a}</li>`).join('')}
            </ul>
          </div>
        </div>
      ` : ''}
      
      ${rejection.alternativeOptions.length > 0 ? `
        <div class="alternative-options">
          <h4>Alternative Financing Options</h4>
          ${rejection.alternativeOptions.map(opt => `
            <div class="alternative-option">
              <div class="option-type">${opt.type}</div>
              <div class="option-description">${opt.description}</div>
              <div class="option-likelihood">Likelihood: ${opt.likelihood}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="next-steps">
        <h4>Next Steps</h4>
        <ol>
          ${rejection.nextSteps.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>
      
      <div class="rejection-notes">
        <h4>Detailed Notes</h4>
        <p>${rejection.notes}</p>
      </div>
    </div>
  `;
  
  document.getElementById('rejection-details-container').innerHTML = detailsHTML;
}

// ============================================================================
// EXAMPLE 5: Integration with Live Simulator
// ============================================================================

class LiveSimulatorWithApprovalRejection {
  constructor() {
    this.generators = new EventGenerators();
    this.eventQueue = [];
    this.isRunning = false;
  }
  
  start() {
    this.isRunning = true;
    this.scheduleNextEvent();
  }
  
  stop() {
    this.isRunning = false;
  }
  
  scheduleNextEvent() {
    if (!this.isRunning) return;
    
    // Random interval between 5-15 seconds
    const interval = 5000 + Math.random() * 10000;
    
    setTimeout(() => {
      this.generateAndProcessEvent();
      this.scheduleNextEvent();
    }, interval);
  }
  
  generateAndProcessEvent() {
    // Select random event type with weighted probabilities
    const eventType = this.selectEventType();
    
    let event;
    switch (eventType) {
      case 'approval_granted':
        event = this.generators.generateApprovalGranted();
        this.processApprovalEvent(event);
        break;
        
      case 'rejection_issued':
        event = this.generators.generateRejectionIssued();
        this.processRejectionEvent(event);
        break;
        
      // ... other event types
    }
  }
  
  selectEventType() {
    const random = Math.random();
    
    // Event probabilities
    if (random < 0.15) return 'approval_granted';      // 15%
    if (random < 0.25) return 'rejection_issued';      // 10%
    if (random < 0.50) return 'new_application';       // 25%
    if (random < 0.70) return 'status_change';         // 20%
    if (random < 0.85) return 'document_uploaded';     // 15%
    return 'review_completed';                         // 15%
  }
  
  processApprovalEvent(approval) {
    console.log('Processing approval:', approval.businessName);
    
    // Show notification
    displayApprovalNotification(approval);
    
    // Update dashboard metrics
    this.updateDashboardMetrics('approval', approval);
    
    // Add to activity feed
    this.addToActivityFeed({
      type: 'approval_granted',
      data: approval,
      description: this.generators.generateApprovalGrantedDescription(approval)
    });
    
    // Emit event for other components
    window.dispatchEvent(new CustomEvent('demo:approval', { detail: approval }));
  }
  
  processRejectionEvent(rejection) {
    console.log('Processing rejection:', rejection.businessName);
    
    // Show notification
    displayRejectionNotification(rejection);
    
    // Update dashboard metrics
    this.updateDashboardMetrics('rejection', rejection);
    
    // Add to activity feed
    this.addToActivityFeed({
      type: 'rejection_issued',
      data: rejection,
      description: this.generators.generateRejectionIssuedDescription(rejection)
    });
    
    // Emit event for other components
    window.dispatchEvent(new CustomEvent('demo:rejection', { detail: rejection }));
  }
  
  updateDashboardMetrics(type, data) {
    // Update relevant metrics based on event type
    if (type === 'approval') {
      // Increment approved count
      // Update total approved amount
      // Update average approval time
    } else if (type === 'rejection') {
      // Increment rejected count
      // Update rejection rate
      // Track rejection reasons
    }
  }
  
  addToActivityFeed(activity) {
    // Add to activity feed UI
    const feedItem = document.createElement('div');
    feedItem.className = `activity-item activity-${activity.type}`;
    feedItem.innerHTML = `
      <div class="activity-icon">${activity.type === 'approval_granted' ? '🎉' : '❌'}</div>
      <div class="activity-content">
        <div class="activity-description">${activity.description}</div>
        <div class="activity-time">${new Date().toLocaleTimeString()}</div>
      </div>
    `;
    
    const feed = document.getElementById('activity-feed');
    feed.insertBefore(feedItem, feed.firstChild);
    
    // Keep only last 20 items
    while (feed.children.length > 20) {
      feed.removeChild(feed.lastChild);
    }
  }
}

// ============================================================================
// EXAMPLE 6: Event Listeners
// ============================================================================

// Listen for approval events
window.addEventListener('demo:approval', (event) => {
  const approval = event.detail;
  console.log('Approval event received:', approval);
  
  // Update UI components
  updateApplicationsList();
  updateDashboardCharts();
  playSuccessSound();
});

// Listen for rejection events
window.addEventListener('demo:rejection', (event) => {
  const rejection = event.detail;
  console.log('Rejection event received:', rejection);
  
  // Update UI components
  updateApplicationsList();
  updateDashboardCharts();
  playErrorSound();
});

// ============================================================================
// EXAMPLE 7: Batch Generation for Testing
// ============================================================================

function generateTestData() {
  const approvals = [];
  const rejections = [];
  
  // Generate 10 approvals
  for (let i = 0; i < 10; i++) {
    approvals.push(generators.generateApprovalGranted());
  }
  
  // Generate 10 rejections
  for (let i = 0; i < 10; i++) {
    rejections.push(generators.generateRejectionIssued());
  }
  
  console.log('Generated test data:');
  console.log('- Approvals:', approvals.length);
  console.log('- Rejections:', rejections.length);
  
  return { approvals, rejections };
}

// ============================================================================
// EXAMPLE 8: Analytics and Reporting
// ============================================================================

function analyzeApprovals(approvals) {
  const analysis = {
    totalCount: approvals.length,
    totalAmount: approvals.reduce((sum, a) => sum + a.approvedAmount, 0),
    averageAmount: 0,
    averageInterestRate: 0,
    approvalTypes: {},
    termDistribution: {},
    hasConditions: 0,
    requiresCollateral: 0,
    requiresGuarantor: 0
  };
  
  analysis.averageAmount = analysis.totalAmount / analysis.totalCount;
  analysis.averageInterestRate = approvals.reduce((sum, a) => sum + a.interestRate, 0) / approvals.length;
  
  approvals.forEach(approval => {
    // Count approval types
    analysis.approvalTypes[approval.approvalType] = 
      (analysis.approvalTypes[approval.approvalType] || 0) + 1;
    
    // Count term distribution
    analysis.termDistribution[approval.termMonths] = 
      (analysis.termDistribution[approval.termMonths] || 0) + 1;
    
    // Count conditions, collateral, guarantor
    if (approval.hasConditions) analysis.hasConditions++;
    if (approval.requiresCollateral) analysis.requiresCollateral++;
    if (approval.requiresGuarantor) analysis.requiresGuarantor++;
  });
  
  return analysis;
}

function analyzeRejections(rejections) {
  const analysis = {
    totalCount: rejections.length,
    categories: {},
    primaryReasons: {},
    appealable: 0,
    canReapply: 0,
    averageRiskScore: 0
  };
  
  analysis.averageRiskScore = rejections.reduce((sum, r) => 
    sum + r.riskAssessment.overallRiskScore, 0) / rejections.length;
  
  rejections.forEach(rejection => {
    // Count categories
    analysis.categories[rejection.category] = 
      (analysis.categories[rejection.category] || 0) + 1;
    
    // Count primary reasons
    analysis.primaryReasons[rejection.primaryReason] = 
      (analysis.primaryReasons[rejection.primaryReason] || 0) + 1;
    
    // Count appealable and reapply
    if (rejection.appealable) analysis.appealable++;
    if (rejection.canReapply) analysis.canReapply++;
  });
  
  return analysis;
}

// ============================================================================
// Helper Functions
// ============================================================================

function updateApplicationStatus(applicationId, newStatus) {
  // Update application status in your data store
  console.log(`Updating application ${applicationId} to status: ${newStatus}`);
}

function updateApplicationsList() {
  // Refresh applications list UI
  console.log('Updating applications list');
}

function updateDashboardCharts() {
  // Refresh dashboard charts
  console.log('Updating dashboard charts');
}

function playSuccessSound() {
  // Play success sound effect
  console.log('Playing success sound');
}

function playErrorSound() {
  // Play error sound effect
  console.log('Playing error sound');
}

function startAppealProcess(rejectionId) {
  // Start appeal process for rejection
  console.log('Starting appeal process for:', rejectionId);
}

// ============================================================================
// Export for use in other modules
// ============================================================================

if (typeof window !== 'undefined') {
  window.ApprovalRejectionIntegration = {
    simulateApprovalForApplication,
    simulateRejectionForApplication,
    displayApprovalNotification,
    displayRejectionNotification,
    showApprovalDetails,
    showRejectionDetails,
    LiveSimulatorWithApprovalRejection,
    generateTestData,
    analyzeApprovals,
    analyzeRejections
  };
}
