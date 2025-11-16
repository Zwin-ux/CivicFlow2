/**
 * Demo Analytics Tracker
 * Tracks demo engagement and generates analytics reports
 * Privacy-safe tracking with no PII, stored in localStorage only
 */

class DemoAnalyticsTracker {
  constructor() {
    // Session management
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    
    // Analytics data
    this.analytics = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: null,
      duration: 0,
      
      // Page tracking
      pagesViewed: [],
      currentPage: null,
      pageStartTime: null,
      
      // Feature tracking
      featuresViewed: new Map(), // feature -> { viewCount, totalDuration, firstViewed, lastViewed }
      
      // Walkthrough tracking
      walkthroughsStarted: [],
      walkthroughsCompleted: [],
      walkthroughSteps: [], // { walkthroughId, step, timestamp }
      
      // Scenario tracking
      scenariosStarted: [],
      scenariosCompleted: [],
      scenarioDurations: new Map(), // scenarioId -> duration
      
      // Role tracking
      roleChanges: [],
      currentRole: 'investor',
      
      // Interaction tracking
      interactions: [], // { type, target, timestamp, metadata }
      
      // Error tracking
      errors: []
    };
    
    // Configuration
    this.config = {
      enabled: true,
      storageKey: 'demoAnalytics',
      maxStoredSessions: 10,
      autoSave: true,
      autoSaveInterval: 30000 // 30 seconds
    };
    
    // Auto-save timer
    this.autoSaveTimer = null;
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the analytics tracker
   */
  initialize() {
    // Load configuration
    this.loadConfiguration();
    
    // Track initial page view
    this.trackPageView(window.location.pathname);
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start auto-save if enabled
    if (this.config.autoSave) {
      this.startAutoSave();
    }
    
    console.log('[Analytics Tracker] Initialized with session ID:', this.sessionId);
  }

  /**
   * Load configuration from localStorage
   */
  loadConfiguration() {
    try {
      const savedConfig = localStorage.getItem('demoAnalyticsConfig');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('[Analytics Tracker] Failed to load configuration:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  saveConfiguration() {
    try {
      localStorage.setItem('demoAnalyticsConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('[Analytics Tracker] Failed to save configuration:', error);
    }
  }

  /**
   * Update configuration
   * @param {Object} updates - Configuration updates
   */
  updateConfiguration(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfiguration();
    
    // Restart auto-save if interval changed
    if (updates.autoSaveInterval && this.config.autoSave) {
      this.stopAutoSave();
      this.startAutoSave();
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload();
    });
    
    // Track navigation (for SPAs)
    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });
    
    // Track clicks (for interaction analytics)
    document.addEventListener('click', (e) => {
      this.trackInteraction('click', e.target, {
        x: e.clientX,
        y: e.clientY,
        button: e.button
      });
    }, true);
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `demo-${timestamp}-${random}`;
  }

  /**
   * Track page view
   * @param {string} page - Page path
   */
  trackPageView(page) {
    if (!this.config.enabled) return;
    
    // End previous page view
    if (this.analytics.currentPage) {
      this.endPageView();
    }
    
    // Start new page view
    this.analytics.currentPage = page;
    this.analytics.pageStartTime = new Date();
    
    this.analytics.pagesViewed.push({
      page,
      timestamp: new Date(),
      referrer: document.referrer,
      duration: 0 // Will be updated when page view ends
    });
    
    console.log('[Analytics Tracker] Page view:', page);
  }

  /**
   * End current page view
   */
  endPageView() {
    if (!this.analytics.currentPage || !this.analytics.pageStartTime) return;
    
    const duration = (new Date() - this.analytics.pageStartTime) / 1000; // seconds
    
    // Update the last page view entry
    const lastPageView = this.analytics.pagesViewed[this.analytics.pagesViewed.length - 1];
    if (lastPageView && lastPageView.page === this.analytics.currentPage) {
      lastPageView.duration = duration;
    }
    
    console.log('[Analytics Tracker] Page view ended:', this.analytics.currentPage, `(${duration.toFixed(1)}s)`);
  }

  /**
   * Track feature view
   * @param {string} feature - Feature name
   * @param {string} details - Additional details
   */
  trackFeatureView(feature, details = '') {
    if (!this.config.enabled) return;
    
    const now = new Date();
    
    // Get or create feature tracking data
    if (!this.analytics.featuresViewed.has(feature)) {
      this.analytics.featuresViewed.set(feature, {
        feature,
        details,
        viewCount: 0,
        totalDuration: 0,
        firstViewed: now,
        lastViewed: now,
        sessions: []
      });
    }
    
    const featureData = this.analytics.featuresViewed.get(feature);
    featureData.viewCount++;
    featureData.lastViewed = now;
    
    // Start tracking duration for this view
    featureData.sessions.push({
      startTime: now,
      endTime: null,
      duration: 0,
      details
    });
    
    console.log('[Analytics Tracker] Feature view:', feature, details);
  }

  /**
   * End feature view (to calculate duration)
   * @param {string} feature - Feature name
   */
  endFeatureView(feature) {
    if (!this.config.enabled) return;
    
    const featureData = this.analytics.featuresViewed.get(feature);
    if (!featureData || featureData.sessions.length === 0) return;
    
    // End the last session
    const lastSession = featureData.sessions[featureData.sessions.length - 1];
    if (!lastSession.endTime) {
      lastSession.endTime = new Date();
      lastSession.duration = (lastSession.endTime - lastSession.startTime) / 1000; // seconds
      featureData.totalDuration += lastSession.duration;
    }
  }

  /**
   * Track walkthrough progress
   * @param {string} walkthroughId - Walkthrough ID
   * @param {number} step - Current step number
   * @param {number} total - Total steps
   */
  trackWalkthroughProgress(walkthroughId, step, total) {
    if (!this.config.enabled) return;
    
    this.analytics.walkthroughSteps.push({
      walkthroughId,
      step,
      total,
      timestamp: new Date()
    });
    
    console.log('[Analytics Tracker] Walkthrough progress:', walkthroughId, `${step}/${total}`);
  }

  /**
   * Track walkthrough start
   * @param {string} walkthroughId - Walkthrough ID
   */
  trackWalkthroughStart(walkthroughId) {
    if (!this.config.enabled) return;
    
    this.analytics.walkthroughsStarted.push({
      walkthroughId,
      timestamp: new Date()
    });
    
    this.trackFeatureView('walkthrough', walkthroughId);
    
    console.log('[Analytics Tracker] Walkthrough started:', walkthroughId);
  }

  /**
   * Track walkthrough completion
   * @param {string} walkthroughId - Walkthrough ID
   * @param {number} duration - Duration in seconds
   */
  trackWalkthroughCompletion(walkthroughId, duration) {
    if (!this.config.enabled) return;
    
    this.analytics.walkthroughsCompleted.push({
      walkthroughId,
      timestamp: new Date(),
      duration
    });
    
    this.endFeatureView('walkthrough');
    
    console.log('[Analytics Tracker] Walkthrough completed:', walkthroughId, `(${duration.toFixed(1)}s)`);
  }

  /**
   * Track scenario start
   * @param {string} scenarioId - Scenario ID
   */
  trackScenarioStart(scenarioId) {
    if (!this.config.enabled) return;
    
    this.analytics.scenariosStarted.push({
      scenarioId,
      timestamp: new Date()
    });
    
    this.trackFeatureView('scenario', scenarioId);
    
    console.log('[Analytics Tracker] Scenario started:', scenarioId);
  }

  /**
   * Track scenario completion
   * @param {string} scenarioId - Scenario ID
   * @param {number} duration - Duration in seconds
   */
  trackScenarioCompletion(scenarioId, duration) {
    if (!this.config.enabled) return;
    
    this.analytics.scenariosCompleted.push({
      scenarioId,
      timestamp: new Date(),
      duration
    });
    
    this.analytics.scenarioDurations.set(scenarioId, duration);
    this.endFeatureView('scenario');
    
    console.log('[Analytics Tracker] Scenario completed:', scenarioId, `(${duration.toFixed(1)}s)`);
  }

  /**
   * Track role change
   * @param {string} previousRole - Previous role
   * @param {string} newRole - New role
   */
  trackRoleChange(previousRole, newRole) {
    if (!this.config.enabled) return;
    
    this.analytics.roleChanges.push({
      from: previousRole,
      to: newRole,
      timestamp: new Date()
    });
    
    this.analytics.currentRole = newRole;
    
    console.log('[Analytics Tracker] Role changed:', previousRole, '->', newRole);
  }

  /**
   * Track interaction
   * @param {string} type - Interaction type (click, scroll, etc.)
   * @param {HTMLElement} target - Target element
   * @param {Object} metadata - Additional metadata
   */
  trackInteraction(type, target, metadata = {}) {
    if (!this.config.enabled) return;
    
    // Limit interaction tracking to avoid overwhelming storage
    if (this.analytics.interactions.length > 1000) {
      return;
    }
    
    // Extract useful information from target
    const targetInfo = {
      tagName: target.tagName,
      id: target.id,
      className: target.className,
      text: target.textContent?.substring(0, 50) // Limit text length
    };
    
    this.analytics.interactions.push({
      type,
      target: targetInfo,
      timestamp: new Date(),
      metadata
    });
  }

  /**
   * Track error
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  trackError(error, context = {}) {
    if (!this.config.enabled) return;
    
    this.analytics.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
    
    console.error('[Analytics Tracker] Error tracked:', error.message);
  }

  /**
   * Get session analytics
   * @returns {Object} Session analytics
   */
  getSessionAnalytics() {
    const now = new Date();
    const duration = (now - this.startTime) / 1000; // seconds
    
    // Convert Map to array for serialization
    const featuresViewed = Array.from(this.analytics.featuresViewed.values()).map(feature => ({
      feature: feature.feature,
      details: feature.details,
      viewCount: feature.viewCount,
      totalDuration: feature.totalDuration,
      firstViewed: feature.firstViewed,
      lastViewed: feature.lastViewed
    }));
    
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: now,
      duration,
      
      // Page analytics
      pagesViewed: this.analytics.pagesViewed,
      uniquePages: [...new Set(this.analytics.pagesViewed.map(p => p.page))],
      
      // Feature analytics
      featuresViewed,
      uniqueFeatures: featuresViewed.length,
      
      // Walkthrough analytics
      walkthroughsStarted: this.analytics.walkthroughsStarted.length,
      walkthroughsCompleted: this.analytics.walkthroughsCompleted.length,
      walkthroughCompletionRate: this.analytics.walkthroughsStarted.length > 0
        ? (this.analytics.walkthroughsCompleted.length / this.analytics.walkthroughsStarted.length * 100).toFixed(1)
        : 0,
      
      // Scenario analytics
      scenariosStarted: this.analytics.scenariosStarted.length,
      scenariosCompleted: this.analytics.scenariosCompleted.length,
      scenarioCompletionRate: this.analytics.scenariosStarted.length > 0
        ? (this.analytics.scenariosCompleted.length / this.analytics.scenariosStarted.length * 100).toFixed(1)
        : 0,
      
      // Role analytics
      roleChanges: this.analytics.roleChanges.length,
      currentRole: this.analytics.currentRole,
      
      // Interaction analytics
      totalInteractions: this.analytics.interactions.length,
      
      // Error analytics
      errorCount: this.analytics.errors.length
    };
  }

  /**
   * Generate detailed report
   * @returns {Object} Detailed analytics report
   */
  generateReport() {
    const sessionAnalytics = this.getSessionAnalytics();
    
    // Calculate engagement score (0-100)
    const engagementScore = this.calculateEngagementScore();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    return {
      summary: {
        sessionId: this.sessionId,
        duration: sessionAnalytics.duration,
        engagementScore,
        pagesViewed: sessionAnalytics.uniquePages.length,
        featuresUsed: sessionAnalytics.uniqueFeatures,
        walkthroughsCompleted: sessionAnalytics.walkthroughsCompleted,
        scenariosCompleted: sessionAnalytics.scenariosCompleted
      },
      
      engagement: {
        score: engagementScore,
        pagesViewed: sessionAnalytics.pagesViewed,
        featuresViewed: sessionAnalytics.featuresViewed,
        interactions: sessionAnalytics.totalInteractions,
        duration: sessionAnalytics.duration
      },
      
      features: sessionAnalytics.featuresViewed,
      
      walkthroughs: {
        started: this.analytics.walkthroughsStarted,
        completed: this.analytics.walkthroughsCompleted,
        completionRate: sessionAnalytics.walkthroughCompletionRate,
        steps: this.analytics.walkthroughSteps
      },
      
      scenarios: {
        started: this.analytics.scenariosStarted,
        completed: this.analytics.scenariosCompleted,
        completionRate: sessionAnalytics.scenarioCompletionRate,
        durations: Array.from(this.analytics.scenarioDurations.entries()).map(([id, duration]) => ({
          scenarioId: id,
          duration
        }))
      },
      
      roles: {
        changes: this.analytics.roleChanges,
        current: this.analytics.currentRole
      },
      
      recommendations,
      
      timestamp: new Date(),
      exportUrl: null // Will be set when exported
    };
  }

  /**
   * Calculate engagement score (0-100)
   * @returns {number} Engagement score
   */
  calculateEngagementScore() {
    let score = 0;
    
    // Duration score (max 20 points)
    const durationMinutes = (new Date() - this.startTime) / 60000;
    score += Math.min(20, durationMinutes * 2);
    
    // Pages viewed score (max 15 points)
    const uniquePages = new Set(this.analytics.pagesViewed.map(p => p.page)).size;
    score += Math.min(15, uniquePages * 3);
    
    // Features used score (max 20 points)
    score += Math.min(20, this.analytics.featuresViewed.size * 4);
    
    // Walkthrough completion score (max 20 points)
    score += this.analytics.walkthroughsCompleted.length * 10;
    
    // Scenario completion score (max 25 points)
    score += this.analytics.scenariosCompleted.length * 12.5;
    
    return Math.min(100, Math.round(score));
  }

  /**
   * Generate recommendations based on analytics
   * @returns {Array<string>} Recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check walkthrough completion
    if (this.analytics.walkthroughsStarted.length > 0 && this.analytics.walkthroughsCompleted.length === 0) {
      recommendations.push('Consider completing a walkthrough to learn more about the platform features.');
    }
    
    // Check scenario usage
    if (this.analytics.scenariosStarted.length === 0) {
      recommendations.push('Try running a scenario to see the platform in action with realistic workflows.');
    }
    
    // Check feature exploration
    if (this.analytics.featuresViewed.size < 3) {
      recommendations.push('Explore more features to get a comprehensive view of the platform capabilities.');
    }
    
    // Check role switching
    if (this.analytics.roleChanges.length === 0) {
      recommendations.push('Switch between different roles to see how the platform adapts to different user types.');
    }
    
    // Check session duration
    const durationMinutes = (new Date() - this.startTime) / 60000;
    if (durationMinutes < 5) {
      recommendations.push('Spend more time exploring to discover all the platform features.');
    }
    
    // If no recommendations, provide positive feedback
    if (recommendations.length === 0) {
      recommendations.push('Great job exploring the platform! You\'ve covered most of the key features.');
    }
    
    return recommendations;
  }

  /**
   * Save analytics to localStorage
   */
  saveAnalytics() {
    if (!this.config.enabled) return;
    
    try {
      // End current page view
      this.endPageView();
      
      // Update end time and duration
      this.analytics.endTime = new Date();
      this.analytics.duration = (this.analytics.endTime - this.startTime) / 1000;
      
      // Convert Maps to objects for serialization
      const analyticsToSave = {
        ...this.analytics,
        featuresViewed: Array.from(this.analytics.featuresViewed.entries()),
        scenarioDurations: Array.from(this.analytics.scenarioDurations.entries())
      };
      
      // Get existing sessions
      const existingSessions = this.loadAllSessions();
      
      // Add current session
      existingSessions.push(analyticsToSave);
      
      // Keep only the most recent sessions
      const sessionsToKeep = existingSessions.slice(-this.config.maxStoredSessions);
      
      // Save to localStorage
      localStorage.setItem(this.config.storageKey, JSON.stringify(sessionsToKeep));
      
      console.log('[Analytics Tracker] Analytics saved to localStorage');
    } catch (error) {
      console.error('[Analytics Tracker] Failed to save analytics:', error);
    }
  }

  /**
   * Load all stored sessions
   * @returns {Array} Array of session analytics
   */
  loadAllSessions() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Analytics Tracker] Failed to load sessions:', error);
    }
    return [];
  }

  /**
   * Get all stored sessions
   * @returns {Array} Array of session analytics
   */
  getAllSessions() {
    const sessions = this.loadAllSessions();
    
    // Convert stored format back to Maps
    return sessions.map(session => ({
      ...session,
      featuresViewed: new Map(session.featuresViewed || []),
      scenarioDurations: new Map(session.scenarioDurations || [])
    }));
  }

  /**
   * Clear all stored analytics
   */
  clearAllAnalytics() {
    try {
      localStorage.removeItem(this.config.storageKey);
      console.log('[Analytics Tracker] All analytics cleared');
    } catch (error) {
      console.error('[Analytics Tracker] Failed to clear analytics:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      this.saveAnalytics();
    }, this.config.autoSaveInterval);
    
    console.log('[Analytics Tracker] Auto-save started');
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('[Analytics Tracker] Auto-save stopped');
    }
  }

  /**
   * Handle page hidden event
   */
  handlePageHidden() {
    // End current page view
    this.endPageView();
    
    // End all active feature views
    for (const [feature] of this.analytics.featuresViewed) {
      this.endFeatureView(feature);
    }
    
    // Save analytics
    this.saveAnalytics();
  }

  /**
   * Handle page visible event
   */
  handlePageVisible() {
    // Track page view again
    this.trackPageView(window.location.pathname);
  }

  /**
   * Handle page unload event
   */
  handlePageUnload() {
    // Save analytics one last time
    this.saveAnalytics();
  }

  /**
   * Enable analytics tracking
   */
  enable() {
    this.config.enabled = true;
    this.saveConfiguration();
    console.log('[Analytics Tracker] Tracking enabled');
  }

  /**
   * Disable analytics tracking
   */
  disable() {
    this.config.enabled = false;
    this.saveConfiguration();
    console.log('[Analytics Tracker] Tracking disabled');
  }

  /**
   * Check if tracking is enabled
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.config.enabled;
  }
}

// Create singleton instance
const analyticsTracker = new DemoAnalyticsTracker();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.DemoAnalyticsTracker = DemoAnalyticsTracker;
  window.analyticsTracker = analyticsTracker;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DemoAnalyticsTracker;
}
