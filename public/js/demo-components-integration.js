/**
 * Demo Components Integration Helper
 * Provides utility functions for integrating DemoIndicator and SkeletonLoader
 * into existing pages
 */

const DemoComponentsIntegration = {
  /**
   * Fetch data with automatic skeleton loading and demo indicators
   * @param {string} url - API endpoint URL
   * @param {HTMLElement} container - Container element
   * @param {Function} renderFunction - Function to render loaded data
   * @param {Object} options - Configuration options
   */
  async fetchWithSkeleton(url, container, renderFunction, options = {}) {
    const {
      skeletonType = 'card',
      skeletonOptions = {},
      showDemoIndicator = true,
      timeout = 3000
    } = options;

    // Show skeleton loader
    container.innerHTML = '';
    let skeleton;
    
    switch (skeletonType) {
      case 'card':
        skeleton = SkeletonLoader.createCard(skeletonOptions);
        break;
      case 'table':
        skeleton = SkeletonLoader.createTable(skeletonOptions);
        break;
      case 'chart':
        skeleton = SkeletonLoader.createChart(skeletonOptions);
        break;
      case 'text':
        skeleton = SkeletonLoader.createText(skeletonOptions);
        break;
      default:
        skeleton = SkeletonLoader.createCard(skeletonOptions);
    }
    
    container.appendChild(skeleton);

    try {
      // Fetch data with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Remove skeleton
      await SkeletonLoader.hide(skeleton, 300);
      skeleton.remove();
      
      // Render data
      renderFunction(data, container);
      
      // Add demo indicator if data is demo data
      if (showDemoIndicator && (data.isDemo || data._demoIndicator)) {
        this.addDemoIndicatorToContainer(container);
      }
      
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      
      // Remove skeleton
      skeleton.remove();
      
      // Show error or fallback to demo data
      container.innerHTML = '<p style="color: #ef4444;">Failed to load data. Showing demo data instead.</p>';
      
      // You could return fallback demo data here
      return null;
    }
  },

  /**
   * Add demo indicator to a container
   * @param {HTMLElement} container - Container element
   * @param {string} variant - Indicator variant ('badge', 'icon', 'banner')
   * @param {Object} options - Configuration options
   */
  addDemoIndicatorToContainer(container, variant = 'banner', options = {}) {
    const indicator = DemoIndicator.createBanner({
      title: 'Demo Data',
      message: 'This content uses simulated data for demonstration purposes.',
      dismissible: true,
      ...options
    });
    
    if (indicator) {
      container.insertBefore(indicator, container.firstChild);
    }
  },

  /**
   * Add demo badge to card elements
   * @param {HTMLElement} card - Card element
   * @param {Object} options - Configuration options
   */
  addDemoBadgeToCard(card, options = {}) {
    const header = card.querySelector('.card-header, .card-title, h3, h2');
    if (header) {
      const badge = DemoIndicator.createBadge({
        text: 'Demo',
        ...options
      });
      header.appendChild(badge);
    }
  },

  /**
   * Add demo icon to list items
   * @param {HTMLElement} listItem - List item element
   * @param {Object} options - Configuration options
   */
  addDemoIconToListItem(listItem, options = {}) {
    const icon = DemoIndicator.createIcon(options);
    listItem.appendChild(icon);
  },

  /**
   * Show loading state with skeleton
   * @param {HTMLElement} element - Element to show loading state
   * @param {string} type - Skeleton type
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} Skeleton element
   */
  showLoading(element, type = 'card', options = {}) {
    return SkeletonLoader.replace(element, type, options);
  },

  /**
   * Hide loading state and show content
   * @param {HTMLElement} skeleton - Skeleton element
   */
  hideLoading(skeleton) {
    SkeletonLoader.remove(skeleton);
  },

  /**
   * Create a card with demo indicator
   * @param {Object} data - Card data
   * @param {boolean} isDemo - Whether data is demo data
   * @returns {HTMLElement} Card element
   */
  createDemoCard(data, isDemo = false) {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${data.title || 'Untitled'}</h3>
        ${isDemo ? '<span class="demo-badge-placeholder"></span>' : ''}
      </div>
      <div class="card-content">
        ${data.content || ''}
      </div>
    `;
    
    if (isDemo) {
      const placeholder = card.querySelector('.demo-badge-placeholder');
      if (placeholder) {
        const badge = DemoIndicator.createBadge({ text: 'Demo' });
        placeholder.replaceWith(badge);
      }
    }
    
    return card;
  },

  /**
   * Initialize demo mode for a page
   * @param {Object} options - Configuration options
   */
  initDemoMode(options = {}) {
    const {
      showBanner = true,
      autoMarkElements = true,
      bannerOptions = {}
    } = options;

    // Check if demo mode is active
    if (!DemoIndicator.isDemoMode()) {
      return;
    }

    // Show banner if requested
    if (showBanner) {
      const banner = DemoIndicator.createBanner({
        title: 'Demo Mode Active',
        message: 'You\'re viewing a demonstration with sample data. Some services are simulated.',
        dismissible: true,
        ...bannerOptions
      });
      
      if (banner) {
        document.body.insertBefore(banner, document.body.firstChild);
      }
    }

    // Auto-mark elements with data-demo attribute
    if (autoMarkElements) {
      DemoIndicator.autoInit();
    }
  },

  /**
   * Simulate API loading with skeleton and demo data
   * @param {HTMLElement} container - Container element
   * @param {Function} dataGenerator - Function that returns demo data
   * @param {Object} options - Configuration options
   */
  async simulateLoading(container, dataGenerator, options = {}) {
    const {
      skeletonType = 'card',
      skeletonOptions = {},
      loadingTime = 1500,
      showDemoIndicator = true
    } = options;

    // Show skeleton
    container.innerHTML = '';
    let skeleton;
    
    switch (skeletonType) {
      case 'card':
        skeleton = SkeletonLoader.createCard(skeletonOptions);
        break;
      case 'table':
        skeleton = SkeletonLoader.createTable(skeletonOptions);
        break;
      case 'chart':
        skeleton = SkeletonLoader.createChart(skeletonOptions);
        break;
      default:
        skeleton = SkeletonLoader.createCard(skeletonOptions);
    }
    
    container.appendChild(skeleton);

    // Wait for loading time
    await new Promise(resolve => setTimeout(resolve, loadingTime));

    // Remove skeleton
    await SkeletonLoader.hide(skeleton, 300);
    skeleton.remove();

    // Generate and render demo data
    const demoData = dataGenerator();
    container.innerHTML = demoData;

    // Add demo indicator
    if (showDemoIndicator) {
      this.addDemoIndicatorToContainer(container, 'banner', {
        title: 'Demo Data',
        message: 'This is simulated data for demonstration purposes.',
        dismissible: true
      });
    }
  }
};

// Export for use in other scripts
window.DemoComponentsIntegration = DemoComponentsIntegration;
