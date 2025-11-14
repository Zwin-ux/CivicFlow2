/**
 * Demo Mode Banner Component
 * Displays a banner indicating demo mode is active with information about mock services
 */

const DEMO_EVENT_CHANNEL = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('octodoc-demo-bus') : null;

class DemoBanner {
  constructor() {
    this.banner = null;
    this.isDismissed = false;
    this.stateHandler = detail => this.updateState(detail);
    this.timelineHandler = detail => this.updateTimelineHint(detail);
    this.statusBadge = null;
    this.timelineHint = null;
    this.init();
  }

  init() {
    // Check if demo mode is enabled
    if (this.isDemoMode()) {
      this.createBanner();
      this.attachEventListeners();
      this.bindLiveIndicators();
      this.syncFromDataset();
    }
  }

  isDemoMode() {
    // Check for demo mode indicator in various ways
    // 1. Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
      return true;
    }

    // 2. Check localStorage
    if (localStorage.getItem('demoMode') === 'true') {
      return true;
    }

    // 3. Check if on demo landing page
    if (window.location.pathname.includes('demo-landing')) {
      return true;
    }

    // 4. Check for demo session cookie
    if (document.cookie.includes('demo_session=')) {
      return true;
    }

    // Default: assume demo mode if DEMO_MODE_ENABLED env var is set
    // This would be injected by the server
    return window.DEMO_MODE_ENABLED === true;
  }

  createBanner() {
    // Check if banner was previously dismissed in this session
    if (sessionStorage.getItem('demoBannerDismissed') === 'true') {
      return;
    }

    this.banner = document.createElement('div');
    this.banner.className = 'demo-banner';
    this.banner.innerHTML = `
      <div class="demo-banner-content">
        <div class="demo-banner-text">
          <p class="demo-banner-title">
            <span aria-live="polite" id="demo-banner-status">Demo mode · idle</span>
          </p>
          <p class="demo-banner-subtitle" id="demo-banner-hint">
            You're viewing curated data. No changes persist.
          </p>
        </div>
      </div>
      <div class="demo-banner-actions">
        <button class="demo-banner-info-btn" id="demo-info-btn">
          <span>What’s simulated?</span>
        </button>
        <button class="demo-banner-close" id="demo-banner-close" aria-label="Dismiss banner">
          ×
        </button>
      </div>
    `;

    document.body.insertBefore(this.banner, document.body.firstChild);
    document.body.classList.add('demo-banner-active');
    this.statusBadge = this.banner.querySelector('#demo-banner-status');
    this.timelineHint = this.banner.querySelector('#demo-banner-hint');
  }

  attachEventListeners() {
    if (!this.banner) return;

    // Close button
    const closeBtn = this.banner.querySelector('#demo-banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismissBanner());
    }

    // Info button
    const infoBtn = this.banner.querySelector('#demo-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', () => this.showInfoModal());
    }
  }

  bindLiveIndicators() {
    window.addEventListener('demo:session-state', event => this.stateHandler(event.detail));
    window.addEventListener('demo:timeline-update', event => this.timelineHandler(event.detail));
    if (DEMO_EVENT_CHANNEL) {
      DEMO_EVENT_CHANNEL.addEventListener('message', event => {
        if (event.data?.name === 'demo:session-state') {
          this.stateHandler(event.data.detail);
        }
        if (event.data?.name === 'demo:timeline-update') {
          this.timelineHandler(event.data.detail);
        }
      });
    }
  }

  syncFromDataset() {
    const state = document.body.dataset.demoMode === 'active' ? 'active' : 'idle';
    this.updateState({ state });
  }

  updateState(detail) {
    if (!this.statusBadge) return;
    if (!detail || !detail.state) return;
    const { state, context = {} } = detail;
    if (state === 'active') {
      const loanLabel = context.loanType === '5a' ? 'SBA 5(a)' : 'SBA 504';
      this.statusBadge.textContent = `Demo mode · ${loanLabel}`;
    } else if (state === 'error') {
      this.statusBadge.textContent = 'Demo mode · retry needed';
    } else {
      this.statusBadge.textContent = 'Demo mode · idle';
    }
  }

  updateTimelineHint(detail) {
    if (!this.timelineHint || !detail) return;
    const { jobs = [] } = detail;
    if (!jobs.length) {
      this.timelineHint.textContent = "Uploads stream here—click 'Start OctoDoc demo' to begin.";
      return;
    }
    const active = jobs.find(job => job.status !== 'done');
    if (active) {
      this.timelineHint.textContent = `Processing ${active.documentId?.slice(0, 6) || 'doc'} (${active.status})`;
      return;
    }
    const latest = jobs[0];
    this.timelineHint.textContent = `Latest: ${latest.documentId?.slice(0, 6)} · ${latest.status}`;
  }

  dismissBanner() {
    if (this.banner) {
      this.banner.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        this.banner.remove();
        document.body.classList.remove('demo-banner-active');
        sessionStorage.setItem('demoBannerDismissed', 'true');
      }, 300);
    }
  }

  showInfoModal() {
    const modal = document.createElement('div');
    modal.className = 'demo-info-modal';
    modal.innerHTML = `
      <div class="demo-info-content">
        <div class="demo-info-header">
          <h2>Demo Mode Information</h2>
        </div>
        <div class="demo-info-body">
          <div class="demo-info-section">
            <h3>What is Demo Mode?</h3>
            <p>
              Demo Mode allows you to explore the Government Lending CRM platform 
              with realistic sample data without affecting any real applications or data.
            </p>
          </div>

          <div class="demo-info-section">
            <h3>Features Available in Demo Mode</h3>
            <ul class="demo-info-list">
              <li>Browse 25+ sample applications with varied statuses</li>
              <li>View AI-powered document analysis results</li>
              <li>Explore anomaly detection and fraud alerts</li>
              <li>Test the applicant, staff, and admin portals</li>
              <li>Experience the full workflow from submission to decision</li>
            </ul>
          </div>

          <div class="demo-info-section">
            <h3>Mock Services</h3>
            <p>
              The following services are simulated in demo mode to provide 
              a complete experience without requiring external integrations:
            </p>
            <ul class="demo-info-list">
              <li><strong>Email Notifications:</strong> Logged to console instead of sending</li>
              <li><strong>Teams Integration:</strong> Simulated notifications (no actual Teams messages)</li>
              <li><strong>EIN Verification:</strong> Mock verification responses</li>
            </ul>
          </div>

          <div class="demo-info-section">
            <h3>Real AI Services</h3>
            <p>
              These AI features use actual AI models to demonstrate real capabilities:
            </p>
            <ul class="demo-info-list">
              <li><strong>Document Analysis:</strong> Real AI-powered quality assessment</li>
              <li><strong>Anomaly Detection:</strong> Actual pattern recognition algorithms</li>
              <li><strong>Decision Support:</strong> AI-generated recommendations</li>
            </ul>
          </div>

          <div class="demo-info-section">
            <h3>Demo User Accounts</h3>
            <p>Use these credentials to explore different user roles:</p>
            <ul class="demo-info-list">
              <li><strong>Applicant:</strong> demo-applicant@demo.local / Demo123!</li>
              <li><strong>Staff:</strong> demo-staff@demo.local / Demo123!</li>
              <li><strong>Admin:</strong> demo-admin@demo.local / Demo123!</li>
            </ul>
          </div>

          <div class="demo-info-section">
            <h3>Important Notes</h3>
            <ul class="demo-info-list">
              <li>All data is sample data and will be reset periodically</li>
              <li>Do not enter any real personal or business information</li>
              <li>Demo sessions expire after 30 minutes of inactivity</li>
              <li>Changes made in demo mode do not affect production data</li>
            </ul>
          </div>
        </div>
        <div class="demo-info-footer">
          <button class="demo-info-close-btn" id="demo-info-close">
            Got it!
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close modal on button click
    const closeBtn = modal.querySelector('#demo-info-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.remove());
    }

    // Close modal on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Add demo tooltip to an element
   * @param {HTMLElement} element - Element to add tooltip to
   * @param {string} message - Tooltip message
   */
  static addTooltip(element, message) {
    const tooltip = document.createElement('span');
    tooltip.className = 'demo-tooltip';
    tooltip.innerHTML = `
      <span class="demo-tooltip-icon">D</span>
      <span class="demo-tooltip-content">${message}</span>
    `;
    element.appendChild(tooltip);
  }

  /**
   * Add demo service badge to an element
   * @param {HTMLElement} element - Element to add badge to
   * @param {string} serviceName - Name of the mock service
   */
  static addServiceBadge(element, serviceName) {
    const badge = document.createElement('span');
    badge.className = 'demo-service-badge';
    badge.innerHTML = `
      <span class="demo-service-badge-icon">D</span>
      <span>Demo: ${serviceName}</span>
    `;
    element.appendChild(badge);
  }
}

// Initialize demo banner when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DemoBanner();
  });
} else {
  new DemoBanner();
}

// Export for use in other scripts
window.DemoBanner = DemoBanner;
