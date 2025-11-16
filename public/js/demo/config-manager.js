/**
 * Demo Configuration Manager
 * Manages demo mode configuration with localStorage persistence,
 * validation, and UI integration
 */

class DemoConfigManager {
  constructor(orchestrator = null) {
    this.orchestrator = orchestrator;
    this.config = null;
    this.defaultConfig = null;
    this.listeners = new Map();
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the configuration manager
   */
  initialize() {
    // Load default configuration
    this.defaultConfig = this.getDefaultConfiguration();
    
    // Load saved configuration or use defaults
    this.config = this.loadConfig();
    
    console.log('[Config Manager] Initialized with configuration');
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfiguration() {
    return {
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
        autoStart: false,
        showProgress: true,
        allowSkip: true,
        highlightAnimation: 'pulse',
        tooltipPosition: 'auto'
      },

      // Scenario settings
      scenarios: {
        enabled: true,
        defaultSpeed: 1.0,
        showNarration: true,
        allowPause: true,
        allowSeek: true
      },

      // AI showcase settings
      aiShowcase: {
        enabled: true,
        showThinkingAnimation: true,
        thinkingDuration: 2000,
        revealAnimationSpeed: 'normal',
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
        storage: 'local',
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
        defaultFailureDuration: 30000
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
        updateInterval: 5000,
        showRealTimeMetrics: true,
        showCharts: true
      },

      // Export settings
      export: {
        enabled: true,
        includeScreenshots: true,
        includeAnalytics: true,
        format: 'pdf'
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
        approvalRate: 62.5,
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
        customApplications: []
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
        animationDuration: 300,
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
        timeout: 3000,
        retries: 2
      }
    };
  }

  /**
   * Load configuration from localStorage
   * @returns {Object} Loaded configuration or defaults
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem('demoModeConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = this.deepMerge(this.defaultConfig, parsed);
        
        // Validate the loaded configuration
        const validation = this.validateConfig(merged);
        if (!validation.valid) {
          console.warn('[Config Manager] Loaded config has errors, using defaults:', validation.errors);
          return this.deepClone(this.defaultConfig);
        }
        
        console.log('[Config Manager] Configuration loaded from localStorage');
        return merged;
      }
    } catch (error) {
      console.warn('[Config Manager] Failed to load configuration:', error);
    }
    
    return this.deepClone(this.defaultConfig);
  }

  /**
   * Save configuration to localStorage
   * @param {Object} config - Configuration to save (optional, uses current if not provided)
   * @returns {boolean} Success status
   */
  saveConfig(config = null) {
    try {
      const configToSave = config || this.config;
      
      // Validate before saving
      const validation = this.validateConfig(configToSave);
      if (!validation.valid) {
        console.error('[Config Manager] Cannot save invalid configuration:', validation.errors);
        this.emit('save-failed', { errors: validation.errors });
        return false;
      }
      
      localStorage.setItem('demoModeConfig', JSON.stringify(configToSave));
      this.config = configToSave;
      
      console.log('[Config Manager] Configuration saved to localStorage');
      this.emit('config-saved', { config: configToSave });
      
      // Notify orchestrator if available
      if (this.orchestrator) {
        this.orchestrator.updateConfiguration(configToSave);
      }
      
      return true;
    } catch (error) {
      console.error('[Config Manager] Failed to save configuration:', error);
      this.emit('save-failed', { error: error.message });
      return false;
    }
  }

  /**
   * Update configuration with partial updates
   * @param {Object} updates - Partial configuration updates
   * @returns {boolean} Success status
   */
  updateConfig(updates) {
    try {
      const newConfig = this.deepMerge(this.config, updates);
      return this.saveConfig(newConfig);
    } catch (error) {
      console.error('[Config Manager] Failed to update configuration:', error);
      return false;
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return this.deepClone(this.config);
  }

  /**
   * Get specific configuration section
   * @param {string} section - Section name (e.g., 'simulation', 'walkthrough')
   * @returns {Object|null} Section configuration or null
   */
  getSection(section) {
    if (this.config && this.config[section]) {
      return this.deepClone(this.config[section]);
    }
    return null;
  }

  /**
   * Update specific configuration section
   * @param {string} section - Section name
   * @param {Object} updates - Section updates
   * @returns {boolean} Success status
   */
  updateSection(section, updates) {
    if (!this.config[section]) {
      console.error('[Config Manager] Unknown section:', section);
      return false;
    }
    
    const newConfig = { ...this.config };
    newConfig[section] = { ...newConfig[section], ...updates };
    
    return this.saveConfig(newConfig);
  }

  /**
   * Reset configuration to defaults
   * @returns {Object} Default configuration
   */
  resetToDefaults() {
    try {
      localStorage.removeItem('demoModeConfig');
      this.config = this.deepClone(this.defaultConfig);
      
      console.log('[Config Manager] Configuration reset to defaults');
      this.emit('config-reset', { config: this.config });
      
      // Notify orchestrator if available
      if (this.orchestrator) {
        this.orchestrator.updateConfiguration(this.config);
      }
      
      return this.deepClone(this.config);
    } catch (error) {
      console.error('[Config Manager] Failed to reset configuration:', error);
      return this.deepClone(this.defaultConfig);
    }
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateConfig(config) {
    const errors = [];

    // Validate simulation settings
    if (config.simulation) {
      if (config.simulation.interval !== undefined) {
        if (typeof config.simulation.interval !== 'number' || config.simulation.interval < 1000) {
          errors.push('Simulation interval must be a number >= 1000ms');
        }
      }
      
      const validIntensities = ['low', 'medium', 'high'];
      if (config.simulation.intensity && !validIntensities.includes(config.simulation.intensity)) {
        errors.push('Simulation intensity must be "low", "medium", or "high"');
      }
      
      // Validate event probabilities sum to ~1.0
      if (config.simulation.eventProbabilities) {
        const sum = Object.values(config.simulation.eventProbabilities).reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1.0) > 0.01) {
          errors.push('Event probabilities should sum to approximately 1.0');
        }
      }
    }

    // Validate role switching settings
    if (config.roleSwitching) {
      const validRoles = ['applicant', 'reviewer', 'approver', 'admin', 'investor'];
      if (config.roleSwitching.defaultRole && !validRoles.includes(config.roleSwitching.defaultRole)) {
        errors.push('Default role must be one of: ' + validRoles.join(', '));
      }
      
      if (config.roleSwitching.availableRoles) {
        const invalidRoles = config.roleSwitching.availableRoles.filter(r => !validRoles.includes(r));
        if (invalidRoles.length > 0) {
          errors.push('Invalid roles in availableRoles: ' + invalidRoles.join(', '));
        }
      }
    }

    // Validate data settings
    if (config.data) {
      if (config.data.approvalRate !== undefined) {
        if (typeof config.data.approvalRate !== 'number' || 
            config.data.approvalRate < 0 || 
            config.data.approvalRate > 100) {
          errors.push('Approval rate must be a number between 0 and 100');
        }
      }
      
      if (config.data.applicationCount !== undefined) {
        if (typeof config.data.applicationCount !== 'number' || config.data.applicationCount < 0) {
          errors.push('Application count must be a non-negative number');
        }
      }
      
      if (config.data.averageLoanAmount !== undefined) {
        if (typeof config.data.averageLoanAmount !== 'number' || config.data.averageLoanAmount < 0) {
          errors.push('Average loan amount must be a non-negative number');
        }
      }
    }

    // Validate timing settings
    if (config.timing) {
      const timingKeys = ['animationDuration', 'transitionDuration', 'tooltipDelay', 
                          'notificationDuration', 'toastDuration'];
      timingKeys.forEach(key => {
        if (config.timing[key] !== undefined) {
          if (typeof config.timing[key] !== 'number' || config.timing[key] < 0) {
            errors.push(`${key} must be a non-negative number`);
          }
        }
      });
    }

    // Validate scenario settings
    if (config.scenarios) {
      if (config.scenarios.defaultSpeed !== undefined) {
        if (typeof config.scenarios.defaultSpeed !== 'number' || 
            config.scenarios.defaultSpeed <= 0 || 
            config.scenarios.defaultSpeed > 5) {
          errors.push('Scenario default speed must be between 0 and 5');
        }
      }
    }

    // Validate theme
    if (config.general && config.general.theme) {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(config.general.theme)) {
        errors.push('Theme must be "light", "dark", or "auto"');
      }
    }

    // Validate export format
    if (config.export && config.export.format) {
      const validFormats = ['pdf', 'html'];
      if (!validFormats.includes(config.export.format)) {
        errors.push('Export format must be "pdf" or "html"');
      }
    }

    // Validate analytics storage
    if (config.analytics && config.analytics.storage) {
      const validStorage = ['local', 'none'];
      if (!validStorage.includes(config.analytics.storage)) {
        errors.push('Analytics storage must be "local" or "none"');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configuration as JSON
   * @returns {string} JSON string of configuration
   */
  exportConfig() {
    try {
      return JSON.stringify(this.config, null, 2);
    } catch (error) {
      console.error('[Config Manager] Failed to export configuration:', error);
      return null;
    }
  }

  /**
   * Import configuration from JSON
   * @param {string} jsonString - JSON string of configuration
   * @returns {boolean} Success status
   */
  importConfig(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      const merged = this.deepMerge(this.defaultConfig, imported);
      
      const validation = this.validateConfig(merged);
      if (!validation.valid) {
        console.error('[Config Manager] Imported config is invalid:', validation.errors);
        this.emit('import-failed', { errors: validation.errors });
        return false;
      }
      
      const success = this.saveConfig(merged);
      if (success) {
        this.emit('config-imported', { config: merged });
      }
      return success;
    } catch (error) {
      console.error('[Config Manager] Failed to import configuration:', error);
      this.emit('import-failed', { error: error.message });
      return false;
    }
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
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
        console.error('[Config Manager] Error in event listener:', error);
      }
    });
  }

  /**
   * Get configuration summary for display
   * @returns {Object} Configuration summary
   */
  getSummary() {
    return {
      simulation: {
        enabled: this.config.simulation.enabled,
        interval: `${this.config.simulation.interval / 1000}s`,
        intensity: this.config.simulation.intensity
      },
      features: {
        liveSimulation: this.config.features.liveSimulation,
        walkthrough: this.config.features.interactiveWalkthrough,
        scenarios: this.config.features.scenarioPlayback,
        aiShowcase: this.config.features.aiShowcase,
        roleSwitching: this.config.features.roleSwitching
      },
      data: {
        applicationCount: this.config.data.applicationCount,
        approvalRate: `${this.config.data.approvalRate}%`,
        averageLoanAmount: `$${this.config.data.averageLoanAmount.toLocaleString()}`
      },
      analytics: {
        enabled: this.config.analytics.enabled,
        storage: this.config.analytics.storage
      }
    };
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.DemoConfigManager = DemoConfigManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DemoConfigManager;
}
