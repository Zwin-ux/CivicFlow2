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
    });
}

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
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const form = document.querySelector('.tab-content.active');
    form.insertBefore(alert, form.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
