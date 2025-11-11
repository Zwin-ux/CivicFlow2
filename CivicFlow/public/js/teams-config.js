/**
 * Teams Configuration Management UI
 * Handles CRUD operations for Teams integration configuration
 */

const API_BASE_URL = '/api/admin/teams/config';
let currentEditId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadConfigurations();
    setupEventListeners();
});

/**
 * Check if user is authenticated and has admin role
 */
function checkAuthentication() {
    const token = localStorage.getItem('accessToken');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'Administrator') {
        window.location.href = '/admin-dashboard.html';
        return;
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/';
    });

    // Config form submission
    document.getElementById('config-form').addEventListener('submit', handleFormSubmit);

    // Close modal on background click
    document.getElementById('config-modal').addEventListener('click', (e) => {
        if (e.target.id === 'config-modal') {
            closeModal();
        }
    });
}

/**
 * Load all configurations from API
 */
async function loadConfigurations() {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(API_BASE_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load configurations');
        }

        const result = await response.json();
        displayConfigurations(result.data);
    } catch (error) {
        console.error('Error loading configurations:', error);
        showAlert('Failed to load configurations', 'error');
        displayEmptyState('Failed to load configurations. Please try again.');
    }
}

/**
 * Display configurations in the UI
 */
function displayConfigurations(configs) {
    const container = document.getElementById('config-list');

    if (!configs || configs.length === 0) {
        displayEmptyState('No Teams configurations found. Click "Add Configuration" to create one.');
        return;
    }

    container.innerHTML = configs.map(config => `
        <div class="config-card">
            <div class="config-card-header">
                <div class="config-card-title">${formatProgramType(config.programType)}</div>
                <div class="config-card-status ${config.isActive ? 'active' : 'inactive'}">
                    ${config.isActive ? 'Active' : 'Inactive'}
                </div>
            </div>
            <div class="config-card-body">
                <div class="config-field">
                    <div class="config-field-label">Program Type</div>
                    <div class="config-field-value">${config.programType}</div>
                </div>
                <div class="config-field">
                    <div class="config-field-label">Channel Name</div>
                    <div class="config-field-value">${config.channelName}</div>
                </div>
                <div class="config-field">
                    <div class="config-field-label">Team ID</div>
                    <div class="config-field-value">${config.teamId.substring(0, 20)}...</div>
                </div>
                <div class="config-field">
                    <div class="config-field-label">Channel ID</div>
                    <div class="config-field-value">${config.channelId.substring(0, 20)}...</div>
                </div>
            </div>
            <div class="notification-rules">
                <div class="notification-rules-title">Notification Rules</div>
                <div class="notification-rules-list">
                    ${renderNotificationRules(config.notificationRules)}
                </div>
            </div>
            <div class="config-card-actions">
                <button class="btn btn-secondary" onclick="editConfiguration('${config.id}')">
                    Edit
                </button>
                <button class="btn btn-danger" onclick="deleteConfiguration('${config.id}', '${config.programType}')">
                    ${config.isActive ? 'Deactivate' : 'Delete'}
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Display empty state
 */
function displayEmptyState(message) {
    const container = document.getElementById('config-list');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Format program type for display
 */
function formatProgramType(programType) {
    return programType
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Render notification rules badges
 */
function renderNotificationRules(rules) {
    const ruleLabels = {
        NEW_SUBMISSION: 'New Submission',
        SLA_WARNING: 'SLA Warning',
        DECISION_READY: 'Decision Ready',
        DOCUMENTS_RECEIVED: 'Documents Received',
        FRAUD_DETECTED: 'Fraud Detected',
        STATUS_CHANGED: 'Status Changed',
        DECISION_MADE: 'Decision Made'
    };

    return Object.entries(ruleLabels)
        .map(([key, label]) => {
            const enabled = rules[key] === true;
            return `<span class="notification-rule ${enabled ? 'enabled' : 'disabled'}">${label}</span>`;
        })
        .join('');
}

/**
 * Open create configuration modal
 */
function openCreateModal() {
    currentEditId = null;
    document.getElementById('modal-title').textContent = 'Add Teams Configuration';
    document.getElementById('config-form').reset();
    document.getElementById('config-id').value = '';
    document.getElementById('program-type').disabled = false;
    
    // Set default notification rules
    document.getElementById('rule-new-submission').checked = true;
    document.getElementById('rule-sla-warning').checked = true;
    document.getElementById('rule-decision-ready').checked = true;
    document.getElementById('rule-documents-received').checked = true;
    document.getElementById('rule-fraud-detected').checked = true;
    document.getElementById('is-active').checked = true;
    
    document.getElementById('config-modal').classList.add('active');
}

/**
 * Edit configuration
 */
async function editConfiguration(id) {
    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }

        const result = await response.json();
        const config = result.data;

        currentEditId = id;
        document.getElementById('modal-title').textContent = 'Edit Teams Configuration';
        document.getElementById('config-id').value = config.id;
        document.getElementById('program-type').value = config.programType;
        document.getElementById('program-type').disabled = true; // Can't change program type
        document.getElementById('team-id').value = config.teamId;
        document.getElementById('channel-id').value = config.channelId;
        document.getElementById('channel-name').value = config.channelName;
        
        // Set notification rules
        document.getElementById('rule-new-submission').checked = config.notificationRules.NEW_SUBMISSION || false;
        document.getElementById('rule-sla-warning').checked = config.notificationRules.SLA_WARNING || false;
        document.getElementById('rule-decision-ready').checked = config.notificationRules.DECISION_READY || false;
        document.getElementById('rule-documents-received').checked = config.notificationRules.DOCUMENTS_RECEIVED || false;
        document.getElementById('rule-fraud-detected').checked = config.notificationRules.FRAUD_DETECTED || false;
        document.getElementById('rule-status-changed').checked = config.notificationRules.STATUS_CHANGED || false;
        document.getElementById('rule-decision-made').checked = config.notificationRules.DECISION_MADE || false;
        document.getElementById('is-active').checked = config.isActive;
        
        document.getElementById('config-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading configuration:', error);
        showAlert('Failed to load configuration', 'error');
    }
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('config-modal').classList.remove('active');
    currentEditId = null;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        programType: document.getElementById('program-type').value.trim().toUpperCase(),
        teamId: document.getElementById('team-id').value.trim(),
        channelId: document.getElementById('channel-id').value.trim(),
        channelName: document.getElementById('channel-name').value.trim() || undefined,
        notificationRules: {
            NEW_SUBMISSION: document.getElementById('rule-new-submission').checked,
            SLA_WARNING: document.getElementById('rule-sla-warning').checked,
            DECISION_READY: document.getElementById('rule-decision-ready').checked,
            DOCUMENTS_RECEIVED: document.getElementById('rule-documents-received').checked,
            FRAUD_DETECTED: document.getElementById('rule-fraud-detected').checked,
            STATUS_CHANGED: document.getElementById('rule-status-changed').checked,
            DECISION_MADE: document.getElementById('rule-decision-made').checked
        },
        isActive: document.getElementById('is-active').checked
    };

    try {
        const token = localStorage.getItem('accessToken');
        const url = currentEditId ? `${API_BASE_URL}/${currentEditId}` : API_BASE_URL;
        const method = currentEditId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to save configuration');
        }

        showAlert(result.message || 'Configuration saved successfully', 'success');
        closeModal();
        loadConfigurations();
    } catch (error) {
        console.error('Error saving configuration:', error);
        showAlert(error.message || 'Failed to save configuration', 'error');
    }
}

/**
 * Test Teams connectivity
 */
async function testConnectivity() {
    const teamId = document.getElementById('team-id').value.trim();
    const channelId = document.getElementById('channel-id').value.trim();

    if (!teamId || !channelId) {
        showAlert('Please enter Team ID and Channel ID first', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/test-connectivity`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teamId, channelId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Connectivity test failed');
        }

        showAlert(`✓ ${result.message}`, 'success');
    } catch (error) {
        console.error('Connectivity test failed:', error);
        showAlert(error.message || 'Connectivity test failed', 'error');
    }
}

/**
 * Delete/deactivate configuration
 */
async function deleteConfiguration(id, programType) {
    if (!confirm(`Are you sure you want to deactivate the configuration for ${formatProgramType(programType)}?`)) {
        return;
    }

    try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to deactivate configuration');
        }

        showAlert(result.message || 'Configuration deactivated successfully', 'success');
        loadConfigurations();
    } catch (error) {
        console.error('Error deactivating configuration:', error);
        showAlert(error.message || 'Failed to deactivate configuration', 'error');
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
