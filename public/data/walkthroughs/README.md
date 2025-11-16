# Walkthrough Definitions

This directory contains JSON definitions for interactive guided tours through CivicFlow2's features.

## Available Walkthroughs

### 1. Dashboard Overview (`dashboard-overview.json`)
- **Duration**: 120 seconds
- **Steps**: 10
- **Focus**: Main dashboard interface, metrics, activity feed, and navigation
- **Audience**: New users, first-time visitors
- **Key Features**: Metrics overview, real-time updates, quick actions

### 2. Application Review (`application-review.json`)
- **Duration**: 180 seconds
- **Steps**: 12
- **Focus**: Complete application review workflow
- **Audience**: Reviewers, approvers, staff
- **Key Features**: Filtering, detail views, documents, timeline, actions

### 3. AI Features (`ai-features.json`)
- **Duration**: 90 seconds
- **Steps**: 8
- **Focus**: AI-powered intelligence and automation
- **Audience**: Technical evaluators, decision makers
- **Key Features**: Risk assessment, document analysis, recommendations

### 4. Admin Tools (`admin-tools.json`)
- **Duration**: 150 seconds
- **Steps**: 11
- **Focus**: System administration and configuration
- **Audience**: System administrators, IT staff
- **Key Features**: User management, integrations, monitoring, audit logs

## File Structure

Each walkthrough JSON file follows this structure:

```json
{
  "id": "unique-identifier",
  "title": "Human-Readable Title",
  "description": "Brief description of what this walkthrough covers",
  "estimatedDuration": 120,
  "steps": [
    {
      "id": "step-identifier",
      "title": "Step Title",
      "description": "Detailed description with instructions",
      "targetElement": ".css-selector, .alternative-selector",
      "position": "top|bottom|left|right|auto|center",
      "highlightStyle": {
        "borderColor": "#8b5cf6",
        "borderWidth": 3,
        "borderRadius": 8,
        "animation": "pulse|glow|none"
      },
      "waitForElement": true
    }
  ]
}
```

## Field Descriptions

### Walkthrough Level
- **id**: Unique identifier (kebab-case)
- **title**: Display name shown to users
- **description**: Brief overview of walkthrough content
- **estimatedDuration**: Approximate time in seconds
- **steps**: Array of step objects

### Step Level
- **id**: Unique step identifier within walkthrough
- **title**: Step heading shown in tooltip
- **description**: Detailed instructions for this step
- **targetElement**: CSS selector(s) for element to highlight (comma-separated for fallbacks)
- **position**: Preferred tooltip position relative to element
- **highlightStyle**: Visual styling for the highlight overlay
- **waitForElement**: Whether to wait for element to appear (default: true)

## Position Options

- **top**: Tooltip above element
- **bottom**: Tooltip below element
- **left**: Tooltip to left of element
- **right**: Tooltip to right of element
- **auto**: Automatically calculate best position
- **center**: Center tooltip on screen (no element highlight)

## Highlight Animations

- **pulse**: Gentle pulsing effect (default)
- **glow**: Glowing border effect
- **none**: No animation

## Color Scheme

Walkthroughs use consistent colors for different types of content:

- **Purple** (#8b5cf6): Welcome/primary steps
- **Blue** (#3b82f6): Information/data steps
- **Green** (#10b981): Success/completion steps
- **Cyan** (#06b6d4): AI/technical features
- **Orange** (#f59e0b): Activity/dynamic content
- **Amber** (#f97316): Demo mode features

## Usage

### With Walkthrough Loader

```javascript
const loader = new WalkthroughLoader();
const walkthrough = await loader.load('dashboard-overview');
```

### With Walkthrough Engine

```javascript
const engine = new WalkthroughEngine(orchestrator);
await engine.loadWalkthrough('dashboard-overview');
await engine.start();
```

### Direct Fetch

```javascript
const response = await fetch('/data/walkthroughs/dashboard-overview.json');
const walkthrough = await response.json();
```

## Adding New Walkthroughs

1. Create a new JSON file in this directory
2. Follow the structure above
3. Add the walkthrough ID to `WalkthroughLoader.availableWalkthroughs`
4. Test with `test-walkthrough-loader.html`
5. Update this README

## Best Practices

### Target Elements
- Provide multiple selector fallbacks: `".primary-selector, .fallback-selector"`
- Use semantic selectors when possible: `"[data-section='metrics']"`
- Avoid overly specific selectors that might break

### Descriptions
- Be clear and concise
- Use action-oriented language
- Explain the "why" not just the "what"
- Keep under 200 characters when possible

### Step Count
- Aim for 8-12 steps per walkthrough
- Break complex topics into multiple walkthroughs
- Each step should have a single focus

### Duration
- Estimate 10-15 seconds per step
- Add buffer for reading and interaction
- Test with real users to refine

### Accessibility
- Ensure descriptions are screen-reader friendly
- Use semantic HTML in target elements
- Provide keyboard navigation (handled by engine)

## Testing

Test walkthroughs using:
- `public/test-walkthrough-loader.html` - Test loader functionality
- `public/test-walkthrough-engine.html` - Test full walkthrough experience

## Validation

All walkthroughs are validated by `WalkthroughLoader.validate()`:
- Required fields present
- Proper data types
- Valid position values
- Non-empty steps array

## Localization

Future enhancement: Support for multiple languages
- Structure supports adding `locale` field
- Descriptions can be externalized
- Consider using i18n keys

## Analytics

Track walkthrough engagement:
- Completion rates
- Time per step
- Skip patterns
- Most/least viewed steps

## Maintenance

- Review walkthroughs quarterly
- Update selectors if UI changes
- Refresh content for new features
- Archive outdated walkthroughs
