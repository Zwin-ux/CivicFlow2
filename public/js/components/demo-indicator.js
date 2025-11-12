/**
 * Demo Indicator Component
 * Reusable component for showing demo mode indicators in various formats
 * Supports badge, icon, and banner variants
 */

class DemoIndicator {
  /**
   * Create a badge variant (small pill on cards)
   * @param {Object} options - Configuration options
   * @param {string} options.text - Badge text (default: "Demo")
   * @param {string} options.tooltip - Tooltip message
   * @param {string} options.className - Additional CSS classes
   * @returns {HTMLElement} Badge element
   */
  static createBadge(options = {}) {
    const {
      text = 'Demo',
      tooltip = 'This is simulated data for demonstration purposes',
      className = ''
    } = options;

    const badge = document.createElement('span');
    badge.className = `demo-indicator-badge ${className}`;
    badge.setAttribute('data-tooltip', tooltip);
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', `Demo mode: ${tooltip}`);
    
    badge.innerHTML = `
      <span class="demo-indicator-icon">✨</span>
      <span class="demo-indicator-text">${text}</span>
    `;

    return badge;
  }

  /**
   * Create an icon variant (tiny icon next to items)
   * @param {Object} options - Configuration options
   * @param {string} options.tooltip - Tooltip message
   * @param {string} options.className - Additional CSS classes
   * @returns {HTMLElement} Icon element
   */
  static createIcon(options = {}) {
    const {
      tooltip = 'This is simulated data for demonstration purposes',
      className = ''
    } = options;

    const icon = document.createElement('span');
    icon.className = `demo-indicator-icon-only ${className}`;
    icon.setAttribute('data-tooltip', tooltip);
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', `Demo mode: ${tooltip}`);
    icon.textContent = '✨';

    return icon;
  }

  /**
   * Create a banner variant (dismissible top banner)
   * @param {Object} options - Configuration options
   * @param {string} options.title - Banner title
   * @param {string} options.message - Banner message
   * @param {boolean} options.dismissible - Whether banner can be dismissed
   * @param {Function} options.onDismiss - Callback when dismissed
   * @param {string} options.className - Additional CSS classes
   * @returns {HTMLElement} Banner element
   */
  static createBanner(options = {}) {
    const {
      title = 'Demo Mode Active',
      message = 'You\'re viewing a demonstration with sample data. Some services are simulated for demo purposes.',
      dismissible = true,
      onDismiss = null,
      className = ''
    } = options;

    // Check if banner was previously dismissed in this session
    if (dismissible && sessionStorage.getItem('demoIndicatorBannerDismissed') === 'true') {
      return null;
    }

    const banner = document.createElement('div');
    banner.className = `demo-indicator-banner ${className}`;
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');

    banner.innerHTML = `
      <div class="demo-indicator-banner-content">
        <div class="demo-indicator-banner-icon">✨</div>
        <div class="demo-indicator-banner-text">
          <div class="demo-indicator-banner-title">${title}</div>
          <div class="demo-indicator-banner-message">${message}</div>
        </div>
      </div>
      ${dismissible ? `
        <button class="demo-indicator-banner-close" aria-label="Dismiss demo mode banner">
          ×
        </button>
      ` : ''}
    `;

    if (dismissible) {
      const closeBtn = banner.querySelector('.demo-indicator-banner-close');
      closeBtn.addEventListener('click', () => {
        banner.style.animation = 'demoIndicatorSlideUp 0.3s ease-out';
        setTimeout(() => {
          banner.remove();
          sessionStorage.setItem('demoIndicatorBannerDismissed', 'true');
          if (onDismiss) onDismiss();
        }, 300);
      });
    }

    return banner;
  }

  /**
   * Add a demo indicator to an element
   * @param {HTMLElement} element - Target element
   * @param {string} variant - Variant type: 'badge', 'icon', or 'banner'
   * @param {Object} options - Configuration options
   */
  static addTo(element, variant = 'badge', options = {}) {
    let indicator;

    switch (variant) {
      case 'badge':
        indicator = DemoIndicator.createBadge(options);
        break;
      case 'icon':
        indicator = DemoIndicator.createIcon(options);
        break;
      case 'banner':
        indicator = DemoIndicator.createBanner(options);
        if (!indicator) return; // Banner was dismissed
        break;
      default:
        console.warn(`Unknown demo indicator variant: ${variant}`);
        return;
    }

    if (variant === 'banner') {
      // Insert banner at the beginning of the element
      element.insertBefore(indicator, element.firstChild);
    } else {
      // Append badge or icon to the element
      element.appendChild(indicator);
    }

    return indicator;
  }

  /**
   * Check if demo mode is active
   * @returns {boolean} True if demo mode is active
   */
  static isDemoMode() {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
      return true;
    }

    // Check localStorage
    if (localStorage.getItem('demoMode') === 'true') {
      return true;
    }

    // Check for demo session cookie
    if (document.cookie.includes('demo_session=')) {
      return true;
    }

    // Check window variable (set by server)
    if (window.DEMO_MODE_ENABLED === true) {
      return true;
    }

    return false;
  }

  /**
   * Automatically add demo indicators to elements with data-demo attribute
   * @param {HTMLElement} container - Container to search within (default: document.body)
   */
  static autoInit(container = document.body) {
    if (!DemoIndicator.isDemoMode()) {
      return;
    }

    // Find all elements with data-demo attribute
    const elements = container.querySelectorAll('[data-demo]');
    
    elements.forEach(element => {
      const variant = element.getAttribute('data-demo-variant') || 'badge';
      const text = element.getAttribute('data-demo-text');
      const tooltip = element.getAttribute('data-demo-tooltip');
      
      const options = {};
      if (text) options.text = text;
      if (tooltip) options.tooltip = tooltip;

      DemoIndicator.addTo(element, variant, options);
    });
  }

  /**
   * Add demo indicator to API response data
   * @param {Object} data - API response data
   * @param {boolean} isDemo - Whether data is demo data
   * @returns {Object} Data with demo indicator
   */
  static markData(data, isDemo = true) {
    if (typeof data === 'object' && data !== null) {
      return {
        ...data,
        isDemo,
        _demoIndicator: isDemo
      };
    }
    return data;
  }

  /**
   * Check if data is demo data
   * @param {Object} data - Data to check
   * @returns {boolean} True if data is demo data
   */
  static isDataDemo(data) {
    return data && (data.isDemo === true || data._demoIndicator === true);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    DemoIndicator.autoInit();
  });
} else {
  DemoIndicator.autoInit();
}

// Export for use in other scripts
window.DemoIndicator = DemoIndicator;
