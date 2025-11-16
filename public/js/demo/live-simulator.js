/**
 * Live Simulator
 * Generates real-time simulated activity for demo mode
 * Creates realistic events with configurable intervals and probabilities
 */

const DEFAULT_NOTIFICATION_TEMPLATES = {
  eventTypes: {
    new_application: {
      title: 'New Application Submitted',
      icon: 'ðŸ“„',
      color: '#2563eb',
      priority: 'normal',
      description: 'A new application has been started by an applicant.',
      notificationTemplate: '{businessName} submitted {loanPurpose} for {loanAmount}.',
      activityTemplate: 'New {industry} application from {businessName} ({location}).',
      animationType: 'slide-in',
      displayDuration: 5200,
      soundEffect: 'notification.mp3'
    },
    status_change: {
      title: 'Application Status Updated',
      icon: 'ðŸ”„',
      color: '#8b5cf6',
      priority: 'normal',
      description: 'An application moved through the workflow.',
      notificationTemplate: '{businessName} moved from {previousStatusDisplay} to {newStatusDisplay}. Reason: {reason}.',
      activityTemplate: 'Status change for {businessName}: {newStatusDisplay}.',
      animationType: 'fade-in',
      displayDuration: 4800,
      soundEffect: 'status-change.mp3'
    },
    document_uploaded: {
      title: 'Document Uploaded',
      icon: 'ðŸ“Ž',
      color: '#06b6d4',
      priority: 'low',
      description: 'Additional documentation is available for review.',
      notificationTemplate: '{businessName} uploaded {documentType} ({fileSizeFormatted}).',
      activityTemplate: 'Document upload: {documentType} for {businessName}.',
      animationType: 'slide-in',
      displayDuration: 4000,
      soundEffect: 'upload.mp3'
    },
    review_completed: {
      title: 'Review Completed',
      icon: 'âœ…',
      color: '#10b981',
      priority: 'normal',
      description: 'A reviewer finished their assessment.',
      notificationTemplate: '{reviewer} completed {reviewType} for {businessName}. Recommendation: {recommendation}.',
      activityTemplate: 'Review complete: {reviewer} | {recommendation} | Risk {riskScore}.',
      animationType: 'bounce-in',
      displayDuration: 5400,
      soundEffect: 'success.mp3'
    },
    approval_granted: {
      title: 'Application Approved',
      icon: 'ðŸŽ‰',
      color: '#10b981',
      priority: 'high',
      description: 'Approval ready for funding.',
      notificationTemplate: '{businessName} approved for {approvedAmount} at {interestRate}% over {termMonths} months.',
      activityTemplate: 'Approval: {businessName} ({approvalType}). Funding on {fundingDate}.',
      animationType: 'bounce-in',
      displayDuration: 7000,
      soundEffect: 'celebration.mp3'
    },
    rejection_issued: {
      title: 'Application Rejected',
      icon: 'â›”',
      color: '#ef4444',
      priority: 'high',
      description: 'An application has been declined.',
      notificationTemplate: '{businessName} rejected: {primaryReason}.',
      activityTemplate: 'Rejection for {businessName}: {rejectionType}.',
      animationType: 'shake',
      displayDuration: 6200,
      soundEffect: 'alert.mp3'
    },
    comment_added: {
      title: 'New Comment Added',
      icon: 'ðŸ’¬',
      color: '#f59e0b',
      priority: 'low',
      description: 'A reviewer left a note on an application.',
      notificationTemplate: '{commenter} commented: {commentText}',
      activityTemplate: 'Comment by {commenter} on {businessName}.',
      animationType: 'slide-in',
      displayDuration: 4200,
      soundEffect: 'message.mp3'
    },
    ai_analysis_complete: {
      title: 'AI Analysis Complete',
      icon: 'ðŸ¤–',
      color: '#06b6d4',
      priority: 'normal',
      description: 'AI finished its assessment.',
      notificationTemplate: 'AI analysis for {businessName}: Risk {riskScore}/100, Confidence {confidence}%.',
      activityTemplate: 'AI analyzed {businessName}. Risk {riskScore}.',
      animationType: 'pulse',
      displayDuration: 5400,
      soundEffect: 'ai-complete.mp3'
    }
  }
};

class LiveSimulator {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    
    // State
    this.isRunning = false;
    this.intervalId = null;
    this.eventQueue = [];
    this.eventHistory = [];
    
    // Configuration
    this.config = {
      interval: 45000, // 45 seconds
      intensity: 'medium',
      eventTypes: [
        'new_application',
        'status_change',
        'document_uploaded',
        'review_completed',
        'approval_granted',
        'rejection_issued',
        'comment_added',
        'ai_analysis_complete'
      ],
      eventProbabilities: {
        new_application: 0.25,
        status_change: 0.20,
        document_uploaded: 0.15,
        review_completed: 0.15,
        approval_granted: 0.10,
        rejection_issued: 0.05,
        comment_added: 0.05,
        ai_analysis_complete: 0.05
      }
    };
    
    // Intensity multipliers for event frequency
    this.intensityMultipliers = {
      low: 1.5,    // 1.5x interval (slower)
      medium: 1.0, // 1x interval (normal)
      high: 0.6    // 0.6x interval (faster)
    };
    
    // Event counter for unique IDs
    this.eventCounter = 0;
    
    // Initialize event generators
    this.eventGenerators = new EventGenerators();
    this.notificationTemplates = DEFAULT_NOTIFICATION_TEMPLATES;
    this.notificationTemplatePath = '/data/demo-event-templates.json';
    this._loadNotificationTemplates();
    
    console.log('[Live Simulator] Initialized with EventGenerators');
  }

  /**
   * Load notification templates from JSON
   */
  _loadNotificationTemplates() {
    if (!window || !window.fetch) {
      return;
    }

    fetch(this.notificationTemplatePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load notification templates: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (payload && payload.eventTypes) {
          this.notificationTemplates = payload;
          console.log('[Live Simulator] Loaded notification templates');
        }
      })
      .catch((error) => {
        console.warn('[Live Simulator] Notification templates fallback', error);
      });
  }
  
  /**
   * Start the live simulation
   * @param {Object} config - Configuration options
   */
  start(config = {}) {
    if (this.isRunning) {
      console.warn('[Live Simulator] Already running');
      return;
    }
    
    // Merge configuration
    this.config = { ...this.config, ...config };
    
    // Apply intensity multiplier to interval
    const multiplier = this.intensityMultipliers[this.config.intensity] || 1.0;
    const adjustedInterval = this.config.interval * multiplier;
    
    // Start generating events
    this.isRunning = true;
    this.scheduleNextEvent(adjustedInterval);
    
    console.log('[Live Simulator] Started with config:', {
      interval: adjustedInterval,
      intensity: this.config.intensity
    });
    
    // Notify orchestrator
    if (this.orchestrator) {
      this.orchestrator.emit('simulator-started', { config: this.config });
    }
  }
  
  /**
   * Stop the live simulation
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    // Clear interval
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    // Clear queue
    this.eventQueue = [];
    
    this.isRunning = false;
    console.log('[Live Simulator] Stopped');
    
    // Notify orchestrator
    if (this.orchestrator) {
      this.orchestrator.emit('simulator-stopped');
    }
  }
  
  /**
   * Schedule the next event generation
   * @param {number} interval - Time until next event in milliseconds
   */
  scheduleNextEvent(interval) {
    if (!this.isRunning) {
      return;
    }
    
    // Add some randomness to interval (Â±20%)
    const randomFactor = 0.8 + Math.random() * 0.4;
    const randomizedInterval = interval * randomFactor;
    
    this.intervalId = setTimeout(() => {
      this.generateEvent();
      this.scheduleNextEvent(interval);
    }, randomizedInterval);
  }
  
  /**
   * Generate a simulated event
   * @returns {Object} Generated event
   */
  generateEvent() {
    // Select event type based on probabilities
    const eventType = this.selectEventType();
    
    // Generate event data
    const event = this.createEvent(eventType);
    
    // Add to history
    this.eventHistory.push(event);
    
    // Keep history limited to last 100 events
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }
    
    // Process event
    this.processEvent(event);
    
    console.log('[Live Simulator] Generated event:', event.type, event.id);
    
    return event;
  }
  
  /**
   * Select event type based on configured probabilities
   * @returns {string} Selected event type
   */
  selectEventType() {
    const random = Math.random();
    let cumulative = 0;
    
    for (const eventType of this.config.eventTypes) {
      cumulative += this.config.eventProbabilities[eventType] || 0;
      if (random <= cumulative) {
        return eventType;
      }
    }
    
    // Fallback to first event type
    return this.config.eventTypes[0];
  }
  
  /**
   * Create event object with data
   * @param {string} type - Event type
   * @returns {Object} Event object
   */
  createEvent(type) {
    this.eventCounter++;
    
    const data = this.generateEventData(type);
    const event = {
      id: `sim-event-${this.eventCounter}`,
      type,
      timestamp: new Date(),
      data,
      notification: this.generateNotification(type, data)
    };
    
    return event;
  }
  
  /**
   * Generate event-specific data
   * @param {string} type - Event type
   * @returns {Object} Event data
   */
  generateEventData(type) {
    const generators = {
      new_application: () => this.eventGenerators.generateNewApplication(),
      status_change: () => this.eventGenerators.generateStatusChange(),
      document_uploaded: () => this.eventGenerators.generateDocumentUploaded(),
      review_completed: () => this.eventGenerators.generateReviewCompleted(),
      approval_granted: () => this.eventGenerators.generateApprovalGranted(),
      rejection_issued: () => this.eventGenerators.generateRejectionIssued(),
      comment_added: () => this.eventGenerators.generateCommentAdded(),
      ai_analysis_complete: () => this.eventGenerators.generateAIAnalysisComplete()
    };

    const generator = generators[type];
    if (!generator) {
      return {};
    }

    const data = generator();
    if (!data) {
      return this.eventGenerators.generateNewApplication();
    }

    return data;
  }
  
  /**
   * Generate notification configuration for event
   * @param {string} type - Event type
   * @param {Object} data - Event payload
   * @returns {Object} Notification config
   */
  generateNotification(type, data = {}) {
    const template = this._getNotificationTemplate(type);

    const title = template.title || this._defaultTitle(type);
    const message = this._formatTemplate(template.notificationTemplate, data) || this._defaultNotificationMessage(type, data);
    const icon = template.icon || '🛈';

    return {
      title,
      message,
      icon,
      color: template.color || '#64748b',
      priority: template.priority || 'normal',
      animation: template.animationType || 'slide-in',
      duration: template.displayDuration || 4500,
      sound: template.soundEffect || null,
      activity: this._formatTemplate(template.activityTemplate, data)
    };
  }

  _getNotificationTemplate(type) {
    return (this.notificationTemplates?.eventTypes?.[type]) || {};
  }

  _defaultTitle(type) {
    const labels = {
      new_application: 'New Application',
      status_change: 'Status Update',
      document_uploaded: 'Document Uploaded',
      review_completed: 'Review Completed',
      approval_granted: 'Application Approved',
      rejection_issued: 'Application Rejected',
      comment_added: 'New Comment',
      ai_analysis_complete: 'AI Insight'
    };
    return labels[type] || 'Simulated Event';
  }

  _defaultNotificationMessage(type, data) {
    switch (type) {
      case 'new_application':
        return `${data.businessName || 'A business'} submitted an application.`;
      case 'status_change':
        return `${data.businessName || 'An application'} had a status change.`;
      case 'document_uploaded':
        return `${data.businessName || 'An application'} has a new document.`;
      case 'review_completed':
        return `${data.reviewer || 'A reviewer'} completed a review.`;
      case 'approval_granted':
        return `${data.businessName || 'An application'} was approved.`;
      case 'rejection_issued':
        return `${data.businessName || 'An application'} was rejected.`;
      case 'comment_added':
        return `${data.commenter || 'A reviewer'} added a comment.`;
      case 'ai_analysis_complete':
        return `${data.businessName || 'An application'} finished AI analysis.`;
      default:
        return 'An event occurred.';
    }
  }

  _formatTemplate(template, data = {}) {
    if (!template) {
      return '';
    }

    return template.replace(/\{([^}]+)\}/g, (_, path) => {
      const value = this._resolveNestedValue(data, path);
      return this._formatNotificationValue(path, value);
    });
  }

  _resolveNestedValue(data, path) {
    return path.split('.').reduce((acc, key) => {
      if (acc && typeof acc === 'object' && Object.prototype.hasOwnProperty.call(acc, key)) {
        return acc[key];
      }
      return undefined;
    }, data);
  }

  _formatNotificationValue(path, value) {
    if (value == null || value === '') {
      return '';
    }

    const normalized = path.toLowerCase();

    if (value instanceof Date) {
      return value.toLocaleTimeString();
    }

    if (typeof value === 'number') {
      if (normalized.includes('amount') || normalized.includes('loan') || normalized.includes('approvedamount')) {
        return this.formatCurrency(value);
      }
      if (normalized.includes('score') || normalized.includes('confidence') || normalized.includes('risk')) {
        return `${value}%`;
      }
    }

    return value;
  }

  }
  
  /**
   * Process generated event
   * @param {Object} event - Event to process
   */
  processEvent(event) {
    // Emit event to orchestrator
    if (this.orchestrator) {
      this.orchestrator.emit('simulated-event', event);
    }
    
    // Trigger notification if notification system is available
    if (window.showToastNotification) {
      this.showNotification(event);
    }
    
    // Update UI elements based on event type
    this.updateUI(event);
  }
  
  /**
   * Show notification for event
   * @param {Object} event - Event to show notification for
   */
  showNotification(event) {
    const { notification, data } = event;
    
    // Build notification message
    let message = '';
    switch (event.type) {
      case 'new_application':
        // Handle both old and new data formats
        if (data.loanAmount) {
          const formattedAmount = this.formatCurrency(data.loanAmount);
          message = `${data.businessName} submitted a loan application for ${formattedAmount}`;
          if (data.location) {
            message += ` (${data.location})`;
          }
        } else {
          message = `${data.businessName} submitted a loan application`;
        }
        break;
      case 'status_change':
        message = `${data.businessName} status changed to ${data.newStatus}`;
        break;
      case 'document_uploaded':
        message = `${data.businessName} uploaded ${data.documentType}`;
        break;
      case 'review_completed':
        message = `${data.reviewer} completed review for ${data.businessName}`;
        break;
      case 'approval_granted':
        message = `${data.businessName} approved for $${data.loanAmount.toLocaleString()}`;
        break;
      case 'rejection_issued':
        message = `${data.businessName} application rejected`;
        break;
      case 'comment_added':
        message = `${data.commenter} commented on ${data.businessName}`;
        break;
      case 'ai_analysis_complete':
        message = `AI analysis complete for ${data.businessName} (Risk: ${data.riskScore})`;
        break;
      default:
        message = 'Event occurred';
    }
    
    // Show toast notification
    if (window.showToastNotification) {
      window.showToastNotification({
        title: notification.title,
        message,
        icon: notification.icon,
        color: notification.color,
        duration: 4000
      });
    }
  }
  
  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  /**
   * Update UI elements based on event
   * @param {Object} event - Event to update UI for
   */
  updateUI(event) {
    // Update metrics if dashboard is visible
    if (document.querySelector('.metrics-grid')) {
      this.updateMetrics(event);
    }
    
    // Update application list if visible
    if (document.querySelector('.applications-list')) {
      this.updateApplicationList(event);
    }
    
    // Update activity feed if visible
    if (document.querySelector('.activity-feed')) {
      this.updateActivityFeed(event);
    }
  }
  
  /**
   * Update dashboard metrics
   * @param {Object} event - Event to update metrics for
   */
  updateMetrics(event) {
    // This is a placeholder - actual implementation would update specific metrics
    // based on event type and integrate with dashboard components
    
    const metricsToUpdate = {
      new_application: ['total-applications', 'pending-review'],
      status_change: ['pending-review', 'in-approval'],
      approval_granted: ['approved', 'total-funded'],
      rejection_issued: ['rejected'],
      review_completed: ['reviews-completed']
    };
    
    const metrics = metricsToUpdate[event.type] || [];
    
    metrics.forEach(metricId => {
      const element = document.querySelector(`[data-metric="${metricId}"]`);
      if (element) {
        // Increment metric with animation
        const currentValue = parseInt(element.textContent) || 0;
        this.animateCounter(element, currentValue, currentValue + 1);
      }
    });
  }
  
  /**
   * Animate counter update
   * @param {HTMLElement} element - Element to animate
   * @param {number} start - Start value
   * @param {number} end - End value
   */
  animateCounter(element, start, end) {
    const duration = 500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const current = Math.floor(start + (end - start) * progress);
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Update application list
   * @param {Object} event - Event to update list for
   */
  updateApplicationList(event) {
    // This is a placeholder - actual implementation would add/update
    // application items in the list with slide-in animations
    
    if (event.type === 'new_application') {
      console.log('[Live Simulator] Would add new application to list:', event.data.businessName);
    } else if (event.type === 'status_change') {
      console.log('[Live Simulator] Would update application status:', event.data.businessName);
    }
  }
  
  /**
   * Update activity feed
   * @param {Object} event - Event to add to feed
   */
  updateActivityFeed(event) {
    const feed = document.querySelector('.activity-feed');
    if (!feed) return;
    
    // Create activity item
    const item = document.createElement('div');
    item.className = 'activity-item fade-in';
    item.innerHTML = `
      <span class="activity-icon">${event.notification.icon}</span>
      <div class="activity-content">
        <div class="activity-title">${event.notification.title}</div>
        <div class="activity-time">${this.formatTime(event.timestamp)}</div>
      </div>
    `;
    
    // Add to top of feed
    feed.insertBefore(item, feed.firstChild);
    
    // Remove old items (keep last 10)
    const items = feed.querySelectorAll('.activity-item');
    if (items.length > 10) {
      items[items.length - 1].remove();
    }
  }
  
  /**
   * Format timestamp for display
   * @param {Date} timestamp - Timestamp to format
   * @returns {string} Formatted time
   */
  formatTime(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  }
  
  /**
   * Set event probabilities
   * @param {Object} probabilities - Event type probabilities (0-1)
   */
  setEventProbabilities(probabilities) {
    this.config.eventProbabilities = {
      ...this.config.eventProbabilities,
      ...probabilities
    };
    
    console.log('[Live Simulator] Event probabilities updated');
  }
  
  /**
   * Set simulation intensity
   * @param {string} intensity - Intensity level ('low', 'medium', 'high')
   */
  setIntensity(intensity) {
    const validIntensities = ['low', 'medium', 'high'];
    if (!validIntensities.includes(intensity)) {
      console.error('[Live Simulator] Invalid intensity:', intensity);
      return;
    }
    
    this.config.intensity = intensity;
    
    // Restart if running to apply new intensity
    if (this.isRunning) {
      this.stop();
      this.start(this.config);
    }
    
    console.log('[Live Simulator] Intensity set to:', intensity);
  }
  
  /**
   * Get event history
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Event history
   */
  getEventHistory(limit = 50) {
    return this.eventHistory.slice(-limit);
  }
  
  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    console.log('[Live Simulator] Event history cleared');
  }
  
  /**
   * Get simulation statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const eventCounts = {};
    
    this.eventHistory.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });
    
    return {
      isRunning: this.isRunning,
      totalEvents: this.eventHistory.length,
      eventCounts,
      config: this.config
    };
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.LiveSimulator = LiveSimulator;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiveSimulator;
}
