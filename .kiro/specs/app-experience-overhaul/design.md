# App Experience Overhaul - Design

## Architecture Overview

This overhaul transforms CivicFlow2 into a modern, app-like experience through:
1. **Component-Based Architecture**: Modular, reusable UI components
2. **State Management**: Centralized state with optimistic updates
3. **Animation System**: Consistent, performant animations
4. **Design System**: Comprehensive design tokens and patterns
5. **Real-Time Layer**: WebSocket-based live updates

## Design System

### Design Tokens

#### Color Palette
```css
/* Primary Colors */
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-500: #3b82f6;  /* Main brand blue */
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;
--color-primary-900: #1e3a8a;

/* Success Colors */
--color-success-50: #f0fdf4;
--color-success-500: #10b981;  /* Main brand green */
--color-success-600: #059669;
--color-success-700: #047857;

/* Neutral Colors */
--color-neutral-50: #f9fafb;
--color-neutral-100: #f3f4f6;
--color-neutral-200: #e5e7eb;
--color-neutral-300: #d1d5db;
--color-neutral-400: #9ca3af;
--color-neutral-500: #6b7280;
--color-neutral-600: #4b5563;
--color-neutral-700: #374151;
--color-neutral-800: #1f2937;
--color-neutral-900: #111827;

/* Semantic Colors */
--color-error: #ef4444;
--color-warning: #f59e0b;
--color-info: #06b6d4;
```

#### Typography
```css
/* Font Families */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

#### Spacing
```css
/* Spacing Scale (4px base) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

#### Shadows & Elevation
```css
/* Elevation System */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Interactive Shadows */
--shadow-focus: 0 0 0 3px rgba(59, 130, 246, 0.5);
--shadow-error: 0 0 0 3px rgba(239, 68, 68, 0.5);
```

#### Border Radius
```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-2xl: 1rem;     /* 16px */
--radius-full: 9999px;  /* Fully rounded */
```

#### Animation Timing
```css
/* Duration */
--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 350ms;
--duration-slower: 500ms;

/* Easing Functions */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

## Component Architecture

### Core Component Library

#### Button Component
```javascript
// public/js/components/button.js
class AppButton {
  variants: {
    primary: 'Solid blue background, white text',
    secondary: 'Outlined, transparent background',
    ghost: 'No border, transparent background',
    danger: 'Red variant for destructive actions'
  },
  sizes: ['sm', 'md', 'lg'],
  states: ['default', 'hover', 'active', 'disabled', 'loading'],
  features: [
    'Ripple effect on click',
    'Loading spinner integration',
    'Icon support (left/right)',
    'Keyboard accessible',
    'Touch-optimized (44px min height)'
  ]
}
```

#### Card Component
```javascript
// public/js/components/card.js
class AppCard {
  features: [
    'Elevated with shadow',
    'Hover state with lift effect',
    'Optional header/footer sections',
    'Collapsible content',
    'Loading skeleton state',
    'Interactive (clickable) variant'
  ],
  animations: {
    hover: 'Lift with shadow increase',
    collapse: 'Smooth height transition',
    loading: 'Shimmer effect'
  }
}
```

#### Input Component
```javascript
// public/js/components/input.js
class AppInput {
  features: [
    'Floating label animation',
    'Inline validation with icons',
    'Helper text support',
    'Error state with message',
    'Success state with checkmark',
    'Character counter',
    'Clear button',
    'Password visibility toggle',
    'Auto-complete integration'
  ],
  variants: ['text', 'email', 'password', 'number', 'tel', 'url'],
  states: ['default', 'focus', 'error', 'success', 'disabled']
}
```

#### Modal/Panel Component
```javascript
// public/js/components/panel.js
class AppPanel {
  types: {
    modal: 'Center overlay with backdrop',
    slideOver: 'Slide from right (desktop) or bottom (mobile)',
    drawer: 'Slide from left (navigation)',
    bottomSheet: 'Slide from bottom (mobile)'
  },
  features: [
    'Smooth slide/fade animations',
    'Backdrop blur effect',
    'Keyboard navigation (ESC to close)',
    'Focus trap',
    'Scroll lock on body',
    'Stacking support (multiple panels)',
    'Responsive sizing'
  ]
}
```

#### Toast/Notification Component
```javascript
// public/js/components/toast.js
class AppToast {
  variants: ['success', 'error', 'warning', 'info'],
  features: [
    'Slide-in animation from top/bottom',
    'Auto-dismiss with timer',
    'Action buttons (undo, view, etc)',
    'Progress bar for auto-dismiss',
    'Stack management (max 3 visible)',
    'Swipe to dismiss (mobile)',
    'Icon integration',
    'Rich content support'
  ],
  positions: ['top-right', 'top-center', 'bottom-right', 'bottom-center']
}
```

#### Table Component
```javascript
// public/js/components/table.js
class AppTable {
  features: [
    'Virtual scrolling for large datasets',
    'Column sorting (multi-column)',
    'Column resizing',
    'Column reordering (drag-drop)',
    'Row selection (single/multi)',
    'Inline editing',
    'Expandable rows',
    'Sticky header',
    'Loading skeleton',
    'Empty state',
    'Pagination',
    'Filters per column'
  ],
  responsive: {
    desktop: 'Full table view',
    tablet: 'Horizontal scroll',
    mobile: 'Card-based list view'
  }
}
```

## Navigation Architecture

### Desktop Navigation
```
┌─────────────────────────────────────────────────────────┐
│ Top Bar (64px height)                                   │
│ ┌─────────┬─────────────────────────────┬─────────────┐│
│ │ Logo    │ Search (Cmd+K)              │ User Menu   ││
│ └─────────┴─────────────────────────────┴─────────────┘│
├─────────────────────────────────────────────────────────┤
│ Sidebar │ Main Content Area                             │
│ (240px) │                                               │
│         │                                               │
│ Nav     │ Page Content                                  │
│ Items   │                                               │
│         │                                               │
│ ───     │                                               │
│         │                                               │
│ Quick   │                                               │
│ Actions │                                               │
└─────────┴───────────────────────────────────────────────┘
```

### Mobile Navigation
```
┌─────────────────────────────────────────┐
│ Top Bar (56px)                          │
│ ┌─────┬───────────────────┬───────────┐│
│ │ ☰   │ Page Title        │ Actions   ││
│ └─────┴───────────────────┴───────────┘│
├─────────────────────────────────────────┤
│                                         │
│                                         │
│         Main Content Area               │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ Bottom Tab Bar (56px)                   │
│ ┌────┬────┬────┬────┬────┐             │
│ │ 🏠 │ 📋 │ ➕ │ 🔔 │ 👤 │             │
│ └────┴────┴────┴────┴────┘             │
└─────────────────────────────────────────┘
```

### Sidebar Navigation Structure
```javascript
{
  sections: [
    {
      title: 'Main',
      items: [
        { icon: 'home', label: 'Dashboard', path: '/', badge: null },
        { icon: 'inbox', label: 'Applications', path: '/applications', badge: '12' },
        { icon: 'document', label: 'Documents', path: '/documents', badge: null },
        { icon: 'users', label: 'Applicants', path: '/applicants', badge: null }
      ]
    },
    {
      title: 'Tools',
      items: [
        { icon: 'chart', label: 'Analytics', path: '/analytics', badge: null },
        { icon: 'robot', label: 'AI Insights', path: '/ai-insights', badge: 'NEW' },
        { icon: 'bell', label: 'Notifications', path: '/notifications', badge: '5' }
      ]
    },
    {
      title: 'Settings',
      items: [
        { icon: 'cog', label: 'Settings', path: '/settings', badge: null },
        { icon: 'help', label: 'Help', path: '/help', badge: null }
      ]
    }
  ]
}
```

## Page Layouts

### Dashboard Layout
```javascript
{
  structure: {
    header: {
      title: 'Dashboard',
      subtitle: 'Welcome back, Sarah',
      actions: ['Export', 'Customize', 'Refresh']
    },
    filters: {
      type: 'persistent-bar',
      items: ['Date Range', 'Status', 'Loan Type', 'Amount Range'],
      savedViews: ['My Applications', 'High Priority', 'Pending Review']
    },
    widgets: [
      {
        type: 'metrics-grid',
        columns: 4,
        items: [
          { label: 'Total Applications', value: '1,234', trend: '+12%', color: 'blue' },
          { label: 'Pending Review', value: '45', trend: '-5%', color: 'orange' },
          { label: 'Approved This Month', value: '89', trend: '+23%', color: 'green' },
          { label: 'Total Funded', value: '$2.4M', trend: '+18%', color: 'purple' }
        ]
      },
      {
        type: 'chart',
        title: 'Application Volume',
        chartType: 'area',
        height: '300px',
        interactive: true
      },
      {
        type: 'activity-feed',
        title: 'Recent Activity',
        realTime: true,
        maxItems: 10
      },
      {
        type: 'quick-actions',
        title: 'Quick Actions',
        actions: [
          'New Application',
          'Review Queue',
          'Generate Report',
          'Bulk Import'
        ]
      }
    ]
  }
}
```

### Application Detail Layout
```javascript
{
  structure: {
    stickyHeader: {
      businessName: 'Acme Manufacturing LLC',
      applicationId: 'APP-2024-001234',
      status: 'Under Review',
      primaryAction: 'Approve',
      secondaryActions: ['Request Info', 'Reject', 'Assign']
    },
    sidebar: {
      position: 'right',
      width: '320px',
      sections: [
        {
          title: 'Key Information',
          items: [
            { label: 'Loan Amount', value: '$150,000' },
            { label: 'Submitted', value: '2 days ago' },
            { label: 'Assigned To', value: 'Sarah Johnson' },
            { label: 'Priority', value: 'High', badge: true }
          ]
        },
        {
          title: 'AI Risk Score',
          component: 'risk-gauge',
          score: 42,
          level: 'Low Risk'
        },
        {
          title: 'Quick Actions',
          actions: ['Download PDF', 'Share', 'Print', 'Export']
        }
      ]
    },
    mainContent: {
      tabs: [
        { id: 'overview', label: 'Overview', icon: 'eye' },
        { id: 'documents', label: 'Documents', icon: 'folder', badge: '12' },
        { id: 'timeline', label: 'Timeline', icon: 'clock' },
        { id: 'comments', label: 'Comments', icon: 'chat', badge: '3' },
        { id: 'ai-insights', label: 'AI Insights', icon: 'robot' }
      ]
    }
  }
}
```

## Animation System

### Micro-Interactions

#### Button Press
```css
.app-button {
  transition: all var(--duration-fast) var(--ease-out);
}

.app-button:active {
  transform: scale(0.98);
}

.app-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Ripple effect */
.app-button::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: ripple var(--duration-base) var(--ease-out);
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

#### Card Hover
```css
.app-card {
  transition: all var(--duration-base) var(--ease-out);
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}
```

#### Page Transitions
```javascript
// Fade and slide transition
const pageTransition = {
  enter: {
    opacity: 0,
    transform: 'translateY(20px)'
  },
  enterActive: {
    opacity: 1,
    transform: 'translateY(0)',
    transition: 'all 250ms ease-out'
  },
  exit: {
    opacity: 1,
    transform: 'translateY(0)'
  },
  exitActive: {
    opacity: 0,
    transform: 'translateY(-20px)',
    transition: 'all 200ms ease-in'
  }
};
```

#### Loading States
```javascript
// Skeleton screen pattern
class SkeletonLoader {
  patterns: {
    card: `
      <div class="skeleton-card">
        <div class="skeleton-header"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    `,
    table: `
      <div class="skeleton-table">
        <div class="skeleton-row" repeat="5"></div>
      </div>
    `,
    dashboard: `
      <div class="skeleton-dashboard">
        <div class="skeleton-metrics"></div>
        <div class="skeleton-chart"></div>
        <div class="skeleton-list"></div>
      </div>
    `
  },
  animation: 'shimmer 1.5s infinite'
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

#### Toast Animations
```css
/* Slide in from top */
@keyframes slideInTop {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Slide out to top */
@keyframes slideOutTop {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

.toast-enter {
  animation: slideInTop var(--duration-base) var(--ease-spring);
}

.toast-exit {
  animation: slideOutTop var(--duration-fast) var(--ease-in);
}
```

## State Management

### Application State Architecture
```javascript
// public/js/state/app-state.js
class AppState {
  constructor() {
    this.state = {
      user: null,
      navigation: { currentPage: '', history: [] },
      ui: { sidebarOpen: true, theme: 'light', notifications: [] },
      data: { applications: [], documents: [], cache: {} },
      realTime: { connected: false, lastUpdate: null }
    };
    this.subscribers = new Map();
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    return () => this.subscribers.get(key).delete(callback);
  }

  // Update state and notify subscribers
  setState(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    this.notify(key, value, oldValue);
  }

  // Optimistic update with rollback
  async optimisticUpdate(key, value, apiCall) {
    const oldValue = this.state[key];
    this.setState(key, value);
    
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      // Rollback on error
      this.setState(key, oldValue);
      throw error;
    }
  }
}
```

### Real-Time Updates
```javascript
// public/js/realtime/websocket-manager.js
class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.handlers = new Map();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      this.reconnect();
    };
  }

  handleMessage(data) {
    const { type, payload } = data;
    const handlers = this.handlers.get(type) || [];
    handlers.forEach(handler => handler(payload));
  }

  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
}
```

## Mobile-Specific Design

### Touch Gestures
```javascript
// public/js/mobile/gesture-handler.js
class GestureHandler {
  gestures: {
    swipe: {
      threshold: 50, // pixels
      velocity: 0.3, // pixels per ms
      directions: ['left', 'right', 'up', 'down']
    },
    longPress: {
      duration: 500, // ms
      movement: 10 // max pixels before canceling
    },
    pullToRefresh: {
      threshold: 80, // pixels
      resistance: 0.5 // drag resistance factor
    },
    pinchZoom: {
      minScale: 0.5,
      maxScale: 3.0
    }
  }
}
```

### Bottom Sheet Pattern
```javascript
// public/js/mobile/bottom-sheet.js
class BottomSheet {
  states: ['closed', 'peek', 'half', 'full'],
  snapPoints: {
    peek: '20%',
    half: '50%',
    full: '90%'
  },
  features: [
    'Drag handle indicator',
    'Snap to positions',
    'Swipe to dismiss',
    'Backdrop blur',
    'Keyboard aware (adjusts for keyboard)',
    'Safe area insets'
  ]
}
```

### Mobile Navigation Patterns
```javascript
// Bottom tab bar configuration
const mobileNavigation = {
  tabs: [
    { id: 'home', icon: 'home', label: 'Home', path: '/' },
    { id: 'applications', icon: 'inbox', label: 'Apps', path: '/applications', badge: 12 },
    { id: 'new', icon: 'plus-circle', label: 'New', action: 'openNewApplicationSheet' },
    { id: 'notifications', icon: 'bell', label: 'Alerts', path: '/notifications', badge: 5 },
    { id: 'profile', icon: 'user', label: 'Profile', path: '/profile' }
  ],
  activeIndicator: {
    type: 'pill', // or 'underline'
    animation: 'slide',
    color: 'var(--color-primary-500)'
  }
};
```

## Performance Optimization

### Code Splitting Strategy
```javascript
// Lazy load routes
const routes = {
  '/': () => import('./pages/dashboard.js'),
  '/applications': () => import('./pages/applications.js'),
  '/applications/:id': () => import('./pages/application-detail.js'),
  '/documents': () => import('./pages/documents.js'),
  '/settings': () => import('./pages/settings.js')
};

// Lazy load components
const lazyComponents = {
  chart: () => import('./components/chart.js'),
  richTextEditor: () => import('./components/rich-text-editor.js'),
  documentViewer: () => import('./components/document-viewer.js')
};
```

### Caching Strategy
```javascript
// public/js/cache/cache-manager.js
class CacheManager {
  strategies: {
    staleWhileRevalidate: {
      // Show cached data immediately, fetch fresh in background
      maxAge: 5 * 60 * 1000, // 5 minutes
      use: ['dashboard-metrics', 'application-list']
    },
    cacheFirst: {
      // Use cache if available, only fetch if missing
      maxAge: 60 * 60 * 1000, // 1 hour
      use: ['user-profile', 'settings']
    },
    networkFirst: {
      // Try network first, fallback to cache
      timeout: 3000, // 3 seconds
      use: ['application-detail', 'documents']
    }
  }
}
```

### Image Optimization
```javascript
// Responsive images with lazy loading
const imageConfig = {
  lazyLoad: true,
  placeholder: 'blur', // or 'skeleton'
  sizes: {
    thumbnail: { width: 150, height: 150 },
    small: { width: 400, height: 300 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 900 }
  },
  formats: ['webp', 'jpg'], // Serve WebP with JPG fallback
  quality: 85
};
```

## Dark Mode Implementation

### Theme System
```javascript
// public/js/theme/theme-manager.js
class ThemeManager {
  themes: {
    light: {
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      primary: '#2563eb',
      success: '#10b981',
      error: '#ef4444'
    },
    dark: {
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      primary: '#3b82f6',
      success: '#10b981',
      error: '#ef4444'
    }
  },
  
  applyTheme(theme) {
    const root = document.documentElement;
    Object.entries(this.themes[theme]).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    localStorage.setItem('theme', theme);
  },
  
  detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
```

### Dark Mode Adjustments
```css
/* Adjust shadows for dark mode */
[data-theme="dark"] {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}

/* Adjust images for dark mode */
[data-theme="dark"] img {
  opacity: 0.9;
}

/* Invert certain UI elements */
[data-theme="dark"] .logo {
  filter: brightness(0.9);
}
```

## Accessibility Implementation

### Keyboard Navigation
```javascript
// public/js/accessibility/keyboard-nav.js
class KeyboardNavigation {
  shortcuts: {
    'cmd+k': 'Open command palette',
    'cmd+/': 'Open keyboard shortcuts help',
    'esc': 'Close modal/panel',
    'tab': 'Navigate forward',
    'shift+tab': 'Navigate backward',
    'enter': 'Activate/submit',
    'space': 'Toggle/select',
    'arrow keys': 'Navigate lists/menus',
    'cmd+s': 'Save (prevent default)',
    'cmd+f': 'Search (prevent default)'
  },
  
  focusManagement: {
    trapFocus: true, // In modals/panels
    restoreFocus: true, // After closing modals
    skipLinks: true, // Skip to main content
    focusIndicators: 'visible' // Always show focus rings
  }
}
```

### ARIA Implementation
```html
<!-- Example: Application card with proper ARIA -->
<article 
  class="app-card" 
  role="article"
  aria-labelledby="app-title-123"
  aria-describedby="app-desc-123">
  
  <h3 id="app-title-123">Acme Manufacturing LLC</h3>
  <p id="app-desc-123">Loan application for $150,000</p>
  
  <div role="group" aria-label="Application status">
    <span aria-label="Status: Under Review">
      <span aria-hidden="true">🔄</span> Under Review
    </span>
  </div>
  
  <button 
    aria-label="View application details for Acme Manufacturing LLC"
    aria-expanded="false">
    View Details
  </button>
</article>
```

### Screen Reader Support
```javascript
// Live region announcements
class A11yAnnouncer {
  announce(message, priority = 'polite') {
    const announcer = document.getElementById('a11y-announcer');
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
}

// Usage examples:
announcer.announce('Application submitted successfully');
announcer.announce('Error: Please fill in all required fields', 'assertive');
announcer.announce('3 new notifications received');
```

## Progressive Web App (PWA)

### Service Worker Strategy
```javascript
// public/service-worker.js
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/css/app.css',
  '/js/app.js',
  '/images/logo.svg',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and cache successful responses
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE)
          .then(cache => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});
```

### Manifest Configuration
```json
{
  "name": "CivicFlow2",
  "short_name": "CivicFlow2",
  "description": "Government lending CRM for micro-business grants and loans",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/images/screenshot-mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/images/screenshot-desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

## File Structure

### New Directory Organization
```
public/
├── css/
│   ├── app/
│   │   ├── design-tokens.css       # Design system variables
│   │   ├── base.css                # Reset and base styles
│   │   ├── layout.css              # Layout utilities
│   │   └── utilities.css           # Utility classes
│   ├── components/
│   │   ├── button.css
│   │   ├── card.css
│   │   ├── input.css
│   │   ├── modal.css
│   │   ├── toast.css
│   │   ├── table.css
│   │   └── navigation.css
│   └── pages/
│       ├── dashboard.css
│       ├── application-detail.css
│       └── documents.css
├── js/
│   ├── app/
│   │   ├── app.js                  # Main app initialization
│   │   ├── router.js               # Client-side routing
│   │   └── config.js               # App configuration
│   ├── components/
│   │   ├── button.js
│   │   ├── card.js
│   │   ├── input.js
│   │   ├── modal.js
│   │   ├── toast.js
│   │   ├── table.js
│   │   └── navigation.js
│   ├── state/
│   │   ├── app-state.js            # Global state management
│   │   └── store.js                # State store
│   ├── realtime/
│   │   ├── websocket-manager.js    # WebSocket handling
│   │   └── event-handlers.js       # Real-time event handlers
│   ├── mobile/
│   │   ├── gesture-handler.js      # Touch gestures
│   │   ├── bottom-sheet.js         # Mobile bottom sheet
│   │   └── mobile-nav.js           # Mobile navigation
│   ├── theme/
│   │   └── theme-manager.js        # Theme switching
│   ├── accessibility/
│   │   ├── keyboard-nav.js         # Keyboard navigation
│   │   └── announcer.js            # Screen reader announcements
│   └── cache/
│       └── cache-manager.js        # Caching strategies
└── service-worker.js               # PWA service worker
```

## Integration with Existing Systems

### Demo Mode Integration
```javascript
// All new components must support demo mode
class AppComponent {
  constructor(options) {
    this.demoMode = options.demoMode || false;
    this.orchestrator = window.DemoOrchestrator;
  }
  
  async fetchData() {
    if (this.demoMode) {
      // Use demo data with simulated delay
      return this.orchestrator.getDemoData(this.dataType);
    }
    // Use real API
    return apiClient.get(this.endpoint);
  }
}
```

### API Client Integration
```javascript
// Extend existing api-client.js with new features
class EnhancedApiClient extends ApiClient {
  // Add optimistic updates
  async optimisticUpdate(endpoint, data, optimisticData) {
    // Update UI immediately
    this.updateUI(optimisticData);
    
    try {
      const result = await this.post(endpoint, data);
      return result;
    } catch (error) {
      // Rollback UI on error
      this.rollbackUI();
      throw error;
    }
  }
  
  // Add request deduplication
  async dedupedRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    const promise = requestFn();
    this.pendingRequests.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
}
```

### WebSocket Server Implementation
```typescript
// src/services/websocketService.ts
import { WebSocketServer } from 'ws';
import { Server } from 'http';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>>;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.clients = new Map();

    this.wss.on('connection', (ws, req) => {
      const userId = this.authenticateConnection(req);
      this.addClient(userId, ws);

      ws.on('message', (data) => {
        this.handleMessage(userId, data);
      });

      ws.on('close', () => {
        this.removeClient(userId, ws);
      });
    });
  }

  broadcast(event: string, data: any, userIds?: string[]) {
    const message = JSON.stringify({ type: event, payload: data });
    
    if (userIds) {
      // Send to specific users
      userIds.forEach(userId => {
        this.clients.get(userId)?.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });
      });
    } else {
      // Broadcast to all
      this.wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }
}
```

## Testing Strategy

### Component Testing
```javascript
// Example: Button component test
describe('AppButton', () => {
  test('renders with correct variant', () => {
    const button = new AppButton({ variant: 'primary' });
    expect(button.element.classList.contains('btn-primary')).toBe(true);
  });

  test('shows loading state', () => {
    const button = new AppButton({ loading: true });
    expect(button.element.querySelector('.spinner')).toBeTruthy();
  });

  test('handles click events', () => {
    const onClick = jest.fn();
    const button = new AppButton({ onClick });
    button.element.click();
    expect(onClick).toHaveBeenCalled();
  });

  test('is keyboard accessible', () => {
    const button = new AppButton();
    expect(button.element.getAttribute('role')).toBe('button');
    expect(button.element.tabIndex).toBe(0);
  });
});
```

### Performance Testing
```javascript
// Lighthouse CI configuration
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/applications',
        'http://localhost:3000/applications/123'
      ]
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }]
      }
    }
  }
};
```

### Accessibility Testing
```javascript
// Automated accessibility testing with axe-core
import { axe } from 'jest-axe';

test('dashboard has no accessibility violations', async () => {
  const { container } = render(<Dashboard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```
