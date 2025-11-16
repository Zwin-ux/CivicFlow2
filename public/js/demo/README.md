# Demo Mode Orchestrator

Central controller for all enhanced demo mode features in CivicFlow2.

## Overview

The Demo Mode Orchestrator is a singleton class that manages the state and coordination of all demo mode features including:

- Live activity simulation
- Interactive walkthroughs
- Scenario playback
- Role switching
- AI showcase features
- Analytics tracking

## Files

- **orchestrator.js** - Main DemoModeOrchestrator class
- **config.js** - Configuration management and defaults
- **config-manager.js** - Configuration UI and management
- **analytics-tracker.js** - Analytics tracking and reporting
- **walkthrough-engine.js** - Interactive walkthrough system
- **README.md** - This file
- **WALKTHROUGH_ENGINE_README.md** - Walkthrough engine documentation

## Usage

### Basic Initialization

The orchestrator is automatically initialized as a singleton when the script loads:

```javascript
// Access the global instance
const orchestrator = window.demoOrchestrator;

// Check if demo mode is active
if (orchestrator.isActive()) {
  console.log('Demo mode is active');
}
```

### Starting Features

```javascript
// Start live simulation
orchestrator.startSimulation();

// Start a walkthrough
orchestrator.startWalkthrough('dashboard-overview');

// Play a scenario
orchestrator.playScenario('rush-application');

// Switch user role
orchestrator.switchRole('reviewer');
```

### Event Listening

The orchestrator uses an event emitter pattern for component communication:

```javascript
// Listen for events
orchestrator.on('simulation-started', (data) => {
  console.log('Simulation started', data);
});

orchestrator.on('role-switched', (data) => {
  console.log('Role changed:', data.previousRole, '->', data.newRole);
});

// Remove listener
orchestrator.off('simulation-started', callback);
```

### Available Events

- `demo-mode-detected` - Demo mode was detected
- `config-updated` - Configuration was updated
- `simulation-started` - Live simulation started
- `simulation-stopped` - Live simulation stopped
- `walkthrough-started` - Walkthrough started
- `walkthrough-stopped` - Walkthrough stopped
- `walkthrough-completed` - Walkthrough completed
- `scenario-started` - Scenario started
- `scenario-stopped` - Scenario stopped
- `scenario-completed` - Scenario completed
- `role-switched` - User role changed
- `feature-viewed` - Feature was viewed (analytics)
- `component-registered` - Component was registered
- `demo-mode-enabled` - Demo mode was enabled
- `demo-mode-disabled` - Demo mode was disabled
- `page-hidden` - Page visibility changed to hidden
- `page-visible` - Page visibility changed to visible
- `cleanup` - Cleanup before page unload

### Registering Components

Other demo components can register themselves with the orchestrator:

```javascript
// Register a component
orchestrator.registerComponent('walkthroughEngine', myWalkthroughEngine);

// Get a registered component
const engine = orchestrator.getComponent('walkthroughEngine');
```

### Configuration Management

```javascript
// Get current configuration
const config = orchestrator.getConfiguration();

// Update configuration
orchestrator.updateConfiguration({
  simulationInterval: 30000,
  enableLiveSimulation: true
});

// Configuration is automatically saved to localStorage
```

### Analytics

```javascript
// Track a feature view
orchestrator.trackFeatureView('dashboard', 'metrics-panel');

// Get analytics summary
const analytics = orchestrator.getAnalytics();
console.log('Session duration:', analytics.duration, 'seconds');
console.log('Features viewed:', analytics.featuresViewed);

// Reset analytics for new session
orchestrator.resetAnalytics();
```

### State Management

```javascript
// Get current state
const state = orchestrator.getState();
console.log('Current role:', state.currentRole);
console.log('Simulation running:', state.simulationRunning);

// Check specific states
if (state.walkthroughActive) {
  console.log('Current walkthrough:', state.currentWalkthrough);
}
```

## Configuration

Default configuration is defined in `config.js`. Configuration can be customized and is persisted to localStorage.

### Configuration Structure

```javascript
{
  // General settings
  general: {
    companyName: 'CivicFlow2',
    industry: 'Government Lending',
    theme: 'auto',
    language: 'en'
  },

  // Simulation settings
  simulation: {
    enabled: true,
    interval: 45000,
    intensity: 'medium',
    eventTypes: [...]
  },

  // Walkthrough settings
  walkthrough: {
    enabled: true,
    autoStart: false,
    showProgress: true,
    allowSkip: true
  },

  // ... more settings
}
```

### Loading and Saving Configuration

```javascript
// Load configuration from localStorage
const config = window.loadConfig();

// Save configuration to localStorage
window.saveConfig(config);

// Reset to defaults
const defaultConfig = window.resetConfig();

// Validate configuration
const validation = window.validateConfig(config);
if (!validation.valid) {
  console.error('Invalid config:', validation.errors);
}
```

## Testing

A test page is available at `/test-demo-orchestrator.html` that provides:

- Current state display
- Control buttons for all features
- Event log viewer
- Analytics display

## Architecture

The orchestrator follows these design principles:

1. **Singleton Pattern** - Single global instance manages all demo state
2. **Event-Driven** - Components communicate via events
3. **Loose Coupling** - Components register themselves, no hard dependencies
4. **State Management** - Centralized state with immutable getters
5. **Configuration** - Persistent configuration with validation
6. **Analytics** - Built-in tracking for demo engagement

## Component Integration

When building new demo components, follow this pattern:

```javascript
class MyDemoComponent {
  constructor() {
    this.orchestrator = window.demoOrchestrator;
    
    // Register with orchestrator
    this.orchestrator.registerComponent('myComponent', this);
    
    // Listen for relevant events
    this.orchestrator.on('demo-mode-enabled', () => {
      this.initialize();
    });
  }

  start() {
    // Component logic
    this.orchestrator.emit('my-component-started');
  }
}
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features used (classes, arrow functions, destructuring)
- localStorage required for persistence
- No external dependencies

## Future Enhancements

Planned features for future versions:

- WebSocket integration for real-time updates
- Advanced analytics with visualization
- Custom event types
- Component lifecycle management
- State persistence across sessions
- Multi-tab synchronization
