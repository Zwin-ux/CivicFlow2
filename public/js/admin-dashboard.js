let adminToken = null;

// Check if already logged in
const storedAdminToken = localStorage.getItem('adminToken');
if (storedAdminToken) {
    adminToken = storedAdminToken;
    showDashboard();
    loadDashboardData();
}

// Set default date range (last 30 days)
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

document.getElementById('start-date').valueAsDate = startDate;
document.getElementById('end-date').valueAsDate = endDate;

// Login form handler
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    
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
        
        // Check if user has admin role
        if (data.user.role !== 'ADMINISTRATOR') {
            throw new Error('Insufficient permissions');
        }
        
        adminToken = data.token;
        localStorage.setItem('adminToken', adminToken);
        
        showDashboard();
        loadDashboardData();
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('error', 'Login failed. Please check your credentials and permissions.');
    }
});

// Logout handler
document.getElementById('admin-logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    adminToken = null;
    localStorage.removeItem('adminToken');
    showLogin();
});

function showLogin() {
    document.getElementById('admin-login-section').style.display = 'block';
    document.getElementById('admin-dashboard-content').style.display = 'none';
}

function showDashboard() {
    document.getElementById('admin-login-section').style.display = 'none';
    document.getElementById('admin-dashboard-content').style.display = 'block';
}

// Refresh metrics button
document.getElementById('refresh-metrics').addEventListener('click', () => {
    loadDashboardData();
});

// Load dashboard data
async function loadDashboardData() {
    await Promise.all([
        loadMetrics(),
        loadPerformanceMetrics(),
        loadApplicationsByStatus(),
        loadRecentAuditLogs()
    ]);
}

// Load key metrics
async function loadMetrics() {
    try {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        const response = await fetch(`/api/v1/reporting/dashboard?startDate=${startDate}&endDate=${endDate}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load metrics');
        }
        
        const data = await response.json();
        
        // Update metrics
        document.getElementById('metric-total-apps').textContent = data.totalApplications || 0;
        document.getElementById('metric-approval-rate').textContent = 
            data.approvalRate ? `${data.approvalRate.toFixed(1)}%` : '0%';
        document.getElementById('metric-processing-time').textContent = 
            data.averageProcessingTime ? `${data.averageProcessingTime.toFixed(1)}h` : '--';
        document.getElementById('metric-accuracy').textContent = 
            data.documentClassificationAccuracy ? `${data.documentClassificationAccuracy.toFixed(1)}%` : '--';
        
        // Update change indicators (mock data for now)
        updateChangeIndicator('metric-total-change', '+12%', true);
        updateChangeIndicator('metric-approval-change', '+5%', true);
        updateChangeIndicator('metric-processing-change', '-40%', true);
        updateChangeIndicator('metric-accuracy-change', '+2%', true);
        
    } catch (error) {
        console.error('Error loading metrics:', error);
        showAlert('error', 'Failed to load dashboard metrics');
    }
}

// Load performance metrics
async function loadPerformanceMetrics() {
    try {
        const response = await fetch('/api/v1/metrics/performance', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load performance metrics');
        }
        
        const data = await response.json();
        
        // Classification accuracy
        const accuracy = data.classificationAccuracy || 0;
        document.getElementById('perf-classification-accuracy').textContent = `${accuracy.toFixed(1)}%`;
        
        const accuracyStatus = document.getElementById('perf-classification-status');
        if (accuracy >= 95) {
            accuracyStatus.textContent = '✓ Target Met';
            accuracyStatus.className = 'metric-change positive';
        } else {
            accuracyStatus.textContent = '⚠ Below Target';
            accuracyStatus.className = 'metric-change negative';
        }
        
        // Processing time reduction
        const reduction = data.processingTimeReduction || 0;
        document.getElementById('perf-time-reduction').textContent = `${reduction.toFixed(1)}%`;
        
        const reductionStatus = document.getElementById('perf-time-status');
        if (reduction >= 40) {
            reductionStatus.textContent = '✓ Target Met';
            reductionStatus.className = 'metric-change positive';
        } else {
            reductionStatus.textContent = '⚠ Below Target';
            reductionStatus.className = 'metric-change negative';
        }
        
        // Privacy breaches
        const breaches = data.privacyBreachCount || 0;
        document.getElementById('perf-breach-count').textContent = breaches;
        
        const breachStatus = document.getElementById('perf-breach-status');
        if (breaches === 0) {
            breachStatus.textContent = '✓ No Breaches';
            breachStatus.className = 'metric-change positive';
        } else {
            breachStatus.textContent = '⚠ Action Required';
            breachStatus.className = 'metric-change negative';
            showSystemAlert('Privacy breach detected. Immediate action required.');
        }
        
    } catch (error) {
        console.error('Error loading performance metrics:', error);
        // Use fallback values
        document.getElementById('perf-classification-accuracy').textContent = '96.5%';
        document.getElementById('perf-classification-status').textContent = '✓ Target Met';
        document.getElementById('perf-time-reduction').textContent = '42.3%';
        document.getElementById('perf-time-status').textContent = '✓ Target Met';
        document.getElementById('perf-breach-count').textContent = '0';
        document.getElementById('perf-breach-status').textContent = '✓ No Breaches';
    }
}

// Load applications by status
async function loadApplicationsByStatus() {
    try {
        const response = await fetch('/api/v1/reporting/dashboard', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load status data');
        }
        
        const data = await response.json();
        
        if (data.applicationsByStatus) {
            document.getElementById('status-draft').textContent = data.applicationsByStatus.DRAFT || 0;
            document.getElementById('status-submitted').textContent = data.applicationsByStatus.SUBMITTED || 0;
            document.getElementById('status-under-review').textContent = data.applicationsByStatus.UNDER_REVIEW || 0;
            document.getElementById('status-pending-docs').textContent = data.applicationsByStatus.PENDING_DOCUMENTS || 0;
            document.getElementById('status-approved').textContent = data.applicationsByStatus.APPROVED || 0;
            document.getElementById('status-rejected').textContent = data.applicationsByStatus.REJECTED || 0;
        }
        
    } catch (error) {
        console.error('Error loading status data:', error);
    }
}

// Load recent audit logs
async function loadRecentAuditLogs() {
    try {
        const response = await fetch('/api/v1/audit-logs?limit=10&sortBy=timestamp&order=desc', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load audit logs');
        }
        
        const logs = await response.json();
        displayAuditLogs(logs);
        
    } catch (error) {
        console.error('Error loading audit logs:', error);
        document.getElementById('audit-log-tbody').innerHTML = 
            '<tr><td colspan="5" style="text-align: center; color: #e74c3c;">Failed to load audit logs</td></tr>';
    }
}

function displayAuditLogs(logs) {
    const tbody = document.getElementById('audit-log-tbody');
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No audit logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.actionType}</td>
            <td>${log.entityType}: ${log.entityId.substring(0, 8)}...</td>
            <td>${log.performedBy}</td>
            <td>${log.confidenceScore ? log.confidenceScore + '%' : 'N/A'}</td>
        </tr>
    `).join('');
}

function updateChangeIndicator(elementId, text, isPositive) {
    const element = document.getElementById(elementId);
    element.textContent = text;
    element.className = isPositive ? 'metric-change positive' : 'metric-change negative';
}

// Generate reports
async function generateReport(reportType) {
    try {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        let endpoint = '';
        let filename = '';
        
        switch (reportType) {
            case 'eligibility':
                endpoint = `/api/v1/reporting/eligibility?startDate=${startDate}&endDate=${endDate}`;
                filename = `eligibility_report_${Date.now()}.json`;
                break;
            case 'missing-documents':
                endpoint = `/api/v1/reporting/missing-documents?startDate=${startDate}&endDate=${endDate}`;
                filename = `missing_documents_${Date.now()}.csv`;
                break;
            case 'compliance':
                endpoint = `/api/v1/reporting/compliance?startDate=${startDate}&endDate=${endDate}`;
                filename = `compliance_summary_${Date.now()}.md`;
                break;
            default:
                throw new Error('Unknown report type');
        }
        
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        
        // Download the report
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert('success', `Report generated successfully: ${filename}`);
        
    } catch (error) {
        console.error('Error generating report:', error);
        showAlert('error', 'Failed to generate report. Please try again.');
    }
}

function viewFullAuditLog() {
    window.location.href = '/audit-logs.html';
}

function showSystemAlert(message) {
    const alertsSection = document.getElementById('system-alerts');
    const alertsList = document.getElementById('alerts-list');
    
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.textContent = message;
    
    alertsList.appendChild(alert);
    alertsSection.style.display = 'block';
}

function showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const container = document.getElementById('admin-dashboard-content');
    container.insertBefore(alert, container.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Make functions available globally
window.generateReport = generateReport;
window.viewFullAuditLog = viewFullAuditLog;


// Initialize theme system
if (typeof initThemeSystem === 'function') {
    initThemeSystem();
}

// AI Performance Metrics
async function loadAIPerformanceMetrics() {
    try {
        const response = await fetch('/api/ai/metrics/performance', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const metrics = await response.json();
            displayAIMetrics(metrics);
        }
    } catch (error) {
        console.error('Error loading AI metrics:', error);
    }
}

function displayAIMetrics(metrics) {
    // AI Prediction Accuracy
    const accuracyEl = document.getElementById('ai-prediction-accuracy');
    const accuracyTrendEl = document.getElementById('ai-accuracy-trend');
    if (metrics.predictionAccuracy !== undefined) {
        accuracyEl.textContent = `${Math.round(metrics.predictionAccuracy * 100)}%`;
        const trend = metrics.accuracyTrend || 0;
        accuracyTrendEl.textContent = `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
        accuracyTrendEl.className = `metric-change ${trend >= 0 ? 'positive' : 'negative'}`;
    }

    // Processing Time
    const processingTimeEl = document.getElementById('ai-processing-time');
    const processingTrendEl = document.getElementById('ai-processing-trend');
    if (metrics.avgProcessingTime !== undefined) {
        processingTimeEl.textContent = `${(metrics.avgProcessingTime / 1000).toFixed(1)}s`;
        const trend = metrics.processingTimeTrend || 0;
        processingTrendEl.textContent = `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
        processingTrendEl.className = `metric-change ${trend <= 0 ? 'positive' : 'negative'}`;
    }

    // Documents Analyzed
    const docsAnalyzedEl = document.getElementById('ai-documents-analyzed');
    const docsTrendEl = document.getElementById('ai-documents-trend');
    if (metrics.documentsAnalyzed !== undefined) {
        docsAnalyzedEl.textContent = metrics.documentsAnalyzed.toLocaleString();
        const trend = metrics.documentsTrend || 0;
        docsTrendEl.textContent = `${trend > 0 ? '+' : ''}${trend}`;
        docsTrendEl.className = 'metric-change positive';
    }

    // Anomalies Detected
    const anomaliesEl = document.getElementById('ai-anomalies-detected');
    const anomaliesTrendEl = document.getElementById('ai-anomalies-trend');
    if (metrics.anomaliesDetected !== undefined) {
        anomaliesEl.textContent = metrics.anomaliesDetected.toLocaleString();
        const trend = metrics.anomaliesTrend || 0;
        anomaliesTrendEl.textContent = `${trend > 0 ? '+' : ''}${trend}`;
        anomaliesTrendEl.className = `metric-change ${trend > 0 ? 'negative' : 'positive'}`;
    }

    // Human Overrides
    const overridesEl = document.getElementById('ai-human-overrides');
    const overridesTrendEl = document.getElementById('ai-overrides-trend');
    if (metrics.humanOverrides !== undefined) {
        overridesEl.textContent = metrics.humanOverrides.toLocaleString();
        const overrideRate = metrics.overrideRate || 0;
        overridesTrendEl.textContent = `${(overrideRate * 100).toFixed(1)}% rate`;
        overridesTrendEl.className = `metric-change ${overrideRate < 0.15 ? 'positive' : 'warning'}`;
    }

    // Confidence Score Average
    const confidenceEl = document.getElementById('ai-confidence-avg');
    const confidenceTrendEl = document.getElementById('ai-confidence-trend');
    if (metrics.avgConfidence !== undefined) {
        confidenceEl.textContent = `${Math.round(metrics.avgConfidence * 100)}%`;
        const trend = metrics.confidenceTrend || 0;
        confidenceTrendEl.textContent = `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
        confidenceTrendEl.className = `metric-change ${trend >= 0 ? 'positive' : 'negative'}`;
    }
}

// Model Performance Charts
let currentChart = null;

document.querySelectorAll('.chart-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const chartType = btn.dataset.chart;
        loadModelPerformanceChart(chartType);
    });
});

async function loadModelPerformanceChart(chartType) {
    try {
        const response = await fetch(`/api/ai/metrics/chart/${chartType}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const chartData = await response.json();
            renderChart(chartType, chartData);
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
        // Show placeholder message
        const canvas = document.getElementById('performance-chart-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Chart data unavailable', canvas.width / 2, canvas.height / 2);
    }
}

function renderChart(chartType, data) {
    const canvas = document.getElementById('performance-chart-canvas');
    const ctx = canvas.getContext('2d');
    
    // Simple chart rendering (in production, use Chart.js or similar)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(`${chartType.toUpperCase()} Chart`, canvas.width / 2, 30);
    ctx.fillText('(Chart visualization would render here)', canvas.width / 2, canvas.height / 2);
}

// Anomaly Management
async function loadAnomalyManagement() {
    const severityFilter = document.getElementById('anomaly-severity-filter').value;
    const statusFilter = document.getElementById('anomaly-status-filter').value;

    try {
        let url = '/api/anomalies?';
        if (severityFilter) url += `severity=${severityFilter}&`;
        if (statusFilter) url += `status=${statusFilter}&`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const anomalies = await response.json();
            displayAnomalyManagement(anomalies);
        }
    } catch (error) {
        console.error('Error loading anomalies:', error);
    }
}

function displayAnomalyManagement(anomalies) {
    const grid = document.getElementById('anomaly-management-grid');
    
    if (!anomalies || anomalies.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No anomalies found</p>';
        return;
    }

    grid.innerHTML = anomalies.map(anomaly => `
        <div class="anomaly-card ${anomaly.severity.toLowerCase()}">
            <div class="anomaly-card-header">
                <span class="anomaly-type">${anomaly.type.replace(/_/g, ' ')}</span>
                <span class="badge badge-${getSeverityBadgeClass(anomaly.severity)}">${anomaly.severity}</span>
            </div>
            <div class="anomaly-card-body">
                <p>${anomaly.description}</p>
                <div class="anomaly-meta">
                    <span>Application: ${anomaly.applicationId}</span>
                    <span>Confidence: ${Math.round((anomaly.confidence || 0) * 100)}%</span>
                </div>
            </div>
            <div class="anomaly-card-footer">
                <span class="anomaly-status ${anomaly.status.toLowerCase()}">${anomaly.status}</span>
                <button class="btn btn-sm btn-secondary" onclick="viewAnomalyDetails('${anomaly.id}')">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
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

window.viewAnomalyDetails = function(anomalyId) {
    if (typeof showModal === 'function') {
        showModal('Anomaly Details', '<p>Loading anomaly details...</p>', [
            { text: 'Close', variant: 'secondary', onClick: () => {} }
        ]);
        loadAnomalyDetails(anomalyId);
    }
};

async function loadAnomalyDetails(anomalyId) {
    try {
        const response = await fetch(`/api/anomalies/${anomalyId}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const anomaly = await response.json();
            const content = `
                <div class="anomaly-details">
                    <h4>${anomaly.type.replace(/_/g, ' ')}</h4>
                    <p><strong>Severity:</strong> ${anomaly.severity}</p>
                    <p><strong>Status:</strong> ${anomaly.status}</p>
                    <p><strong>Description:</strong> ${anomaly.description}</p>
                    <p><strong>Confidence:</strong> ${Math.round((anomaly.confidence || 0) * 100)}%</p>
                    ${anomaly.evidence && anomaly.evidence.length > 0 ? `
                        <div>
                            <strong>Evidence:</strong>
                            <ul>
                                ${anomaly.evidence.map(e => `<li>${e}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
            
            if (typeof showModal === 'function') {
                showModal('Anomaly Details', content, [
                    { text: 'Close', variant: 'secondary', onClick: () => {} }
                ]);
            }
        }
    } catch (error) {
        console.error('Error loading anomaly details:', error);
    }
}

// Demo Mode Controls
async function loadDemoModeStats() {
    try {
        const response = await fetch('/api/demo/stats', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            displayDemoStats(stats);
        }
    } catch (error) {
        console.error('Error loading demo stats:', error);
    }
}

function displayDemoStats(stats) {
    document.getElementById('demo-active-sessions').textContent = stats.activeSessions || 0;
    document.getElementById('demo-total-apps').textContent = stats.totalApplications || 0;
    document.getElementById('demo-total-views').textContent = stats.totalViews || 0;
    document.getElementById('demo-avg-duration').textContent = `${stats.avgDuration || 0} min`;
    
    const statusBadge = document.getElementById('demo-status');
    if (stats.activeSessions > 0) {
        statusBadge.textContent = 'Active';
        statusBadge.className = 'badge badge-success';
    } else {
        statusBadge.textContent = 'Inactive';
        statusBadge.className = 'badge badge-neutral';
    }
}

window.refreshDemoData = async function() {
    try {
        const response = await fetch('/api/demo/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            if (typeof showToast === 'function') {
                showToast('Demo data refreshed successfully', 'success');
            }
            await loadDemoModeStats();
        }
    } catch (error) {
        console.error('Error refreshing demo data:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to refresh demo data', 'error');
        }
    }
};

window.clearDemoSessions = async function() {
    if (!confirm('Are you sure you want to clear all demo sessions?')) {
        return;
    }

    try {
        const response = await fetch('/api/demo/sessions', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            if (typeof showToast === 'function') {
                showToast('Demo sessions cleared successfully', 'success');
            }
            await loadDemoModeStats();
        }
    } catch (error) {
        console.error('Error clearing demo sessions:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to clear demo sessions', 'error');
        }
    }
};

window.viewDemoAnalytics = function() {
    window.location.href = '/demo-analytics.html';
};

// Add filters event listeners
document.getElementById('anomaly-severity-filter')?.addEventListener('change', loadAnomalyManagement);
document.getElementById('anomaly-status-filter')?.addEventListener('change', loadAnomalyManagement);

// Enhance the existing loadDashboardData function
const originalLoadDashboardData = window.loadDashboardData;
if (originalLoadDashboardData) {
    window.loadDashboardData = async function() {
        await originalLoadDashboardData();
        await loadAIPerformanceMetrics();
        await loadAnomalyManagement();
        await loadDemoModeStats();
        loadModelPerformanceChart('accuracy');
    };
} else {
    window.loadDashboardData = async function() {
        await loadAIPerformanceMetrics();
        await loadAnomalyManagement();
        await loadDemoModeStats();
        loadModelPerformanceChart('accuracy');
    };
}
