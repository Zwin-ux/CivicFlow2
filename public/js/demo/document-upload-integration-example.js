/**
 * Document Upload Event Generator Integration Example
 * Shows how to integrate document_uploaded events with the Live Simulator
 */

// Example 1: Basic usage with Live Simulator
function integrateDocumentUploadWithSimulator() {
  const simulator = new LiveSimulator();
  const eventGenerators = new EventGenerators();
  
  // Configure simulator to include document uploads
  simulator.start({
    interval: 30000, // 30 seconds
    eventTypes: [
      'new_application',
      'status_change',
      'document_uploaded'  // Add document uploads
    ],
    intensity: 'medium'
  });
  
  // Listen for document upload events
  simulator.on('event', (event) => {
    if (event.type === 'document_uploaded') {
      console.log('Document uploaded:', event.data);
      
      // Show notification
      showDocumentUploadNotification(event.data);
      
      // Update dashboard
      updateDocumentCount(event.data.applicationId);
    }
  });
}

// Example 2: Generate document upload for specific application
function uploadDocumentForApplication(applicationId, businessName) {
  const eventGenerators = new EventGenerators();
  
  // Create mock application
  const application = {
    applicationId: applicationId,
    businessName: businessName,
    status: 'UNDER_REVIEW',
    loanAmount: 150000,
    location: 'Springfield, IL'
  };
  
  // Generate document upload
  const documentEvent = eventGenerators.generateDocumentUploaded(application);
  
  console.log('Generated document upload:', documentEvent);
  
  return documentEvent;
}

// Example 3: Show document upload notification
function showDocumentUploadNotification(documentData) {
  const notification = {
    title: 'Document Uploaded',
    message: `${documentData.businessName} uploaded ${documentData.documentType}`,
    icon: '📄',
    color: '#06b6d4',
    timestamp: documentData.uploadedAt,
    metadata: {
      documentId: documentData.documentId,
      applicationId: documentData.applicationId,
      fileSize: documentData.fileSizeFormatted,
      pageCount: documentData.pageCount,
      status: documentData.documentStatus
    }
  };
  
  // Show toast notification (assuming toast notification component exists)
  if (window.ToastNotification) {
    window.ToastNotification.show(notification);
  }
  
  console.log('Notification:', notification);
}

// Example 4: Update document count on dashboard
function updateDocumentCount(applicationId) {
  // Find application card
  const appCard = document.querySelector(`[data-application-id="${applicationId}"]`);
  
  if (appCard) {
    const docCountElement = appCard.querySelector('.document-count');
    if (docCountElement) {
      const currentCount = parseInt(docCountElement.textContent) || 0;
      docCountElement.textContent = currentCount + 1;
      
      // Add animation
      docCountElement.classList.add('count-updated');
      setTimeout(() => {
        docCountElement.classList.remove('count-updated');
      }, 1000);
    }
  }
}

// Example 5: Display document in application detail view
function displayDocumentInDetailView(documentData) {
  const documentList = document.getElementById('documentsList');
  
  if (!documentList) return;
  
  const documentCard = document.createElement('div');
  documentCard.className = 'document-card';
  documentCard.innerHTML = `
    <div class="document-header">
      <div class="document-icon">📄</div>
      <div class="document-info">
        <div class="document-type">${documentData.documentType}</div>
        <div class="document-meta">
          ${documentData.fileSizeFormatted} • ${documentData.pageCount} pages
        </div>
      </div>
      <div class="document-status status-${documentData.documentStatus}">
        ${documentData.documentStatus.replace('_', ' ').toUpperCase()}
      </div>
    </div>
    
    <div class="document-details">
      <div class="detail-row">
        <span class="label">Uploaded by:</span>
        <span class="value">${documentData.uploadedBy}</span>
      </div>
      <div class="detail-row">
        <span class="label">Uploaded at:</span>
        <span class="value">${formatDateTime(documentData.uploadedAt)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Quality Score:</span>
        <span class="value">${documentData.qualityScore}/100</span>
      </div>
    </div>
    
    ${documentData.aiAnalysis ? `
    <div class="ai-analysis">
      <div class="ai-header">🤖 AI Analysis</div>
      <div class="ai-confidence">
        Confidence: ${documentData.aiAnalysis.confidence}%
      </div>
      <div class="ai-quality">
        <div>Readability: ${documentData.aiAnalysis.qualityAssessment.readability}/100</div>
        <div>Completeness: ${documentData.aiAnalysis.qualityAssessment.completeness}/100</div>
        <div>Authenticity: ${documentData.aiAnalysis.qualityAssessment.authenticity}/100</div>
      </div>
    </div>
    ` : ''}
    
    ${documentData.hasIssues ? `
    <div class="document-issues">
      <div class="issues-header">⚠️ Issues Detected</div>
      <ul>
        ${documentData.issues.map(issue => `<li>${issue}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    <div class="document-actions">
      <button class="btn-view" onclick="viewDocument('${documentData.documentId}')">
        View Document
      </button>
      <button class="btn-download" onclick="downloadDocument('${documentData.documentId}')">
        Download
      </button>
    </div>
  `;
  
  // Add with animation
  documentCard.style.opacity = '0';
  documentCard.style.transform = 'translateY(-10px)';
  documentList.insertBefore(documentCard, documentList.firstChild);
  
  setTimeout(() => {
    documentCard.style.transition = 'all 0.3s ease-out';
    documentCard.style.opacity = '1';
    documentCard.style.transform = 'translateY(0)';
  }, 10);
}

// Example 6: Filter documents by type
function filterDocumentsByType(documents, type) {
  return documents.filter(doc => doc.documentType === type);
}

// Example 7: Get documents requiring attention
function getDocumentsNeedingAttention(documents) {
  return documents.filter(doc => doc.documentStatus === 'needs_attention');
}

// Example 8: Calculate document completion percentage
function calculateDocumentCompletion(documents, requiredDocuments) {
  const uploadedRequired = documents.filter(doc => 
    requiredDocuments.includes(doc.documentType)
  );
  
  return Math.round((uploadedRequired.length / requiredDocuments.length) * 100);
}

// Example 9: Generate document upload activity feed item
function createDocumentActivityFeedItem(documentData) {
  return {
    id: `activity-${documentData.documentId}`,
    type: 'document_uploaded',
    icon: '📄',
    title: 'Document Uploaded',
    description: `${documentData.uploadedBy} uploaded ${documentData.documentType}`,
    timestamp: documentData.uploadedAt,
    applicationId: documentData.applicationId,
    businessName: documentData.businessName,
    metadata: {
      documentId: documentData.documentId,
      documentType: documentData.documentType,
      fileSize: documentData.fileSizeFormatted,
      status: documentData.documentStatus
    }
  };
}

// Example 10: Batch generate documents for application
function generateDocumentsForApplication(applicationId, businessName, count = 5) {
  const eventGenerators = new EventGenerators();
  const documents = [];
  
  const application = {
    applicationId: applicationId,
    businessName: businessName,
    status: 'UNDER_REVIEW',
    loanAmount: 150000,
    location: 'Springfield, IL'
  };
  
  for (let i = 0; i < count; i++) {
    const doc = eventGenerators.generateDocumentUploaded(application);
    documents.push(doc);
  }
  
  console.log(`Generated ${count} documents for ${businessName}`);
  return documents;
}

// Helper function to format date/time
function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.DocumentUploadIntegration = {
    integrateWithSimulator: integrateDocumentUploadWithSimulator,
    uploadForApplication: uploadDocumentForApplication,
    showNotification: showDocumentUploadNotification,
    updateCount: updateDocumentCount,
    displayInDetailView: displayDocumentInDetailView,
    filterByType: filterDocumentsByType,
    getNeedingAttention: getDocumentsNeedingAttention,
    calculateCompletion: calculateDocumentCompletion,
    createActivityItem: createDocumentActivityFeedItem,
    generateBatch: generateDocumentsForApplication
  };
}

console.log('[Document Upload Integration] Examples loaded');
