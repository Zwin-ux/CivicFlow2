/**
 * Review Completed Event Generator - Integration Example
 * 
 * This file demonstrates how to integrate the review_completed event generator
 * with the live simulator and display review completion events in the UI.
 */

// Example 1: Basic Integration with Live Simulator
// Add this to your live-simulator.js event generation logic

function integrateReviewCompletedWithSimulator() {
  // In LiveSimulator class, update event type probabilities
  const eventProbabilities = {
    new_application: 0.25,
    status_change: 0.20,
    document_uploaded: 0.20,
    review_completed: 0.15,  // <-- Add review_completed
    approval_granted: 0.08,
    rejection_issued: 0.05,
    comment_added: 0.05,
    ai_analysis_complete: 0.02
  };
  
  // In generateEvent() method, add review_completed case
  if (eventType === 'review_completed') {
    const data = this.eventGenerators.generateReviewCompleted();
    
    return {
      id: `EVT-${Date.now()}-${Math.random()}`,
      type: 'review_completed',
      timestamp: new Date(),
      data: data,
      notification: {
        title: 'Review Completed',
        message: `${data.reviewer} completed review for ${data.businessName}`,
        icon: '✅',
        color: '#10b981',
        priority: data.priority
      }
    };
  }
}

// Example 2: Display Review Completion in UI
function displayReviewCompletedEvent(event) {
  const data = event.data;
  
  // Create notification toast
  const toast = document.createElement('div');
  toast.className = 'toast-notification review-completed';
  toast.innerHTML = `
    <div class="toast-icon" style="background-color: ${event.notification.color}">
      ${event.notification.icon}
    </div>
    <div class="toast-content">
      <div class="toast-title">${event.notification.title}</div>
      <div class="toast-message">${event.notification.message}</div>
      <div class="toast-details">
        <span class="badge badge-${data.priority}">${data.priority.toUpperCase()}</span>
        <span class="review-type">${data.reviewType}</span>
        <span class="recommendation recommendation-${data.recommendation.toLowerCase().replace(/\s+/g, '-')}">
          ${data.recommendation}
        </span>
      </div>
      <div class="toast-meta">
        Risk Score: ${data.riskScore}/100 | 
        Confidence: ${data.confidence}% | 
        Duration: ${data.reviewDurationMinutes}min
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}

// Example 3: Update Dashboard Metrics
function updateDashboardForReviewCompleted(event) {
  const data = event.data;
  
  // Update review completion count
  const reviewCountElement = document.getElementById('reviews-completed-count');
  if (reviewCountElement) {
    const currentCount = parseInt(reviewCountElement.textContent) || 0;
    reviewCountElement.textContent = currentCount + 1;
    
    // Animate the update
    reviewCountElement.classList.add('metric-updated');
    setTimeout(() => reviewCountElement.classList.remove('metric-updated'), 1000);
  }
  
  // Update average risk score
  const avgRiskElement = document.getElementById('average-risk-score');
  if (avgRiskElement) {
    // In a real implementation, you'd calculate the actual average
    avgRiskElement.textContent = `${data.riskScore}/100`;
  }
  
  // Update recommendation distribution chart
  updateRecommendationChart(data.recommendation);
}

// Example 4: Add to Activity Feed
function addReviewToActivityFeed(event) {
  const data = event.data;
  
  const activityFeed = document.getElementById('activity-feed');
  if (!activityFeed) return;
  
  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item review-completed';
  activityItem.innerHTML = `
    <div class="activity-icon">
      <span class="icon-circle" style="background-color: ${event.notification.color}">
        ${event.notification.icon}
      </span>
    </div>
    <div class="activity-content">
      <div class="activity-header">
        <strong>${data.reviewer}</strong> completed ${data.reviewType}
        <span class="activity-time">${formatTimeAgo(data.completedAt)}</span>
      </div>
      <div class="activity-body">
        <div class="activity-business">${data.businessName}</div>
        <div class="activity-recommendation">
          Recommendation: <strong>${data.recommendation}</strong>
        </div>
        <div class="activity-details">
          <span class="risk-score" style="color: ${getRiskColor(data.riskScore)}">
            Risk: ${data.riskScore}/100
          </span>
          <span class="confidence">Confidence: ${data.confidence}%</span>
        </div>
      </div>
      ${data.notes ? `<div class="activity-notes">${data.notes}</div>` : ''}
      ${data.conditions.length > 0 ? `
        <div class="activity-conditions">
          <strong>Conditions:</strong>
          <ul>
            ${data.conditions.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  // Insert at the top of the feed
  activityFeed.insertBefore(activityItem, activityFeed.firstChild);
  
  // Animate entrance
  setTimeout(() => activityItem.classList.add('slide-in'), 10);
  
  // Limit feed to 20 items
  const items = activityFeed.querySelectorAll('.activity-item');
  if (items.length > 20) {
    items[items.length - 1].remove();
  }
}

// Example 5: Update Application Detail Page
function updateApplicationDetailForReview(event) {
  const data = event.data;
  
  // Check if we're viewing this application
  const currentAppId = getCurrentApplicationId();
  if (currentAppId !== data.applicationId) return;
  
  // Add review to timeline
  const timeline = document.getElementById('application-timeline');
  if (timeline) {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item review-completed';
    timelineItem.innerHTML = `
      <div class="timeline-marker" style="background-color: ${event.notification.color}">
        ${event.notification.icon}
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <strong>Review Completed</strong>
          <span class="timeline-time">${formatDateTime(data.completedAt)}</span>
        </div>
        <div class="timeline-body">
          <div class="review-info">
            <div class="reviewer">
              <strong>${data.reviewer}</strong> - ${data.metadata.reviewerRole}
            </div>
            <div class="review-type">${data.reviewType}</div>
          </div>
          <div class="review-recommendation recommendation-${data.recommendation.toLowerCase().replace(/\s+/g, '-')}">
            <strong>Recommendation:</strong> ${data.recommendation}
          </div>
          <div class="review-scores">
            <div class="score-item">
              <label>Risk Score</label>
              <div class="score-value" style="color: ${getRiskColor(data.riskScore)}">
                ${data.riskScore}/100
              </div>
            </div>
            <div class="score-item">
              <label>Confidence</label>
              <div class="score-value">${data.confidence}%</div>
            </div>
            <div class="score-item">
              <label>Duration</label>
              <div class="score-value">${data.reviewDurationMinutes}min</div>
            </div>
          </div>
          ${data.notes ? `
            <div class="review-notes">
              <strong>Notes:</strong>
              <p>${data.notes}</p>
            </div>
          ` : ''}
          ${data.findings.length > 0 ? `
            <div class="review-findings">
              <strong>Findings:</strong>
              <ul>
                ${data.findings.map(f => `
                  <li class="finding-${f.status}">
                    <span class="finding-category">${f.category}:</span>
                    ${f.description}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          ${data.nextSteps.length > 0 ? `
            <div class="review-next-steps">
              <strong>Next Steps:</strong>
              <ol>
                ${data.nextSteps.map(step => `<li>${step}</li>`).join('')}
              </ol>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    timeline.insertBefore(timelineItem, timeline.firstChild);
  }
  
  // Update risk score display
  const riskScoreElement = document.getElementById('risk-score');
  if (riskScoreElement) {
    riskScoreElement.textContent = `${data.riskScore}/100`;
    riskScoreElement.style.color = getRiskColor(data.riskScore);
  }
}

// Example 6: Complete Integration Function
function setupReviewCompletedIntegration() {
  // Listen for review_completed events from the simulator
  if (window.liveSimulator) {
    window.liveSimulator.on('event', (event) => {
      if (event.type === 'review_completed') {
        // Display notification
        displayReviewCompletedEvent(event);
        
        // Update dashboard metrics
        updateDashboardForReviewCompleted(event);
        
        // Add to activity feed
        addReviewToActivityFeed(event);
        
        // Update application detail if viewing
        updateApplicationDetailForReview(event);
        
        // Log for debugging
        console.log('[Review Completed]', event.data);
      }
    });
  }
}

// Helper Functions

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function getRiskColor(riskScore) {
  if (riskScore < 40) return '#10b981'; // Green - Low risk
  if (riskScore < 60) return '#f59e0b'; // Amber - Medium risk
  return '#ef4444'; // Red - High risk
}

function getCurrentApplicationId() {
  // Extract from URL or page context
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id') || null;
}

function updateRecommendationChart(recommendation) {
  // Update chart visualization
  // Implementation depends on your charting library
  console.log('Update recommendation chart:', recommendation);
}

// CSS Styles for Review Completed Events
const reviewCompletedStyles = `
<style>
.toast-notification.review-completed {
  min-width: 400px;
  max-width: 500px;
}

.toast-details {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.toast-details .badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-normal {
  background-color: #e5e7eb;
  color: #374151;
}

.badge-medium {
  background-color: #fef3c7;
  color: #92400e;
}

.badge-high {
  background-color: #fee2e2;
  color: #991b1b;
}

.toast-details .review-type {
  font-size: 12px;
  color: #6b7280;
}

.toast-details .recommendation {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.recommendation-approve {
  background-color: #d1fae5;
  color: #065f46;
}

.recommendation-approve-with-conditions {
  background-color: #fef3c7;
  color: #92400e;
}

.recommendation-request-additional-information {
  background-color: #dbeafe;
  color: #1e40af;
}

.recommendation-escalate-to-senior-reviewer {
  background-color: #e0e7ff;
  color: #3730a3;
}

.recommendation-reject {
  background-color: #fee2e2;
  color: #991b1b;
}

.toast-meta {
  margin-top: 6px;
  font-size: 11px;
  color: #9ca3af;
}

.activity-item.review-completed {
  border-left: 3px solid #10b981;
}

.activity-recommendation {
  margin: 4px 0;
}

.activity-details {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
}

.activity-notes {
  margin-top: 8px;
  padding: 8px;
  background-color: #f9fafb;
  border-radius: 4px;
  font-size: 13px;
  color: #4b5563;
}

.activity-conditions {
  margin-top: 8px;
  font-size: 13px;
}

.activity-conditions ul {
  margin: 4px 0 0 20px;
  padding: 0;
}

.activity-conditions li {
  margin: 2px 0;
  color: #6b7280;
}

.timeline-item.review-completed {
  border-left: 2px solid #10b981;
}

.review-info {
  margin-bottom: 8px;
}

.review-scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 12px 0;
}

.score-item {
  text-align: center;
}

.score-item label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.score-value {
  font-size: 18px;
  font-weight: 600;
}

.review-findings ul {
  margin: 8px 0 0 20px;
  padding: 0;
}

.review-findings li {
  margin: 4px 0;
}

.finding-positive {
  color: #059669;
}

.finding-neutral {
  color: #d97706;
}

.finding-concern {
  color: #dc2626;
}

.finding-category {
  font-weight: 600;
}

.review-next-steps ol {
  margin: 8px 0 0 20px;
  padding: 0;
}

.review-next-steps li {
  margin: 4px 0;
  color: #4b5563;
}
</style>
`;

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupReviewCompletedIntegration);
} else {
  setupReviewCompletedIntegration();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupReviewCompletedIntegration,
    displayReviewCompletedEvent,
    updateDashboardForReviewCompleted,
    addReviewToActivityFeed,
    updateApplicationDetailForReview
  };
}
