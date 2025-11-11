// Initialize theme system
if (typeof initThemeSystem === 'function') {
    initThemeSystem();
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// AI-powered document recommendations
let currentApplicationData = null;
let recommendedDocuments = [];

// Listen for program type changes to get AI recommendations
document.getElementById('programType')?.addEventListener('change', async (e) => {
    const programType = e.target.value;
    if (programType) {
        await fetchDocumentRecommendations(programType);
    }
});

async function fetchDocumentRecommendations(programType) {
    try {
        // Create temporary application data for recommendations
        const tempAppData = {
            programType: programType,
            requestedAmount: document.getElementById('requestedAmount')?.value || 0
        };

        const response = await fetch('/api/ai/recommendations/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tempAppData)
        });

        if (response.ok) {
            const recommendations = await response.json();
            displayDocumentRecommendations(recommendations);
            recommendedDocuments = recommendations.documents || [];
            updateUploadProgress();
        }
    } catch (error) {
        console.error('Error fetching document recommendations:', error);
    }
}

function displayDocumentRecommendations(recommendations) {
    const recommendationsContainer = document.getElementById('ai-recommendations');
    const recommendationsList = document.getElementById('recommendations-list');

    if (!recommendations.documents || recommendations.documents.length === 0) {
        recommendationsContainer.style.display = 'none';
        return;
    }

    recommendationsList.innerHTML = recommendations.documents.map(doc => `
        <div class="recommendation-item ${doc.required ? 'required' : 'optional'}">
            <div class="recommendation-icon">
                ${doc.required ? '📄' : '📋'}
            </div>
            <div class="recommendation-content">
                <div class="recommendation-title">
                    ${doc.documentType}
                    ${doc.required ? '<span class="badge badge-error">Required</span>' : '<span class="badge badge-neutral">Optional</span>'}
                </div>
                <div class="recommendation-description">${doc.description || ''}</div>
                ${doc.reason ? `<div class="recommendation-reason"><strong>Why:</strong> ${doc.reason}</div>` : ''}
            </div>
        </div>
    `).join('');

    recommendationsContainer.style.display = 'block';
}

function updateUploadProgress() {
    const progressIndicator = document.getElementById('upload-progress-indicator');
    const completionPercentage = document.getElementById('completion-percentage');
    const completionProgressBar = document.getElementById('completion-progress-bar');
    const documentsUploaded = document.getElementById('documents-uploaded');
    const documentsRequired = document.getElementById('documents-required');

    if (recommendedDocuments.length === 0) {
        progressIndicator.style.display = 'none';
        return;
    }

    const requiredDocs = recommendedDocuments.filter(doc => doc.required);
    const uploadedTypes = new Set(selectedFiles.map(f => classifyDocumentType(f.name)));
    const uploadedRequired = requiredDocs.filter(doc => uploadedTypes.has(doc.documentType));

    const percentage = requiredDocs.length > 0 
        ? Math.round((uploadedRequired.length / requiredDocs.length) * 100)
        : 0;

    completionPercentage.textContent = `${percentage}%`;
    completionProgressBar.style.width = `${percentage}%`;
    documentsUploaded.textContent = uploadedRequired.length;
    documentsRequired.textContent = requiredDocs.length;

    progressIndicator.style.display = 'block';
}

function classifyDocumentType(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('w-9') || lower.includes('w9')) return 'W-9 Form';
    if (lower.includes('ein')) return 'EIN Verification';
    if (lower.includes('bank') || lower.includes('statement')) return 'Bank Statements';
    if (lower.includes('tax')) return 'Tax Returns';
    if (lower.includes('license')) return 'Business License';
    return 'Other Document';
}

// File upload handling
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
let selectedFiles = [];

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (!selectedFiles.find(f => f.name === file.name)) {
            selectedFiles.push(file);
            addFileToList(file);
        }
    });
}

function addFileToList(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-size">(${formatFileSize(file.size)})</span>
            <span class="file-quality" data-filename="${file.name}">
                <span class="spinner-small"></span> Analyzing...
            </span>
        </div>
        <div class="file-progress">
            <div class="file-progress-bar" style="width: 0%"></div>
        </div>
        <button type="button" class="file-remove" data-filename="${file.name}">&times;</button>
    `;
    
    fileList.appendChild(fileItem);
    
    // Add remove handler
    fileItem.querySelector('.file-remove').addEventListener('click', (e) => {
        const filename = e.target.dataset.filename;
        selectedFiles = selectedFiles.filter(f => f.name !== filename);
        fileItem.remove();
        updateUploadProgress();
    });

    // Simulate AI quality analysis
    setTimeout(() => {
        performQualityAnalysis(file, fileItem);
    }, 1000);

    updateUploadProgress();
}

async function performQualityAnalysis(file, fileItem) {
    const qualitySpan = fileItem.querySelector('.file-quality');
    
    try {
        // Simulate quality check (in real implementation, this would call the AI API)
        const quality = simulateQualityCheck(file);
        
        let qualityHTML = '';
        if (quality.score >= 80) {
            qualityHTML = `<span class="badge badge-success">✓ Good Quality (${quality.score})</span>`;
        } else if (quality.score >= 60) {
            qualityHTML = `<span class="badge badge-warning">⚠ Fair Quality (${quality.score})</span>`;
        } else {
            qualityHTML = `<span class="badge badge-error">✗ Poor Quality (${quality.score})</span>`;
        }

        if (quality.suggestions.length > 0) {
            qualityHTML += `<button class="btn-link" onclick="showQualitySuggestions('${file.name}', ${JSON.stringify(quality.suggestions).replace(/"/g, '&quot;')})">View Suggestions</button>`;
        }

        qualitySpan.innerHTML = qualityHTML;

        // Show toast for poor quality
        if (quality.score < 60 && typeof showToast === 'function') {
            showToast(`Document "${file.name}" has quality issues. Click "View Suggestions" for improvements.`, 'warning', 5000);
        }
    } catch (error) {
        qualitySpan.innerHTML = '<span class="badge badge-neutral">Quality check unavailable</span>';
    }
}

function simulateQualityCheck(file) {
    // Simulate quality scoring based on file properties
    let score = 70 + Math.floor(Math.random() * 30);
    const suggestions = [];

    if (file.size < 50000) {
        score -= 20;
        suggestions.push('File size is very small. Ensure the document is complete and readable.');
    }

    if (file.size > 5000000) {
        score -= 10;
        suggestions.push('Large file size detected. Consider compressing the document.');
    }

    if (!file.type.includes('pdf') && file.size > 2000000) {
        suggestions.push('For better quality, consider converting images to PDF format.');
    }

    return { score: Math.max(0, Math.min(100, score)), suggestions };
}

window.showQualitySuggestions = function(filename, suggestions) {
    if (typeof showModal === 'function') {
        const content = `
            <h3>Quality Improvement Suggestions</h3>
            <p><strong>Document:</strong> ${filename}</p>
            <ul style="text-align: left; margin: 1rem 0;">
                ${suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <p style="margin-top: 1rem;">Please consider re-uploading this document with the suggested improvements for better processing accuracy.</p>
        `;
        showModal('Document Quality Feedback', content, [
            { text: 'Close', variant: 'secondary', onClick: () => {} }
        ]);
    }
};

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Application form submission
document.getElementById('application-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    
    // Add form fields
    const formFields = {
        businessName: document.getElementById('businessName').value,
        ein: document.getElementById('ein').value,
        programType: document.getElementById('programType').value,
        requestedAmount: parseFloat(document.getElementById('requestedAmount').value),
        contactInfo: {
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value
        },
        ownerInfo: {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            ssn: document.getElementById('ssn').value
        }
    };
    
    formData.append('applicationData', JSON.stringify(formFields));
    
    // Add files
    selectedFiles.forEach(file => {
        formData.append('documents', file);
    });
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Simulate file upload progress
        const progressBars = document.querySelectorAll('.file-progress-bar');
        progressBars.forEach(bar => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                bar.style.width = progress + '%';
                if (progress >= 100) clearInterval(interval);
            }, 100);
        });
        
        // Submit application
        const response = await fetch('/api/applications', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit application');
        }
        
        const result = await response.json();
        
        // Show success message
        showAlert('success', `Application submitted successfully! Your application ID is: ${result.id}`);
        
        // Reset form
        e.target.reset();
        selectedFiles = [];
        fileList.innerHTML = '';
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error submitting application:', error);
        showAlert('error', 'Failed to submit application. Please try again.');
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Submit Application';
        submitBtn.disabled = false;
    }
});

// Application status search
document.getElementById('search-btn').addEventListener('click', async () => {
    const applicationId = document.getElementById('applicationId').value.trim();
    
    if (!applicationId) {
        showAlert('warning', 'Please enter an application ID');
        return;
    }
    
    try {
        const response = await fetch(`/api/applications/${applicationId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showAlert('error', 'Application not found');
            } else {
                throw new Error('Failed to fetch application');
            }
            return;
        }
        
        const application = await response.json();
        displayApplicationStatus(application);
        
    } catch (error) {
        console.error('Error fetching application:', error);
        showAlert('error', 'Failed to fetch application status. Please try again.');
    }
});

function displayApplicationStatus(application) {
    const statusResult = document.getElementById('status-result');
    
    // Update basic info
    document.getElementById('result-app-id').textContent = application.id;
    document.getElementById('result-business-name').textContent = application.applicant?.businessName || 'N/A';
    document.getElementById('result-program-type').textContent = application.programType;
    document.getElementById('result-amount').textContent = `$${application.requestedAmount.toLocaleString()}`;
    document.getElementById('result-submitted').textContent = application.submittedAt 
        ? new Date(application.submittedAt).toLocaleDateString() 
        : 'Not submitted';
    document.getElementById('result-eligibility').textContent = application.eligibilityScore 
        ? `${application.eligibilityScore}/100` 
        : 'Pending';
    
    // Update status badge
    const statusBadge = document.getElementById('result-status');
    statusBadge.textContent = application.status.replace('_', ' ');
    statusBadge.className = `status-badge ${application.status.toLowerCase()}`;
    
    // Show missing documents if any
    const missingDocsSection = document.getElementById('missing-docs-section');
    const missingDocsList = document.getElementById('missing-docs-list');
    
    if (application.missingDocuments && application.missingDocuments.length > 0) {
        missingDocsList.innerHTML = application.missingDocuments
            .map(doc => `<li>${doc}</li>`)
            .join('');
        missingDocsSection.style.display = 'block';
    } else {
        missingDocsSection.style.display = 'none';
    }
    
    // Build timeline
    const timeline = document.getElementById('timeline');
    const timelineEvents = [];
    
    if (application.createdAt) {
        timelineEvents.push({
            date: application.createdAt,
            event: 'Application created'
        });
    }
    
    if (application.submittedAt) {
        timelineEvents.push({
            date: application.submittedAt,
            event: 'Application submitted'
        });
    }
    
    if (application.reviewedAt) {
        timelineEvents.push({
            date: application.reviewedAt,
            event: 'Application reviewed'
        });
    }
    
    if (application.decidedAt) {
        timelineEvents.push({
            date: application.decidedAt,
            event: `Application ${application.decision?.decision.toLowerCase()}`
        });
    }
    
    timeline.innerHTML = timelineEvents
        .map(event => `
            <div class="timeline-item">
                <div class="timeline-date">${new Date(event.date).toLocaleString()}</div>
                <div class="timeline-content">${event.event}</div>
            </div>
        `)
        .join('');
    
    statusResult.style.display = 'block';
}

function showAlert(type, message) {
    // Use toast system if available
    if (typeof showToast === 'function') {
        showToast(message, type, 5000);
        return;
    }

    // Fallback to inline alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const form = document.querySelector('.tab-content.active');
    form.insertBefore(alert, form.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
