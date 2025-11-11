/**
 * Modal/Dialog Component
 * JavaScript component for modal dialogs
 */

class Modal {
  constructor(options = {}) {
    this.id = options.id || `modal-${Date.now()}`;
    this.title = options.title || '';
    this.content = options.content || '';
    this.size = options.size || 'md'; // sm, md, lg, xl, full
    this.closeOnOverlay = options.closeOnOverlay !== false;
    this.closeOnEscape = options.closeOnEscape !== false;
    this.showClose = options.showClose !== false;
    this.footer = options.footer || null;
    this.onOpen = options.onOpen || null;
    this.onClose = options.onClose || null;
    
    this.overlay = null;
    this.modal = null;
    this.isOpen = false;
    
    this.create();
  }
  
  /**
   * Create modal elements
   */
  create() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'ds-modal-overlay';
    this.overlay.id = `${this.id}-overlay`;
    
    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = `ds-modal ds-modal-${this.size}`;
    this.modal.id = this.id;
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    
    // Build modal HTML
    this.modal.innerHTML = `
      <div class="ds-modal-header">
        <h2 class="ds-modal-title">${this.title}</h2>
        ${this.showClose ? `
          <button class="ds-modal-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ` : ''}
      </div>
      <div class="ds-modal-body">
        ${this.content}
      </div>
      ${this.footer ? `<div class="ds-modal-footer">${this.footer}</div>` : ''}
    `;
    
    this.overlay.appendChild(this.modal);
    
    // Attach event listeners
    this.attachEventListeners();
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    if (this.showClose) {
      const closeBtn = this.modal.querySelector('.ds-modal-close');
      closeBtn.addEventListener('click', () => this.close());
    }
    
    // Overlay click
    if (this.closeOnOverlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }
    
    // Escape key
    if (this.closeOnEscape) {
      this.escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.escapeHandler);
    }
  }
  
  /**
   * Open modal
   */
  open() {
    if (this.isOpen) return;
    
    // Add to DOM
    document.body.appendChild(this.overlay);
    
    // Prevent body scroll
    document.body.classList.add('ds-modal-open');
    
    // Trigger animation
    setTimeout(() => {
      this.overlay.classList.add('show');
      this.isOpen = true;
      
      // Focus first focusable element
      const focusable = this.modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) {
        focusable.focus();
      }
      
      // Callback
      if (this.onOpen) {
        this.onOpen(this);
      }
      
      // Emit event
      window.dispatchEvent(new CustomEvent('modal:open', {
        detail: { id: this.id }
      }));
    }, 10);
  }
  
  /**
   * Close modal
   */
  close() {
    if (!this.isOpen) return;
    
    // Animate out
    this.overlay.classList.remove('show');
    
    setTimeout(() => {
      // Remove from DOM
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      
      // Allow body scroll
      document.body.classList.remove('ds-modal-open');
      
      this.isOpen = false;
      
      // Callback
      if (this.onClose) {
        this.onClose(this);
      }
      
      // Emit event
      window.dispatchEvent(new CustomEvent('modal:close', {
        detail: { id: this.id }
      }));
    }, 300);
  }
  
  /**
   * Update modal content
   */
  setContent(content) {
    const body = this.modal.querySelector('.ds-modal-body');
    if (body) {
      body.innerHTML = content;
    }
  }
  
  /**
   * Update modal title
   */
  setTitle(title) {
    const titleEl = this.modal.querySelector('.ds-modal-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }
  
  /**
   * Destroy modal
   */
  destroy() {
    if (this.isOpen) {
      this.close();
    }
    
    // Remove escape listener
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    
    // Remove from DOM
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

// Modal manager for handling multiple modals
class ModalManager {
  constructor() {
    this.modals = new Map();
  }
  
  /**
   * Create and register a modal
   */
  create(options) {
    const modal = new Modal(options);
    this.modals.set(modal.id, modal);
    return modal;
  }
  
  /**
   * Get modal by ID
   */
  get(id) {
    return this.modals.get(id);
  }
  
  /**
   * Open modal by ID
   */
  open(id) {
    const modal = this.modals.get(id);
    if (modal) {
      modal.open();
    }
  }
  
  /**
   * Close modal by ID
   */
  close(id) {
    const modal = this.modals.get(id);
    if (modal) {
      modal.close();
    }
  }
  
  /**
   * Close all modals
   */
  closeAll() {
    this.modals.forEach(modal => modal.close());
  }
  
  /**
   * Destroy modal by ID
   */
  destroy(id) {
    const modal = this.modals.get(id);
    if (modal) {
      modal.destroy();
      this.modals.delete(id);
    }
  }
}

// Create global instance
const modalManager = new ModalManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Modal, ModalManager, modalManager };
}
