/**
 * Toast Notification System
 * JavaScript component for showing toast notifications
 */

class ToastManager {
  constructor(options = {}) {
    this.position = options.position || 'bottom-right';
    this.duration = options.duration || 5000;
    this.container = null;
    this.toasts = [];
    
    this.init();
  }
  
  /**
   * Initialize toast container
   */
  init() {
    // Create container if it doesn't exist
    this.container = document.querySelector('.ds-toast-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = `ds-toast-container ${this.position}`;
      document.body.appendChild(this.container);
    }
  }
  
  /**
   * Show a toast notification
   */
  show(options) {
    const toast = this.createToast(options);
    this.container.appendChild(toast.element);
    this.toasts.push(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.element.classList.add('show');
    }, 10);
    
    // Auto dismiss
    if (options.duration !== 0) {
      const duration = options.duration || this.duration;
      toast.timeout = setTimeout(() => {
        this.dismiss(toast.id);
      }, duration);
      
      // Update progress bar
      if (toast.progressBar) {
        toast.progressBar.style.transitionDuration = `${duration}ms`;
        setTimeout(() => {
          toast.progressBar.style.width = '0%';
        }, 10);
      }
    }
    
    return toast.id;
  }
  
  /**
   * Create toast element
   */
  createToast(options) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = options.type || 'info';
    const title = options.title || '';
    const message = options.message || '';
    const showProgress = options.showProgress !== false;
    
    const element = document.createElement('div');
    element.className = `ds-toast ds-toast-${type}`;
    element.id = id;
    
    // Icon
    const icon = this.getIcon(type);
    
    // Build HTML
    element.innerHTML = `
      <div class="ds-toast-icon">
        ${icon}
      </div>
      <div class="ds-toast-content">
        ${title ? `<div class="ds-toast-title">${title}</div>` : ''}
        ${message ? `<div class="ds-toast-message">${message}</div>` : ''}
      </div>
      <button class="ds-toast-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      ${showProgress ? '<div class="ds-toast-progress"><div class="ds-toast-progress-bar" style="width: 100%"></div></div>' : ''}
    `;
    
    // Close button handler
    const closeBtn = element.querySelector('.ds-toast-close');
    closeBtn.addEventListener('click', () => {
      this.dismiss(id);
    });
    
    const progressBar = showProgress ? element.querySelector('.ds-toast-progress-bar') : null;
    
    return {
      id,
      element,
      progressBar,
      timeout: null
    };
  }
  
  /**
   * Get icon SVG for toast type
   */
  getIcon(type) {
    const icons = {
      success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`,
      error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`,
      warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,
      info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`
    };
    
    return icons[type] || icons.info;
  }
  
  /**
   * Dismiss a toast
   */
  dismiss(id) {
    const toastIndex = this.toasts.findIndex(t => t.id === id);
    
    if (toastIndex === -1) return;
    
    const toast = this.toasts[toastIndex];
    
    // Clear timeout
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }
    
    // Animate out
    toast.element.classList.remove('show');
    toast.element.classList.add('hiding');
    
    // Remove from DOM
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.splice(toastIndex, 1);
    }, 300);
  }
  
  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.forEach(toast => {
      this.dismiss(toast.id);
    });
  }
  
  /**
   * Convenience methods
   */
  success(message, title, options = {}) {
    return this.show({ ...options, type: 'success', message, title });
  }
  
  error(message, title, options = {}) {
    return this.show({ ...options, type: 'error', message, title });
  }
  
  warning(message, title, options = {}) {
    return this.show({ ...options, type: 'warning', message, title });
  }
  
  info(message, title, options = {}) {
    return this.show({ ...options, type: 'info', message, title });
  }
}

// Create global instance
const toast = new ToastManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ToastManager, toast };
}
