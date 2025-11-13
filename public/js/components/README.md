# UI Components Documentation

## Overview

This directory contains reusable UI components for the CivicFlow2 application, specifically designed to enhance the investor demo experience with professional loading states and demo mode indicators.

## Components

### 1. DemoIndicator Component

A flexible component for displaying demo mode indicators in various formats.

**File:** `demo-indicator.js`  
**Styles:** `../../css/components/demo-indicator.css`

#### Variants

##### Badge Variant
Small pill-shaped indicator for cards and inline content.

```javascript
// Create a badge
const badge = DemoIndicator.createBadge({
  text: 'Demo',
  tooltip: 'This is simulated data for demonstration purposes',
  className: 'demo-indicator-badge-sm' // optional size class
});

// Add to element
element.appendChild(badge);
```

##### Icon Variant
Tiny sparkle icon for inline use next to text.

```javascript
// Create an icon
const icon = DemoIndicator.createIcon({
  tooltip: 'This is simulated data for demonstration purposes'
});

// Add to element
element.appendChild(icon);
```

##### Banner Variant
Dismissible banner for page-level notifications.

```javascript
// Create a banner
const banner = DemoIndicator.createBanner({
  title: 'Demo Mode Active',
  message: 'You\'re viewing a demonstration with sample data.',
  dismissible: true,
  onDismiss: () => console.log('Banner dismissed')
});

// Add to page
if (banner) {
  document.body.insertBefore(banner, document.body.firstChild);
}
```

#### Helper Methods

```javascript
// Add indicator to element
DemoIndicator.addTo(element, 'badge', { text: 'Demo' });

// Check if demo mode is active
if (DemoIndicator.isDemoMode()) {
  // Show demo indicators
}

// Auto-initialize from data attributes
DemoIndicator.autoInit();

// Mark data as demo data
const markedData = DemoIndicator.markData(data, true);

// Check if data is demo data
if (DemoIndicator.isDataDemo(data)) {
  // Handle demo data
}
```

#### HTML Data Attributes

```html
<!-- Auto-initialize with data attributes -->
<div data-demo data-demo-variant="badge" data-demo-text="Demo">
  Content here
</div>

<div data-demo data-demo-variant="icon" data-demo-tooltip="Simulated data">
  Content here
</div>
```

#### CSS Classes

- `demo-indicator-badge` - Default badge
- `demo-indicator-badge-sm` - Small badge
- `demo-indicator-badge-lg` - Large badge
- `demo-indicator-badge-purple` - Purple gradient (default)
- `demo-indicator-badge-blue` - Blue gradient
- `demo-indicator-badge-indigo` - Indigo gradient
- `demo-indicator-icon-only` - Icon variant
- `demo-indicator-banner` - Banner variant

---

### 2. SkeletonLoader Component

Loading placeholders with shimmer animation for various content types.

**File:** `skeleton-loader.js`  
**Styles:** `../../css/components/skeleton-loader.css`

#### Skeleton Types

##### Card Skeleton
Loading placeholder for card layouts.

```javascript
// Create card skeleton
const skeleton = SkeletonLoader.createCard({
  count: 3,              // Number of cards
  height: 'auto',        // Card height
  showImage: false,      // Show image placeholder
  showActions: true,     // Show action buttons
  className: ''          // Additional classes
});

container.appendChild(skeleton);
```

##### Table Skeleton
Loading placeholder for table layouts.

```javascript
// Create table skeleton
const skeleton = SkeletonLoader.createTable({
  rows: 5,              // Number of rows
  columns: 4,           // Number of columns
  showHeader: true,     // Show header row
  className: ''         // Additional classes
});

container.appendChild(skeleton);
```

##### Chart Skeleton
Loading placeholder for charts.

```javascript
// Create chart skeleton
const skeleton = SkeletonLoader.createChart({
  type: 'bar',          // 'bar', 'line', 'pie', 'donut'
  height: '300px',      // Chart height
  showLegend: true,     // Show legend
  showTitle: true,      // Show title
  className: ''         // Additional classes
});

container.appendChild(skeleton);
```

##### Text Skeleton
Loading placeholder for text content.

```javascript
// Create text skeleton
const skeleton = SkeletonLoader.createText({
  lines: 3,             // Number of lines
  width: '100%',        // Width
  className: ''         // Additional classes
});

container.appendChild(skeleton);
```

#### Helper Methods

```javascript
// Replace element with skeleton
const skeleton = SkeletonLoader.replace(element, 'card', { count: 1 });

// Remove skeleton and restore element
SkeletonLoader.remove(skeleton);

// Show skeleton with transition
SkeletonLoader.show(skeleton, 300);

// Hide skeleton with transition
await SkeletonLoader.hide(skeleton, 300);

// Auto-initialize from data attributes
SkeletonLoader.autoInit();
```

#### HTML Data Attributes

```html
<!-- Auto-initialize with data attributes -->
<div data-skeleton="card" data-skeleton-count="3" data-skeleton-height="200px">
  <!-- Skeleton will be added here -->
</div>
```

#### CSS Classes

- `skeleton-loader-container` - Container for multiple skeletons
- `skeleton-loader-card` - Card skeleton
- `skeleton-loader-table` - Table skeleton
- `skeleton-loader-chart` - Chart skeleton
- `skeleton-loader-text-block` - Text skeleton
- `skeleton-loader-grid` - Grid layout for skeletons

---

### 3. DemoComponentsIntegration Helper

Utility functions for integrating DemoIndicator and SkeletonLoader.

**File:** `../demo-components-integration.js`

#### Usage Examples

##### Fetch with Skeleton Loading

```javascript
// Fetch data with automatic skeleton and demo indicators
await DemoComponentsIntegration.fetchWithSkeleton(
  '/api/v1/applications',
  container,
  (data, container) => {
    // Render function
    container.innerHTML = renderApplications(data);
  },
  {
    skeletonType: 'card',
    skeletonOptions: { count: 3 },
    showDemoIndicator: true,
    timeout: 3000
  }
);
```

##### Initialize Demo Mode

```javascript
// Initialize demo mode for a page
DemoComponentsIntegration.initDemoMode({
  showBanner: true,
  autoMarkElements: true,
  bannerOptions: {
    title: 'Demo Mode',
    message: 'Viewing sample data'
  }
});
```

##### Simulate Loading

```javascript
// Simulate API loading with demo data
await DemoComponentsIntegration.simulateLoading(
  container,
  () => '<div>Demo content here</div>',
  {
    skeletonType: 'card',
    loadingTime: 1500,
    showDemoIndicator: true
  }
);
```

---

## Complete Integration Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="/css/components/demo-indicator.css">
  <link rel="stylesheet" href="/css/components/skeleton-loader.css">
</head>
<body>
  <div id="app-container"></div>

  <script src="/js/components/demo-indicator.js"></script>
  <script src="/js/components/skeleton-loader.js"></script>
  <script src="/js/demo-components-integration.js"></script>
  <script>
    // Initialize demo mode
    DemoComponentsIntegration.initDemoMode();

    // Load data with skeleton
    const container = document.getElementById('app-container');
    
    DemoComponentsIntegration.fetchWithSkeleton(
      '/api/v1/applications',
      container,
      (data, container) => {
        // Render applications
        const html = data.data.map(app => `
          <div class="card">
            <h3>${app.businessName}</h3>
            <p>Amount: $${app.loanAmount}</p>
          </div>
        `).join('');
        container.innerHTML = html;
        
        // Add demo badges to cards if demo data
        if (data.isDemo) {
          container.querySelectorAll('.card').forEach(card => {
            DemoComponentsIntegration.addDemoBadgeToCard(card);
          });
        }
      },
      {
        skeletonType: 'card',
        skeletonOptions: { count: 3 },
        showDemoIndicator: true
      }
    );
  </script>
</body>
</html>
```

---

## Requirements Mapping

### DemoIndicator Component
- **Requirement 3.1**: Badge variant (small pill on cards) 
- **Requirement 3.2**: Icon variant (tiny icon next to items) 
- **Requirement 3.3**: Consistent color scheme (purple/blue) 
- **Requirement 3.4**: Tooltip on hover 
- **Requirement 12.1**: Small, elegant banner 
- **Requirement 12.2**: Professional color (gradient purple/blue) 
- **Requirement 12.3**: Dismissible with X button 
- **Requirement 12.4**: Remember preference for session 
- **Requirement 12.5**: Not shown on every page navigation 

### SkeletonLoader Component
- **Requirement 4.1**: Skeleton screens matching content layout 
- **Requirement 4.2**: Subtle loading indicator 
- **Requirement 4.3**: Complete loading within 2 seconds 
- **Requirement 4.4**: Smooth animations 
- **Requirement 4.5**: No spinners for more than 500ms 

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Accessibility

Both components follow accessibility best practices:

- Proper ARIA attributes (`aria-busy`, `aria-label`, `role`)
- Keyboard navigation support
- Focus indicators
- Reduced motion support (`prefers-reduced-motion`)
- Screen reader friendly
- Semantic HTML

---

## Performance

- Minimal CSS animations (GPU-accelerated)
- No external dependencies
- Lazy initialization
- Efficient DOM manipulation
- Small file sizes (~10KB combined, unminified)

---

## Demo Page

View all components in action: `/demo-components.html`
