# Live Simulator Implementation

## Overview

The Live Simulator generates real-time simulated activity for demo mode, creating realistic events with configurable intervals and probabilities. This component brings the demo to life by showing continuous system activity.

## Implementation Status

✅ **COMPLETE** - Task 3.1: Live Simulator Core

All sub-tasks completed:
- ✅ Event generator with configurable intervals
- ✅ Event type probability system
- ✅ Event queue and processor
- ✅ Start/stop controls
- ✅ Intensity levels (low, medium, high)

## Features

### Core Functionality

1. **Event Generation**
   - Generates events at configurable intervals
   - Supports 8 event types (new_application, status_change, etc.)
   - Probability-based event type selection
   - Realistic event data generation

2. **Intensity Levels**
   - **Low**: 1.5x interval (slower, less frequent)
   - **Medium**: 1x interval (normal frequency)
   - **High**: 0.6x interval (faster, more frequent)

3. **Event Types**
   - `new_application` - New loan application submitted
   - `status_change` - Application status updated
   - `document_uploaded` - Document added to application
   - `review_completed` - Review process finished
   - `approval_granted` - Application approved
   - `rejection_issued` - Application rejected
   - `comment_added` - Comment added to application
   - `ai_analysis_complete` - AI analysis finished

4. **Event Processing**
   - Automatic notification generation
   - UI updates (metrics, lists, feeds)
   - Event history tracking
   - Statistics collection

## Architecture

```
LiveSimulator
├── Event Generation
│   ├── selectEventType() - Probability-based selection
│   ├── createEvent() - Event object creation
│   └── generateEventData() - Type-specific data
├── Event Processing
│   ├── processEvent() - Main processor
│   ├── showNotification() - Toast notifications
│   └── updateUI() - UI element updates
├── Controls
│   ├── start() - Start simulation
│   ├── stop() - Stop simulation
│   └── setIntensity() - Change intensity
└── Analytics
    ├── getEventHistory() - Get past events
    ├── getStatistics() - Get stats
    └── clearHistory() - Clear history
```

## Usage

### Basic Usage

```javascript
// Initialize with orchestrator
const simulator = new LiveSimulator(demoOrchestrator);

// Start simulation
simulator.start({
  interval: 45000,      // 45 seconds
  intensity: 'medium'   // low, medium, or high
});

// Stop simulation
simulator.stop();
```

### With Orchestrator Integration

```javascript
// Register with orchestrator
demoOrchestrator.registerComponent('liveSimulator', simulator);

// Start via orchestrator
demoOrchestrator.startSimulation();

// Listen for events
demoOrchestrator.on('simulated-event', (event) => {
  console.log('Event:', event.type, event.data);
});
```

### Manual Event Generation

```javascript
// Generate single event
const event = simulator.generateEvent();

// Get event history
const history = simulator.getEventHistory(50); // Last 50 events

// Get statistics
const stats = simulator.getStatistics();
console.log('Total events:', stats.totalEvents);
console.log('Event counts:', stats.eventCounts);
```

### Customization

```javascript
// Set custom event probabilities
simulator.setEventProbabilities({
  new_application: 0.30,
  approval_granted: 0.15,
  rejection_issued: 0.10
});

// Change intensity dynamically
simulator.setIntensity('high'); // Restarts if running

// Clear history
simulator.clearHistory();
```

## Event Structure

```javascript
{
  id: 'sim-event-123',
  type: 'new_application',
  timestamp: Date,
  data: {
    applicationId: 'APP-1234567890-123',
    businessName: 'Acme Manufacturing',
    loanAmount: 75000,
    submittedBy: 'Applicant Portal'
  },
  notification: {
    title: 'New Application Submitted',
    icon: '📝',
    color: '#3b82f6',
    priority: 'normal'
  }
}
```

## Configuration

Default configuration from `config.js`:

```javascript
simulation: {
  enabled: true,
  interval: 45000,
  intensity: 'medium',
  eventTypes: [...],
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
}
```

## UI Integration

### Automatic Updates

The simulator automatically updates:
- Dashboard metrics (counters with animation)
- Application lists (new items with slide-in)
- Activity feeds (recent events)
- Toast notifications (event alerts)

### Required UI Elements

For automatic updates, include these elements:

```html
<!-- Metrics -->
<div data-metric="total-applications">0</div>
<div data-metric="pending-review">0</div>

<!-- Application list -->
<div class="applications-list"></div>

<!-- Activity feed -->
<div class="activity-feed"></div>
```

### Toast Notifications

Implement `window.showToastNotification()`:

```javascript
window.showToastNotification = function(config) {
  // config: { title, message, icon, color, duration }
  // Show toast notification
};
```

## Testing

Test file: `public/test-live-simulator.html`

Features tested:
- ✅ Start/stop simulation
- ✅ Manual event generation
- ✅ Intensity levels
- ✅ Event history
- ✅ Statistics tracking
- ✅ Toast notifications
- ✅ Event type distribution

### Running Tests

1. Open `http://localhost:3000/test-live-simulator.html`
2. Click "Start Simulation"
3. Observe events being generated
4. Try different intensity levels
5. Generate manual events
6. Check statistics and history

## Integration with Other Components

### Orchestrator

```javascript
// Orchestrator calls simulator
orchestrator.startSimulation() → simulator.start()
orchestrator.stopSimulation() → simulator.stop()

// Simulator emits to orchestrator
simulator.processEvent() → orchestrator.emit('simulated-event')
```

### Notification System (Task 3.3)

```javascript
// Simulator triggers notifications
simulator.showNotification(event) → NotificationSystem.show()
```

### Dashboard Updates (Task 3.4)

```javascript
// Simulator updates dashboard
simulator.updateMetrics(event) → Dashboard.updateCounters()
simulator.updateApplicationList(event) → Dashboard.addApplication()
```

## Performance Considerations

1. **Event History Limit**: Keeps last 100 events to prevent memory issues
2. **Randomized Intervals**: ±20% variation prevents predictable patterns
3. **Efficient Updates**: Uses requestAnimationFrame for smooth animations
4. **Cleanup**: Clears timers and history on stop

## Next Steps

Task 3.2: Simulated Event Types
- Implement dedicated event generators for each type
- Add more realistic data templates
- Create event templates JSON file

Task 3.3: Notification System
- Build toast notification component
- Implement notification queue
- Add sound effects (optional)

Task 3.4: Real-time Dashboard Updates
- Integrate with dashboard metrics
- Add animated counter updates
- Implement chart animations

## Files

- `public/js/demo/live-simulator.js` - Main implementation
- `public/test-live-simulator.html` - Test page
- `public/js/demo/config.js` - Configuration
- `public/js/demo/orchestrator.js` - Orchestrator integration

## API Reference

### Constructor

```javascript
new LiveSimulator(orchestrator)
```

### Methods

- `start(config)` - Start simulation
- `stop()` - Stop simulation
- `generateEvent()` - Generate single event
- `setEventProbabilities(probabilities)` - Update probabilities
- `setIntensity(intensity)` - Change intensity
- `getEventHistory(limit)` - Get event history
- `clearHistory()` - Clear history
- `getStatistics()` - Get statistics

### Events (via Orchestrator)

- `simulator-started` - Simulation started
- `simulator-stopped` - Simulation stopped
- `simulated-event` - Event generated

## Notes

- Events are generated with realistic business names, amounts, and reviewers
- Probabilities can be customized per deployment
- Intensity can be changed dynamically
- All events include notification configuration
- Event history is maintained for analytics
- UI updates are automatic when elements are present
