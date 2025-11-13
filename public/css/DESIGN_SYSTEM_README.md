# Enhanced Visual Design System

A comprehensive, modern design system for the Government Lending CRM with support for dark mode, animations, and responsive layouts.

## Overview

This design system provides a complete set of design tokens, components, and utilities to build consistent, accessible, and beautiful user interfaces.

## Features

-  **Comprehensive Design Tokens** - Colors, typography, spacing, shadows, and more
-  **Dark Mode Support** - Automatic theme switching based on system preferences
-  **Responsive Layout System** - Mobile-first grid and flexbox utilities
-  **Animation System** - Pre-built animations and micro-interactions
-  **Component Library** - Reusable UI components (buttons, cards, modals, etc.)
-  **Accessibility** - WCAG 2.1 Level AA compliant
- Demo **Theme System** - Easy theme customization and switching

## Getting Started

### Installation

Include the design system CSS in your HTML:

```html
<!-- Complete design system -->
<link rel="stylesheet" href="/css/design-system-all.css">

<!-- Theme system JavaScript -->
<script src="/js/theme-system.js"></script>

<!-- Optional: Component JavaScript -->
<script src="/js/components/toast.js"></script>
<script src="/js/components/modal.js"></script>
<script src="/js/components/theme-toggle.js"></script>
```

### Basic Usage

```html
<div class="ds-container">
  <div class="ds-card hoverable">
    <div class="ds-card-header">
      <h3 class="ds-card-title">Card Title</h3>
    </div>
    <div class="ds-card-body">
      <p>Card content goes here.</p>
    </div>
    <div class="ds-card-footer">
      <button class="ds-btn ds-btn-primary">Action</button>
    </div>
  </div>
</div>
```

## Design Tokens

### Colors

The design system includes a comprehensive color palette with semantic naming:

- **Primary** - Main brand color (blue)
- **Secondary** - Secondary brand color (purple)
- **Success** - Success states (green)
- **Warning** - Warning states (orange)
- **Error** - Error states (red)
- **Info** - Informational states (cyan)
- **Neutral** - Grayscale colors

Each color has 10 shades (50-900) for flexibility.

```css
/* Using color tokens */
.my-element {
  color: var(--color-primary);
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-600);
}
```

### Typography

```css
/* Font families */
--font-family-primary: System fonts
--font-family-mono: Monospace fonts

/* Font sizes */
--font-size-xs: 0.75rem (12px)
--font-size-sm: 0.875rem (14px)
--font-size-base: 1rem (16px)
--font-size-lg: 1.125rem (18px)
--font-size-xl: 1.25rem (20px)
--font-size-2xl: 1.5rem (24px)
--font-size-3xl: 1.875rem (30px)
--font-size-4xl: 2.25rem (36px)

/* Font weights */
--font-weight-light: 300
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

### Spacing

```css
--spacing-1: 0.25rem (4px)
--spacing-2: 0.5rem (8px)
--spacing-3: 0.75rem (12px)
--spacing-4: 1rem (16px)
--spacing-6: 1.5rem (24px)
--spacing-8: 2rem (32px)
/* ... and more */
```

### Shadows & Elevation

```css
--shadow-sm: Small shadow
--shadow-base: Base shadow
--shadow-md: Medium shadow
--shadow-lg: Large shadow
--shadow-xl: Extra large shadow

--elevation-1: Material Design elevation level 1
--elevation-2: Material Design elevation level 2
/* ... up to elevation-5 */
```

## Components

### Buttons

```html
<!-- Primary button -->
<button class="ds-btn ds-btn-primary">Primary</button>

<!-- Secondary button -->
<button class="ds-btn ds-btn-secondary">Secondary</button>

<!-- Outlined button -->
<button class="ds-btn ds-btn-outlined">Outlined</button>

<!-- Button sizes -->
<button class="ds-btn ds-btn-primary ds-btn-sm">Small</button>
<button class="ds-btn ds-btn-primary">Default</button>
<button class="ds-btn ds-btn-primary ds-btn-lg">Large</button>

<!-- Loading state -->
<button class="ds-btn ds-btn-primary loading">Loading...</button>

<!-- Icon button -->
<button class="ds-btn ds-btn-icon ds-btn-primary">
  <svg>...</svg>
</button>
```

### Cards

```html
<div class="ds-card">
  <div class="ds-card-header">
    <h3 class="ds-card-title">Card Title</h3>
    <p class="ds-card-subtitle">Subtitle</p>
  </div>
  <div class="ds-card-body">
    Content goes here
  </div>
  <div class="ds-card-footer">
    <div class="ds-card-actions justify-end">
      <button class="ds-btn ds-btn-text">Cancel</button>
      <button class="ds-btn ds-btn-primary">Save</button>
    </div>
  </div>
</div>

<!-- Hoverable card -->
<div class="ds-card hoverable">...</div>

<!-- Outlined card -->
<div class="ds-card outlined">...</div>
```

### Forms

```html
<div class="ds-form-group">
  <label class="ds-form-label required">Email</label>
  <input type="email" class="ds-form-input" placeholder="Enter email">
  <span class="ds-form-help">We'll never share your email.</span>
</div>

<!-- With validation -->
<div class="ds-form-group">
  <label class="ds-form-label">Username</label>
  <input type="text" class="ds-form-input valid">
  <div class="ds-form-feedback success">Username is available!</div>
</div>

<!-- Switch toggle -->
<label class="ds-form-switch">
  <input type="checkbox" class="ds-form-switch-input">
  <span class="ds-form-switch-label">Enable notifications</span>
</label>
```

### Modal

```javascript
// Create modal
const modal = new Modal({
  title: 'Confirm Action',
  content: '<p>Are you sure you want to proceed?</p>',
  size: 'md',
  footer: `
    <button class="ds-btn ds-btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="ds-btn ds-btn-primary">Confirm</button>
  `
});

// Open modal
modal.open();

// Close modal
modal.close();
```

### Toast Notifications

```javascript
// Show toast
toast.success('Operation completed successfully!', 'Success');
toast.error('An error occurred', 'Error');
toast.warning('Please review your input', 'Warning');
toast.info('New update available', 'Info');

// Custom options
toast.show({
  type: 'success',
  title: 'Success',
  message: 'Your changes have been saved',
  duration: 5000,
  showProgress: true
});
```

### Badges & Tags

```html
<!-- Badges -->
<span class="ds-badge ds-badge-primary">New</span>
<span class="ds-badge ds-badge-success">Active</span>
<span class="ds-badge ds-badge-warning">Pending</span>

<!-- Tags -->
<span class="ds-tag ds-tag-primary">React</span>
<span class="ds-tag ds-tag-secondary">TypeScript</span>

<!-- Tag with close button -->
<span class="ds-tag ds-tag-info">
  JavaScript
  <button class="ds-tag-close">×</button>
</span>
```

### Progress Indicators

```html
<!-- Linear progress -->
<div class="ds-progress">
  <div class="ds-progress-bar" style="width: 60%"></div>
</div>

<!-- With label -->
<div class="ds-progress-labeled">
  <div class="ds-progress">
    <div class="ds-progress-bar success" style="width: 75%"></div>
  </div>
  <span class="ds-progress-label">75%</span>
</div>

<!-- Spinner -->
<div class="ds-spinner"></div>

<!-- Step progress -->
<div class="ds-progress-steps">
  <div class="ds-progress-step completed">
    <div class="ds-progress-step-circle">1</div>
    <div class="ds-progress-step-label">Step 1</div>
  </div>
  <div class="ds-progress-step active">
    <div class="ds-progress-step-circle">2</div>
    <div class="ds-progress-step-label">Step 2</div>
  </div>
  <div class="ds-progress-step">
    <div class="ds-progress-step-circle">3</div>
    <div class="ds-progress-step-label">Step 3</div>
  </div>
</div>
```

## Layout System

### Container

```html
<div class="ds-container">
  <!-- Content constrained to max-width with responsive padding -->
</div>

<!-- Specific sizes -->
<div class="ds-container-sm">Small container (640px)</div>
<div class="ds-container-lg">Large container (1024px)</div>
<div class="ds-container-fluid">Full width</div>
```

### Grid System

```html
<!-- Basic grid -->
<div class="ds-grid ds-grid-cols-3 ds-grid-gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>

<!-- Responsive grid -->
<div class="ds-grid ds-grid-cols-1 md:ds-grid-cols-2 lg:ds-grid-cols-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>

<!-- Auto-fit grid -->
<div class="ds-grid ds-grid-auto-fit">
  <!-- Items automatically fit based on min-width -->
</div>
```

### Flexbox Utilities

```html
<div class="ds-flex ds-justify-between ds-items-center ds-gap-4">
  <div>Left</div>
  <div>Right</div>
</div>

<div class="ds-flex ds-flex-col ds-gap-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## Animations

### Animation Classes

```html
<!-- Fade animations -->
<div class="animate-fade-in">Fades in</div>

<!-- Slide animations -->
<div class="animate-slide-in-up">Slides up</div>
<div class="animate-slide-in-down">Slides down</div>

<!-- Scale animations -->
<div class="animate-scale-in">Scales in</div>

<!-- Continuous animations -->
<div class="animate-pulse">Pulses</div>
<div class="animate-spin">Spins</div>
<div class="animate-bounce">Bounces</div>
```

### Skeleton Loaders

```html
<div class="skeleton skeleton-title"></div>
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-avatar"></div>
<div class="skeleton skeleton-card"></div>
```

### Micro-interactions

```html
<button class="ds-btn hover-lift">Lifts on hover</button>
<div class="ds-card hover-grow">Grows on hover</div>
<button class="ds-btn active-press">Press effect</button>
```

## Theme System

### Using the Theme System

```javascript
// Get current theme
const currentTheme = themeSystem.getTheme(); // 'light', 'dark', or 'auto'

// Set theme
themeSystem.setTheme('dark');
themeSystem.setTheme('light');
themeSystem.setTheme('auto'); // Follows system preference

// Toggle theme
themeSystem.toggleTheme();

// Listen for theme changes
window.addEventListener('theme:change', (e) => {
  console.log('Theme changed to:', e.detail.activeTheme);
});
```

### Theme Toggle Component

```html
<!-- Add theme toggle to your page -->
<div data-theme-toggle></div>

<!-- Or create manually -->
<div id="theme-toggle-container"></div>
<script>
  new ThemeToggle('#theme-toggle-container');
</script>
```

## Accessibility

The design system follows WCAG 2.1 Level AA guidelines:

- Proper color contrast ratios
- Keyboard navigation support
- Screen reader friendly
- Focus indicators
- ARIA labels and roles
- Semantic HTML

### Screen Reader Only Content

```html
<span class="sr-only">This text is only for screen readers</span>
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Customization

### Overriding Design Tokens

```css
:root {
  /* Override primary color */
  --color-primary: #your-color;
  --color-primary-600: #your-darker-color;
  
  /* Override spacing */
  --spacing-4: 1.5rem;
  
  /* Override font */
  --font-family-primary: 'Your Font', sans-serif;
}
```

### Creating Custom Themes

```css
[data-theme="custom"] {
  --color-primary: #custom-color;
  --color-background-primary: #custom-bg;
  /* ... other tokens */
}
```

## Best Practices

1. **Use Design Tokens** - Always use CSS variables instead of hardcoded values
2. **Mobile First** - Build for mobile, then enhance for larger screens
3. **Semantic HTML** - Use proper HTML elements for better accessibility
4. **Consistent Spacing** - Use the spacing scale for margins and padding
5. **Component Composition** - Combine components to build complex UIs
6. **Performance** - Use animations sparingly and respect `prefers-reduced-motion`

## Examples

See the `/examples` directory for complete page examples using the design system.

## Support

For issues or questions, please contact the development team.

## License

Internal use only - Government Lending CRM
