/**
 * Demo Mode Orchestrator
 * Central controller for all enhanced demo mode features
 * Manages state, coordinates components, and provides event communication
 */

class DemoModeOrchestrator {
  constructor() {
    // State management
    this.state = {
      isActive: false,
      currentRole: 'investor',
      simulationRunning: false,
      walkthroughActive: false,
      scenarioPlaying: false,
      currentWalkthrough: null,
      currentScenario: null,
      analytics: {
        sessionId: this.generateSessionId(),
        startTime: new Date(),
        featuresViewed: [],
        walkthroughsCompleted: [],
        scenariosCompleted: []
      }
    };

    // Configuration
    this.config = {
      enableLiveSimulation: true,
      simulationInterval: 45000, // 45 seconds
      enableWalkthrough: true,
      enableScenarios: true,
      enableAnalytics: true,
      customData: null
    };

    // Event listeners
    this.listeners = new Map();

    // Component references
    this.components = {
      walkthroughEngine: null,
      scenarioPlayer: null,
      liveSimulator: null,
      aiShowcaseEngine: null,
      roleSwitcher: null,
      analyticsTracker: null
    };

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the orchestrator
   */
  initialize() {
    // Load configuration from localStorage
    this.loadConfiguration();

    // Check if demo mode should be active
    this.checkDemoMode();

    // Set up event listeners
    this.setupEventListeners();

    // Log initialization
    if (this.state.isActive) {
      console.log('[Demo Orchestrator] Initialized in demo mode');
      console.log('[Demo Orchestrator] Session ID:', this.state.analytics.sessionId);
    }
  }

  /**
   * Check if demo mode should be active
   */
  checkDemoMode() {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
      this.state.isActive = true;
      return;
    }

    // Check localStorage
    if (localStorage.getItem('demoMode') === 'true') {
      this.state.isActive = true;
      return;
    }

    // Check for demo session cookie
    if (document.cookie.includes('demo_session=')) {
      this.state.isActive = true;
      return;
    }

    // Check window variable (set by server)
    if (window.DEMO_MODE_ENABLED === true) {
      this.state.isActive = true;
      return;
    }

    // Check if API indicates demo mode
    this.checkApiDemoMode();
  }

  /**
   * Check API for demo mode status
   */
  async checkApiDemoMode() {
    try {
      const response = await fetch('/api/v1/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.demoMode === true || response.headers.get('X-Demo-Mode') === 'true') {
          this.state.isActive = true;
          this.emit('demo-mode-detected', { source: 'api' });
        }
      }
    } catch (error) {
      // If health check fails, assume demo mode
      console.warn('[Demo Orchestrator] Health check failed, assuming demo mode');
      this.state.isActive = true;
    }
  }

  /**
   * Load configuration from localStorage
   */
  loadConfiguration() {
    try {
      const savedConfig = localStorage.getItem('demoModeConfig');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
        console.log('[Demo Orchestrator] Configuration loaded from localStorage');
      }
    } catch (error) {
      console.warn('[Demo Orchestrator] Failed to load configuration:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  saveConfiguration() {
    try {
      localStorage.setItem('demoModeConfig', JSON.stringify(this.config));
      console.log('[Demo Orchestrator] Configuration saved to localStorage');
    } catch (error) {
      console.warn('[Demo Orchestrator] Failed to save configuration:', error);
    }
  }

  /**
   * Update configuration
   * @param {Object} updates - Configuration updates
   */
  updateConfiguration(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfiguration();
    this.emit('config-updated', this.config);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.emit('page-hidden');
      } else {
        this.emit('page-visible');
      }
    });

    // Listen for beforeunload to save state
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Start live simulation
   */
  startSimulation() {
    if (!this.config.enableLiveSimulation) {
      console.warn('[Demo Orchestrator] Live simulation is disabled in config');
      return;
    }

    if (this.state.simulationRunning) {
      console.warn('[Demo Orchestrator] Simulation already running');
      return;
    }

    this.state.simulationRunning = true;
    this.emit('simulation-started');
    console.log('[Demo Orchestrator] Live simulation started');

    // Notify live simulator component if available
    if (this.components.liveSimulator) {
      this.components.liveSimulator.start({
        interval: this.config.simulationInterval,
        intensity: 'medium'
      });
    }
  }

  /**
   * Stop live simulation
   */
  stopSimulation() {
    if (!this.state.simulationRunning) {
      return;
    }

    this.state.simulationRunning = false;
    this.emit('simulation-stopped');
    console.log('[Demo Orchestrator] Live simulation stopped');

    // Notify live simulator component if available
    if (this.components.liveSimulator) {
      this.components.liveSimulator.stop();
    }
  }

  /**
   * Start walkthrough
   * @param {string} walkthroughId - ID of walkthrough to start
   */
  startWalkthrough(walkthroughId) {
    if (!this.config.enableWalkthrough) {
      console.warn('[Demo Orchestrator] Walkthroughs are disabled in config');
      return;
    }

    if (this.state.walkthroughActive) {
      console.warn('[Demo Orchestrator] Walkthrough already active');
      return;
    }

    this.state.walkthroughActive = true;
    this.state.currentWalkthrough = walkthroughId;
    this.emit('walkthrough-started', { walkthroughId });
    console.log('[Demo Orchestrator] Walkthrough started:', walkthroughId);

    // Track analytics
    this.trackFeatureView('walkthrough', walkthroughId);

    // Notify walkthrough engine if available
    if (this.components.walkthroughEngine) {
      this.components.walkthroughEngine.loadWalkthrough(walkthroughId);
      this.components.walkthroughEngine.start();
    }
  }

  /**
   * Stop walkthrough
   */
  stopWalkthrough() {
    if (!this.state.walkthroughActive) {
      return;
    }

    const walkthroughId = this.state.currentWalkthrough;
    this.state.walkthroughActive = false;
    this.state.currentWalkthrough = null;
    this.emit('walkthrough-stopped', { walkthroughId });
    console.log('[Demo Orchestrator] Walkthrough stopped');
  }

  /**
   * Complete walkthrough
   * @param {string} walkthroughId - ID of completed walkthrough
   */
  completeWalkthrough(walkthroughId) {
    this.state.walkthroughActive = false;
    this.state.currentWalkthrough = null;
    
    // Track completion
    if (!this.state.analytics.walkthroughsCompleted.includes(walkthroughId)) {
      this.state.analytics.walkthroughsCompleted.push(walkthroughId);
    }

    this.emit('walkthrough-completed', { walkthroughId });
    console.log('[Demo Orchestrator] Walkthrough completed:', walkthroughId);
  }

  /**
   * Play scenario
   * @param {string} scenarioId - ID of scenario to play
   */
  playScenario(scenarioId) {
    if (!this.config.enableScenarios) {
      console.warn('[Demo Orchestrator] Scenarios are disabled in config');
      return;
    }

    if (this.state.scenarioPlaying) {
      console.warn('[Demo Orchestrator] Scenario already playing');
      return;
    }

    this.state.scenarioPlaying = true;
    this.state.currentScenario = scenarioId;
    this.emit('scenario-started', { scenarioId });
    console.log('[Demo Orchestrator] Scenario started:', scenarioId);

    // Track analytics
    this.trackFeatureView('scenario', scenarioId);

    // Notify scenario player if available
    if (this.components.scenarioPlayer) {
      this.components.scenarioPlayer.loadScenario(scenarioId);
      this.components.scenarioPlayer.play();
    }
  }

  /**
   * Stop scenario
   */
  stopScenario() {
    if (!this.state.scenarioPlaying) {
      return;
    }

    const scenarioId = this.state.currentScenario;
    this.state.scenarioPlaying = false;
    this.state.currentScenario = null;
    this.emit('scenario-stopped', { scenarioId });
    console.log('[Demo Orchestrator] Scenario stopped');

    // Notify scenario player if available
    if (this.components.scenarioPlayer) {
      this.components.scenarioPlayer.stop();
    }
  }

  /**
   * Complete scenario
   * @param {string} scenarioId - ID of completed scenario
   */
  completeScenario(scenarioId) {
    this.state.scenarioPlaying = false;
    this.state.currentScenario = null;
    
    // Track completion
    if (!this.state.analytics.scenariosCompleted.includes(scenarioId)) {
      this.state.analytics.scenariosCompleted.push(scenarioId);
    }

    this.emit('scenario-completed', { scenarioId });
    console.log('[Demo Orchestrator] Scenario completed:', scenarioId);
  }

  /**
   * Switch user role
   * @param {string} role - Role to switch to (applicant, reviewer, approver, admin, investor)
   */
  switchRole(role) {
    const validRoles = ['applicant', 'reviewer', 'approver', 'admin', 'investor'];
    
    if (!validRoles.includes(role)) {
      console.error('[Demo Orchestrator] Invalid role:', role);
      return;
    }

    const previousRole = this.state.currentRole;
    this.state.currentRole = role;
    this.emit('role-switched', { previousRole, newRole: role });
    console.log('[Demo Orchestrator] Role switched:', previousRole, '->', role);

    // Track analytics
    this.trackFeatureView('role-switch', role);

    // Notify role switcher if available
    if (this.components.roleSwitcher) {
      this.components.roleSwitcher.switchTo(role);
    }
  }

  /**
   * Get current state
   * @returns {Object} Current demo state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get configuration
   * @returns {Object} Current configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Register a component
   * @param {string} name - Component name
   * @param {Object} component - Component instance
   */
  registerComponent(name, component) {
    if (this.components.hasOwnProperty(name)) {
      this.components[name] = component;
      console.log('[Demo Orchestrator] Component registered:', name);
      this.emit('component-registered', { name });
    } else {
      console.warn('[Demo Orchestrator] Unknown component name:', name);
    }
  }

  /**
   * Get a registered component
   * @param {string} name - Component name
   * @returns {Object|null} Component instance or null
   */
  getComponent(name) {
    return this.components[name] || null;
  }

  /**
   * Track feature view for analytics
   * @param {string} feature - Feature name
   * @param {string} details - Additional details
   */
  trackFeatureView(feature, details = '') {
    if (!this.config.enableAnalytics) {
      return;
    }

    const view = {
      feature,
      details,
      timestamp: new Date(),
      page: window.location.pathname
    };

    this.state.analytics.featuresViewed.push(view);
    this.emit('feature-viewed', view);

    // Notify analytics tracker if available
    if (this.components.analyticsTracker) {
      this.components.analyticsTracker.trackFeatureView(feature, details);
    }
  }

  /**
   * Event emitter - add listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Event emitter - remove listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Event emitter - emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    const callbacks = this.listeners.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[Demo Orchestrator] Error in event listener:', error);
      }
    });
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'demo-session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get analytics summary
   * @returns {Object} Analytics summary
   */
  getAnalytics() {
    const duration = (new Date() - this.state.analytics.startTime) / 1000; // seconds

    return {
      sessionId: this.state.analytics.sessionId,
      startTime: this.state.analytics.startTime,
      duration,
      currentRole: this.state.currentRole,
      featuresViewed: this.state.analytics.featuresViewed.length,
      walkthroughsCompleted: this.state.analytics.walkthroughsCompleted.length,
      scenariosCompleted: this.state.analytics.scenariosCompleted.length,
      simulationUsed: this.state.simulationRunning,
      details: {
        featuresViewed: this.state.analytics.featuresViewed,
        walkthroughsCompleted: this.state.analytics.walkthroughsCompleted,
        scenariosCompleted: this.state.analytics.scenariosCompleted
      }
    };
  }

  /**
   * Reset analytics for new session
   */
  resetAnalytics() {
    this.state.analytics = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      featuresViewed: [],
      walkthroughsCompleted: [],
      scenariosCompleted: []
    };
    console.log('[Demo Orchestrator] Analytics reset for new session');
  }

  /**
   * Cleanup before page unload
   */
  cleanup() {
    // Stop any running features
    if (this.state.simulationRunning) {
      this.stopSimulation();
    }
    if (this.state.walkthroughActive) {
      this.stopWalkthrough();
    }
    if (this.state.scenarioPlaying) {
      this.stopScenario();
    }

    // Save configuration
    this.saveConfiguration();

    // Emit cleanup event
    this.emit('cleanup');

    console.log('[Demo Orchestrator] Cleanup completed');
  }

  /**
   * Check if demo mode is active
   * @returns {boolean} True if demo mode is active
   */
  isActive() {
    return this.state.isActive;
  }

  /**
   * Enable demo mode
   */
  enable() {
    this.state.isActive = true;
    localStorage.setItem('demoMode', 'true');
    this.emit('demo-mode-enabled');
    console.log('[Demo Orchestrator] Demo mode enabled');
  }

  /**
   * Disable demo mode
   */
  disable() {
    this.state.isActive = false;
    localStorage.removeItem('demoMode');
    this.emit('demo-mode-disabled');
    console.log('[Demo Orchestrator] Demo mode disabled');
  }
}

// Create singleton instance
const demoOrchestrator = new DemoModeOrchestrator();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.DemoModeOrchestrator = DemoModeOrchestrator;
  window.demoOrchestrator = demoOrchestrator;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DemoModeOrchestrator;
}
