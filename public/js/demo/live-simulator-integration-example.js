/**
 * Live Simulator Integration Example
 * Demonstrates how to integrate the Live Simulator with the Demo Mode Orchestrator
 */

// Example 1: Basic Integration
function basicIntegration() {
  // Create simulator instance
  const simulator = new LiveSimulator(window.demoOrchestrator);
  
  // Register with orchestrator
  window.demoOrchestrator.registerComponent('liveSimulator', simulator);
  
  // Start simulation via orchestrator
  window.demoOrchestrator.startSimulation();
  
  console.log('Basic integration complete');
}

// Example 2: Custom Configuration
function customConfiguration() {
  const simulator = new LiveSimulator(window.demoOrchestrator);
  window.demoOrchestrator.registerComponent('liveSimulator', simulator);
  
  // Start with custom config
  simulator.start({
    interval: 30000, // 30 seconds
    intensity: 'high',
    eventTypes: [
      'new_application',
      'approval_granted',
      'ai_analysis_complete'
    ]
  });
  
  // Customize probabilities
  simulator.setEventProbabilities({
    new_application: 0.40,
    approval_granted: 0.35,
    ai_analysis_complete: 0.25
  });
  
  console.log('Custom configuration applied');
}

// Example 3: Event Listening
function eventListening() {
  const simulator = new LiveSimulator(window.demoOrchestrator);
  window.demoOrchestrator.registerComponent('liveSimulator', simulator);
  
  // Listen for simulated events
  window.demoOrchestrator.on('simulated-event', (event) => {
    console.log('Event received:', event.type);
    
    // Handle specific event types
    switch (event.type) {
      case 'new_application':
        handleNewApplication(event.data);
        break;
      case 'approval_granted':
        handleApproval(event.data);
        break;
      case 'ai_analysis_complete':
        handleAIAnalysis(event.data);
        break;
    }
  });
  
  // Listen for simulator lifecycle events
  window.demoOrchestrator.on('simulator-started', () => {
    console.log('Simulator started');
    showSimulatorIndicator();
  });
  
  window.demoOrchestrator.on('simulator-stopped', () => {
    console.log('Simulator stopped');
    hideSimulatorIndicator();
  });
  
  window.demoOrchestrator.startSimulation();
}

// Example 4: Dashboard Integration
function dashboardIntegration() {
  const simulator = new LiveSimulator(window.demoOrchestrator);
  window.demoOrchestrator.registerComponent('liveSimulator', simulator);
  
  // Update dashboard on events
  window.demoOrchestrator.on('simulated-event', (event) => {
    updateDashboardMetrics(event);
    updateApplicationList(event);
    updateActivityFeed(event);
  });
  
  window.demoOrchestrator.startSimulation();
}

// Example 5: Manual Control
function manualControl() {
  const simulator = new LiveSimulator(window.demoOrchestrator);
  window.demoOrchestrator.registerComponent('liveSimulator', simulator);
  
  // Start button
  document.getElementById('startSimBtn').addEventListener('click', () => {
    const intensity = document.getElementById('intensitySelect').value;
    simulator.start({ intensity });
  });
  
  // Stop button
  document.getElementById('stopSimBtn').addEventListener('click', () => {
    simulator.stop();
  });
  
  // Generate event button
  document.getElementById('generateEventBtn').addEventListener('click', () => {
    simulator.generateEvent();
  });
  
  // Intensity change
  document.getElementById('intensitySelect').addEventListener('change', (e) => {
    simulator.setIntensity(e.target.value);
  });
}

// Example 6: Analytics Integration
function analyticsIntegration() {
  const simulator = new LiveSimulator(window.demoOrchestrator);
  window.demoOrchestrator.registerComponent('liveSimulator', simulator);
  
  // Track events for analytics
  window.demoOrchestrator.on('simulated-event', (event) => {
    // Track with analytics tracker
    if (window.demoOrchestrator.getComponent('analyticsTracker')) {
      window.demoOrchestrator.getComponent('analyticsTracker')
        .trackFeatureView('live-simulation', event.type);
    }
  });
  
  // Periodic statistics reporting
  setInterval(() => {
    const stats = simulator.getStatistics();
    console.log('Simulation stats:', stats);
    
    // Update analytics dashboard
    updateAnalyticsDashboard(stats);
  }, 60000); // Every minute
  
  window.demoOrchestrator.startSimulation();
}

// Helper Functions

function handleNewApplication(data) {
  console.log('New application:', data.businessName, data.loanAmount);
  
  // Add to application list
  if (window.addApplicationToList) {
    window.addApplicationToList({
      id: data.applicationId,
      businessName: data.businessName,
      loanAmount: data.loanAmount,
      status: 'Submitted',
      submittedAt: new Date()
    });
  }
  
  // Update metrics
  incrementMetric('total-applications');
  incrementMetric('pending-review');
}

function handleApproval(data) {
  console.log('Application approved:', data.businessName, data.loanAmount);
  
  // Update application status
  if (window.updateApplicationStatus) {
    window.updateApplicationStatus(data.applicationId, 'Approved');
  }
  
  // Update metrics
  incrementMetric('approved');
  incrementMetric('total-funded', data.loanAmount);
}

function handleAIAnalysis(data) {
  console.log('AI analysis complete:', data.businessName, data.riskScore);
  
  // Show AI insights
  if (window.showAIInsights) {
    window.showAIInsights(data.applicationId, {
      riskScore: data.riskScore,
      confidence: data.confidence
    });
  }
}

function updateDashboardMetrics(event) {
  // Update relevant metrics based on event type
  const metricMap = {
    new_application: ['total-applications', 'pending-review'],
    status_change: ['pending-review'],
    approval_granted: ['approved', 'total-funded'],
    rejection_issued: ['rejected'],
    review_completed: ['reviews-completed']
  };
  
  const metrics = metricMap[event.type] || [];
  metrics.forEach(metric => incrementMetric(metric));
}

function updateApplicationList(event) {
  if (event.type === 'new_application') {
    // Add new application with animation
    const list = document.querySelector('.applications-list');
    if (list) {
      const item = createApplicationItem(event.data);
      item.style.animation = 'slideIn 0.3s ease-out';
      list.insertBefore(item, list.firstChild);
    }
  }
}

function updateActivityFeed(event) {
  const feed = document.querySelector('.activity-feed');
  if (!feed) return;
  
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `
    <span class="activity-icon">${event.notification.icon}</span>
    <div class="activity-content">
      <div class="activity-title">${event.notification.title}</div>
      <div class="activity-time">Just now</div>
    </div>
  `;
  
  feed.insertBefore(item, feed.firstChild);
  
  // Keep only last 10 items
  const items = feed.querySelectorAll('.activity-item');
  if (items.length > 10) {
    items[items.length - 1].remove();
  }
}

function incrementMetric(metricId, amount = 1) {
  const element = document.querySelector(`[data-metric="${metricId}"]`);
  if (element) {
    const current = parseInt(element.textContent) || 0;
    animateCounter(element, current, current + amount);
  }
}

function animateCounter(element, start, end) {
  const duration = 500;
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const current = Math.floor(start + (end - start) * progress);
    element.textContent = current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
}

function createApplicationItem(data) {
  const item = document.createElement('div');
  item.className = 'application-card';
  item.innerHTML = `
    <div class="application-header">
      <h3>${data.businessName}</h3>
      <span class="status-badge status-submitted">Submitted</span>
    </div>
    <div class="application-details">
      <div class="detail-item">
        <span class="label">Loan Amount:</span>
        <span class="value">$${data.loanAmount.toLocaleString()}</span>
      </div>
      <div class="detail-item">
        <span class="label">Application ID:</span>
        <span class="value">${data.applicationId}</span>
      </div>
    </div>
  `;
  return item;
}

function showSimulatorIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'simulator-indicator';
  indicator.className = 'simulator-active';
  indicator.innerHTML = `
    <span class="pulse-dot"></span>
    <span>Live Simulation Active</span>
  `;
  document.body.appendChild(indicator);
}

function hideSimulatorIndicator() {
  const indicator = document.getElementById('simulator-indicator');
  if (indicator) {
    indicator.remove();
  }
}

function updateAnalyticsDashboard(stats) {
  // Update analytics dashboard with simulation stats
  const dashboard = document.querySelector('.analytics-dashboard');
  if (!dashboard) return;
  
  dashboard.innerHTML = `
    <h3>Live Simulation Statistics</h3>
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-label">Total Events</div>
        <div class="stat-value">${stats.totalEvents}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Intensity</div>
        <div class="stat-value">${stats.config.intensity}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Running</div>
        <div class="stat-value">${stats.isRunning ? 'Yes' : 'No'}</div>
      </div>
    </div>
    <div class="event-breakdown">
      <h4>Event Breakdown</h4>
      ${Object.entries(stats.eventCounts).map(([type, count]) => `
        <div class="event-stat">
          <span>${type}:</span>
          <span>${count}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// Export examples
if (typeof window !== 'undefined') {
  window.LiveSimulatorExamples = {
    basicIntegration,
    customConfiguration,
    eventListening,
    dashboardIntegration,
    manualControl,
    analyticsIntegration
  };
}
