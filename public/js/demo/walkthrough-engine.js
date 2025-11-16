/**
 * Walkthrough Engine
 * Manages interactive guided tours with step navigation, element highlighting, and tooltips
 */

class WalkthroughEngine {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.currentWalkthrough = null;
    this.currentStepIndex = 0;
    this.isActive = false;
    this.isPaused = false;
    
    // DOM elements
    this.overlay = null;
    this.highlight = null;
    this.tooltip = null;
    
    // Configuration
    this.config = {
      highlightPadding: 8,
      tooltipOffset: 20,
      animationDuration: 300,
      scrollBehavior: 'smooth',
      scrollOffset: 100
    };
    
    // Keyboard shortcuts
    this.keyHandlers = {
      'ArrowRight': () => this.next(),
      'ArrowLeft': () => this.previous(),
      'Escape': () => this.skip(),
      'Enter': () => this.next()
    };
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the walkthrough engine
   */
  initialize() {
    // Create overlay and UI elements
    this.createOverlay();
    this.createHighlight();
    this.createTooltip();
    
    // Set up keyboard listeners
    this.setupKeyboardListeners();
    
    console.log('[Walkthrough Engine] Initialized');
  }

  /**
   * Create overlay element
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'walkthrough-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 9998;
      display: none;
      opacity: 0;
      transition: opacity ${this.config.animationDuration}ms ease;
    `;
    
    // Click overlay to skip
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.skip();
      }
    });
    
    document.body.appendChild(this.overlay);
  }

  /**
   * Create highlight element
   */
  createHighlight() {
    this.highlight = document.createElement('div');
    this.highlight.className = 'walkthrough-highlight';
    this.highlight.style.cssText = `
      position: absolute;
      border: 3px solid #8b5cf6;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
      z-index: 9999;
      display: none;
      pointer-events: none;
      opacity: 0;
      transform: scale(1);
      transition: all ${this.config.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1),
                  opacity ${this.config.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1),
                  transform ${this.config.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `;
    
    document.body.appendChild(this.highlight);
  }

  /**
   * Create tooltip element
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'walkthrough-tooltip';
    this.tooltip.setAttribute('role', 'dialog');
    this.tooltip.setAttribute('aria-modal', 'true');
    this.tooltip.setAttribute('aria-labelledby', 'walkthrough-title');
    this.tooltip.setAttribute('aria-describedby', 'walkthrough-description');
    this.tooltip.style.cssText = `
      position: absolute;
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      z-index: 10000;
      display: none;
      opacity: 0;
      transform: scale(1);
      transition: opacity ${this.config.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1),
                  transform ${this.config.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1),
                  left ${this.config.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1),
                  top ${this.config.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `;
    
    this.tooltip.innerHTML = `
      <div class="walkthrough-tooltip-header">
        <h3 id="walkthrough-title" class="walkthrough-tooltip-title"></h3>
        <button class="walkthrough-tooltip-close" aria-label="Close walkthrough (Escape)">×</button>
      </div>
      <div class="walkthrough-tooltip-content">
        <p id="walkthrough-description" class="walkthrough-tooltip-description"></p>
      </div>
      <div class="walkthrough-tooltip-footer">
        <div class="walkthrough-tooltip-progress" aria-live="polite" aria-atomic="true"></div>
        <div class="walkthrough-tooltip-actions">
          <button class="walkthrough-tooltip-skip" aria-label="Skip tour (Escape)">Skip Tour</button>
          <div class="walkthrough-tooltip-nav">
            <button class="walkthrough-tooltip-prev" disabled aria-label="Previous step (Left Arrow)">Back</button>
            <button class="walkthrough-tooltip-next" aria-label="Next step (Right Arrow or Enter)">Next</button>
          </div>
        </div>
      </div>
    `;
    
    // Set up button handlers
    this.tooltip.querySelector('.walkthrough-tooltip-close').addEventListener('click', () => this.skip());
    this.tooltip.querySelector('.walkthrough-tooltip-skip').addEventListener('click', () => this.skip());
    this.tooltip.querySelector('.walkthrough-tooltip-prev').addEventListener('click', () => this.previous());
    this.tooltip.querySelector('.walkthrough-tooltip-next').addEventListener('click', () => this.next());
    
    document.body.appendChild(this.tooltip);
  }

  /**
   * Set up keyboard listeners
   */
  setupKeyboardListeners() {
    this.keyboardHandler = (e) => {
      if (!this.isActive || this.isPaused) return;
      
      const handler = this.keyHandlers[e.key];
      if (handler) {
        e.preventDefault();
        e.stopPropagation();
        handler();
      }
    };
    
    // Handle Tab key for focus trapping within tooltip
    this.tabHandler = (e) => {
      if (!this.isActive || this.isPaused) return;
      if (e.key !== 'Tab') return;
      
      // Get all focusable elements within tooltip
      const focusableElements = this.tooltip.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Trap focus within tooltip
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
    document.addEventListener('keydown', this.tabHandler);
  }

  /**
   * Load walkthrough definition
   * @param {string|Object} walkthroughIdOrData - Walkthrough ID or data object
   * @returns {Promise<Object>} Walkthrough data
   */
  async loadWalkthrough(walkthroughIdOrData) {
    try {
      let walkthrough;
      
      if (typeof walkthroughIdOrData === 'string') {
        // Load from file
        const response = await fetch(`/data/walkthroughs/${walkthroughIdOrData}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load walkthrough: ${walkthroughIdOrData}`);
        }
        walkthrough = await response.json();
      } else {
        // Use provided data
        walkthrough = walkthroughIdOrData;
      }
      
      // Validate walkthrough
      if (!this.validateWalkthrough(walkthrough)) {
        throw new Error('Invalid walkthrough data');
      }
      
      this.currentWalkthrough = walkthrough;
      this.currentStepIndex = 0;
      
      console.log('[Walkthrough Engine] Loaded walkthrough:', walkthrough.id);
      return walkthrough;
      
    } catch (error) {
      console.error('[Walkthrough Engine] Failed to load walkthrough:', error);
      throw error;
    }
  }

  /**
   * Validate walkthrough data
   * @param {Object} walkthrough - Walkthrough data
   * @returns {boolean} Valid or not
   */
  validateWalkthrough(walkthrough) {
    if (!walkthrough || typeof walkthrough !== 'object') return false;
    if (!walkthrough.id || !walkthrough.title) return false;
    if (!Array.isArray(walkthrough.steps) || walkthrough.steps.length === 0) return false;
    
    // Validate each step
    for (const step of walkthrough.steps) {
      if (!step.id || !step.title || !step.targetElement) return false;
    }
    
    return true;
  }

  /**
   * Start walkthrough
   */
  async start() {
    if (!this.currentWalkthrough) {
      console.error('[Walkthrough Engine] No walkthrough loaded');
      return;
    }
    
    if (this.isActive) {
      console.warn('[Walkthrough Engine] Walkthrough already active');
      return;
    }
    
    this.isActive = true;
    this.currentStepIndex = -1; // Mark as initial state for smooth first step
    
    // Show overlay with fade in
    this.overlay.style.display = 'block';
    // Trigger reflow
    this.overlay.offsetHeight;
    this.overlay.style.opacity = '1';
    
    // Wait for overlay to fade in
    await new Promise(resolve => setTimeout(resolve, this.config.animationDuration));
    
    // Show first step
    await this.showStep(0);
    
    console.log('[Walkthrough Engine] Started walkthrough:', this.currentWalkthrough.id);
  }

  /**
   * Show a specific step
   * @param {number} index - Step index
   */
  async showStep(index) {
    if (!this.currentWalkthrough || index < 0 || index >= this.currentWalkthrough.steps.length) {
      return;
    }
    
    const step = this.currentWalkthrough.steps[index];
    const isFirstStep = this.currentStepIndex === -1 || this.currentStepIndex === index;
    this.currentStepIndex = index;
    
    // If not first step, fade out current elements for smooth transition
    if (!isFirstStep) {
      await this.fadeOutElements();
    }
    
    // Execute step action if provided
    if (step.action && typeof step.action === 'function') {
      try {
        await step.action();
      } catch (error) {
        console.error('[Walkthrough Engine] Step action failed:', error);
      }
    }
    
    // Wait for element if needed
    const element = await this.waitForElement(step.targetElement, step.waitForElement !== false);
    
    if (!element) {
      console.warn('[Walkthrough Engine] Target element not found:', step.targetElement);
      // Show tooltip without highlight
      this.updateTooltip(step);
      this.positionTooltip(null, step.position || 'center');
      await this.fadeInElements(false);
      return;
    }
    
    // Scroll element into view
    await this.scrollToElement(element);
    
    // Highlight element (position it but keep it hidden)
    this.highlightElement(element, step.highlightStyle, true);
    
    // Show tooltip (update content but keep it hidden)
    this.updateTooltip(step);
    this.positionTooltip(element, step.position || 'auto');
    
    // Update navigation buttons
    this.updateNavigation();
    
    // Fade in elements with staggered animation
    await this.fadeInElements(true);
    
    // Set focus to the next button for keyboard navigation
    this.setFocusToTooltip();
    
    console.log('[Walkthrough Engine] Showing step:', index + 1, '/', this.currentWalkthrough.steps.length);
  }

  /**
   * Fade out highlight and tooltip for smooth transition
   * @returns {Promise<void>}
   */
  async fadeOutElements() {
    return new Promise((resolve) => {
      // Fade out tooltip first
      this.tooltip.style.opacity = '0';
      this.tooltip.style.transform = 'scale(0.95)';
      
      // Then fade out highlight with slight delay
      setTimeout(() => {
        this.highlight.style.opacity = '0';
        this.highlight.style.transform = 'scale(0.98)';
      }, 50);
      
      // Wait for animations to complete
      setTimeout(resolve, this.config.animationDuration);
    });
  }

  /**
   * Fade in highlight and tooltip with staggered animation
   * @param {boolean} hasHighlight - Whether highlight should be shown
   * @returns {Promise<void>}
   */
  async fadeInElements(hasHighlight) {
    return new Promise((resolve) => {
      // Show highlight first if present
      if (hasHighlight) {
        this.highlight.style.display = 'block';
        this.highlight.style.opacity = '0';
        this.highlight.style.transform = 'scale(0.98)';
        
        // Trigger reflow
        this.highlight.offsetHeight;
        
        // Fade in highlight
        this.highlight.style.opacity = '1';
        this.highlight.style.transform = 'scale(1)';
      }
      
      // Then show tooltip with slight delay
      setTimeout(() => {
        this.tooltip.style.display = 'block';
        this.tooltip.style.opacity = '0';
        this.tooltip.style.transform = 'scale(0.95)';
        
        // Trigger reflow
        this.tooltip.offsetHeight;
        
        // Fade in tooltip
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'scale(1)';
      }, hasHighlight ? 100 : 0);
      
      // Wait for animations to complete
      setTimeout(resolve, this.config.animationDuration + 100);
    });
  }

  /**
   * Wait for element to appear in DOM
   * @param {string} selector - CSS selector
   * @param {boolean} shouldWait - Whether to wait or return immediately
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element|null>} Element or null
   */
  async waitForElement(selector, shouldWait = true, timeout = 5000) {
    const element = document.querySelector(selector);
    
    if (element || !shouldWait) {
      return element;
    }
    
    // Wait for element to appear
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        } else if (Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(null);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also check periodically
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          observer.disconnect();
          resolve(el);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          observer.disconnect();
          resolve(null);
        }
      }, 100);
    });
  }

  /**
   * Scroll element into view
   * @param {Element} element - Target element
   * @returns {Promise<void>}
   */
  async scrollToElement(element) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const isInView = (
      rect.top >= 0 &&
      rect.bottom <= window.innerHeight
    );
    
    if (!isInView) {
      const elementTop = element.offsetTop;
      const offset = this.config.scrollOffset;
      
      window.scrollTo({
        top: elementTop - offset,
        behavior: this.config.scrollBehavior
      });
      
      // Wait for smooth scroll to complete
      return new Promise((resolve) => {
        setTimeout(resolve, 400);
      });
    }
  }

  /**
   * Highlight element
   * @param {Element} element - Element to highlight
   * @param {Object} style - Highlight style options
   * @param {boolean} keepHidden - Keep element hidden for transition
   */
  highlightElement(element, style = {}, keepHidden = false) {
    if (!element) {
      this.highlight.style.display = 'none';
      return;
    }
    
    const rect = element.getBoundingClientRect();
    const padding = this.config.highlightPadding;
    
    // Position highlight
    if (!keepHidden) {
      this.highlight.style.display = 'block';
    }
    this.highlight.style.left = `${rect.left - padding + window.scrollX}px`;
    this.highlight.style.top = `${rect.top - padding + window.scrollY}px`;
    this.highlight.style.width = `${rect.width + padding * 2}px`;
    this.highlight.style.height = `${rect.height + padding * 2}px`;
    
    // Apply custom style
    if (style.borderColor) {
      this.highlight.style.borderColor = style.borderColor;
    } else {
      this.highlight.style.borderColor = '#8b5cf6';
    }
    if (style.borderWidth) {
      this.highlight.style.borderWidth = `${style.borderWidth}px`;
    } else {
      this.highlight.style.borderWidth = '3px';
    }
    if (style.borderRadius) {
      this.highlight.style.borderRadius = `${style.borderRadius}px`;
    } else {
      this.highlight.style.borderRadius = '8px';
    }
    
    // Apply animation
    const animation = style.animation || 'pulse';
    this.highlight.classList.remove('pulse-animation', 'glow-animation');
    if (animation === 'pulse') {
      this.highlight.classList.add('pulse-animation');
    } else if (animation === 'glow') {
      this.highlight.classList.add('glow-animation');
    }
  }

  /**
   * Update tooltip content
   * @param {Object} step - Step data
   */
  updateTooltip(step) {
    const title = this.tooltip.querySelector('.walkthrough-tooltip-title');
    const description = this.tooltip.querySelector('.walkthrough-tooltip-description');
    const progress = this.tooltip.querySelector('.walkthrough-tooltip-progress');
    
    title.textContent = step.title;
    description.textContent = step.description;
    
    // Update progress
    const current = this.currentStepIndex + 1;
    const total = this.currentWalkthrough.steps.length;
    progress.textContent = `Step ${current} of ${total}`;
    
    // Show tooltip
    this.tooltip.style.display = 'block';
    setTimeout(() => {
      this.tooltip.style.opacity = '1';
    }, 10);
  }

  /**
   * Position tooltip relative to element
   * @param {Element} element - Target element
   * @param {string} position - Preferred position (top, bottom, left, right, auto, center)
   */
  positionTooltip(element, position = 'auto') {
    if (!element) {
      // Center tooltip on screen
      this.tooltip.style.left = '50%';
      this.tooltip.style.top = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      this.tooltip.setAttribute('data-position', 'center');
      return;
    }
    
    const rect = element.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const offset = this.config.tooltipOffset;
    const padding = 20;
    const arrowSize = 12; // Size of the arrow indicator
    
    let finalPosition = position;
    
    // Auto-detect best position with priority order
    if (position === 'auto') {
      finalPosition = this.calculateBestPosition(rect, tooltipRect, offset, padding);
    }
    
    // Calculate position with collision detection
    const positionData = this.calculateTooltipPosition(
      rect, 
      tooltipRect, 
      finalPosition, 
      offset, 
      padding,
      arrowSize
    );
    
    // Apply position
    this.tooltip.style.left = `${positionData.left + window.scrollX}px`;
    this.tooltip.style.top = `${positionData.top + window.scrollY}px`;
    this.tooltip.style.transform = positionData.transform || 'none';
    this.tooltip.setAttribute('data-position', positionData.position);
    
    // Update arrow position if needed
    this.updateTooltipArrow(positionData.position, positionData.arrowOffset);
  }

  /**
   * Calculate the best position for tooltip based on available space
   * @param {DOMRect} elementRect - Target element rectangle
   * @param {DOMRect} tooltipRect - Tooltip rectangle
   * @param {number} offset - Offset from element
   * @param {number} padding - Viewport padding
   * @returns {string} Best position
   */
  calculateBestPosition(elementRect, tooltipRect, offset, padding) {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Calculate available space in each direction
    const spaces = {
      top: elementRect.top - padding,
      bottom: viewport.height - elementRect.bottom - padding,
      left: elementRect.left - padding,
      right: viewport.width - elementRect.right - padding
    };
    
    // Calculate required space for each position
    const required = {
      top: tooltipRect.height + offset,
      bottom: tooltipRect.height + offset,
      left: tooltipRect.width + offset,
      right: tooltipRect.width + offset
    };
    
    // Priority order: bottom, top, right, left
    const priorities = ['bottom', 'top', 'right', 'left'];
    
    // Find first position with enough space
    for (const pos of priorities) {
      if (spaces[pos] >= required[pos]) {
        // Also check if tooltip fits horizontally/vertically
        if (pos === 'top' || pos === 'bottom') {
          const horizontalSpace = viewport.width - 2 * padding;
          if (tooltipRect.width <= horizontalSpace) {
            return pos;
          }
        } else {
          const verticalSpace = viewport.height - 2 * padding;
          if (tooltipRect.height <= verticalSpace) {
            return pos;
          }
        }
      }
    }
    
    // If no position has enough space, use the one with most space
    const maxSpace = Math.max(...Object.values(spaces));
    for (const [pos, space] of Object.entries(spaces)) {
      if (space === maxSpace) {
        return pos;
      }
    }
    
    return 'bottom'; // Fallback
  }

  /**
   * Calculate tooltip position coordinates with collision detection
   * @param {DOMRect} elementRect - Target element rectangle
   * @param {DOMRect} tooltipRect - Tooltip rectangle
   * @param {string} position - Desired position
   * @param {number} offset - Offset from element
   * @param {number} padding - Viewport padding
   * @param {number} arrowSize - Arrow indicator size
   * @returns {Object} Position data
   */
  calculateTooltipPosition(elementRect, tooltipRect, position, offset, padding, arrowSize) {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let left, top, transform = null, arrowOffset = 0;
    
    // Calculate base position
    switch (position) {
      case 'top':
        left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
        top = elementRect.top - tooltipRect.height - offset;
        break;
        
      case 'bottom':
        left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
        top = elementRect.bottom + offset;
        break;
        
      case 'left':
        left = elementRect.left - tooltipRect.width - offset;
        top = elementRect.top + elementRect.height / 2 - tooltipRect.height / 2;
        break;
        
      case 'right':
        left = elementRect.right + offset;
        top = elementRect.top + elementRect.height / 2 - tooltipRect.height / 2;
        break;
        
      default:
        left = elementRect.left + elementRect.width / 2 - tooltipRect.width / 2;
        top = elementRect.bottom + offset;
        position = 'bottom';
    }
    
    // Store original position for arrow calculation
    const originalLeft = left;
    const originalTop = top;
    
    // Apply viewport constraints with smart adjustment
    if (position === 'top' || position === 'bottom') {
      // Horizontal constraint
      const minLeft = padding;
      const maxLeft = viewport.width - tooltipRect.width - padding;
      
      if (left < minLeft) {
        arrowOffset = left - minLeft; // Negative offset
        left = minLeft;
      } else if (left > maxLeft) {
        arrowOffset = left - maxLeft; // Positive offset
        left = maxLeft;
      }
      
      // Vertical constraint
      if (top < padding) {
        top = padding;
      } else if (top + tooltipRect.height > viewport.height - padding) {
        top = viewport.height - tooltipRect.height - padding;
      }
    } else {
      // Vertical constraint
      const minTop = padding;
      const maxTop = viewport.height - tooltipRect.height - padding;
      
      if (top < minTop) {
        arrowOffset = top - minTop; // Negative offset
        top = minTop;
      } else if (top > maxTop) {
        arrowOffset = top - maxTop; // Positive offset
        top = maxTop;
      }
      
      // Horizontal constraint
      if (left < padding) {
        left = padding;
      } else if (left + tooltipRect.width > viewport.width - padding) {
        left = viewport.width - tooltipRect.width - padding;
      }
    }
    
    return {
      left,
      top,
      transform,
      position,
      arrowOffset
    };
  }

  /**
   * Update tooltip arrow indicator
   * @param {string} position - Tooltip position
   * @param {number} offset - Arrow offset from center
   */
  updateTooltipArrow(position, offset = 0) {
    // Remove existing arrow
    const existingArrow = this.tooltip.querySelector('.walkthrough-tooltip-arrow');
    if (existingArrow) {
      existingArrow.remove();
    }
    
    // Don't show arrow for center position
    if (position === 'center') {
      return;
    }
    
    // Create arrow element
    const arrow = document.createElement('div');
    arrow.className = 'walkthrough-tooltip-arrow';
    arrow.setAttribute('data-position', position);
    
    // Position arrow based on tooltip position
    const arrowSize = 12;
    const arrowStyles = {
      position: 'absolute',
      width: '0',
      height: '0',
      borderStyle: 'solid'
    };
    
    switch (position) {
      case 'top':
        arrowStyles.bottom = `-${arrowSize}px`;
        arrowStyles.left = `calc(50% - ${arrowSize}px + ${offset}px)`;
        arrowStyles.borderWidth = `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`;
        arrowStyles.borderColor = 'white transparent transparent transparent';
        break;
        
      case 'bottom':
        arrowStyles.top = `-${arrowSize}px`;
        arrowStyles.left = `calc(50% - ${arrowSize}px + ${offset}px)`;
        arrowStyles.borderWidth = `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`;
        arrowStyles.borderColor = 'transparent transparent white transparent';
        break;
        
      case 'left':
        arrowStyles.right = `-${arrowSize}px`;
        arrowStyles.top = `calc(50% - ${arrowSize}px + ${offset}px)`;
        arrowStyles.borderWidth = `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`;
        arrowStyles.borderColor = 'transparent transparent transparent white';
        break;
        
      case 'right':
        arrowStyles.left = `-${arrowSize}px`;
        arrowStyles.top = `calc(50% - ${arrowSize}px + ${offset}px)`;
        arrowStyles.borderWidth = `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`;
        arrowStyles.borderColor = 'transparent white transparent transparent';
        break;
    }
    
    // Apply styles
    Object.assign(arrow.style, arrowStyles);
    
    // Add arrow to tooltip
    this.tooltip.appendChild(arrow);
  }

  /**
   * Update navigation button states
   */
  updateNavigation() {
    const prevBtn = this.tooltip.querySelector('.walkthrough-tooltip-prev');
    const nextBtn = this.tooltip.querySelector('.walkthrough-tooltip-next');
    
    // Update prev button
    prevBtn.disabled = this.currentStepIndex === 0;
    
    // Update next button text
    const isLastStep = this.currentStepIndex === this.currentWalkthrough.steps.length - 1;
    nextBtn.textContent = isLastStep ? 'Finish' : 'Next';
  }

  /**
   * Navigate to next step
   */
  async next() {
    if (!this.isActive || !this.currentWalkthrough) return;
    
    const isLastStep = this.currentStepIndex === this.currentWalkthrough.steps.length - 1;
    
    if (isLastStep) {
      this.complete();
    } else {
      await this.showStep(this.currentStepIndex + 1);
    }
  }

  /**
   * Navigate to previous step
   */
  async previous() {
    if (!this.isActive || !this.currentWalkthrough) return;
    
    if (this.currentStepIndex > 0) {
      await this.showStep(this.currentStepIndex - 1);
    }
  }

  /**
   * Skip walkthrough
   */
  skip() {
    if (!this.isActive) return;
    
    this.stop();
    
    // Notify orchestrator
    if (this.orchestrator) {
      this.orchestrator.stopWalkthrough();
    }
    
    console.log('[Walkthrough Engine] Walkthrough skipped');
  }

  /**
   * Complete walkthrough
   */
  complete() {
    if (!this.isActive) return;
    
    const walkthroughId = this.currentWalkthrough?.id;
    
    this.stop();
    
    // Notify orchestrator
    if (this.orchestrator && walkthroughId) {
      this.orchestrator.completeWalkthrough(walkthroughId);
    }
    
    console.log('[Walkthrough Engine] Walkthrough completed:', walkthroughId);
  }

  /**
   * Stop walkthrough
   */
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Hide UI elements
    this.overlay.style.opacity = '0';
    this.tooltip.style.opacity = '0';
    this.highlight.style.display = 'none';
    
    setTimeout(() => {
      this.overlay.style.display = 'none';
      this.tooltip.style.display = 'none';
    }, this.config.animationDuration);
    
    console.log('[Walkthrough Engine] Stopped');
  }

  /**
   * Pause walkthrough
   */
  pause() {
    this.isPaused = true;
    console.log('[Walkthrough Engine] Paused');
  }

  /**
   * Resume walkthrough
   */
  resume() {
    this.isPaused = false;
    console.log('[Walkthrough Engine] Resumed');
  }

  /**
   * Get current step
   * @returns {Object|null} Current step data
   */
  getCurrentStep() {
    if (!this.currentWalkthrough || this.currentStepIndex < 0) {
      return null;
    }
    return this.currentWalkthrough.steps[this.currentStepIndex];
  }

  /**
   * Get walkthrough progress
   * @returns {Object} Progress data
   */
  getProgress() {
    if (!this.currentWalkthrough) {
      return { current: 0, total: 0, percentage: 0 };
    }
    
    const current = this.currentStepIndex + 1;
    const total = this.currentWalkthrough.steps.length;
    const percentage = Math.round((current / total) * 100);
    
    return { current, total, percentage };
  }

  /**
   * Check if walkthrough is active
   * @returns {boolean} Active status
   */
  isWalkthroughActive() {
    return this.isActive;
  }

  /**
   * Set focus to tooltip for keyboard navigation
   */
  setFocusToTooltip() {
    // Focus on the next/finish button for immediate keyboard interaction
    const nextBtn = this.tooltip.querySelector('.walkthrough-tooltip-next');
    if (nextBtn && !nextBtn.disabled) {
      // Use setTimeout to ensure the element is fully rendered and focusable
      setTimeout(() => {
        nextBtn.focus();
      }, 100);
    }
  }

  /**
   * Cleanup and remove event listeners
   */
  cleanup() {
    // Remove keyboard listeners
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
    if (this.tabHandler) {
      document.removeEventListener('keydown', this.tabHandler);
    }
    
    // Remove DOM elements
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.highlight && this.highlight.parentNode) {
      this.highlight.parentNode.removeChild(this.highlight);
    }
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    
    console.log('[Walkthrough Engine] Cleanup completed');
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.WalkthroughEngine = WalkthroughEngine;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WalkthroughEngine;
}
