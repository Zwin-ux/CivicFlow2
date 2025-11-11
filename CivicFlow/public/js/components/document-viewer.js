/**
 * Enhanced Document Viewer Component
 * 
 * Features:
 * - PDF rendering with zoom and pan
 * - Image viewer with quality controls
 * - Multi-page navigation
 * - Full-screen mode
 * - AI annotation overlay system
 * - Annotation interaction features
 * - Document comparison view
 */

class DocumentViewer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.options = {
      enableAnnotations: true,
      enableComparison: false,
      enableFullscreen: true,
      initialZoom: 1.0,
      minZoom: 0.5,
      maxZoom: 3.0,
      zoomStep: 0.25,
      ...options
    };

    this.state = {
      currentDocument: null,
      currentPage: 1,
      totalPages: 1,
      zoom: this.options.initialZoom,
      rotation: 0,
      isFullscreen: false,
      isPanning: false,
      panStart: { x: 0, y: 0 },
      panOffset: { x: 0, y: 0 },
      annotations: [],
      selectedAnnotation: null,
      comparisonDocument: null
    };

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="document-viewer" data-fullscreen="${this.state.isFullscreen}">
        <!-- Toolbar -->
        <div class="document-viewer__toolbar">
          <div class="document-viewer__toolbar-group">
            <button class="btn btn--icon" data-action="zoom-out" title="Zoom Out">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
                <path d="M5 7h6v2H5V7z"/>
              </svg>
            </button>
            <span class="document-viewer__zoom-level">${Math.round(this.state.zoom * 100)}%</span>
            <button class="btn btn--icon" data-action="zoom-in" title="Zoom In">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
                <path d="M9 5v2H7v2h2v2h2V9h2V7h-2V5H9z"/>
              </svg>
            </button>
            <button class="btn btn--icon" data-action="fit-width" title="Fit Width">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
            </button>
            <button class="btn btn--icon" data-action="rotate" title="Rotate">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
              </svg>
            </button>
          </div>

          <div class="document-viewer__toolbar-group">
            <button class="btn btn--icon" data-action="prev-page" title="Previous Page" ${this.state.currentPage <= 1 ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
            <span class="document-viewer__page-info">
              <input type="number" class="document-viewer__page-input" value="${this.state.currentPage}" min="1" max="${this.state.totalPages}">
              <span>/ ${this.state.totalPages}</span>
            </span>
            <button class="btn btn--icon" data-action="next-page" title="Next Page" ${this.state.currentPage >= this.state.totalPages ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <div class="document-viewer__toolbar-group">
            ${this.options.enableAnnotations ? `
              <button class="btn btn--secondary" data-action="toggle-annotations" title="Toggle Annotations">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
                Annotations
              </button>
            ` : ''}
            ${this.options.enableFullscreen ? `
              <button class="btn btn--icon" data-action="fullscreen" title="Fullscreen">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Main Viewer Area -->
        <div class="document-viewer__content">
          <div class="document-viewer__canvas-container">
            <canvas class="document-viewer__canvas" id="document-canvas"></canvas>
            ${this.options.enableAnnotations ? '<div class="document-viewer__annotations" id="annotations-layer"></div>' : ''}
          </div>
          
          ${this.options.enableComparison ? `
            <div class="document-viewer__comparison">
              <canvas class="document-viewer__canvas" id="comparison-canvas"></canvas>
            </div>
          ` : ''}
        </div>

        <!-- Annotation Sidebar -->
        ${this.options.enableAnnotations ? `
          <div class="document-viewer__sidebar" id="annotation-sidebar">
            <div class="document-viewer__sidebar-header">
              <h3>Annotations</h3>
              <button class="btn btn--icon btn--sm" data-action="close-sidebar">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
            <div class="document-viewer__sidebar-content" id="annotation-list">
              <!-- Annotations will be rendered here -->
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  attachEventListeners() {
    // Zoom controls
    this.container.querySelector('[data-action="zoom-in"]')?.addEventListener('click', () => this.zoomIn());
    this.container.querySelector('[data-action="zoom-out"]')?.addEventListener('click', () => this.zoomOut());
    this.container.querySelector('[data-action="fit-width"]')?.addEventListener('click', () => this.fitToWidth());
    this.container.querySelector('[data-action="rotate"]')?.addEventListener('click', () => this.rotate());

    // Page navigation
    this.container.querySelector('[data-action="prev-page"]')?.addEventListener('click', () => this.previousPage());
    this.container.querySelector('[data-action="next-page"]')?.addEventListener('click', () => this.nextPage());
    
    const pageInput = this.container.querySelector('.document-viewer__page-input');
    pageInput?.addEventListener('change', (e) => this.goToPage(parseInt(e.target.value)));

    // Fullscreen
    this.container.querySelector('[data-action="fullscreen"]')?.addEventListener('click', () => this.toggleFullscreen());

    // Annotations
    this.container.querySelector('[data-action="toggle-annotations"]')?.addEventListener('click', () => this.toggleAnnotations());
    this.container.querySelector('[data-action="close-sidebar"]')?.addEventListener('click', () => this.closeSidebar());

    // Pan functionality
    const canvas = this.container.querySelector('.document-viewer__canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', (e) => this.startPan(e));
      canvas.addEventListener('mousemove', (e) => this.pan(e));
      canvas.addEventListener('mouseup', () => this.endPan());
      canvas.addEventListener('mouseleave', () => this.endPan());
      
      // Mouse wheel zoom
      canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  async loadDocument(documentId, documentType = 'pdf') {
    try {
      this.state.currentDocument = { id: documentId, type: documentType };
      
      if (documentType === 'pdf') {
        await this.loadPDF(documentId);
      } else if (documentType === 'image') {
        await this.loadImage(documentId);
      }

      // Load annotations if enabled
      if (this.options.enableAnnotations) {
        await this.loadAnnotations(documentId);
      }

      this.render();
    } catch (error) {
      console.error('Error loading document:', error);
      this.showError('Failed to load document');
    }
  }

  async loadPDF(documentId) {
    // This would integrate with PDF.js library
    // For now, we'll create a placeholder implementation
    console.log('Loading PDF:', documentId);
    
    // Simulate PDF loading
    this.state.totalPages = 5; // Example
    this.state.currentPage = 1;
    
    // In a real implementation, you would use PDF.js:
    // const pdf = await pdfjsLib.getDocument(`/api/documents/${documentId}/content`).promise;
    // this.state.totalPages = pdf.numPages;
    // await this.renderPDFPage(pdf, this.state.currentPage);
  }

  async loadImage(documentId) {
    console.log('Loading image:', documentId);
    
    const canvas = this.container.querySelector('.document-viewer__canvas');
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      this.applyTransform();
    };
    img.src = `/api/documents/${documentId}/content`;
    
    this.state.totalPages = 1;
    this.state.currentPage = 1;
  }

  // Zoom methods
  zoomIn() {
    if (this.state.zoom < this.options.maxZoom) {
      this.state.zoom = Math.min(this.state.zoom + this.options.zoomStep, this.options.maxZoom);
      this.applyTransform();
      this.updateZoomDisplay();
    }
  }

  zoomOut() {
    if (this.state.zoom > this.options.minZoom) {
      this.state.zoom = Math.max(this.state.zoom - this.options.zoomStep, this.options.minZoom);
      this.applyTransform();
      this.updateZoomDisplay();
    }
  }

  fitToWidth() {
    const canvas = this.container.querySelector('.document-viewer__canvas');
    const container = this.container.querySelector('.document-viewer__canvas-container');
    
    if (canvas && container) {
      const containerWidth = container.clientWidth - 40; // padding
      const canvasWidth = canvas.width;
      this.state.zoom = containerWidth / canvasWidth;
      this.applyTransform();
      this.updateZoomDisplay();
    }
  }

  rotate() {
    this.state.rotation = (this.state.rotation + 90) % 360;
    this.applyTransform();
  }

  applyTransform() {
    const canvas = this.container.querySelector('.document-viewer__canvas');
    if (canvas) {
      canvas.style.transform = `
        scale(${this.state.zoom}) 
        rotate(${this.state.rotation}deg) 
        translate(${this.state.panOffset.x}px, ${this.state.panOffset.y}px)
      `;
    }
  }

  updateZoomDisplay() {
    const zoomDisplay = this.container.querySelector('.document-viewer__zoom-level');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(this.state.zoom * 100)}%`;
    }
  }

  // Page navigation methods
  nextPage() {
    if (this.state.currentPage < this.state.totalPages) {
      this.goToPage(this.state.currentPage + 1);
    }
  }

  previousPage() {
    if (this.state.currentPage > 1) {
      this.goToPage(this.state.currentPage - 1);
    }
  }

  async goToPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= this.state.totalPages) {
      this.state.currentPage = pageNumber;
      
      if (this.state.currentDocument?.type === 'pdf') {
        // Render the new page
        // await this.renderPDFPage(this.pdfDocument, pageNumber);
      }
      
      this.render();
    }
  }

  // Pan methods
  startPan(e) {
    if (e.button === 0 && this.state.zoom > 1) { // Left mouse button and zoomed in
      this.state.isPanning = true;
      this.state.panStart = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }

  pan(e) {
    if (this.state.isPanning) {
      const dx = e.clientX - this.state.panStart.x;
      const dy = e.clientY - this.state.panStart.y;
      
      this.state.panOffset.x += dx;
      this.state.panOffset.y += dy;
      this.state.panStart = { x: e.clientX, y: e.clientY };
      
      this.applyTransform();
    }
  }

  endPan() {
    this.state.isPanning = false;
  }

  handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      if (e.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
  }

  // Fullscreen methods
  toggleFullscreen() {
    const viewer = this.container.querySelector('.document-viewer');
    
    if (!this.state.isFullscreen) {
      if (viewer.requestFullscreen) {
        viewer.requestFullscreen();
      } else if (viewer.webkitRequestFullscreen) {
        viewer.webkitRequestFullscreen();
      } else if (viewer.msRequestFullscreen) {
        viewer.msRequestFullscreen();
      }
      this.state.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      this.state.isFullscreen = false;
    }
    
    viewer.setAttribute('data-fullscreen', this.state.isFullscreen);
  }

  // Annotation methods
  async loadAnnotations(documentId) {
    try {
      const response = await fetch(`/api/documents/${documentId}/analysis`);
      if (response.ok) {
        const data = await response.json();
        this.state.annotations = this.parseAnnotations(data);
        this.renderAnnotations();
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  }

  parseAnnotations(analysisData) {
    const annotations = [];
    
    // Parse extracted entities
    if (analysisData.extractedData?.entities) {
      analysisData.extractedData.entities.forEach(entity => {
        annotations.push({
          id: `entity-${entity.type}-${annotations.length}`,
          type: 'entity',
          entityType: entity.type,
          value: entity.value,
          confidence: entity.confidence,
          boundingBox: entity.boundingBox,
          severity: 'info',
          editable: true,
          accepted: null
        });
      });
    }
    
    // Parse anomalies
    if (analysisData.anomalies) {
      analysisData.anomalies.forEach(anomaly => {
        annotations.push({
          id: `anomaly-${annotations.length}`,
          type: 'anomaly',
          anomalyType: anomaly.type,
          description: anomaly.description,
          confidence: anomaly.confidence,
          boundingBox: anomaly.location,
          severity: anomaly.severity.toLowerCase(),
          editable: false,
          accepted: null
        });
      });
    }
    
    return annotations;
  }

  renderAnnotations() {
    const annotationsLayer = this.container.querySelector('#annotations-layer');
    const annotationList = this.container.querySelector('#annotation-list');
    
    if (!annotationsLayer || !annotationList) return;
    
    // Clear existing annotations
    annotationsLayer.innerHTML = '';
    annotationList.innerHTML = '';
    
    // Render each annotation
    this.state.annotations.forEach(annotation => {
      // Render bounding box on canvas
      if (annotation.boundingBox) {
        this.renderAnnotationBox(annotationsLayer, annotation);
      }
      
      // Add to sidebar list
      this.renderAnnotationListItem(annotationList, annotation);
    });
  }

  renderAnnotationBox(container, annotation) {
    const box = document.createElement('div');
    box.className = `annotation-box annotation-box--${annotation.severity}`;
    box.dataset.annotationId = annotation.id;
    
    if (annotation.boundingBox) {
      const { x, y, width, height } = annotation.boundingBox;
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
    }
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'annotation-tooltip';
    tooltip.innerHTML = `
      <div class="annotation-tooltip__header">
        <span class="badge badge--${annotation.severity}">${annotation.type}</span>
        <span class="annotation-tooltip__confidence">${Math.round(annotation.confidence * 100)}%</span>
      </div>
      <div class="annotation-tooltip__content">
        ${annotation.value || annotation.description}
      </div>
    `;
    box.appendChild(tooltip);
    
    // Add click handler
    box.addEventListener('click', () => this.selectAnnotation(annotation.id));
    
    container.appendChild(box);
  }

  renderAnnotationListItem(container, annotation) {
    const item = document.createElement('div');
    item.className = `annotation-item ${annotation.accepted === true ? 'annotation-item--accepted' : ''} ${annotation.accepted === false ? 'annotation-item--rejected' : ''}`;
    item.dataset.annotationId = annotation.id;
    
    item.innerHTML = `
      <div class="annotation-item__header">
        <span class="badge badge--${annotation.severity}">${annotation.type}</span>
        <span class="annotation-item__confidence">${Math.round(annotation.confidence * 100)}%</span>
      </div>
      <div class="annotation-item__content">
        <strong>${annotation.entityType || annotation.anomalyType}</strong>
        <p>${annotation.value || annotation.description}</p>
      </div>
      ${annotation.editable ? `
        <div class="annotation-item__actions">
          <button class="btn btn--sm btn--success" data-action="accept" data-annotation-id="${annotation.id}">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            Accept
          </button>
          <button class="btn btn--sm btn--error" data-action="reject" data-annotation-id="${annotation.id}">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
            Reject
          </button>
          <button class="btn btn--sm btn--secondary" data-action="edit" data-annotation-id="${annotation.id}">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
            </svg>
            Edit
          </button>
        </div>
      ` : ''}
      <div class="annotation-item__comments">
        <textarea class="form-input" placeholder="Add a comment..." data-annotation-id="${annotation.id}"></textarea>
        <button class="btn btn--sm btn--primary" data-action="add-comment" data-annotation-id="${annotation.id}">Add Comment</button>
      </div>
    `;
    
    // Attach event listeners
    item.querySelector('[data-action="accept"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.acceptAnnotation(annotation.id);
    });
    
    item.querySelector('[data-action="reject"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rejectAnnotation(annotation.id);
    });
    
    item.querySelector('[data-action="edit"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editAnnotation(annotation.id);
    });
    
    item.querySelector('[data-action="add-comment"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const textarea = item.querySelector('textarea');
      this.addAnnotationComment(annotation.id, textarea.value);
      textarea.value = '';
    });
    
    container.appendChild(item);
  }

  selectAnnotation(annotationId) {
    this.state.selectedAnnotation = annotationId;
    
    // Highlight selected annotation
    this.container.querySelectorAll('.annotation-box').forEach(box => {
      box.classList.toggle('annotation-box--selected', box.dataset.annotationId === annotationId);
    });
    
    this.container.querySelectorAll('.annotation-item').forEach(item => {
      item.classList.toggle('annotation-item--selected', item.dataset.annotationId === annotationId);
    });
    
    // Scroll to annotation in sidebar
    const selectedItem = this.container.querySelector(`.annotation-item[data-annotation-id="${annotationId}"]`);
    if (selectedItem) {
      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async acceptAnnotation(annotationId) {
    const annotation = this.state.annotations.find(a => a.id === annotationId);
    if (annotation) {
      annotation.accepted = true;
      
      // Update UI
      const item = this.container.querySelector(`.annotation-item[data-annotation-id="${annotationId}"]`);
      if (item) {
        item.classList.add('annotation-item--accepted');
        item.classList.remove('annotation-item--rejected');
      }
      
      // Log to audit trail
      await this.logAnnotationChange(annotationId, 'accepted', annotation.value);
      
      // Show toast notification
      if (window.Toast) {
        window.Toast.show('Annotation accepted', 'success');
      }
    }
  }

  async rejectAnnotation(annotationId) {
    const annotation = this.state.annotations.find(a => a.id === annotationId);
    if (annotation) {
      annotation.accepted = false;
      
      // Update UI
      const item = this.container.querySelector(`.annotation-item[data-annotation-id="${annotationId}"]`);
      if (item) {
        item.classList.add('annotation-item--rejected');
        item.classList.remove('annotation-item--accepted');
      }
      
      // Log to audit trail
      await this.logAnnotationChange(annotationId, 'rejected', annotation.value);
      
      // Show toast notification
      if (window.Toast) {
        window.Toast.show('Annotation rejected', 'info');
      }
    }
  }

  async editAnnotation(annotationId) {
    const annotation = this.state.annotations.find(a => a.id === annotationId);
    if (!annotation) return;
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal modal--active';
    modal.innerHTML = `
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <div class="modal__header">
          <h3>Edit Annotation</h3>
          <button class="btn btn--icon" data-action="close-modal">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
        <div class="modal__body">
          <div class="form-group">
            <label class="form-label">Value</label>
            <input type="text" class="form-input" id="edit-annotation-value" value="${annotation.value || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-input" id="edit-annotation-type">
              <option value="PERSON" ${annotation.entityType === 'PERSON' ? 'selected' : ''}>Person</option>
              <option value="ORGANIZATION" ${annotation.entityType === 'ORGANIZATION' ? 'selected' : ''}>Organization</option>
              <option value="LOCATION" ${annotation.entityType === 'LOCATION' ? 'selected' : ''}>Location</option>
              <option value="DATE" ${annotation.entityType === 'DATE' ? 'selected' : ''}>Date</option>
              <option value="MONEY" ${annotation.entityType === 'MONEY' ? 'selected' : ''}>Money</option>
            </select>
          </div>
        </div>
        <div class="modal__footer">
          <button class="btn btn--secondary" data-action="cancel-edit">Cancel</button>
          <button class="btn btn--primary" data-action="save-edit">Save Changes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('[data-action="close-modal"]').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-action="cancel-edit"]').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal__backdrop').addEventListener('click', () => modal.remove());
    
    modal.querySelector('[data-action="save-edit"]').addEventListener('click', async () => {
      const newValue = modal.querySelector('#edit-annotation-value').value;
      const newType = modal.querySelector('#edit-annotation-type').value;
      
      annotation.value = newValue;
      annotation.entityType = newType;
      
      // Update UI
      this.renderAnnotations();
      
      // Log to audit trail
      await this.logAnnotationChange(annotationId, 'edited', newValue);
      
      modal.remove();
      
      if (window.Toast) {
        window.Toast.show('Annotation updated', 'success');
      }
    });
  }

  async addAnnotationComment(annotationId, comment) {
    if (!comment.trim()) return;
    
    const annotation = this.state.annotations.find(a => a.id === annotationId);
    if (annotation) {
      if (!annotation.comments) {
        annotation.comments = [];
      }
      
      annotation.comments.push({
        text: comment,
        timestamp: new Date().toISOString(),
        user: 'Current User' // Would come from auth context
      });
      
      // Log to audit trail
      await this.logAnnotationChange(annotationId, 'commented', comment);
      
      if (window.Toast) {
        window.Toast.show('Comment added', 'success');
      }
    }
  }

  async logAnnotationChange(annotationId, action, value) {
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `annotation_${action}`,
          entityType: 'annotation',
          entityId: annotationId,
          changes: { value, action },
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error logging annotation change:', error);
    }
  }

  toggleAnnotations() {
    const annotationsLayer = this.container.querySelector('#annotations-layer');
    const sidebar = this.container.querySelector('#annotation-sidebar');
    
    if (annotationsLayer) {
      const isVisible = annotationsLayer.style.display !== 'none';
      annotationsLayer.style.display = isVisible ? 'none' : 'block';
      
      if (sidebar) {
        sidebar.classList.toggle('document-viewer__sidebar--visible');
      }
    }
  }

  closeSidebar() {
    const sidebar = this.container.querySelector('#annotation-sidebar');
    if (sidebar) {
      sidebar.classList.remove('document-viewer__sidebar--visible');
    }
  }

  // Document comparison methods
  async loadComparisonDocument(documentId) {
    this.state.comparisonDocument = { id: documentId };
    
    // Load the comparison document
    const canvas = this.container.querySelector('#comparison-canvas');
    if (canvas) {
      // Similar to loadDocument but render to comparison canvas
      console.log('Loading comparison document:', documentId);
    }
    
    this.highlightDifferences();
  }

  highlightDifferences() {
    // Compare the two documents and highlight differences
    // This would use image diff algorithms or text comparison
    console.log('Highlighting differences between documents');
  }

  // Keyboard shortcuts
  handleKeyboard(e) {
    if (!this.container.contains(document.activeElement)) return;
    
    switch(e.key) {
      case 'ArrowLeft':
        if (!e.target.matches('input, textarea')) {
          this.previousPage();
          e.preventDefault();
        }
        break;
      case 'ArrowRight':
        if (!e.target.matches('input, textarea')) {
          this.nextPage();
          e.preventDefault();
        }
        break;
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          this.zoomIn();
          e.preventDefault();
        }
        break;
      case '-':
        if (e.ctrlKey || e.metaKey) {
          this.zoomOut();
          e.preventDefault();
        }
        break;
      case '0':
        if (e.ctrlKey || e.metaKey) {
          this.state.zoom = 1.0;
          this.applyTransform();
          this.updateZoomDisplay();
          e.preventDefault();
        }
        break;
      case 'f':
        if (e.ctrlKey || e.metaKey) {
          this.toggleFullscreen();
          e.preventDefault();
        }
        break;
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
    // Clean up event listeners
    document.removeEventListener('keydown', this.handleKeyboard);
    this.container.innerHTML = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentViewer;
}
