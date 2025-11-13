/**
 * Demo Mode UI Components
 */

class DemoModeUI {
  constructor() {
    this.sessionId = null;
    this.userRole = null;
    this.expiresAt = null;
    this.timerInterval = null;
    this.bannerElement = null;
  }

  /**
   * Initialize demo mode UI
   */
  init(sessionId, userRole, expiresAt) {
    this.sessionId = sessionId;
    this.userRole = userRole;
    this.expiresAt = new Date(expiresAt);

    // Add demo mode class to body
    document.body.classList.add('demo-mode-active');

    // Show demo banner
    this.showBanner();

    // Add demo badges to data elements
    this.addDemoBadges();

    // Start timer
    this.startTimer();

    // Store session info in sessionStorage
    sessionStorage.setItem('demo_session', sessionId);
    sessionStorage.setItem('demo_role', userRole);
    sessionStorage.setItem('demo_expires', expiresAt);
  }

  /**
   * Show demo mode banner
   */
  showBanner() {
    // Check if banner already exists
    if (document.querySelector('.demo-banner')) {
      return;
    }

    const banner = document.createElement('div');
    banner.className = 'demo-banner';
    banner.innerHTML = `
      <div class="demo-banner__content">
        <div class="demo-banner__text">
          <p class="demo-banner__title">Demo Mode Active</p>
          <p class="demo-banner__subtitle">You're viewing a demonstration with sample data. No changes will be saved.</p>
        </div>
      </div>
      <div class="demo-banner__actions">
        <div class="demo-banner__timer" id="demo-timer">
          <span id="demo-time-remaining">--:--</span>
        </div>
        <button class="demo-banner__button" onclick="demoModeUI.resetSession()">
          Reset Demo
        </button>
        <button class="demo-banner__button demo-banner__button--primary" onclick="demoModeUI.endSession()">
          Exit Demo
        </button>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);
    this.bannerElement = banner;
  }

  /**
   * Hide demo mode banner
   */
  hideBanner() {
    if (this.bannerElement) {
      this.bannerElement.remove();
      this.bannerElement = null;
    }
    document.body.classList.remove('demo-mode-active');
  }

  /**
   * Add demo badges to data elements
   */
  addDemoBadges() {
    // Add badges to cards, tables, and other data containers
    const dataElements = document.querySelectorAll(
      '.card, .table-row, .data-item, .application-card, .document-item'
    );

    dataElements.forEach(element => {
      // Skip if badge already exists
      if (element.querySelector('.demo-badge')) {
        return;
      }

      const badge = document.createElement('span');
      badge.className = 'demo-badge demo-badge--small';
  badge.innerHTML = 'Demo';

      // Try to add to header or prepend to element
      const header = element.querySelector('.card-header, .item-header, h3, h4');
      if (header) {
        header.appendChild(badge);
      } else {
        element.insertBefore(badge, element.firstChild);
      }
    });
  }

  /**
   * Start countdown timer
   */
  startTimer() {
    this.updateTimer();
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  /**
   * Update countdown timer
   */
  updateTimer() {
    const now = new Date();
    const remaining = this.expiresAt - now;

    if (remaining <= 0) {
      this.handleSessionExpired();
      return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const timerElement = document.getElementById('demo-time-remaining');
    
    if (timerElement) {
      timerElement.textContent = timeString;

      // Add warning class if less than 5 minutes
      const timerContainer = document.getElementById('demo-timer');
      if (minutes < 5 && timerContainer) {
        timerContainer.classList.add('demo-banner__timer--warning');
      }
    }
  }

  /**
   * Stop timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Handle session expired
   */
  handleSessionExpired() {
    this.stopTimer();
    
    // Show expiration message
    if (window.toastManager) {
      window.toastManager.show(
        'Demo session has expired. Redirecting to demo landing page...',
        'warning',
        5000
      );
    } else {
      alert('Demo session has expired. Redirecting to demo landing page...');
    }

    // Redirect after 2 seconds
    setTimeout(() => {
      window.location.href = '/demo-landing.html';
    }, 2000);
  }

  /**
   * Reset demo session
   */
  async resetSession() {
    if (!confirm('Reset demo session? This will clear all demo data and start fresh.')) {
      return;
    }

    try {
      const response = await fetch('/api/v1/demo/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': this.sessionId,
        },
      });

      if (response.ok) {
        if (window.toastManager) {
          window.toastManager.show('Demo session reset successfully', 'success');
        }
        
        // Reload page
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error('Failed to reset demo session');
      }
    } catch (error) {
      console.error('Error resetting demo session:', error);
      if (window.toastManager) {
        window.toastManager.show('Failed to reset demo session', 'error');
      } else {
        alert('Failed to reset demo session');
      }
    }
  }

  /**
   * End demo session
   */
  async endSession() {
    if (!confirm('Exit demo mode? You will be redirected to the demo landing page.')) {
      return;
    }

    try {
      await fetch('/api/v1/demo/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Session': this.sessionId,
        },
      });
    } catch (error) {
      console.error('Error ending demo session:', error);
    }

    // Clean up
    this.stopTimer();
    this.hideBanner();
    sessionStorage.removeItem('demo_session');
    sessionStorage.removeItem('demo_role');
    sessionStorage.removeItem('demo_expires');

    // Redirect
    window.location.href = '/demo-landing.html';
  }

  /**
   * Check if in demo mode
   */
  static isDemoMode() {
    return sessionStorage.getItem('demo_session') !== null;
  }

  /**
   * Get demo session ID
   */
  static getSessionId() {
    return sessionStorage.getItem('demo_session');
  }

  /**
   * Get demo user role
   */
  static getUserRole() {
    return sessionStorage.getItem('demo_role');
  }

  /**
   * Add demo session header to fetch requests
   */
  static addDemoHeaders(headers = {}) {
    const sessionId = DemoModeUI.getSessionId();
    if (sessionId) {
      headers['X-Demo-Session'] = sessionId;
    }
    return headers;
  }
}

// Create global instance
window.demoModeUI = new DemoModeUI();

// Auto-initialize if demo session exists
document.addEventListener('DOMContentLoaded', () => {
  const sessionId = sessionStorage.getItem('demo_session');
  const userRole = sessionStorage.getItem('demo_role');
  const expiresAt = sessionStorage.getItem('demo_expires');

  if (sessionId && userRole && expiresAt) {
    window.demoModeUI.init(sessionId, userRole, expiresAt);
  }
});

// Intercept fetch to add demo headers
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (DemoModeUI.isDemoMode()) {
    const [url, options = {}] = args;
    options.headers = DemoModeUI.addDemoHeaders(options.headers || {});
    return originalFetch(url, options);
  }
  return originalFetch(...args);
};
