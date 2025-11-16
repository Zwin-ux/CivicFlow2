# Walkthrough Engine

The Walkthrough Engine provides interactive guided tours with step navigation, element highlighting, and contextual tooltips.

## Features

- **Step Navigation**: Next, previous, skip functionality
- **Element Highlighting**: Animated overlays with pulse/glow effects
- **Smart Positioning**: Auto-positioning tooltips to stay visible
- **Keyboard Support**: Arrow keys, Enter, and Escape
- **Dynamic Elements**: Waits for elements to appear in DOM
- **Smooth Scrolling**: Auto-scrolls elements into view
- **Responsive Design**: Mobile-optimized layouts
- **Accessibility**: ARIA labels and keyboard navigation

## Usage

### Basic Setup

```javascript
// Initialize with orchestrator
const walkthroughEngine = new WalkthroughEngine(demoOrchestrator);

// Register with orchestrator
demoOrchestrator.registerComponent('walkthroughEngine', walkthroughEngine);
```

### Define a Walkthrough

```javascript
const walkthrough = {
  id: 'dashboard-overview',
  title: 'Dashboard Overview',
  description: 'Learn about the dashboard features',
  estimatedDuration: 120, // seconds
  steps: [
    {
      id: 'step-1',
      title: 'Welcome',
      description: 'Welcome to the dashboard!',
      targetElement: '#dashboard-header',
      position: 'bottom', // 'top', 'bottom', 'left', 'right', 'auto', 'center'
      highlightStyle: {
        borderColor: '#8b5cf6',
        borderWidth: 3,
        borderRadius: 8,
        animation: 'pulse' // 'pulse', 'glow', 'none'
      },
      waitForElement: true, // Wait for element to appear
      action: async () => {
        // Optional: Execute code when step is shown
        console.log('Step 1 shown');
      }
    },
    {
      id: 'step-2',
      title: 'Metrics',
      description: 'View key performance metrics here',
      targetElement: '.metrics-panel',
      position: 'auto',
      highlightStyle: {
        animation: 'glow'
      }
    }
  ]
};
```

### Load and Start

```javascript
// Load walkthrough
await walkthroughEngine.loadWalkthrough(walkthrough);

// Or load from JSON file
await walkthroughEngine.loadWalkthrough('dashboard-overview');

// Start walkthrough
await walkthroughEngine.start();
```

### Control Methods

```javascript
// Navigation
walkthroughEngine.next();      // Go to next step
walkthroughEngine.previous();  // Go to previous step
walkthroughEngine.skip();      // Skip walkthrough

// Control
walkthroughEngine.pause();     // Pause walkthrough
walkthroughEngine.resume();    // Resume walkthrough
walkthroughEngine.stop();      // Stop walkthrough

// Information
const step = walkthroughEngine.getCurrentStep();
const progress = walkthroughEngine.getProgress();
// Returns: { current: 2, total: 5, percentage: 40 }

const isActive = walkthroughEngine.isWalkthroughActive();
```

### Keyboard Shortcuts

- **Arrow Right / Enter**: Next step
- **Arrow Left**: Previous step
- **Escape**: Skip walkthrough

## Walkthrough Definition Format

### Required Fields

- `id` (string): Unique identifier
- `title` (string): Walkthrough title
- `steps` (array): Array of step objects

### Step Fields

- `id` (string): Unique step identifier
- `title` (string): Step title
- `description` (string): Step description
- `targetElement` (string): CSS selector for element to highlight

### Optional Step Fields

- `position` (string): Tooltip position - 'top', 'bottom', 'left', 'right', 'auto', 'center'
- `highlightStyle` (object): Custom highlight styling
  - `borderColor` (string): Border color
  - `borderWidth` (number): Border width in pixels
  - `borderRadius` (number): Border radius in pixels
  - `animation` (string): Animation type - 'pulse', 'glow', 'none'
- `waitForElement` (boolean): Wait for element to appear (default: true)
- `action` (function): Async function to execute when step is shown

## Loading from JSON Files

Place walkthrough JSON files in `/public/data/walkthroughs/`:

```
/public/data/walkthroughs/
  ├── dashboard-overview.json
  ├── application-review.json
  └── ai-features.json
```

Load by ID:

```javascript
await walkthroughEngine.loadWalkthrough('dashboard-overview');
```

## Integration with Orchestrator

The walkthrough engine integrates with the Demo Mode Orchestrator:

```javascript
// Orchestrator starts walkthrough
demoOrchestrator.startWalkthrough('dashboard-overview');

// Listen to events
demoOrchestrator.on('walkthrough-started', (data) => {
  console.log('Started:', data.walkthroughId);
});

demoOrchestrator.on('walkthrough-completed', (data) => {
  console.log('Completed:', data.walkthroughId);
});

demoOrchestrator.on('walkthrough-stopped', (data) => {
  console.log('Stopped:', data.walkthroughId);
});
```

## Styling

The walkthrough uses CSS from `/public/css/walkthrough.css`. Key classes:

- `.walkthrough-overlay`: Dark overlay background
- `.walkthrough-highlight`: Element highlight border
- `.walkthrough-tooltip`: Tooltip container
- `.pulse-animation`: Pulse animation class
- `.glow-animation`: Glow animation class

### Customization

Override CSS variables or classes to customize appearance:

```css
.walkthrough-highlight {
  border-color: #your-color;
  border-width: 4px;
}

.walkthrough-tooltip {
  max-width: 500px;
  border-radius: 16px;
}
```

## Configuration

Configure via the walkthrough engine constructor or config object:

```javascript
const walkthroughEngine = new WalkthroughEngine(orchestrator);

// Update configuration
walkthroughEngine.config = {
  highlightPadding: 8,        // Padding around highlighted element
  tooltipOffset: 20,          // Distance from element to tooltip
  animationDuration: 300,     // Animation duration in ms
  scrollBehavior: 'smooth',   // 'smooth' or 'auto'
  scrollOffset: 100           // Offset from top when scrolling
};
```

## Best Practices

1. **Keep Steps Focused**: Each step should highlight one feature
2. **Clear Descriptions**: Write concise, actionable descriptions
3. **Logical Flow**: Order steps in a natural progression
4. **Test Responsiveness**: Verify on mobile and desktop
5. **Handle Missing Elements**: Use `waitForElement` for dynamic content
6. **Provide Context**: Start with an overview step
7. **End with Action**: Final step should encourage next action

## Example Walkthroughs

### Dashboard Overview (8-10 steps)
- Welcome message
- Key metrics panel
- Application list
- Filters and search
- Quick actions
- Notifications
- Settings menu
- Next steps

### Application Review (10-12 steps)
- Application card
- Applicant information
- Document viewer
- AI insights panel
- Risk score
- Review checklist
- Comments section
- Decision buttons
- Approval workflow
- Status tracking

### AI Features (6-8 steps)
- AI insights overview
- Risk assessment
- Document analysis
- Field extraction
- Recommendations
- Confidence scores
- AI settings

## Troubleshooting

### Element Not Found
- Ensure CSS selector is correct
- Set `waitForElement: true` for dynamic elements
- Check if element is hidden or removed

### Tooltip Positioning Issues
- Use `position: 'auto'` for automatic positioning
- Ensure viewport has enough space
- Check for CSS conflicts

### Animation Not Working
- Verify CSS file is loaded
- Check for CSS conflicts
- Ensure animation classes are applied

### Keyboard Navigation Not Working
- Check if other elements are capturing keyboard events
- Verify walkthrough is active
- Look for JavaScript errors

## Testing

Test page available at `/test-walkthrough-engine.html`

```bash
# Open in browser
http://localhost:3000/test-walkthrough-engine.html
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch optimization

## Performance

- Minimal DOM manipulation
- Efficient event listeners
- Smooth 60fps animations
- Lazy loading of walkthrough data
- Automatic cleanup on completion

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader announcements
- Focus management
- High contrast mode support
- Reduced motion support

## Future Enhancements

- Voice narration
- Video integration
- Progress persistence
- Multi-language support
- Custom themes
- Analytics integration
- A/B testing support
