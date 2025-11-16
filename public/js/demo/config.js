/**
 * Demo Mode Configuration
 * Default configuration values and constants for demo mode features
 */

const DemoConfig = {
  // General settings
  general: {
    companyName: 'CivicFlow2',
    industry: 'Government Lending',
    theme: 'auto', // 'light', 'dark', or 'auto'
    language: 'en'
  },

  // Simulation settings
  simulation: {
    enabled: true,
    interval: 45000, // 45 seconds between events
    intensity: 'medium', // 'low', 'medium', 'high'
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
  },

  // Walkthrough settings
  walkthrough: {
    enabled: true,
    autoStart: false, // Auto-start walkthrough on first visit
    showProgress: true,
    allowSkip: true,
    highlightAnimation: 'pulse', // 'pulse', 'glow', 'none'
    tooltipPosition: 'auto' // 'auto', 'top', 'bottom', 'left', 'right'
  },

  // Scenario settings
  scenarios: {
    enabled: true,
    defaultSpeed: 1.0, // 0.5x, 1x, 2x
    showNarration: true,
    allowPause: true,
    allowSeek: true
  },

  // AI showcase settings
  aiShowcase: {
    enabled: true,
    showThinkingAnimation: true,
    thinkingDuration: 2000, // milliseconds
    revealAnimationSpeed: 'normal', // 'slow', 'normal', 'fast'
    showConfidenceScores: true
  },

  // Role switching settings
  roleSwitching: {
    enabled: true,
    defaultRole: 'investor',
    availableRoles: ['applicant', 'reviewer', 'approver', 'admin', 'investor'],
    showRoleIndicator: true,
    enableKeyboardShortcuts: true
  },

  // Analytics settings
  analytics: {
    enabled: true,
    storage: 'local', // 'local' or 'none'
    trackPageViews: true,
    trackFeatureViews: true,
    trackWalkthroughs: true,
    trackScenarios: true
  },

  // Resilience demo settings
  resilienceDemo: {
    enabled: true,
    showCircuitBreaker: true,
    showActivityFeed: true,
    defaultFailureDuration: 30000 // 30 seconds
  },

  // Teams integration demo settings
  teamsDemo: {
    enabled: true,
    showNotificationPanel: true,
    showAdaptiveCards: true,
    mockNotifications: true
  },

  // Performance dashboard settings
  performanceDashboard: {
    enabled: true,
    updateInterval: 5000, // 5 seconds
    showRealTimeMetrics: true,
    showCharts: true
  },

  // Export settings
  export: {
    enabled: true,
    includeScreenshots: true,
    includeAnalytics: true,
    format: 'pdf' // 'pdf' or 'html'
  },

  // Accessibility settings
  accessibility: {
    enableKeyboardNav: true,
    enableScreenReader: true,
    enableHighContrast: false,
    enableFocusIndicators: true
  },

  // Mobile settings
  mobile: {
    enableTouchGestures: true,
    optimizeAnimations: true,
    showMobileControls: true
  },

  // Data customization
  data: {
    applicationCount: 47,
    approvalRate: 62.5, // percentage
    averageLoanAmount: 75000,
    industries: [
      'Manufacturing',
      'Technology',
      'Retail',
      'Food Service',
      'Professional Services',
      'Healthcare',
      'Construction',
      'Transportation'
    ],
    customApplications: [] // Array of custom application objects
  },

  // Feature flags
  features: {
    liveSimulation: true,
    interactiveWalkthrough: true,
    scenarioPlayback: true,
    aiShowcase: true,
    roleSwitching: true,
    resilienceDemo: true,
    teamsIntegration: true,
    performanceMetrics: true,
    workflowVisualization: true,
    documentIntelligence: true,
    exportReports: true,
    mobileOptimization: true
  },

  // Timing constants
  timing: {
    animationDuration: 300, // milliseconds
    transitionDuration: 200,
    tooltipDelay: 500,
    notificationDuration: 5000,
    toastDuration: 4000
  },

  // Color scheme
  colors: {
    demoPurple: '#8b5cf6',
    demoBlue: '#3b82f6',
    successGreen: '#10b981',
    warningAmber: '#f59e0b',
    errorRed: '#ef4444',
    aiCyan: '#06b6d4',
    simulationOrange: '#f97316'
  },

  // API endpoints
  api: {
    baseURL: '/api/v1',
    timeout: 3000, // milliseconds
    retries: 2
  }
};

/**
 * Get default configuration
 * @returns {Object} Default configuration
 */
function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DemoConfig));
}

/**
 * Merge configuration with defaults
 * @param {Object} customConfig - Custom configuration
 * @returns {Object} Merged configuration
 */
function mergeConfig(customConfig) {
  return deepMerge(getDefaultConfig(), customConfig);
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateConfig(config) {
  const errors = [];

  // Validate simulation interval
  if (config.simulation?.interval < 1000) {
    errors.push('Simulation interval must be at least 1000ms');
  }

  // Validate simulation intensity
  const validIntensities = ['low', 'medium', 'high'];
  if (config.simulation?.intensity && !validIntensities.includes(config.simulation.intensity)) {
    errors.push('Simulation intensity must be "low", "medium", or "high"');
  }

  // Validate role
  const validRoles = ['applicant', 'reviewer', 'approver', 'admin', 'investor'];
  if (config.roleSwitching?.defaultRole && !validRoles.includes(config.roleSwitching.defaultRole)) {
    errors.push('Default role must be one of: ' + validRoles.join(', '));
  }

  // Validate approval rate
  if (config.data?.approvalRate !== undefined) {
    if (config.data.approvalRate < 0 || config.data.approvalRate > 100) {
      errors.push('Approval rate must be between 0 and 100');
    }
  }

  // Validate application count
  if (config.data?.applicationCount !== undefined) {
    if (config.data.applicationCount < 0) {
      errors.push('Application count must be non-negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load configuration from localStorage
 * @returns {Object} Loaded configuration or default
 */
function loadConfig() {
  try {
    const saved = localStorage.getItem('demoModeConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      return mergeConfig(parsed);
    }
  } catch (error) {
    console.warn('[Demo Config] Failed to load configuration:', error);
  }
  return getDefaultConfig();
}

/**
 * Save configuration to localStorage
 * @param {Object} config - Configuration to save
 * @returns {boolean} Success status
 */
function saveConfig(config) {
  try {
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.error('[Demo Config] Invalid configuration:', validation.errors);
      return false;
    }
    localStorage.setItem('demoModeConfig', JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('[Demo Config] Failed to save configuration:', error);
    return false;
  }
}

/**
 * Reset configuration to defaults
 * @returns {Object} Default configuration
 */
function resetConfig() {
  try {
    localStorage.removeItem('demoModeConfig');
    return getDefaultConfig();
  } catch (error) {
    console.error('[Demo Config] Failed to reset configuration:', error);
    return getDefaultConfig();
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.DemoConfig = DemoConfig;
  window.getDefaultConfig = getDefaultConfig;
  window.mergeConfig = mergeConfig;
  window.validateConfig = validateConfig;
  window.loadConfig = loadConfig;
  window.saveConfig = saveConfig;
  window.resetConfig = resetConfig;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DemoConfig,
    getDefaultConfig,
    mergeConfig,
    validateConfig,
    loadConfig,
    saveConfig,
    resetConfig
  };
}
