/**
 * Skeleton Loader Component
 * Displays loading placeholders with shimmer animation
 * Supports card, table, chart, and text layouts
 */

class SkeletonLoader {
  /**
   * Create a card skeleton layout
   * @param {Object} options - Configuration options
   * @param {number} options.count - Number of skeleton cards (default: 1)
   * @param {string} options.height - Card height (default: 'auto')
   * @param {boolean} options.showImage - Show image placeholder (default: false)
   * @param {boolean} options.showActions - Show action buttons placeholder (default: true)
   * @param {string} options.className - Additional CSS classes
   * @returns {HTMLElement} Skeleton card container
   */
  static createCard(options = {}) {
    const {
      count = 1,
      height = 'auto',
      showImage = false,
      showActions = true,
      className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton-loader-container ${className}`;
    container.setAttribute('aria-busy', 'true');
    container.setAttribute('aria-label', 'Loading content');

    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton-loader-card';
      if (height !== 'auto') {
        card.style.height = height;
      }

      card.innerHTML = `
        ${showImage ? '<div class="skeleton-loader-image"></div>' : ''}
        <div class="skeleton-loader-card-content">
          <div class="skeleton-loader-title"></div>
          <div class="skeleton-loader-text"></div>
          <div class="skeleton-loader-text skeleton-loader-text-short"></div>
          ${showActions ? `
            <div class="skeleton-loader-actions">
              <div class="skeleton-loader-button"></div>
              <div class="skeleton-loader-button"></div>
            </div>
          ` : ''}
        </div>
      `;

      container.appendChild(card);
    }

    return container;
  }

  /**
   * Create a table skeleton layout
   * @param {Object} options - Configuration options
   * @param {number} options.rows - Number of table rows (default: 5)
   * @param {number} options.columns - Number of columns (default: 4)
   * @param {boolean} options.showHeader - Show header row (default: true)
   * @param {string} options.className - Additional CSS classes
   * @returns {HTMLElement} Skeleton table
   */
  static createTable(options = {}) {
    const {
      rows = 5,
      columns = 4,
      showHeader = true,
      className = ''
    } = options;

    const table = document.createElement('div');
    table.className = `skeleton-loader-table ${className}`;
    table.setAttribute('aria-busy', 'true');
    table.setAttribute('aria-label', 'Loading table data');

    if (showHeader) {
      const header = document.createElement('div');
      header.className = 'skeleton-loader-table-header';
      for (let i = 0; i < columns; i++) {
        const headerCell = document.createElement('div');
        headerCell.className = 'skeleton-loader-table-cell skeleton-loader-header-cell';
        header.appendChild(headerCell);
      }
      table.appendChild(header);
    }

    const tbody = document.createElement('div');
    tbody.className = 'skeleton-loader-table-body';

    for (let i = 0; i < rows; i++) {
      const row = document.createElement('div');
      row.className = 'skeleton-loader-table-row';
      
      for (let j = 0; j < columns; j++) {
        const cell = document.createElement('div');
        cell.className = 'skeleton-loader-table-cell';
        
        // Vary cell widths for more realistic look
        const widthClass = j === 0 ? 'skeleton-loader-cell-wide' : 
                          j === columns - 1 ? 'skeleton-loader-cell-narrow' : '';
        if (widthClass) cell.classList.add(widthClass);
        
        row.appendChild(cell);
      }
      
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    return table;
  }

  /**
   * Create a chart skeleton layout
   * @param {Object} options - Configuration options
   * @param {string} options.type - Chart type: 'bar', 'line', 'pie', 'donut' (default: 'bar')
   * @param {string} options.height - Chart height (default: '300px')
   * @param {boolean} options.showLegend - Show legend placeholder (default: true)
   * @param {boolean} options.showTitle - Show title placeholder (default: true)
   * @param {string} options.className - Additional CSS classes
   * @returns {HTMLElement} Skeleton chart
   */
  static createChart(options = {}) {
    const {
      type = 'bar',
      height = '300px',
      showLegend = true,
      showTitle = true,
      className = ''
    } = options;

    const chart = document.createElement('div');
    chart.className = `skeleton-loader-chart skeleton-loader-chart-${type} ${className}`;
    chart.style.height = height;
    chart.setAttribute('aria-busy', 'true');
    chart.setAttribute('aria-label', 'Loading chart');

    let chartContent = '';

    if (showTitle) {
      chartContent += '<div class="skeleton-loader-chart-title"></div>';
    }

    if (type === 'bar') {
      chartContent += `
        <div class="skeleton-loader-chart-content">
          <div class="skeleton-loader-bars">
            <div class="skeleton-loader-bar" style="height: 60%"></div>
            <div class="skeleton-loader-bar" style="height: 80%"></div>
            <div class="skeleton-loader-bar" style="height: 45%"></div>
            <div class="skeleton-loader-bar" style="height: 90%"></div>
            <div class="skeleton-loader-bar" style="height: 70%"></div>
          </div>
          <div class="skeleton-loader-chart-axis"></div>
        </div>
      `;
    } else if (type === 'line') {
      chartContent += `
        <div class="skeleton-loader-chart-content">
          <div class="skeleton-loader-line-chart">
            <svg viewBox="0 0 300 200" class="skeleton-loader-line-svg">
              <polyline points="0,150 60,120 120,80 180,100 240,60 300,90" 
                        class="skeleton-loader-line-path" />
            </svg>
          </div>
          <div class="skeleton-loader-chart-axis"></div>
        </div>
      `;
    } else if (type === 'pie' || type === 'donut') {
      chartContent += `
        <div class="skeleton-loader-chart-content skeleton-loader-chart-centered">
          <div class="skeleton-loader-${type}"></div>
        </div>
      `;
    }

    if (showLegend) {
      chartContent += `
        <div class="skeleton-loader-chart-legend">
          <div class="skeleton-loader-legend-item"></div>
          <div class="skeleton-loader-legend-item"></div>
          <div class="skeleton-loader-legend-item"></div>
        </div>
      `;
    }

    chart.innerHTML = chartContent;
    return chart;
  }

  /**
   * Create a text skeleton layout
   * @param {Object} options - Configuration options
   * @param {number} options.lines - Number of text lines (default: 3)
   * @param {string} options.width - Width of text block (default: '100%')
   * @param {string} options.className - Additional CSS classes
   * @returns {HTMLElement} Skeleton text
   */
  static createText(options = {}) {
    const {
      lines = 3,
      width = '100%',
      className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton-loader-text-block ${className}`;
    container.style.width = width;
    container.setAttribute('aria-busy', 'true');
    container.setAttribute('aria-label', 'Loading text');

    for (let i = 0; i < lines; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton-loader-text-line';
      
      // Make last line shorter for more realistic look
      if (i === lines - 1) {
        line.classList.add('skeleton-loader-text-line-short');
      }
      
      container.appendChild(line);
    }

    return container;
  }

  /**
   * Create a custom skeleton layout
   * @param {string} html - Custom HTML structure with skeleton classes
   * @param {string} className - Additional CSS classes
   * @returns {HTMLElement} Custom skeleton
   */
  static createCustom(html, className = '') {
    const container = document.createElement('div');
    container.className = `skeleton-loader-custom ${className}`;
    container.setAttribute('aria-busy', 'true');
    container.setAttribute('aria-label', 'Loading content');
    container.innerHTML = html;
    return container;
  }

  /**
   * Replace an element with a skeleton loader
   * @param {HTMLElement} element - Element to replace
   * @param {string} type - Skeleton type: 'card', 'table', 'chart', 'text'
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} Skeleton element
   */
  static replace(element, type = 'card', options = {}) {
    let skeleton;

    switch (type) {
      case 'card':
        skeleton = SkeletonLoader.createCard(options);
        break;
      case 'table':
        skeleton = SkeletonLoader.createTable(options);
        break;
      case 'chart':
        skeleton = SkeletonLoader.createChart(options);
        break;
      case 'text':
        skeleton = SkeletonLoader.createText(options);
        break;
      default:
        console.warn(`Unknown skeleton type: ${type}`);
        return null;
    }

    element.style.display = 'none';
    element.parentNode.insertBefore(skeleton, element);
    
    // Store reference for easy removal
    skeleton._replacedElement = element;
    
    return skeleton;
  }

  /**
   * Remove skeleton and show original element
   * @param {HTMLElement} skeleton - Skeleton element to remove
   */
  static remove(skeleton) {
    if (skeleton._replacedElement) {
      skeleton._replacedElement.style.display = '';
    }
    skeleton.remove();
  }

  /**
   * Show skeleton with smooth transition
   * @param {HTMLElement} skeleton - Skeleton element
   * @param {number} duration - Transition duration in ms (default: 300)
   */
  static show(skeleton, duration = 300) {
    skeleton.style.opacity = '0';
    skeleton.style.display = 'block';
    
    setTimeout(() => {
      skeleton.style.transition = `opacity ${duration}ms ease`;
      skeleton.style.opacity = '1';
    }, 10);
  }

  /**
   * Hide skeleton with smooth transition
   * @param {HTMLElement} skeleton - Skeleton element
   * @param {number} duration - Transition duration in ms (default: 300)
   * @returns {Promise} Resolves when transition completes
   */
  static hide(skeleton, duration = 300) {
    return new Promise(resolve => {
      skeleton.style.transition = `opacity ${duration}ms ease`;
      skeleton.style.opacity = '0';
      
      setTimeout(() => {
        skeleton.style.display = 'none';
        resolve();
      }, duration);
    });
  }

  /**
   * Automatically add skeleton loaders to elements with data-skeleton attribute
   * @param {HTMLElement} container - Container to search within (default: document.body)
   */
  static autoInit(container = document.body) {
    const elements = container.querySelectorAll('[data-skeleton]');
    
    elements.forEach(element => {
      const type = element.getAttribute('data-skeleton') || 'card';
      const count = parseInt(element.getAttribute('data-skeleton-count')) || 1;
      const height = element.getAttribute('data-skeleton-height');
      
      const options = { count };
      if (height) options.height = height;

      const skeleton = SkeletonLoader[`create${type.charAt(0).toUpperCase() + type.slice(1)}`](options);
      element.appendChild(skeleton);
    });
  }
}

// Export for use in other scripts
window.SkeletonLoader = SkeletonLoader;
