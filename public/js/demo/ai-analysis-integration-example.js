/**
 * AI Analysis Complete Event - Integration Example
 * Demonstrates how to integrate AI analysis events into the demo mode
 */

// Example 1: Basic Integration with Live Simulator
// ================================================

class LiveSimulatorWithAI {
  constructor() {
    this.generators = new EventGenerators();
    this.eventProbabilities = {
      new_application: 0.20,
      status_change: 0.15,
      document_uploaded: 0.15,
      review_completed: 0.15,
      approval_granted: 0.10,
      rejection_issued: 0.05,
      comment_added: 0.10,
      ai_analysis_complete: 0.10  // AI analysis events
    };
  }
  
  generateEvent() {
    const eventType = this.selectEventType();
    
    if (eventType === 'ai_analysis_complete') {
      const eventData = this.generators.generateAIAnalysisComplete();
      
      return {
        type: 'ai_analysis_complete',
        data: eventData,
        timestamp: new Date(),
        notification: {
          title: 'AI Analysis Complete',
          message: `${eventData.businessName} - Risk: ${eventData.riskScore}/100 (${eventData.riskLevel})`,
          icon: '🤖',
          color: '#06b6d4',
          priority: eventData.requiresManualReview ? 'high' : 'normal',
          duration: 5000
        }
      };
    }
    
    // ... other event types
  }
  
  selectEventType() {
    const random = Math.random();
    let cumulative = 0;
    
    for (const [type, probability] of Object.entries(this.eventProbabilities)) {
      cumulative += probability;
      if (random <= cumulative) {
        return type;
      }
    }
    
    return 'new_application';
  }
}

// Example 2: Display AI Analysis in Dashboard
// ===========================================

function displayAIAnalysisEvent(analysisData) {
  // Create AI insights card
  const insightsCard = document.createElement('div');
  insightsCard.className = 'ai-insights-card';
  insightsCard.innerHTML = `
    <div class="ai-insights-header">
      <span class="ai-icon">🤖</span>
      <h3>AI Analysis Complete</h3>
      <span class="ai-confidence">${analysisData.confidence}% confidence</span>
    </div>
    
    <div class="ai-insights-body">
      <div class="business-info">
        <h4>${analysisData.businessName}</h4>
        <p>${analysisData.location} • ${analysisData.industry}</p>
      </div>
      
      <div class="risk-score-section">
        <div class="risk-score-display">
          <div class="risk-score-value ${analysisData.riskLevel}">
            ${analysisData.riskScore}
          </div>
          <div class="risk-score-label">
            Risk Score
            <span class="risk-level">${analysisData.riskLevel.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>
        
        <div class="approval-probability">
          <div class="probability-bar">
            <div class="probability-fill" style="width: ${analysisData.approvalProbability}%"></div>
          </div>
          <span class="probability-label">${analysisData.approvalProbability}% Approval Probability</span>
        </div>
      </div>
      
      <div class="key-insights">
        <h5>Key Insights</h5>
        <ul>
          ${analysisData.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
      
      <div class="recommendations">
        <h5>Recommendations</h5>
        ${analysisData.recommendations.map(rec => `
          <div class="recommendation ${rec.priority}">
            <span class="rec-action">${rec.action}</span>
            <span class="rec-priority">${rec.priority}</span>
            <p class="rec-rationale">${rec.rationale}</p>
          </div>
        `).join('')}
      </div>
      
      ${analysisData.flags.length > 0 ? `
        <div class="ai-flags">
          <h5>Alerts</h5>
          ${analysisData.flags.map(flag => `
            <div class="flag ${flag.severity}">
              <span class="flag-icon">⚠️</span>
              <div class="flag-content">
                <p class="flag-message">${flag.message}</p>
                <p class="flag-action">Action: ${flag.action}</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="analysis-metadata">
        <span class="analysis-time">Analyzed ${formatTimeAgo(analysisData.analyzedAt)}</span>
        <span class="processing-time">Processing: ${analysisData.processingTimeMs}ms</span>
      </div>
    </div>
  `;
  
  // Add to dashboard
  const aiInsightsContainer = document.getElementById('ai-insights-container');
  if (aiInsightsContainer) {
    aiInsightsContainer.prepend(insightsCard);
    
    // Animate in
    setTimeout(() => insightsCard.classList.add('visible'), 10);
  }
}

// Example 3: Update Application Detail Page
// =========================================

function updateApplicationWithAIAnalysis(applicationId, analysisData) {
  // Update risk score badge
  const riskBadge = document.querySelector(`[data-app-id="${applicationId}"] .risk-badge`);
  if (riskBadge) {
    riskBadge.textContent = `Risk: ${analysisData.riskScore}`;
    riskBadge.className = `risk-badge risk-${analysisData.riskLevel}`;
  }
  
  // Update AI insights section
  const aiSection = document.querySelector(`[data-app-id="${applicationId}"] .ai-analysis-section`);
  if (aiSection) {
    aiSection.innerHTML = `
      <div class="ai-analysis-header">
        <h4>AI Risk Analysis</h4>
        <span class="ai-badge">AI Analyzed</span>
      </div>
      
      <div class="financial-metrics">
        <h5>Financial Analysis</h5>
        <div class="metrics-grid">
          <div class="metric">
            <label>Debt-to-Income</label>
            <value>${analysisData.financialAnalysis.debtToIncomeRatio}</value>
          </div>
          <div class="metric">
            <label>Debt Service Coverage</label>
            <value>${analysisData.financialAnalysis.debtServiceCoverageRatio}</value>
          </div>
          <div class="metric">
            <label>Current Ratio</label>
            <value>${analysisData.financialAnalysis.currentRatio}</value>
          </div>
          <div class="metric">
            <label>Profit Margin</label>
            <value>${analysisData.financialAnalysis.profitMargin}</value>
          </div>
          <div class="metric">
            <label>Revenue Growth</label>
            <value>${analysisData.financialAnalysis.revenueGrowth}</value>
          </div>
          <div class="metric">
            <label>Financial Health</label>
            <value>${analysisData.financialAnalysis.overallFinancialHealth}/100</value>
          </div>
        </div>
      </div>
      
      <div class="credit-assessment">
        <h5>Credit Assessment</h5>
        <div class="credit-score-display">
          <div class="credit-score">${analysisData.creditAssessment.estimatedCreditScore}</div>
          <div class="credit-rating">${analysisData.creditAssessment.creditRating}</div>
        </div>
        <div class="credit-details">
          <p>Payment History: ${analysisData.creditAssessment.paymentHistory}/100</p>
          <p>Credit Utilization: ${analysisData.creditAssessment.creditUtilization}</p>
          <p>Credit Age: ${analysisData.creditAssessment.creditAge}</p>
        </div>
      </div>
      
      <div class="risk-factors">
        <h5>Risk Factors</h5>
        ${analysisData.riskFactors.map(factor => `
          <div class="risk-factor ${factor.severity}">
            <span class="factor-name">${factor.factor}</span>
            <span class="factor-impact">Impact: ${factor.impact}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="positive-indicators">
        <h5>Positive Indicators</h5>
        ${analysisData.positiveIndicators.map(indicator => `
          <div class="positive-indicator ${indicator.strength}">
            <span class="indicator-name">${indicator.indicator}</span>
            <span class="indicator-impact">Impact: +${indicator.impact}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// Example 4: Show AI Analysis Notification
// ========================================

function showAIAnalysisNotification(analysisData) {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = 'toast-notification ai-analysis';
  
  // Determine notification style based on risk level
  const notificationStyles = {
    low: { icon: '✅', color: '#10b981', title: 'Low Risk' },
    medium: { icon: '⚠️', color: '#f59e0b', title: 'Medium Risk' },
    high: { icon: '🔴', color: '#ef4444', title: 'High Risk' },
    very_high: { icon: '🚨', color: '#dc2626', title: 'Very High Risk' }
  };
  
  const style = notificationStyles[analysisData.riskLevel];
  
  toast.innerHTML = `
    <div class="toast-icon" style="background-color: ${style.color}">
      ${style.icon}
    </div>
    <div class="toast-content">
      <div class="toast-header">
        <span class="toast-title">AI Analysis Complete</span>
        <span class="toast-risk-level" style="color: ${style.color}">${style.title}</span>
      </div>
      <div class="toast-body">
        <p class="toast-business">${analysisData.businessName}</p>
        <p class="toast-details">
          Risk Score: ${analysisData.riskScore}/100 • 
          Confidence: ${analysisData.confidence}% • 
          Approval: ${analysisData.approvalProbability}%
        </p>
        ${analysisData.requiresManualReview ? 
          '<p class="toast-alert">⚠️ Manual review recommended</p>' : ''}
      </div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  // Add to notification container
  const container = document.getElementById('notification-container') || document.body;
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('visible'), 10);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}

// Example 5: Activity Feed Integration
// ====================================

function addAIAnalysisToActivityFeed(analysisData) {
  const activityFeed = document.getElementById('activity-feed');
  if (!activityFeed) return;
  
  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item ai-analysis';
  activityItem.innerHTML = `
    <div class="activity-icon">🤖</div>
    <div class="activity-content">
      <div class="activity-header">
        <span class="activity-title">AI Analysis Complete</span>
        <span class="activity-time">${formatTimeAgo(analysisData.analyzedAt)}</span>
      </div>
      <div class="activity-body">
        <p><strong>${analysisData.businessName}</strong></p>
        <p>Risk Score: <span class="risk-score ${analysisData.riskLevel}">${analysisData.riskScore}/100</span></p>
        <p>Confidence: ${analysisData.confidence}% • Approval Probability: ${analysisData.approvalProbability}%</p>
        ${analysisData.requiresManualReview ? 
          '<p class="manual-review-flag">⚠️ Manual review recommended</p>' : ''}
      </div>
      <div class="activity-actions">
        <button onclick="viewAIAnalysisDetails('${analysisData.analysisId}')">View Details</button>
        <button onclick="viewApplication('${analysisData.applicationId}')">View Application</button>
      </div>
    </div>
  `;
  
  // Add to feed (prepend for newest first)
  activityFeed.prepend(activityItem);
  
  // Animate in
  setTimeout(() => activityItem.classList.add('visible'), 10);
  
  // Limit feed to 50 items
  const items = activityFeed.querySelectorAll('.activity-item');
  if (items.length > 50) {
    items[items.length - 1].remove();
  }
}

// Example 6: Dashboard Metrics Update
// ===================================

function updateDashboardMetricsWithAI(analysisData) {
  // Update AI analysis count
  const aiCountElement = document.getElementById('ai-analysis-count');
  if (aiCountElement) {
    const currentCount = parseInt(aiCountElement.textContent) || 0;
    aiCountElement.textContent = currentCount + 1;
    aiCountElement.classList.add('updated');
    setTimeout(() => aiCountElement.classList.remove('updated'), 500);
  }
  
  // Update average risk score
  const avgRiskElement = document.getElementById('avg-risk-score');
  if (avgRiskElement) {
    // In a real implementation, you'd calculate the actual average
    // For demo, we'll just show the current score
    avgRiskElement.textContent = analysisData.riskScore;
    avgRiskElement.className = `avg-risk-score risk-${analysisData.riskLevel}`;
  }
  
  // Update manual review queue if needed
  if (analysisData.requiresManualReview) {
    const reviewQueueElement = document.getElementById('manual-review-queue');
    if (reviewQueueElement) {
      const currentQueue = parseInt(reviewQueueElement.textContent) || 0;
      reviewQueueElement.textContent = currentQueue + 1;
      reviewQueueElement.classList.add('updated');
      setTimeout(() => reviewQueueElement.classList.remove('updated'), 500);
    }
  }
}

// Example 7: Detailed Analysis Modal
// ==================================

function showAIAnalysisModal(analysisData) {
  const modal = document.createElement('div');
  modal.className = 'modal ai-analysis-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>🤖 AI Risk Analysis</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      
      <div class="modal-body">
        <div class="analysis-summary">
          <h3>${analysisData.businessName}</h3>
          <p>${analysisData.location} • ${analysisData.industry}</p>
          <p>Loan Amount: ${formatCurrency(analysisData.loanAmount)}</p>
        </div>
        
        <div class="analysis-scores">
          <div class="score-card">
            <label>Risk Score</label>
            <div class="score-value ${analysisData.riskLevel}">${analysisData.riskScore}/100</div>
            <div class="score-label">${analysisData.riskLevel.replace('_', ' ').toUpperCase()}</div>
          </div>
          <div class="score-card">
            <label>Confidence</label>
            <div class="score-value">${analysisData.confidence}%</div>
          </div>
          <div class="score-card">
            <label>Approval Probability</label>
            <div class="score-value">${analysisData.approvalProbability}%</div>
          </div>
          <div class="score-card">
            <label>Viability Score</label>
            <div class="score-value">${analysisData.viabilityScore}/100</div>
          </div>
        </div>
        
        <div class="analysis-tabs">
          <button class="tab-button active" onclick="showTab('insights')">Insights</button>
          <button class="tab-button" onclick="showTab('financial')">Financial</button>
          <button class="tab-button" onclick="showTab('credit')">Credit</button>
          <button class="tab-button" onclick="showTab('market')">Market</button>
          <button class="tab-button" onclick="showTab('recommendations')">Recommendations</button>
        </div>
        
        <div class="tab-content" id="insights-tab">
          <!-- Key insights, risk factors, positive indicators -->
        </div>
        
        <div class="tab-content" id="financial-tab" style="display: none;">
          <!-- Financial analysis details -->
        </div>
        
        <div class="tab-content" id="credit-tab" style="display: none;">
          <!-- Credit assessment details -->
        </div>
        
        <div class="tab-content" id="market-tab" style="display: none;">
          <!-- Market analysis details -->
        </div>
        
        <div class="tab-content" id="recommendations-tab" style="display: none;">
          <!-- Recommendations and next actions -->
        </div>
      </div>
      
      <div class="modal-footer">
        <button onclick="exportAIAnalysis('${analysisData.analysisId}')">Export Report</button>
        <button onclick="viewApplication('${analysisData.applicationId}')">View Application</button>
        <button onclick="this.closest('.modal').remove()">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('visible'), 10);
}

// Utility Functions
// ================

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.AIAnalysisIntegration = {
    displayAIAnalysisEvent,
    updateApplicationWithAIAnalysis,
    showAIAnalysisNotification,
    addAIAnalysisToActivityFeed,
    updateDashboardMetricsWithAI,
    showAIAnalysisModal
  };
}
