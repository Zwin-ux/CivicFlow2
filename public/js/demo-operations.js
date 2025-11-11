/**
 * Demo Operations Client Library
 * Provides easy-to-use functions for simulating operations in demo mode
 */

class DemoOperations {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.baseUrl = '/api/v1/demo/operations';
  }

  /**
   * Get headers for demo requests
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Demo-Session': this.sessionId,
    };
  }

  /**
   * Show processing indicator with realistic timing
   */
  async showProcessing(processingTime, message = 'Processing...') {
    const indicator = document.createElement('div');
    indicator.className = 'demo-processing-indicator';
    indicator.innerHTML = `
      <div class="spinner"></div>
      <p>${message}</p>
      <div class="progress-bar">
        <div class="progress-fill" style="animation-duration: ${processingTime}ms"></div>
      </div>
    `;
    document.body.appendChild(indicator);

    await new Promise(resolve => setTimeout(resolve, processingTime));
    indicator.remove();
  }

  /**
   * Simulate document upload
   */
  async uploadDocument(applicationId, file) {
    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          applicationId,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });

      if (!response.ok) {
        throw new Error('Upload simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Uploading document...');

      return result.document;
    } catch (error) {
      console.error('Error simulating document upload:', error);
      throw error;
    }
  }

  /**
   * Simulate AI analysis
   */
  async analyzeDocument(documentId, documentType) {
    try {
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          documentId,
          documentType,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Analyzing document with AI...');

      return result.analysis;
    } catch (error) {
      console.error('Error simulating AI analysis:', error);
      throw error;
    }
  }

  /**
   * Simulate approval/rejection decision
   */
  async submitDecision(applicationId, decision, justification, approvedAmount = null) {
    try {
      const response = await fetch(`${this.baseUrl}/decision`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          applicationId,
          decision,
          justification,
          approvedAmount,
        }),
      });

      if (!response.ok) {
        throw new Error('Decision simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Processing decision...');

      // Show notification indicators
      this.showNotifications(result.notifications);

      return {
        application: result.application,
        decision: result.decision,
      };
    } catch (error) {
      console.error('Error simulating decision:', error);
      throw error;
    }
  }

  /**
   * Simulate application submission
   */
  async submitApplication(applicationId) {
    try {
      const response = await fetch(`${this.baseUrl}/submit`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        throw new Error('Submission simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Submitting application...');

      return result.application;
    } catch (error) {
      console.error('Error simulating application submission:', error);
      throw error;
    }
  }

  /**
   * Simulate document classification
   */
  async classifyDocument(documentId, fileName) {
    try {
      const response = await fetch(`${this.baseUrl}/classify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          documentId,
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('Classification simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Classifying document...');

      return result.classification;
    } catch (error) {
      console.error('Error simulating document classification:', error);
      throw error;
    }
  }

  /**
   * Simulate data extraction
   */
  async extractData(documentId, documentType) {
    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          documentId,
          documentType,
        }),
      });

      if (!response.ok) {
        throw new Error('Extraction simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Extracting data...');

      return result.extraction;
    } catch (error) {
      console.error('Error simulating data extraction:', error);
      throw error;
    }
  }

  /**
   * Simulate batch processing
   */
  async batchProcess(documentIds, operationType) {
    try {
      const response = await fetch(`${this.baseUrl}/batch-process`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          documentIds,
          operationType,
        }),
      });

      if (!response.ok) {
        throw new Error('Batch processing simulation failed');
      }

      const result = await response.json();
      
      // Show batch processing indicator
      this.showBatchProgress(result.job);

      return result.job;
    } catch (error) {
      console.error('Error simulating batch processing:', error);
      throw error;
    }
  }

  /**
   * Simulate anomaly detection
   */
  async detectAnomalies(applicationId, documentIds) {
    try {
      const response = await fetch(`${this.baseUrl}/detect-anomalies`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          applicationId,
          documentIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Anomaly detection simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Detecting anomalies...');

      // Show anomaly alerts if any found
      if (result.anomalies.length > 0) {
        this.showAnomalyAlerts(result.anomalies, result.riskScore);
      }

      return {
        anomalies: result.anomalies,
        riskScore: result.riskScore,
      };
    } catch (error) {
      console.error('Error simulating anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Simulate eligibility calculation
   */
  async calculateEligibility(applicationId, programType) {
    try {
      const response = await fetch(`${this.baseUrl}/calculate-eligibility`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          applicationId,
          programType,
        }),
      });

      if (!response.ok) {
        throw new Error('Eligibility calculation simulation failed');
      }

      const result = await response.json();
      
      // Show processing indicator
      await this.showProcessing(result.processingTime, 'Calculating eligibility...');

      return {
        eligibilityScore: result.eligibilityScore,
        factors: result.factors,
        recommendation: result.recommendation,
      };
    } catch (error) {
      console.error('Error simulating eligibility calculation:', error);
      throw error;
    }
  }

  /**
   * Simulate notification sending
   */
  async sendNotification(type, recipient, message) {
    try {
      const response = await fetch(`${this.baseUrl}/send-notification`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          type,
          recipient,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Notification simulation failed');
      }

      const result = await response.json();
      
      // Show notification sent indicator
      this.showNotificationSent(type, recipient);

      return result.notification;
    } catch (error) {
      console.error('Error simulating notification:', error);
      throw error;
    }
  }

  /**
   * Show notification indicators
   */
  showNotifications(notifications) {
    const container = document.createElement('div');
    container.className = 'demo-notifications';
    
    notifications.forEach((notification, index) => {
      setTimeout(() => {
        const toast = document.createElement('div');
        toast.className = 'demo-notification-toast';
        toast.innerHTML = `
          <i class="icon-check-circle"></i>
          <span>${notification}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
      }, index * 500);
    });

    document.body.appendChild(container);
    setTimeout(() => container.remove(), notifications.length * 500 + 3000);
  }

  /**
   * Show batch processing progress
   */
  showBatchProgress(job) {
    const modal = document.createElement('div');
    modal.className = 'demo-batch-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Batch Processing</h3>
        <p>Processing ${job.totalDocuments} documents...</p>
        <div class="progress-bar">
          <div class="progress-fill" style="animation-duration: ${job.estimatedCompletionTime}ms"></div>
        </div>
        <p class="estimated-time">Estimated completion: ${Math.round(job.estimatedCompletionTime / 1000)}s</p>
        <button onclick="this.closest('.demo-batch-modal').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
      modal.querySelector('.modal-content').innerHTML += '<p class="success">✓ Batch processing complete!</p>';
    }, job.estimatedCompletionTime);
  }

  /**
   * Show anomaly alerts
   */
  showAnomalyAlerts(anomalies, riskScore) {
    const modal = document.createElement('div');
    modal.className = 'demo-anomaly-modal';
    
    const severityClass = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';
    
    modal.innerHTML = `
      <div class="modal-content">
        <h3>⚠️ Anomalies Detected</h3>
        <div class="risk-score ${severityClass}">
          Risk Score: ${riskScore}
        </div>
        <ul class="anomaly-list">
          ${anomalies.map(a => `
            <li class="anomaly-item severity-${a.severity.toLowerCase()}">
              <strong>${a.type}</strong>
              <span class="severity-badge">${a.severity}</span>
              <p>${a.description}</p>
              <small>Confidence: ${Math.round(a.confidence * 100)}%</small>
            </li>
          `).join('')}
        </ul>
        <button onclick="this.closest('.demo-anomaly-modal').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Show notification sent indicator
   */
  showNotificationSent(type, recipient) {
    const toast = document.createElement('div');
    toast.className = 'demo-notification-toast';
    toast.innerHTML = `
      <i class="icon-send"></i>
      <span>${type} notification sent to ${recipient}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  /**
   * Complete workflow: Upload → Analyze → Extract
   */
  async completeDocumentWorkflow(applicationId, file) {
    try {
      // Step 1: Upload
      const document = await this.uploadDocument(applicationId, file);
      
      // Step 2: Classify
      const classification = await this.classifyDocument(document.id, file.name);
      
      // Step 3: Analyze
      const analysis = await this.analyzeDocument(document.id, classification.documentType);
      
      // Step 4: Extract
      const extraction = await this.extractData(document.id, classification.documentType);

      return {
        document,
        classification,
        analysis,
        extraction,
      };
    } catch (error) {
      console.error('Error in complete document workflow:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DemoOperations;
}
