// Initialize theme system
if (typeof initThemeSystem === 'function') {
    initThemeSystem();
}

let authToken = null;
let currentApplicationId = null;
let currentAIAnalysis = null;

// Check if already logged in
const storedToken = localStorage.getItem('staffToken');
if (storedToken) {
    authToken = storedToken;
    showDashboard();
}

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Login failed');
        }
        
        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('staffToken', authToken);
        
        showDashboard();
        loadApplicationQueue();
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('error', 'Login failed. Please check your credentials.');
    }
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    authToken = null;
    localStorage.removeItem('staffToken');
    showLogin();
});

function showLogin() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('staff-dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('staff-dashboard').style.display = 'block';
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// Load application queue
async function loadApplicationQueue() {
    const statusFilter = document.getElementById('status-filter').value;
    const programFilter = document.getElementById('program-filter').value;
    const sortBy = document.getElementById('sort-filter').value;
    
    try {
        let url = '/api/applications?';
        if (statusFilter) url += `status=${statusFilter}&`;
        if (programFilter) url += `programType=${programFilter}&`;
        url += `sortBy=${sortBy}&order=desc`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load applications');
        }
        
        const applications = await response.json();
        displayApplicationQueue(applications);
        
    } catch (error) {
        console.error('Error loading applications:', error);
        showAlert('error', 'Failed to load applications');
    }
}

function displayApplicationQueue(applications) {
    const tbody = document.getElementById('applications-tbody');
    
    if (applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No applications found</td></tr>';
        return;
    }
    
    tbody.innerHTML = applications.map(app => `
        <tr>
            <td>${app.id.substring(0, 8)}...</td>
            <td>${app.applicant?.businessName || 'N/A'}</td>
            <td>${app.programType}</td>
            <td>$${app.requestedAmount.toLocaleString()}</td>
            <td>${app.eligibilityScore ? app.eligibilityScore + '/100' : 'Pending'}</td>
            <td><span class="status-badge ${app.status.toLowerCase()}">${app.status.replace('_', ' ')}</span></td>
            <td>${app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="btn btn-primary" onclick="reviewApplication('${app.id}')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    Review
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter handlers
document.getElementById('status-filter').addEventListener('change', loadApplicationQueue);
document.getElementById('program-filter').addEventListener('change', loadApplicationQueue);
document.getElementById('sort-filter').addEventListener('change', loadApplicationQueue);

// Review application
async function reviewApplication(applicationId) {
    currentApplicationId = applicationId;
    
    try {
        const response = await fetch(`/api/applications/${applicationId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load application');
        }
        
        const application = await response.json();
        displayApplicationReview(application);
        
        // Switch to review tab
        document.querySelector('[data-tab="review"]').click();
        
    } catch (error) {
        console.error('Error loading application:', error);
        showAlert('error', 'Failed to load application details');
    }
}

function displayApplicationReview(app) {
    document.getElementById('no-application-selected').style.display = 'none';
    document.getElementById('application-review').style.display = 'block';
    
    // Basic info
    document.getElementById('review-app-id').textContent = app.id;
    document.getElementById('review-business-name').textContent = app.applicant?.businessName || 'N/A';
    document.getElementById('review-ein').textContent = app.applicant?.ein || 'N/A';
    document.getElementById('review-program-type').textContent = app.programType;
    document.getElementById('review-amount').textContent = `$${app.requestedAmount.toLocaleString()}`;
    document.getElementById('review-submitted').textContent = app.submittedAt 
        ? new Date(app.submittedAt).toLocaleString() 
        : 'Not submitted';
    document.getElementById('review-contact').textContent = app.applicant?.contactInfo?.email || 'N/A';
    
    const statusBadge = document.getElementById('review-status');
    statusBadge.textContent = app.status.replace('_', ' ');
    statusBadge.className = `status-badge ${app.status.toLowerCase()}`;
    
    // Eligibility score
    const scoreValue = document.getElementById('review-eligibility-score');
    const scoreStatus = document.getElementById('review-eligibility-status');
    const scoreCircle = document.querySelector('.score-circle');
    
    if (app.eligibilityScore !== null && app.eligibilityScore !== undefined) {
        scoreValue.textContent = app.eligibilityScore;
        
        if (app.eligibilityScore >= 70) {
            scoreCircle.className = 'score-circle high';
            scoreStatus.textContent = 'Eligible';
            scoreStatus.style.color = '#27ae60';
        } else if (app.eligibilityScore >= 50) {
            scoreCircle.className = 'score-circle medium';
            scoreStatus.textContent = 'Review Required';
            scoreStatus.style.color = '#f39c12';
        } else {
            scoreCircle.className = 'score-circle low';
            scoreStatus.textContent = 'Not Eligible';
            scoreStatus.style.color = '#e74c3c';
        }
    } else {
        scoreValue.textContent = '--';
        scoreStatus.textContent = 'Pending';
        scoreCircle.className = 'score-circle';
    }
    
    // Program rules (mock data for now)
    const programRules = document.getElementById('review-program-rules');
    programRules.innerHTML = `
        <li>Business must be operational for at least 6 months</li>
        <li>Valid EIN required</li>
        <li>All required documents submitted</li>
        <li>No outstanding tax liens</li>
    `;
    
    // Fraud flags
    const fraudSection = document.getElementById('fraud-flags-section');
    const fraudList = document.getElementById('fraud-flags-list');
    
    if (app.fraudFlags && app.fraudFlags.length > 0) {
        fraudList.innerHTML = app.fraudFlags.map(flag => `
            <div class="fraud-flag ${flag.severity.toLowerCase()}">
                <div class="fraud-flag-header">
                    <span class="fraud-flag-type">${flag.type.replace(/_/g, ' ')}</span>
                    <span class="fraud-flag-severity ${flag.severity.toLowerCase()}">${flag.severity}</span>
                </div>
                <div class="fraud-flag-description">${flag.description}</div>
            </div>
        `).join('');
        fraudSection.style.display = 'block';
    } else {
        fraudSection.style.display = 'none';
    }
    
    // Missing documents
    const missingDocsSection = document.getElementById('missing-docs-review-section');
    const missingDocsList = document.getElementById('review-missing-docs');
    
    if (app.missingDocuments && app.missingDocuments.length > 0) {
        missingDocsList.innerHTML = app.missingDocuments.map(doc => `<li>${doc}</li>`).join('');
        missingDocsSection.style.display = 'block';
    } else {
        missingDocsSection.style.display = 'none';
    }
    
    // Documents
    const documentsGrid = document.getElementById('review-documents');
    if (app.documents && app.documents.length > 0) {
        documentsGrid.innerHTML = app.documents.map(doc => {
            const confidence = doc.classificationConfidence || 0;
            let confidenceClass = 'low';
            if (confidence >= 80) confidenceClass = 'high';
            else if (confidence >= 60) confidenceClass = 'medium';
            
            return `
                <div class="document-card">
                    <div class="document-icon">Doc</div>
                    <div class="document-name">${doc.fileName}</div>
                    <div class="document-type">${doc.documentType || 'Unknown'}</div>
                    <div class="document-confidence ${confidenceClass}">
                        ${confidence}% confidence
                    </div>
                    <div class="document-actions">
                        <button class="btn btn-primary" onclick="viewDocument('${doc.id}')">View</button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        documentsGrid.innerHTML = '<p style="color: #7f8c8d;">No documents uploaded</p>';
    }
    
    // Recommendation
    const recommendationCard = document.getElementById('recommendation-card');
    const recommendationIcon = document.getElementById('recommendation-icon-text');
    const recommendationAction = document.getElementById('recommendation-action');
    const recommendationReasons = document.getElementById('recommendation-reasons');
    
    let recommendation = 'REVIEW';
    let reasons = [];
    
    if (app.eligibilityScore >= 70 && (!app.fraudFlags || app.fraudFlags.length === 0) && 
        (!app.missingDocuments || app.missingDocuments.length === 0)) {
        recommendation = 'APPROVE';
        reasons = [
            'Eligibility score meets threshold',
            'All required documents submitted',
            'No fraud flags detected'
        ];
    recommendationCard.className = 'recommendation-card approve';
    recommendationIcon.textContent = '';
        recommendationAction.textContent = 'Recommended: APPROVE';
    } else if (app.eligibilityScore < 50 || (app.fraudFlags && app.fraudFlags.some(f => f.severity === 'HIGH'))) {
        recommendation = 'REJECT';
        reasons = [];
        if (app.eligibilityScore < 50) reasons.push('Eligibility score below threshold');
        if (app.fraudFlags && app.fraudFlags.length > 0) reasons.push('Fraud flags detected');
    recommendationCard.className = 'recommendation-card reject';
    recommendationIcon.textContent = '';
        recommendationAction.textContent = 'Recommended: REJECT';
    } else {
        recommendation = 'REQUEST_INFO';
        reasons = [];
        if (app.missingDocuments && app.missingDocuments.length > 0) {
            reasons.push('Missing required documents');
        }
        if (app.eligibilityScore < 70) {
            reasons.push('Eligibility score requires review');
        }
    recommendationCard.className = 'recommendation-card request-info';
    recommendationIcon.textContent = '';
        recommendationAction.textContent = 'Recommended: REQUEST MORE INFO';
    }
    
    recommendationReasons.innerHTML = reasons.map(r => `<li>${r}</li>`).join('');
}

function viewDocument(documentId) {
    // In a real implementation, this would open the document in a new tab or modal
    window.open(`/api/documents/${documentId}/download`, '_blank');
}

// Back to queue button
document.getElementById('back-to-queue').addEventListener('click', () => {
    document.querySelector('[data-tab="queue"]').click();
    document.getElementById('no-application-selected').style.display = 'block';
    document.getElementById('application-review').style.display = 'none';
});

// Override checkbox handler
document.getElementById('override-checkbox').addEventListener('change', (e) => {
    const overrideReasonGroup = document.getElementById('override-reason-group');
    const overrideReason = document.getElementById('override-reason');
    
    if (e.target.checked) {
        overrideReasonGroup.style.display = 'block';
        overrideReason.required = true;
    } else {
        overrideReasonGroup.style.display = 'none';
        overrideReason.required = false;
    }
});

// Decision form submission
document.getElementById('decision-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const decision = document.getElementById('decision').value;
    const approvedAmount = document.getElementById('approved-amount').value;
    const justification = document.getElementById('justification').value;
    const override = document.getElementById('override-checkbox').checked;
    const overrideReason = document.getElementById('override-reason').value;
    
    const decisionData = {
        decision,
        justification,
        amount: approvedAmount ? parseFloat(approvedAmount) : null,
        overrideReason: override ? overrideReason : null
    };
    
    try {
        const response = await fetch(`/api/applications/${currentApplicationId}/decision`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(decisionData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit decision');
        }
        
        showAlert('success', 'Decision submitted successfully');
        
        // Reset form and go back to queue
        e.target.reset();
        document.getElementById('override-reason-group').style.display = 'none';
        document.querySelector('[data-tab="queue"]').click();
        loadApplicationQueue();
        
    } catch (error) {
        console.error('Error submitting decision:', error);
        showAlert('error', 'Failed to submit decision. Please try again.');
    }
});

// Cancel decision button
document.getElementById('cancel-decision').addEventListener('click', () => {
    document.getElementById('decision-form').reset();
    document.getElementById('override-reason-group').style.display = 'none';
});

function showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const container = document.querySelector('.tab-content.active');
    container.insertBefore(alert, container.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Make reviewApplication available globally
window.reviewApplication = reviewApplication;
window.viewDocument = viewDocument;


// AI Analysis Functions
async function loadAIAnalysis(applicationId) {
    try {
        const response = await fetch(`/api/applications/${applicationId}/ai-analysis`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            currentAIAnalysis = await response.json();
            displayAIAnalysis(currentAIAnalysis);
            displayAnomalyAlerts(currentAIAnalysis.anomalies);
        }
    } catch (error) {
        console.error('Error loading AI analysis:', error);
    }
}

function displayAIAnalysis(analysis) {
    // Document Quality Score
    const qualityScore = document.getElementById('ai-quality-score');
    const qualityStatus = document.getElementById('ai-quality-status');
    
    if (analysis.qualityScore !== undefined) {
        qualityScore.textContent = analysis.qualityScore + '/100';
        if (analysis.qualityScore >= 80) {
            qualityStatus.textContent = 'Excellent';
            qualityStatus.className = 'metric-status success';
        } else if (analysis.qualityScore >= 60) {
            qualityStatus.textContent = 'Good';
            qualityStatus.className = 'metric-status warning';
        } else {
            qualityStatus.textContent = 'Needs Improvement';
            qualityStatus.className = 'metric-status error';
        }
    }

    // Extraction Confidence
    const extractionConfidence = document.getElementById('ai-extraction-confidence');
    const extractionStatus = document.getElementById('ai-extraction-status');
    
    if (analysis.extractionConfidence !== undefined) {
        const confidence = Math.round(analysis.extractionConfidence * 100);
        extractionConfidence.textContent = confidence + '%';
        if (confidence >= 85) {
            extractionStatus.textContent = 'High Confidence';
            extractionStatus.className = 'metric-status success';
        } else if (confidence >= 70) {
            extractionStatus.textContent = 'Medium Confidence';
            extractionStatus.className = 'metric-status warning';
        } else {
            extractionStatus.textContent = 'Low Confidence';
            extractionStatus.className = 'metric-status error';
        }
    }

    // Risk Score
    const riskScore = document.getElementById('ai-risk-score');
    const riskStatus = document.getElementById('ai-risk-status');
    
    if (analysis.riskScore !== undefined) {
        riskScore.textContent = analysis.riskScore + '/100';
        if (analysis.riskScore < 30) {
            riskStatus.textContent = 'Low Risk';
            riskStatus.className = 'metric-status success';
        } else if (analysis.riskScore < 70) {
            riskStatus.textContent = 'Medium Risk';
            riskStatus.className = 'metric-status warning';
        } else {
            riskStatus.textContent = 'High Risk';
            riskStatus.className = 'metric-status error';
        }
    }

    // AI Recommendation
    const aiRecommendation = document.getElementById('ai-recommendation');
    const aiRecommendationConfidence = document.getElementById('ai-recommendation-confidence');
    
    if (analysis.recommendation) {
        aiRecommendation.textContent = analysis.recommendation.decision || 'REVIEW';
        if (analysis.recommendation.confidence) {
            const confidence = Math.round(analysis.recommendation.confidence * 100);
            aiRecommendationConfidence.textContent = `${confidence}% confidence`;
        }
    }
}

function displayAnomalyAlerts(anomalies) {
    const anomalySection = document.getElementById('anomaly-alerts-section');
    const anomalyCount = document.getElementById('anomaly-count');
    const anomalyList = document.getElementById('anomaly-alerts-list');

    if (!anomalies || anomalies.length === 0) {
        anomalySection.style.display = 'none';
        return;
    }

    anomalyCount.textContent = anomalies.length;
    anomalyList.innerHTML = anomalies.map(anomaly => `
        <div class="anomaly-alert ${anomaly.severity.toLowerCase()}">
            <div class="anomaly-header">
                <div class="anomaly-type">
                    <span class="anomaly-icon">${getSeverityIcon(anomaly.severity)}</span>
                    <span class="anomaly-type-text">${anomaly.type.replace(/_/g, ' ')}</span>
                </div>
                <span class="badge badge-${getSeverityBadgeClass(anomaly.severity)}">${anomaly.severity}</span>
            </div>
            <div class="anomaly-description">${anomaly.description}</div>
            ${anomaly.evidence && anomaly.evidence.length > 0 ? `
                <div class="anomaly-evidence">
                    <strong>Evidence:</strong>
                    <ul>
                        ${anomaly.evidence.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <div class="anomaly-confidence">
                Confidence: ${Math.round((anomaly.confidence || 0) * 100)}%
            </div>
            <div class="anomaly-actions">
                <button class="btn btn-sm btn-secondary" onclick="reviewAnomaly('${anomaly.id}')">
                    Review
                </button>
                <button class="btn btn-sm btn-success" onclick="resolveAnomaly('${anomaly.id}')">
                    Mark Resolved
                </button>
            </div>
        </div>
    `).join('');

    anomalySection.style.display = 'block';
}

function getSeverityIcon(severity) {
    // Return a short textual label for severity (no emoji)
    const labels = {
        'CRITICAL': 'CRITICAL',
        'HIGH': 'HIGH',
        'MEDIUM': 'MEDIUM',
        'LOW': 'LOW'
    };
    return labels[severity] || 'LOW';
}

function getSeverityBadgeClass(severity) {
    const classes = {
        'CRITICAL': 'error',
        'HIGH': 'error',
        'MEDIUM': 'warning',
        'LOW': 'neutral'
    };
    return classes[severity] || 'neutral';
}

// Document viewer with annotations
window.viewDocument = function(documentId) {
    if (typeof DocumentViewer !== 'undefined') {
        const viewer = new DocumentViewer({
            documentId: documentId,
            showAnnotations: true,
            enableInteraction: true
        });
        viewer.open();
    } else {
        if (typeof showToast === 'function') {
            showToast('Document viewer not available', 'error');
        }
    }
};

// View all documents with annotations
document.getElementById('view-with-annotations')?.addEventListener('click', () => {
    if (!currentApplicationId) return;
    
    if (typeof showModal === 'function') {
        const content = `
            <div class="document-viewer-container">
                <p>Loading documents with AI annotations...</p>
                <div id="annotation-viewer"></div>
            </div>
        `;
        showModal('Documents with AI Annotations', content, [
            { text: 'Close', variant: 'secondary', onClick: () => {} }
        ]);
        
        // Load documents with annotations
        loadDocumentsWithAnnotations(currentApplicationId);
    }
});

async function loadDocumentsWithAnnotations(applicationId) {
    try {
        const response = await fetch(`/api/applications/${applicationId}/documents`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const documents = await response.json();
            const viewer = document.getElementById('annotation-viewer');
            if (viewer && documents.length > 0) {
                viewer.innerHTML = documents.map(doc => `
                    <div class="document-preview">
                        <h4>${doc.fileName}</h4>
                        <button class="btn btn-primary" onclick="viewDocument('${doc.id}')">
                            View with Annotations
                        </button>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

// Anomaly management functions
window.reviewAnomaly = async function(anomalyId) {
    if (typeof showModal === 'function') {
        const content = `
            <div class="anomaly-review-form">
                <p>Review this anomaly and provide your assessment:</p>
                <textarea id="review-notes" rows="4" placeholder="Enter your review notes..." style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            </div>
        `;
        showModal('Review Anomaly', content, [
            {
                text: 'Submit Review',
                variant: 'primary',
                onClick: async () => {
                    const notes = document.getElementById('review-notes')?.value;
                    await submitAnomalyReview(anomalyId, notes);
                }
            },
            { text: 'Cancel', variant: 'secondary', onClick: () => {} }
        ]);
    }
};

async function submitAnomalyReview(anomalyId, notes) {
    try {
        const response = await fetch(`/api/anomalies/${anomalyId}/review`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes, status: 'REVIEWED' })
        });

        if (response.ok) {
            if (typeof showToast === 'function') {
                showToast('Anomaly review submitted successfully', 'success');
            }
            // Reload AI analysis
            if (currentApplicationId) {
                await loadAIAnalysis(currentApplicationId);
            }
        }
    } catch (error) {
        console.error('Error submitting anomaly review:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to submit review', 'error');
        }
    }
}

window.resolveAnomaly = async function(anomalyId) {
    try {
        const response = await fetch(`/api/anomalies/${anomalyId}/review`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'RESOLVED' })
        });

        if (response.ok) {
            if (typeof showToast === 'function') {
                showToast('Anomaly marked as resolved', 'success');
            }
            // Reload AI analysis
            if (currentApplicationId) {
                await loadAIAnalysis(currentApplicationId);
            }
        }
    } catch (error) {
        console.error('Error resolving anomaly:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to resolve anomaly', 'error');
        }
    }
};

// Enhance the existing displayApplicationDetails function to load AI analysis
const originalDisplayApplicationDetails = window.displayApplicationDetails;
if (originalDisplayApplicationDetails) {
    window.displayApplicationDetails = async function(app) {
        await originalDisplayApplicationDetails(app);
        // Load AI analysis after displaying application details
        await loadAIAnalysis(app.id);
    };
}
