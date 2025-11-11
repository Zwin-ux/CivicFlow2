/**
 * Document Comparison Component
 * 
 * Features:
 * - Side-by-side document comparison
 * - Highlight differences between versions
 * - Show change history
 * - Diff visualization
 */

class DocumentComparison {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.options = {
      showDiffOnly: false,
      highlightColor: '#ffeb3b',
      syncScroll: true,
      ...options
    };

    this.state = {
      document1: null,
      document2: null,
      differences: [],
      currentDiffIndex: 0,
      viewMode: 'side-by-side', // 'side-by-side', 'overlay', 'diff-only'
      zoom: 1.0
    };

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="document-comparison">
        <!-- Toolbar -->
        <div class="document-comparison__toolbar">
          <div class="document-comparison__toolbar-group">
            <h3 class="document-comparison__title">Document Comparison</h3>
          </div>

          <div class="document-comparison__toolbar-group">
            <label class="form-label">View Mode:</label>
            <select class="form-input form-input--sm" data-action="change-view-mode">
              <option value="side-by-side" ${this.state.viewMode === 'side-by-side' ? 'selected' : ''}>Side by Side</option>
              <option value="overlay" ${this.state.viewMode === 'overlay' ? 'selected' : ''}>Overlay</option>
              <option value="diff-only" ${this.state.viewMode === 'diff-only' ? 'selected' : ''}>Differences Only</option>
            </select>
          </div>

          <div class="document-comparison__toolbar-group">
            <button class="btn btn--icon" data-action="prev-diff" title="Previous Difference" ${this.state.currentDiffIndex <= 0 ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
            <span class="document-comparison__diff-counter">
              ${this.state.differences.length > 0 ? `${this.state.currentDiffIndex + 1} / ${this.state.differences.length}` : '0 differences'}
            </span>
            <button class="btn btn--icon" data-action="next-diff" title="Next Difference" ${this.state.currentDiffIndex >= this.state.differences.length - 1 ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <div class="document-comparison__toolbar-group">
            <label class="form-checkbox">
              <input type="checkbox" ${this.options.syncScroll ? 'checked' : ''} data-action="toggle-sync-scroll">
              <span>Sync Scroll</span>
            </label>
          </div>
        </div>

        <!-- Comparison Content -->
        <div class="document-comparison__content" data-view-mode="${this.state.viewMode}">
          <div class="document-comparison__panel document-comparison__panel--left">
            <div class="document-comparison__panel-header">
              <h4>Original Document</h4>
              <span class="badge badge--secondary" id="doc1-info">Not loaded</span>
            </div>
            <div class="document-comparison__panel-content" id="doc1-content">
              <canvas id="doc1-canvas"></canvas>
              <div class="document-comparison__highlights" id="doc1-highlights"></div>
            </div>
          </div>

          <div class="document-comparison__panel document-comparison__panel--right">
            <div class="document-comparison__panel-header">
              <h4>Comparison Document</h4>
              <span class="badge badge--secondary" id="doc2-info">Not loaded</span>
            </div>
            <div class="document-comparison__panel-content" id="doc2-content">
              <canvas id="doc2-canvas"></canvas>
              <div class="document-comparison__highlights" id="doc2-highlights"></div>
            </div>
          </div>
        </div>

        <!-- Differences Sidebar -->
        <div class="document-comparison__sidebar">
          <div class="document-comparison__sidebar-header">
            <h4>Detected Changes</h4>
            <span class="badge badge--primary">${this.state.differences.length}</span>
          </div>
          <div class="document-comparison__sidebar-content" id="differences-list">
            <!-- Differences will be rendered here -->
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // View mode change
    this.container.querySelector('[data-action="change-view-mode"]')?.addEventListener('change', (e) => {
      this.changeViewMode(e.target.value);
    });

    // Difference navigation
    this.container.querySelector('[data-action="prev-diff"]')?.addEventListener('click', () => {
      this.navigateToDifference(this.state.currentDiffIndex - 1);
    });

    this.container.querySelector('[data-action="next-diff"]')?.addEventListener('click', () => {
      this.navigateToDifference(this.state.currentDiffIndex + 1);
    });

    // Sync scroll toggle
    this.container.querySelector('[data-action="toggle-sync-scroll"]')?.addEventListener('change', (e) => {
      this.options.syncScroll = e.target.checked;
      this.setupScrollSync();
    });

    // Setup scroll synchronization
    this.setupScrollSync();
  }

  setupScrollSync() {
    const panel1 = this.container.querySelector('#doc1-content');
    const panel2 = this.container.querySelector('#doc2-content');

    if (!panel1 || !panel2) return;

    // Remove existing listeners
    panel1.removeEventListener('scroll', this.syncScrollHandler1);
    panel2.removeEventListener('scroll', this.syncScrollHandler2);

    if (this.options.syncScroll) {
      let isScrolling1 = false;
      let isScrolling2 = false;

      this.syncScrollHandler1 = () => {
        if (isScrolling2) return;
        isScrolling1 = true;
        panel2.scrollTop = panel1.scrollTop;
        panel2.scrollLeft = panel1.scrollLeft;
        setTimeout(() => { isScrolling1 = false; }, 50);
      };

      this.syncScrollHandler2 = () => {
        if (isScrolling1) return;
        isScrolling2 = true;
        panel1.scrollTop = panel2.scrollTop;
        panel1.scrollLeft = panel2.scrollLeft;
        setTimeout(() => { isScrolling2 = false; }, 50);
      };

      panel1.addEventListener('scroll', this.syncScrollHandler1);
      panel2.addEventListener('scroll', this.syncScrollHandler2);
    }
  }

  async loadDocuments(doc1Id, doc2Id) {
    try {
      // Load both documents
      await Promise.all([
        this.loadDocument(doc1Id, 'doc1'),
        this.loadDocument(doc2Id, 'doc2')
      ]);

      // Detect differences
      await this.detectDifferences();

      // Update UI
      this.render();
      this.renderDifferences();
    } catch (error) {
      console.error('Error loading documents for comparison:', error);
      this.showError('Failed to load documents for comparison');
    }
  }

  async loadDocument(documentId, target) {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to load document');

      const document = await response.json();
      
      if (target === 'doc1') {
        this.state.document1 = document;
      } else {
        this.state.document2 = document;
      }

      // Update info badge
      const infoBadge = this.container.querySelector(`#${target}-info`);
      if (infoBadge) {
        infoBadge.textContent = document.fileName || document.documentType;
        infoBadge.className = 'badge badge--success';
      }

      // Load document content
      await this.renderDocumentContent(documentId, target);
    } catch (error) {
      console.error(`Error loading ${target}:`, error);
      throw error;
    }
  }

  async renderDocumentContent(documentId, target) {
    const canvas = this.container.querySelector(`#${target}-canvas`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Load image
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `/api/documents/${documentId}/content`;
  }

  async detectDifferences() {
    if (!this.state.document1 || !this.state.document2) return;

    try {
      // Call API to detect differences
      const response = await fetch('/api/documents/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document1Id: this.state.document1.id,
          document2Id: this.state.document2.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.state.differences = data.differences || [];
      } else {
        // Fallback: compare extracted data
        this.state.differences = this.compareExtractedData();
      }
    } catch (error) {
      console.error('Error detecting differences:', error);
      // Fallback to local comparison
      this.state.differences = this.compareExtractedData();
    }
  }

  compareExtractedData() {
    const differences = [];
    
    // Compare document metadata
    if (this.state.document1.fileName !== this.state.document2.fileName) {
      differences.push({
        type: 'metadata',
        field: 'fileName',
        value1: this.state.document1.fileName,
        value2: this.state.document2.fileName,
        severity: 'low'
      });
    }

    // Compare extracted entities (if available)
    const entities1 = this.state.document1.analysis?.extractedData?.entities || [];
    const entities2 = this.state.document2.analysis?.extractedData?.entities || [];

    // Find entities in doc1 not in doc2
    entities1.forEach(entity1 => {
      const match = entities2.find(e2 => 
        e2.type === entity1.type && 
        e2.value === entity1.value
      );

      if (!match) {
        differences.push({
          type: 'entity_removed',
          entityType: entity1.type,
          value: entity1.value,
          location: entity1.boundingBox,
          document: 'doc1',
          severity: 'medium'
        });
      }
    });

    // Find entities in doc2 not in doc1
    entities2.forEach(entity2 => {
      const match = entities1.find(e1 => 
        e1.type === entity2.type && 
        e1.value === entity2.value
      );

      if (!match) {
        differences.push({
          type: 'entity_added',
          entityType: entity2.type,
          value: entity2.value,
          location: entity2.boundingBox,
          document: 'doc2',
          severity: 'medium'
        });
      }
    });

    // Find modified entities
    entities1.forEach(entity1 => {
      const similar = entities2.find(e2 => 
        e2.type === entity1.type && 
        e2.boundingBox && entity1.boundingBox &&
        this.areBoundingBoxesSimilar(e2.boundingBox, entity1.boundingBox)
      );

      if (similar && similar.value !== entity1.value) {
        differences.push({
          type: 'entity_modified',
          entityType: entity1.type,
          value1: entity1.value,
          value2: similar.value,
          location1: entity1.boundingBox,
          location2: similar.boundingBox,
          severity: 'high'
        });
      }
    });

    return differences;
  }

  areBoundingBoxesSimilar(box1, box2, threshold = 50) {
    if (!box1 || !box2) return false;
    
    const dx = Math.abs(box1.x - box2.x);
    const dy = Math.abs(box1.y - box2.y);
    
    return dx < threshold && dy < threshold;
  }

  renderDifferences() {
    const list = this.container.querySelector('#differences-list');
    if (!list) return;

    list.innerHTML = '';

    if (this.state.differences.length === 0) {
      list.innerHTML = `
        <div class="document-comparison__no-differences">
          <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" style="color: var(--color-success);">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <p>No differences detected</p>
        </div>
      `;
      return;
    }

    this.state.differences.forEach((diff, index) => {
      const item = this.createDifferenceItem(diff, index);
      list.appendChild(item);
    });

    // Highlight differences on canvases
    this.highlightDifferences();
  }

  createDifferenceItem(diff, index) {
    const item = document.createElement('div');
    item.className = `difference-item difference-item--${diff.severity} ${index === this.state.currentDiffIndex ? 'difference-item--active' : ''}`;
    item.dataset.diffIndex = index;

    let content = '';
    
    switch (diff.type) {
      case 'metadata':
        content = `
          <div class="difference-item__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
            </svg>
          </div>
          <div class="difference-item__content">
            <strong>Metadata Change: ${diff.field}</strong>
            <div class="difference-item__values">
              <span class="difference-item__old">${diff.value1}</span>
              <span class="difference-item__arrow">→</span>
              <span class="difference-item__new">${diff.value2}</span>
            </div>
          </div>
        `;
        break;

      case 'entity_removed':
        content = `
          <div class="difference-item__icon" style="color: var(--color-error);">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="difference-item__content">
            <strong>Removed: ${diff.entityType}</strong>
            <p>${diff.value}</p>
          </div>
        `;
        break;

      case 'entity_added':
        content = `
          <div class="difference-item__icon" style="color: var(--color-success);">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="difference-item__content">
            <strong>Added: ${diff.entityType}</strong>
            <p>${diff.value}</p>
          </div>
        `;
        break;

      case 'entity_modified':
        content = `
          <div class="difference-item__icon" style="color: var(--color-warning);">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
            </svg>
          </div>
          <div class="difference-item__content">
            <strong>Modified: ${diff.entityType}</strong>
            <div class="difference-item__values">
              <span class="difference-item__old">${diff.value1}</span>
              <span class="difference-item__arrow">→</span>
              <span class="difference-item__new">${diff.value2}</span>
            </div>
          </div>
        `;
        break;
    }

    item.innerHTML = content;

    // Click to navigate
    item.addEventListener('click', () => {
      this.navigateToDifference(index);
    });

    return item;
  }

  highlightDifferences() {
    const highlights1 = this.container.querySelector('#doc1-highlights');
    const highlights2 = this.container.querySelector('#doc2-highlights');

    if (!highlights1 || !highlights2) return;

    // Clear existing highlights
    highlights1.innerHTML = '';
    highlights2.innerHTML = '';

    this.state.differences.forEach((diff, index) => {
      if (diff.location || diff.location1) {
        const highlight1 = this.createHighlight(diff.location || diff.location1, diff.severity, index);
        highlights1.appendChild(highlight1);
      }

      if (diff.location2) {
        const highlight2 = this.createHighlight(diff.location2, diff.severity, index);
        highlights2.appendChild(highlight2);
      }
    });
  }

  createHighlight(boundingBox, severity, index) {
    const highlight = document.createElement('div');
    highlight.className = `comparison-highlight comparison-highlight--${severity}`;
    highlight.dataset.diffIndex = index;

    if (boundingBox) {
      highlight.style.left = `${boundingBox.x}px`;
      highlight.style.top = `${boundingBox.y}px`;
      highlight.style.width = `${boundingBox.width}px`;
      highlight.style.height = `${boundingBox.height}px`;
    }

    highlight.addEventListener('click', () => {
      this.navigateToDifference(index);
    });

    return highlight;
  }

  navigateToDifference(index) {
    if (index < 0 || index >= this.state.differences.length) return;

    this.state.currentDiffIndex = index;

    // Update active state
    this.container.querySelectorAll('.difference-item').forEach((item, i) => {
      item.classList.toggle('difference-item--active', i === index);
    });

    this.container.querySelectorAll('.comparison-highlight').forEach((highlight, i) => {
      highlight.classList.toggle('comparison-highlight--active', 
        parseInt(highlight.dataset.diffIndex) === index);
    });

    // Scroll to difference
    const activeItem = this.container.querySelector('.difference-item--active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Update toolbar
    this.updateToolbar();
  }

  changeViewMode(mode) {
    this.state.viewMode = mode;
    const content = this.container.querySelector('.document-comparison__content');
    if (content) {
      content.setAttribute('data-view-mode', mode);
    }
  }

  updateToolbar() {
    const prevBtn = this.container.querySelector('[data-action="prev-diff"]');
    const nextBtn = this.container.querySelector('[data-action="next-diff"]');
    const counter = this.container.querySelector('.document-comparison__diff-counter');

    if (prevBtn) {
      prevBtn.disabled = this.state.currentDiffIndex <= 0;
    }

    if (nextBtn) {
      nextBtn.disabled = this.state.currentDiffIndex >= this.state.differences.length - 1;
    }

    if (counter) {
      counter.textContent = this.state.differences.length > 0 
        ? `${this.state.currentDiffIndex + 1} / ${this.state.differences.length}`
        : '0 differences';
    }
  }

  showError(message) {
    if (window.Toast) {
      window.Toast.show(message, 'error');
    } else {
      alert(message);
    }
  }

  destroy() {
    const panel1 = this.container.querySelector('#doc1-content');
    const panel2 = this.container.querySelector('#doc2-content');

    if (panel1) panel1.removeEventListener('scroll', this.syncScrollHandler1);
    if (panel2) panel2.removeEventListener('scroll', this.syncScrollHandler2);

    this.container.innerHTML = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentComparison;
}
