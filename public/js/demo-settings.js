/**
 * Demo Settings UI Controller
 * Handles the demo settings page interactions and configuration management
 */

(function() {
  'use strict';

  let configManager;
  let currentConfig;

  /**
   * Initialize the settings page
   */
  function initialize() {
    // Create config manager instance
    configManager = new DemoConfigManager(window.demoOrchestrator);

    // Load current configuration
    currentConfig = configManager.getConfig();

    // Populate form with current values
    populateForm();

    // Set up event listeners
    setupEventListeners();

    console.log('[Demo Settings] Initialized');
  }

  /**
   * Populate form with current configuration values
   */
  function populateForm() {
    // General settings
    document.getElementById('companyName').value = currentConfig.general.companyName;
    document.getElementById('industry').value = currentConfig.general.industry;
    document.getElementById('theme').value = currentConfig.general.theme;
    document.getElementById('language').value = currentConfig.general.language;

    // Simulation settings
    document.getElementById('simulationEnabled').checked = currentConfig.simulation.enabled;
    document.getElementById('simulationInterval').value = currentConfig.simulation.interval / 1000;
    document.getElementById('simulationIntensity').value = currentConfig.simulation.intensity;

    // Walkthrough settings
    document.getElementById('walkthroughEnabled').checked = currentConfig.walkthrough.enabled;
    document.getElementById('walkthroughAutoStart').checked = currentConfig.walkthrough.autoStart;
    document.getElementById('highlightAnimation').value = currentConfig.walkthrough.highlightAnimation;
    document.getElementById('tooltipPosition').value = currentConfig.walkthrough.tooltipPosition;

    // Scenario settings
    document.getElementById('scenariosEnabled').checked = currentConfig.scenarios.enabled;
    document.getElementById('scenarioSpeed').value = currentConfig.scenarios.defaultSpeed;
    document.getElementById('showNarration').checked = currentConfig.scenarios.showNarration;

    // Role switching settings
    document.getElementById('roleSwitchingEnabled').checked = currentConfig.roleSwitching.enabled;
    document.getElementById('defaultRole').value = currentConfig.roleSwitching.defaultRole;
    document.getElementById('enableKeyboardShortcuts').checked = currentConfig.roleSwitching.enableKeyboardShortcuts;

    // Data customization
    document.getElementById('applicationCount').value = currentConfig.data.applicationCount;
    document.getElementById('approvalRate').value = currentConfig.data.approvalRate;
    document.getElementById('averageLoanAmount').value = currentConfig.data.averageLoanAmount;

    // Analytics settings
    document.getElementById('analyticsEnabled').checked = currentConfig.analytics.enabled;
    document.getElementById('analyticsStorage').value = currentConfig.analytics.storage;

    // Feature flags
    document.getElementById('featureLiveSimulation').checked = currentConfig.features.liveSimulation;
    document.getElementById('featureWalkthrough').checked = currentConfig.features.interactiveWalkthrough;
    document.getElementById('featureScenarios').checked = currentConfig.features.scenarioPlayback;
    document.getElementById('featureAIShowcase').checked = currentConfig.features.aiShowcase;
    document.getElementById('featureRoleSwitching').checked = currentConfig.features.roleSwitching;
    document.getElementById('featureResilienceDemo').checked = currentConfig.features.resilienceDemo;
  }

  /**
   * Collect form values into configuration object
   * @returns {Object} Configuration object
   */
  function collectFormValues() {
    return {
      general: {
        companyName: document.getElementById('companyName').value,
        industry: document.getElementById('industry').value,
        theme: document.getElementById('theme').value,
        language: document.getElementById('language').value
      },
      simulation: {
        enabled: document.getElementById('simulationEnabled').checked,
        interval: parseInt(document.getElementById('simulationInterval').value) * 1000,
        intensity: document.getElementById('simulationIntensity').value,
        eventTypes: currentConfig.simulation.eventTypes,
        eventProbabilities: currentConfig.simulation.eventProbabilities
      },
      walkthrough: {
        enabled: document.getElementById('walkthroughEnabled').checked,
        autoStart: document.getElementById('walkthroughAutoStart').checked,
        showProgress: currentConfig.walkthrough.showProgress,
        allowSkip: currentConfig.walkthrough.allowSkip,
        highlightAnimation: document.getElementById('highlightAnimation').value,
        tooltipPosition: document.getElementById('tooltipPosition').value
      },
      scenarios: {
        enabled: document.getElementById('scenariosEnabled').checked,
        defaultSpeed: parseFloat(document.getElementById('scenarioSpeed').value),
        showNarration: document.getElementById('showNarration').checked,
        allowPause: currentConfig.scenarios.allowPause,
        allowSeek: currentConfig.scenarios.allowSeek
      },
      aiShowcase: currentConfig.aiShowcase,
      roleSwitching: {
        enabled: document.getElementById('roleSwitchingEnabled').checked,
        defaultRole: document.getElementById('defaultRole').value,
        availableRoles: currentConfig.roleSwitching.availableRoles,
        showRoleIndicator: currentConfig.roleSwitching.showRoleIndicator,
        enableKeyboardShortcuts: document.getElementById('enableKeyboardShortcuts').checked
      },
      analytics: {
        enabled: document.getElementById('analyticsEnabled').checked,
        storage: document.getElementById('analyticsStorage').value,
        trackPageViews: currentConfig.analytics.trackPageViews,
        trackFeatureViews: currentConfig.analytics.trackFeatureViews,
        trackWalkthroughs: currentConfig.analytics.trackWalkthroughs,
        trackScenarios: currentConfig.analytics.trackScenarios
      },
      resilienceDemo: currentConfig.resilienceDemo,
      teamsDemo: currentConfig.teamsDemo,
      performanceDashboard: currentConfig.performanceDashboard,
      export: currentConfig.export,
      accessibility: currentConfig.accessibility,
      mobile: currentConfig.mobile,
      data: {
        applicationCount: parseInt(document.getElementById('applicationCount').value),
        approvalRate: parseFloat(document.getElementById('approvalRate').value),
        averageLoanAmount: parseInt(document.getElementById('averageLoanAmount').value),
        industries: currentConfig.data.industries,
        customApplications: currentConfig.data.customApplications
      },
      features: {
        liveSimulation: document.getElementById('featureLiveSimulation').checked,
        interactiveWalkthrough: document.getElementById('featureWalkthrough').checked,
        scenarioPlayback: document.getElementById('featureScenarios').checked,
        aiShowcase: document.getElementById('featureAIShowcase').checked,
        roleSwitching: document.getElementById('featureRoleSwitching').checked,
        resilienceDemo: document.getElementById('featureResilienceDemo').checked,
        teamsIntegration: currentConfig.features.teamsIntegration,
        performanceMetrics: currentConfig.features.performanceMetrics,
        workflowVisualization: currentConfig.features.workflowVisualization,
        documentIntelligence: currentConfig.features.documentIntelligence,
        exportReports: currentConfig.features.exportReports,
        mobileOptimization: currentConfig.features.mobileOptimization
      },
      timing: currentConfig.timing,
      colors: currentConfig.colors,
      api: currentConfig.api
    };
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Save button
    document.getElementById('saveConfigBtn').addEventListener('click', handleSave);

    // Reset button
    document.getElementById('resetConfigBtn').addEventListener('click', handleReset);

    // Export button
    document.getElementById('exportConfigBtn').addEventListener('click', handleExport);

    // Import button
    document.getElementById('importConfigBtn').addEventListener('click', handleImportClick);

    // File input for import
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);

    // Listen for config manager events
    configManager.on('config-saved', () => {
      showStatus('Configuration saved successfully!', 'success');
    });

    configManager.on('save-failed', (data) => {
      showStatus('Failed to save configuration: ' + (data.errors ? data.errors.join(', ') : data.error), 'error');
    });

    configManager.on('config-reset', () => {
      showStatus('Configuration reset to defaults', 'info');
      currentConfig = configManager.getConfig();
      populateForm();
    });

    configManager.on('config-imported', () => {
      showStatus('Configuration imported successfully!', 'success');
      currentConfig = configManager.getConfig();
      populateForm();
    });

    configManager.on('import-failed', (data) => {
      showStatus('Failed to import configuration: ' + (data.errors ? data.errors.join(', ') : data.error), 'error');
    });
  }

  /**
   * Handle save button click
   */
  function handleSave() {
    const newConfig = collectFormValues();
    const success = configManager.saveConfig(newConfig);
    
    if (success) {
      currentConfig = newConfig;
    }
  }

  /**
   * Handle reset button click
   */
  function handleReset() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      configManager.resetToDefaults();
    }
  }

  /**
   * Handle export button click
   */
  function handleExport() {
    const configJson = configManager.exportConfig();
    if (!configJson) {
      showStatus('Failed to export configuration', 'error');
      return;
    }

    // Create blob and download
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Configuration exported successfully!', 'success');
  }

  /**
   * Handle import button click
   */
  function handleImportClick() {
    document.getElementById('importFileInput').click();
  }

  /**
   * Handle import file selection
   * @param {Event} event - File input change event
   */
  function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const success = configManager.importConfig(e.target.result);
      if (!success) {
        // Error message already shown by event listener
      }
      // Reset file input
      event.target.value = '';
    };
    reader.onerror = function() {
      showStatus('Failed to read file', 'error');
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  /**
   * Show status message
   * @param {string} message - Message to display
   * @param {string} type - Message type (success, error, warning, info)
   */
  function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 5000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
