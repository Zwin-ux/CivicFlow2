# Demo Configuration Manager

## Overview

The Demo Configuration Manager provides a robust system for managing demo mode configuration with localStorage persistence, validation, and UI integration.

## Files

- **`config-manager.js`** - Core configuration manager class
- **`config.js`** - Default configuration values and utilities
- **`demo-settings.html`** - Configuration UI panel
- **`demo-settings.css`** - Styling for settings panel
- **`demo-settings.js`** - UI controller for settings page

## Features

### Core Functionality

1. **Load/Save Configuration**
   - Loads configuration from localStorage
   - Saves configuration with validation
   - Merges with defaults for missing values

2. **Validation**
   - Validates all configuration values
   - Provides detailed error messages
   - Prevents invalid configurations from being saved

3. **Default Configuration**
   - Comprehensive default values
   - Easy reset to defaults
   - Deep cloning to prevent mutations

4. **Import/Export**
   - Export configuration as JSON
   - Import configuration from JSON
   - Validation on import

5. **Event System**
   - Emits events for configuration changes
   - Listeners for save, reset, import events
   - Integration with orchestrator

## Usage

### Basic Usage

```javascript
// Create config manager instance
const configManager = new DemoConfigManager(orchestrator);

// Load configuration
const config = configManager.loadConfig();

// Update configuration
configManager.updateConfig({
  simulation: {
    interval: 60000,
    intensity: 'high'
  }
});

// Save configuration
configManager.saveConfig();

// Reset to defaults
configManager.resetToDefaults();
```

### Section Operations

```javascript
// Get specific section
const simulationConfig = configManager.getSection('simulation');

// Update specific section
configManager.updateSection('simulation', {
  enabled: true,
  interval: 30000
});
```

### Validation

```javascript
// Validate configuration
const validation = configManager.validateConfig(config);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Export/Import

```javascript
// Export configuration
const jsonString = configManager.exportConfig();

// Import configuration
const success = configManager.importConfig(jsonString);
```

### Event Listeners

```javascript
// Listen for configuration changes
configManager.on('config-saved', (data) => {
  console.log('Configuration saved:', data.config);
});

configManager.on('save-failed', (data) => {
  console.error('Save failed:', data.errors);
});

configManager.on('config-reset', (data) => {
  console.log('Configuration reset to defaults');
});
```

## Configuration Structure

### General Settings
- `companyName` - Company name for demo
- `industry` - Industry vertical
- `theme` - UI theme (light, dark, auto)
- `language` - Language code

### Simulation Settings
- `enabled` - Enable/disable simulation
- `interval` - Time between events (ms)
- `intensity` - Event frequency (low, medium, high)
- `eventTypes` - Array of event types
- `eventProbabilities` - Probability for each event type

### Walkthrough Settings
- `enabled` - Enable/disable walkthroughs
- `autoStart` - Auto-start on first visit
- `showProgress` - Show progress indicator
- `allowSkip` - Allow skipping walkthrough
- `highlightAnimation` - Animation style (pulse, glow, none)
- `tooltipPosition` - Tooltip position (auto, top, bottom, left, right)

### Scenario Settings
- `enabled` - Enable/disable scenarios
- `defaultSpeed` - Playback speed (0.5x - 2x)
- `showNarration` - Show narration text
- `allowPause` - Allow pausing scenarios
- `allowSeek` - Allow seeking in timeline

### Role Switching Settings
- `enabled` - Enable/disable role switching
- `defaultRole` - Default role on load
- `availableRoles` - Array of available roles
- `showRoleIndicator` - Show role indicator badge
- `enableKeyboardShortcuts` - Enable keyboard shortcuts

### Data Customization
- `applicationCount` - Number of applications
- `approvalRate` - Approval rate percentage
- `averageLoanAmount` - Average loan amount
- `industries` - Array of industry options
- `customApplications` - Array of custom application objects

### Analytics Settings
- `enabled` - Enable/disable analytics
- `storage` - Storage method (local, none)
- `trackPageViews` - Track page views
- `trackFeatureViews` - Track feature usage
- `trackWalkthroughs` - Track walkthrough completion
- `trackScenarios` - Track scenario completion

### Feature Flags
- `liveSimulation` - Enable live simulation
- `interactiveWalkthrough` - Enable walkthroughs
- `scenarioPlayback` - Enable scenarios
- `aiShowcase` - Enable AI showcase
- `roleSwitching` - Enable role switching
- `resilienceDemo` - Enable resilience demo
- And more...

## Validation Rules

### Simulation
- Interval must be >= 1000ms
- Intensity must be 'low', 'medium', or 'high'
- Event probabilities should sum to ~1.0

### Role Switching
- Default role must be valid (applicant, reviewer, approver, admin, investor)
- Available roles must all be valid

### Data
- Approval rate must be 0-100
- Application count must be non-negative
- Average loan amount must be non-negative

### Timing
- All timing values must be non-negative numbers

### Scenarios
- Default speed must be 0-5

### Theme
- Must be 'light', 'dark', or 'auto'

### Export Format
- Must be 'pdf' or 'html'

### Analytics Storage
- Must be 'local' or 'none'

## Settings UI

### Accessing Settings
Navigate to `/demo-settings.html` to access the configuration UI.

### Features
- Visual form for all configuration options
- Real-time validation
- Export/Import buttons
- Reset to defaults button
- Save changes button
- Status messages for feedback

### Sections
1. General Settings
2. Live Simulation
3. Interactive Walkthrough
4. Scenario Playback
5. Role Switching
6. Data Customization
7. Analytics
8. Feature Flags

## Testing

A test page is available at `/test-config-manager.html` that provides:
- Load configuration test
- Save configuration test
- Update configuration test
- Validation tests (valid and invalid)
- Reset to defaults test
- Export/Import tests
- Get summary test
- Section operations tests

## Integration with Orchestrator

The config manager integrates with the demo orchestrator:

```javascript
// Create with orchestrator reference
const configManager = new DemoConfigManager(orchestrator);

// Configuration changes notify orchestrator
configManager.saveConfig(newConfig);
// Orchestrator receives updateConfiguration() call
```

## Best Practices

1. **Always validate before saving**
   ```javascript
   const validation = configManager.validateConfig(config);
   if (validation.valid) {
     configManager.saveConfig(config);
   }
   ```

2. **Use section updates for partial changes**
   ```javascript
   // Better than updating entire config
   configManager.updateSection('simulation', { interval: 60000 });
   ```

3. **Listen for events to react to changes**
   ```javascript
   configManager.on('config-saved', () => {
     // Reload components with new config
   });
   ```

4. **Export configuration for backup**
   ```javascript
   // Periodically export for backup
   const backup = configManager.exportConfig();
   ```

5. **Deep clone when modifying**
   ```javascript
   // Get a copy to modify
   const config = configManager.getConfig();
   // Modify and save
   config.simulation.interval = 60000;
   configManager.saveConfig(config);
   ```

## Error Handling

The config manager handles errors gracefully:
- Invalid configurations are rejected with detailed errors
- Failed saves emit 'save-failed' events
- Failed imports emit 'import-failed' events
- Console warnings for non-critical issues
- Console errors for critical issues

## Browser Compatibility

- Requires localStorage support
- Requires ES6+ features (classes, arrow functions, etc.)
- Works in all modern browsers
- Graceful degradation if localStorage unavailable

## Future Enhancements

Potential future additions:
- Cloud sync for configurations
- Configuration presets/templates
- Configuration versioning
- Configuration diff/merge tools
- Multi-user configuration sharing
- Configuration validation schemas
- Advanced validation rules
- Configuration migration tools
