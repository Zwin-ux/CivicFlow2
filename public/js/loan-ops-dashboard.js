/**
 * Loan Operations Dashboard
 * Component-based dashboard for loan officers
 */

// ============================================================================
// State Management
// ============================================================================
const DashboardState = {
    user: null,
    currentView: 'pipeline', // 'pipeline', 'queue', 'sla'
    wsConnection: null,
    wsReconnectAttempts: 0,
    wsMaxReconnectAttempts: 5,
    pipelineData: null,
    queueData: null,
    slaData: null,
    loading: {
        pipeline: false,
        queue: false,
        sla: false
    },
    filters: {
        status: null,
        programType: null,
        assignedTo: null
    },
    queueView: 'my-queue', // 'my-queue' or 'unassigned'
    queueSort: {
        column: 'submittedAt',
        direction: 'desc'
    },
    pagination: {
        page: 1,
        limit: 50,
        totalCount: 0
    }
};

// ============================================================================
// API Client
// ============================================================================
const API = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Unauthorized - redirect to login
                window.location.href = '/staff-portal.html';
                return null;
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Dashboard endpoints
    async getPipeline(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/dashboard/pipeline?${params}`);
    },

    async getQueue(view, page = 1, limit = 50) {
        return this.request(`/dashboard/queue?view=${view}&page=${page}&limit=${limit}`);
    },

    async claimApplication(applicationId) {
        return this.request('/dashboard/queue/claim', {
            method: 'POST',
            body: JSON.stringify({ applicationId })
        });
    },

    async getSLAAnalytics(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return this.request(`/dashboard/sla?${params}`);
    },

    async requestDocuments(applicationId, documentTypes, message) {
        return this.request('/dashboard/actions/request-documents', {
            method: 'POST',
            body: JSON.stringify({ applicationId, documentTypes, message })
        });
    },

    async addNote(applicationId, note) {
        return this.request('/dashboard/actions/add-note', {
            method: 'POST',
            body: JSON.stringify({ applicationId, note, isInternal: true })
        });
    },

    async startHuddle(applicationId, participants) {
        return this.request('/dashboard/actions/start-huddle', {
            method: 'POST',
            body: JSON.stringify({ applicationId, participants })
        });
    },

    async logDecision(applicationId, decision, amount, justification, overrideReason) {
        return this.request('/dashboard/actions/log-decision', {
            method: 'POST',
            body: JSON.stringify({ applicationId, decision, amount, justification, overrideReason })
        });
    },

    async getCurrentUser() {
        return this.request('/auth/me');
    }
};

// ============================================================================
// WebSocket Manager
// ============================================================================
const WebSocketManager = {
    pingInterval: null,
    reconnectTimeout: null,

    /**
     * Establish WebSocket connection with userId parameter
     */
    connect() {
        // Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Ensure we have user info before connecting
        if (!DashboardState.user || !DashboardState.user.id) {
            console.warn('Cannot connect WebSocket: user not loaded yet');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsURL = `${protocol}//${window.location.host}/api/dashboard/stream?userId=${DashboardState.user.id}`;
        
        try {
            console.log('Establishing WebSocket connection...');
            DashboardState.wsConnection = new WebSocket(wsURL);
            
            DashboardState.wsConnection.onopen = () => {
                console.log('WebSocket connected successfully');
                DashboardState.wsReconnectAttempts = 0;
                this.updateConnectionStatus(true);
                
                // Start ping mechanism to keep connection alive
                this.startPingInterval();
                
                // Show success notification on reconnect (not initial connect)
                if (DashboardState.wsReconnectAttempts > 0) {
                    Utils.showToast('Real-time updates reconnected', 'success');
                }
            };

            DashboardState.wsConnection.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            DashboardState.wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };

            DashboardState.wsConnection.onclose = (event) => {
                console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
                this.updateConnectionStatus(false);
                this.stopPingInterval();
                
                // Attempt to reconnect with exponential backoff
                this.reconnect();
            };
        } catch (error) {
            console.error('Failed to establish WebSocket connection:', error);
            this.updateConnectionStatus(false);
            this.reconnect();
        }
    },

    /**
     * Reconnect with exponential backoff
     */
    reconnect() {
        // Check if we've exceeded max attempts
        if (DashboardState.wsReconnectAttempts >= DashboardState.wsMaxReconnectAttempts) {
            console.error('Max WebSocket reconnection attempts reached');
            Utils.showToast('Real-time updates unavailable. Please refresh the page.', 'error');
            return;
        }

        // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
        const baseDelay = 1000;
        const delay = Math.min(baseDelay * Math.pow(2, DashboardState.wsReconnectAttempts), 30000);
        DashboardState.wsReconnectAttempts++;

        console.log(`Reconnecting WebSocket in ${delay}ms (attempt ${DashboardState.wsReconnectAttempts}/${DashboardState.wsMaxReconnectAttempts})`);
        
        // Show reconnection notification
        if (DashboardState.wsReconnectAttempts === 1) {
            Utils.showToast('Connection lost. Attempting to reconnect...', 'warning');
        }
        
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    },

    /**
     * Start ping interval to keep connection alive
     */
    startPingInterval() {
        // Clear any existing interval
        this.stopPingInterval();
        
        // Send ping every 25 seconds (server heartbeat is 30s)
        this.pingInterval = setInterval(() => {
            if (DashboardState.wsConnection && DashboardState.wsConnection.readyState === WebSocket.OPEN) {
                try {
                    DashboardState.wsConnection.send(JSON.stringify({ type: 'ping' }));
                } catch (error) {
                    console.error('Failed to send ping:', error);
                }
            }
        }, 25000);
    },

    /**
     * Stop ping interval
     */
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    },

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(message) {
        const { type, data } = message;

        // Handle connection established message
        if (type === 'connection.established') {
            console.log('WebSocket connection established:', data);
            return;
        }

        // Handle pong response
        if (type === 'pong') {
            return;
        }

        // Handle dashboard events
        switch (type) {
            case 'application.updated':
                this.handleApplicationUpdate(data);
                break;
            case 'application.assigned':
                this.handleApplicationAssigned(data);
                break;
            case 'sla.warning':
                this.handleSLAWarning(data);
                break;
            case 'sla.breached':
                this.handleSLABreach(data);
                break;
            default:
                console.log('Unknown WebSocket message type:', type);
        }
    },

    /**
     * Handle application update event
     */
    handleApplicationUpdate(data) {
        console.log('Application updated:', data);
        
        // Update specific application card if visible
        const applicationId = data.id || data.applicationId;
        if (applicationId) {
            this.updateApplicationCard(applicationId, data);
        }
        
        // Refresh current view to show updates
        DashboardComponents.refreshCurrentView();
        
        // Show toast notification with application details
        const appIdShort = applicationId ? `#${applicationId.substring(0, 8)}` : '';
        Utils.showToast(`Application ${appIdShort} updated`, 'info');
    },

    /**
     * Handle application assigned event
     */
    handleApplicationAssigned(data) {
        console.log('Application assigned:', data);
        
        const { applicationId, assignedTo, assignedToName } = data;
        
        // Refresh queue view if active
        if (DashboardState.currentView === 'queue') {
            DashboardComponents.loadQueueData();
        } else {
            // Refresh other views to update assignment status
            DashboardComponents.refreshCurrentView();
        }
        
        // Show notification if assigned to current user
        if (assignedTo === DashboardState.user?.id) {
            const appIdShort = applicationId ? `#${applicationId.substring(0, 8)}` : '';
            Utils.showToast(`New application ${appIdShort} assigned to you`, 'success');
        } else if (assignedToName) {
            // Show notification for assignments to other users (for managers)
            const appIdShort = applicationId ? `#${applicationId.substring(0, 8)}` : '';
            Utils.showToast(`Application ${appIdShort} assigned to ${assignedToName}`, 'info');
        }
    },

    /**
     * Handle SLA warning event
     */
    handleSLAWarning(data) {
        console.log('SLA warning:', data);
        
        const applicationId = data.id || data.applicationId;
        const appIdShort = applicationId ? `#${applicationId.substring(0, 8)}` : '';
        const applicantName = data.applicantName || '';
        
        // Show prominent warning notification
        Utils.showToast(
            `[WARN] SLA Warning: Application ${appIdShort} ${applicantName ? `(${applicantName})` : ''} is approaching deadline`,
            'warning'
        );
        
        // Update application card if visible
        if (applicationId) {
            this.updateApplicationCard(applicationId, data);
        }
        
        // Refresh views to show updated SLA status
        DashboardComponents.refreshCurrentView();
    },

    /**
     * Handle SLA breach event
     */
    handleSLABreach(data) {
        console.log('SLA breach:', data);
        
        const applicationId = data.id || data.applicationId;
        const appIdShort = applicationId ? `#${applicationId.substring(0, 8)}` : '';
        const applicantName = data.applicantName || '';
        
        // Show critical error notification
        Utils.showToast(
            ` SLA Breach: Application ${appIdShort} ${applicantName ? `(${applicantName})` : ''} has exceeded deadline!`,
            'error'
        );
        
        // Update application card if visible
        if (applicationId) {
            this.updateApplicationCard(applicationId, data);
        }
        
        // Refresh views to show breached status
        DashboardComponents.refreshCurrentView();
    },

    /**
     * Update specific application card in the UI
     */
    updateApplicationCard(applicationId, data) {
        // Find the application card in the DOM
        const card = document.querySelector(`[data-app-id="${applicationId}"]`);
        if (!card) {
            return;
        }

        // Update SLA badge if present
        if (data.slaStatus) {
            const slaBadge = card.querySelector('.badge');
            if (slaBadge) {
                slaBadge.className = `badge ${Utils.getSLABadgeClass(data.slaStatus)}`;
                slaBadge.textContent = Utils.getSLABadgeText(data.slaStatus);
            }
        }

        // Update risk score if present
        if (data.riskScore !== undefined) {
            const riskScoreEl = card.querySelector('.risk-score');
            if (riskScoreEl) {
                const riskLevel = DashboardComponents.getRiskLevel(data.riskScore);
                riskScoreEl.className = `risk-score risk-score-${riskLevel}`;
                riskScoreEl.textContent = `${data.riskScore}/100`;
            }
        }

        // Update status if present
        if (data.status) {
            const statusBadge = card.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.className = `status-badge status-${data.status.toLowerCase()}`;
                statusBadge.textContent = DashboardComponents.formatStatus(data.status);
            }
        }

        // Add visual feedback for update
        card.classList.add('card-updated');
        setTimeout(() => {
            card.classList.remove('card-updated');
        }, 2000);
    },

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('ws-status');
        if (statusEl) {
            statusEl.className = `ws-status ${connected ? 'connected' : 'disconnected'}`;
            statusEl.textContent = connected ? 'Live' : 'Offline';
            
            // Add tooltip
            statusEl.title = connected 
                ? 'Real-time updates active' 
                : 'Real-time updates unavailable';
        }
    },

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        console.log('Disconnecting WebSocket...');
        
        // Stop ping interval
        this.stopPingInterval();
        
        // Clear reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        // Close connection
        if (DashboardState.wsConnection) {
            DashboardState.wsConnection.close();
            DashboardState.wsConnection = null;
        }
        
        this.updateConnectionStatus(false);
    }
};

// ============================================================================
// Utility Functions
// ============================================================================
const Utils = {
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    },

    getSLABadgeClass(slaStatus) {
        switch (slaStatus) {
            case 'ON_TRACK': return 'sla-badge-success';
            case 'AT_RISK': return 'sla-badge-warning';
            case 'BREACHED': return 'sla-badge-error';
            default: return 'sla-badge-default';
        }
    },

    getSLABadgeText(slaStatus) {
        switch (slaStatus) {
            case 'ON_TRACK': return 'On Track';
            case 'AT_RISK': return 'At Risk';
            case 'BREACHED': return 'Breached';
            default: return 'Unknown';
        }
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ============================================================================
// Dashboard Components
// ============================================================================
const DashboardComponents = {
    init() {
        this.renderLayout();
        this.attachEventListeners();
        this.loadInitialData(); // This will connect WebSocket after user is loaded
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refreshCurrentView();
        }, 30000);
    },

    renderLayout() {
        const root = document.getElementById('dashboard-root');
        root.innerHTML = `
            <div class="dashboard-container">
                <!-- Header -->
                <header class="dashboard-header">
                    <div class="header-left">
                        <h1 class="dashboard-title">Loan Operations Dashboard</h1>
                    </div>
                    <div class="header-right">
                        <div id="ws-status" class="ws-status disconnected">Connecting...</div>
                        <div class="user-info">
                            <span id="user-name">Loading...</span>
                            <button id="logout-btn" class="btn-icon" title="Logout">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>

                <!-- Navigation Tabs -->
                <nav class="dashboard-nav">
                    <button class="nav-tab active" data-view="pipeline">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        Pipeline
                    </button>
                    <button class="nav-tab" data-view="queue">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                        Queue
                    </button>
                    <button class="nav-tab" data-view="sla">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        SLA Analytics
                    </button>
                </nav>

                <!-- Main Content Area -->
                <main class="dashboard-content">
                    <div id="pipeline-view" class="view-container active"></div>
                    <div id="queue-view" class="view-container"></div>
                    <div id="sla-view" class="view-container"></div>
                </main>
            </div>

            <!-- Toast Container -->
            <div id="toast-container"></div>

            <!-- Modal Container -->
            <div id="modal-container"></div>
        `;
    },

    attachEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('token');
            WebSocketManager.disconnect();
            window.location.href = '/staff-portal.html';
        });
    },

    async loadInitialData() {
        try {
            // Load user info first
            const user = await API.getCurrentUser();
            DashboardState.user = user;
            document.getElementById('user-name').textContent = user.username;

            // Connect WebSocket after user is loaded
            WebSocketManager.connect();

            // Load initial view data
            await this.loadPipelineData();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            Utils.showToast('Failed to load dashboard data', 'error');
        }
    },

    switchView(viewName) {
        // Update state
        DashboardState.currentView = viewName;

        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        // Update view containers
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Load view data
        switch (viewName) {
            case 'pipeline':
                this.loadPipelineData();
                break;
            case 'queue':
                this.loadQueueData();
                break;
            case 'sla':
                this.loadSLAData();
                break;
        }
    },

    refreshCurrentView() {
        switch (DashboardState.currentView) {
            case 'pipeline':
                this.loadPipelineData();
                break;
            case 'queue':
                this.loadQueueData();
                break;
            case 'sla':
                this.loadSLAData();
                break;
        }
    },

    async loadPipelineData() {
        const container = document.getElementById('pipeline-view');
        DashboardState.loading.pipeline = true;

        try {
            const data = await API.getPipeline(DashboardState.filters);
            DashboardState.pipelineData = data;
            this.renderPipelineView(data);
        } catch (error) {
            console.error('Failed to load pipeline data:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Failed to load pipeline data</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="DashboardComponents.loadPipelineData()">Retry</button>
                </div>
            `;
        } finally {
            DashboardState.loading.pipeline = false;
        }
    },

    renderPipelineView(data) {
        const container = document.getElementById('pipeline-view');
        
        if (!data || !data.pipelines || data.pipelines.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <h3>No Applications</h3>
                    <p>There are no applications in the pipeline</p>
                </div>
            `;
            return;
        }

        const statusOrder = [
            'DRAFT',
            'SUBMITTED',
            'UNDER_REVIEW',
            'PENDING_DOCUMENTS',
            'APPROVED',
            'REJECTED',
            'DEFERRED'
        ];

        const statusLabels = {
            'DRAFT': 'Draft',
            'SUBMITTED': 'Submitted',
            'UNDER_REVIEW': 'Under Review',
            'PENDING_DOCUMENTS': 'Pending Documents',
            'APPROVED': 'Approved',
            'REJECTED': 'Rejected',
            'DEFERRED': 'Deferred'
        };

        // Group applications by status
        const pipelineMap = {};
        statusOrder.forEach(status => {
            pipelineMap[status] = data.pipelines.find(p => p.status === status) || {
                status,
                applications: [],
                count: 0
            };
        });

        container.innerHTML = `
            <div class="pipeline-header">
                <h2>Application Pipeline</h2>
                <div class="pipeline-stats">
                    <div class="stat-item">
                        <span class="stat-value">${data.totalCount || 0}</span>
                        <span class="stat-label">Total Applications</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.getPipelineCount(pipelineMap, ['SUBMITTED', 'UNDER_REVIEW'])}</span>
                        <span class="stat-label">In Progress</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.getPipelineCount(pipelineMap, ['APPROVED'])}</span>
                        <span class="stat-label">Approved</span>
                    </div>
                </div>
            </div>
            <div class="pipeline-columns">
                ${statusOrder.map(status => this.renderPipelineColumn(status, statusLabels[status], pipelineMap[status])).join('')}
            </div>
        `;

        // Auto-refresh indicator
        const lastUpdated = document.createElement('div');
        lastUpdated.className = 'last-updated';
        lastUpdated.textContent = `Last updated: ${Utils.formatDate(data.lastUpdated || new Date())}`;
        container.appendChild(lastUpdated);
    },

    getPipelineCount(pipelineMap, statuses) {
        return statuses.reduce((sum, status) => sum + (pipelineMap[status]?.count || 0), 0);
    },

    renderPipelineColumn(status, label, pipeline) {
        const applications = pipeline.applications || [];
        const count = pipeline.count || 0;

        return `
            <div class="pipeline-column">
                <div class="column-header">
                    <h3 class="column-title">${label}</h3>
                    <span class="column-count">${count}</span>
                </div>
                <div class="column-content">
                    ${applications.length === 0 
                        ? '<div class="column-empty">No applications</div>'
                        : applications.map(app => this.renderApplicationCard(app)).join('')
                    }
                </div>
            </div>
        `;
    },

    renderApplicationCard(app) {
        const slaClass = Utils.getSLABadgeClass(app.slaStatus);
        const slaText = Utils.getSLABadgeText(app.slaStatus);
        const hasFraudFlags = app.fraudFlags && app.fraudFlags.length > 0;

        return `
            <div class="application-card" data-app-id="${app.id}">
                <div class="card-header-row">
                    <span class="app-id">#${app.id.substring(0, 8)}</span>
                    <span class="badge ${slaClass}">${slaText}</span>
                </div>
                <div class="card-body">
                    <h4 class="applicant-name">${app.applicantName || 'Unknown'}</h4>
                    <div class="card-details">
                        <div class="detail-row">
                            <span class="detail-label">Program:</span>
                            <span class="detail-value">${app.programType || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">${Utils.formatCurrency(app.requestedAmount || 0)}</span>
                        </div>
                        ${app.riskScore !== undefined ? `
                        <div class="detail-row">
                            <span class="detail-label">Risk Score:</span>
                            <span class="detail-value risk-score-${this.getRiskLevel(app.riskScore)}">${app.riskScore}/100</span>
                        </div>
                        ` : ''}
                        ${app.assignedTo ? `
                        <div class="detail-row">
                            <span class="detail-label">Assigned:</span>
                            <span class="detail-value">${app.assignedTo}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${hasFraudFlags ? `
                    <div class="fraud-indicator">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        ${app.fraudFlags.length} fraud flag${app.fraudFlags.length > 1 ? 's' : ''}
                    </div>
                    ` : ''}
                </div>
                <div class="card-footer">
                    <span class="submitted-time">${Utils.formatRelativeTime(app.submittedAt)}</span>
                    <button class="btn-link" onclick="DashboardComponents.viewApplication('${app.id}')">View Details</button>
                </div>
                <div class="quick-actions">
                    <button class="quick-action-btn" onclick="QuickActionsModal.showRequestDocuments('${app.id}')" title="Request Documents">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Docs
                    </button>
                    <button class="quick-action-btn" onclick="QuickActionsModal.showAddNote('${app.id}')" title="Add Note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Note
                    </button>
                    <button class="quick-action-btn" onclick="QuickActionsModal.showStartHuddle('${app.id}')" title="Start Huddle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Huddle
                    </button>
                    <button class="quick-action-btn" onclick="QuickActionsModal.showLogDecision('${app.id}')" title="Log Decision">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                        Decision
                    </button>
                </div>
            </div>
        `;
    },

    getRiskLevel(score) {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    },

    viewApplication(applicationId) {
        // Navigate to application detail view
        window.location.href = `/staff-portal.html?app=${applicationId}`;
    },

    async loadQueueData() {
        const container = document.getElementById('queue-view');
        DashboardState.loading.queue = true;

        try {
            const data = await API.getQueue(
                DashboardState.queueView,
                DashboardState.pagination.page,
                DashboardState.pagination.limit
            );
            
            DashboardState.queueData = data;
            DashboardState.pagination.totalCount = data.totalCount || 0;
            
            this.renderQueueView(data);
        } catch (error) {
            console.error('Failed to load queue data:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Failed to load queue data</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="DashboardComponents.loadQueueData()">Retry</button>
                </div>
            `;
        } finally {
            DashboardState.loading.queue = false;
        }
    },

    renderQueueView(data) {
        const container = document.getElementById('queue-view');
        
        const applications = data.applications || [];
        const hasMore = data.hasMore || false;
        const totalCount = data.totalCount || 0;
        
        // Calculate pagination info
        const startIndex = (DashboardState.pagination.page - 1) * DashboardState.pagination.limit + 1;
        const endIndex = Math.min(
            DashboardState.pagination.page * DashboardState.pagination.limit,
            totalCount
        );
        const totalPages = Math.ceil(totalCount / DashboardState.pagination.limit);

        container.innerHTML = `
            <div class="queue-header">
                <h2>Work Queue</h2>
                <div class="queue-tabs">
                    <button 
                        class="queue-tab ${DashboardState.queueView === 'my-queue' ? 'active' : ''}" 
                        data-view="my-queue"
                        onclick="DashboardComponents.switchQueueView('my-queue')"
                    >
                        My Queue
                        ${DashboardState.queueView === 'my-queue' ? `<span class="tab-count">${totalCount}</span>` : ''}
                    </button>
                    <button 
                        class="queue-tab ${DashboardState.queueView === 'unassigned' ? 'active' : ''}" 
                        data-view="unassigned"
                        onclick="DashboardComponents.switchQueueView('unassigned')"
                    >
                        Unassigned
                        ${DashboardState.queueView === 'unassigned' ? `<span class="tab-count">${totalCount}</span>` : ''}
                    </button>
                </div>
            </div>

            ${applications.length === 0 ? this.renderQueueEmptyState() : `
                <div class="queue-table-container">
                    <table class="queue-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-sort="id" onclick="DashboardComponents.sortQueue('id')">
                                    Application ID
                                    ${this.renderSortIcon('id')}
                                </th>
                                <th class="sortable" data-sort="applicantName" onclick="DashboardComponents.sortQueue('applicantName')">
                                    Applicant
                                    ${this.renderSortIcon('applicantName')}
                                </th>
                                <th class="sortable" data-sort="programType" onclick="DashboardComponents.sortQueue('programType')">
                                    Program
                                    ${this.renderSortIcon('programType')}
                                </th>
                                <th class="sortable" data-sort="requestedAmount" onclick="DashboardComponents.sortQueue('requestedAmount')">
                                    Amount
                                    ${this.renderSortIcon('requestedAmount')}
                                </th>
                                <th class="sortable" data-sort="status" onclick="DashboardComponents.sortQueue('status')">
                                    Status
                                    ${this.renderSortIcon('status')}
                                </th>
                                <th class="sortable" data-sort="submittedAt" onclick="DashboardComponents.sortQueue('submittedAt')">
                                    Submitted
                                    ${this.renderSortIcon('submittedAt')}
                                </th>
                                <th class="sortable" data-sort="slaStatus" onclick="DashboardComponents.sortQueue('slaStatus')">
                                    SLA
                                    ${this.renderSortIcon('slaStatus')}
                                </th>
                                <th>Risk</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${applications.map(app => this.renderQueueRow(app)).join('')}
                        </tbody>
                    </table>
                </div>

                ${totalCount > DashboardState.pagination.limit ? `
                    <div class="queue-pagination">
                        <div class="pagination-info">
                            Showing ${startIndex}-${endIndex} of ${totalCount} applications
                        </div>
                        <div class="pagination-controls">
                            <button 
                                class="pagination-btn" 
                                ${DashboardState.pagination.page === 1 ? 'disabled' : ''}
                                onclick="DashboardComponents.goToPage(1)"
                            >
                                First
                            </button>
                            <button 
                                class="pagination-btn" 
                                ${DashboardState.pagination.page === 1 ? 'disabled' : ''}
                                onclick="DashboardComponents.goToPage(${DashboardState.pagination.page - 1})"
                            >
                                Previous
                            </button>
                            <span class="pagination-page">
                                Page ${DashboardState.pagination.page} of ${totalPages}
                            </span>
                            <button 
                                class="pagination-btn" 
                                ${!hasMore ? 'disabled' : ''}
                                onclick="DashboardComponents.goToPage(${DashboardState.pagination.page + 1})"
                            >
                                Next
                            </button>
                            <button 
                                class="pagination-btn" 
                                ${!hasMore ? 'disabled' : ''}
                                onclick="DashboardComponents.goToPage(${totalPages})"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                ` : ''}
            `}
        `;
    },

    renderQueueEmptyState() {
        const isMyQueue = DashboardState.queueView === 'my-queue';
        return `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <h3>${isMyQueue ? 'Your Queue is Empty' : 'No Unassigned Applications'}</h3>
                <p>${isMyQueue 
                    ? 'You have no applications assigned to you at the moment.' 
                    : 'All applications have been assigned to loan officers.'
                }</p>
                ${!isMyQueue ? `
                    <button class="btn btn-primary" onclick="DashboardComponents.switchQueueView('my-queue')">
                        View My Queue
                    </button>
                ` : ''}
            </div>
        `;
    },

    renderQueueRow(app) {
        const isUnassigned = DashboardState.queueView === 'unassigned';
        const slaClass = Utils.getSLABadgeClass(app.slaStatus);
        const slaText = Utils.getSLABadgeText(app.slaStatus);
        const hasFraudFlags = app.fraudFlags && app.fraudFlags.length > 0;

        return `
            <tr class="queue-row" data-app-id="${app.id}">
                <td class="app-id-cell">
                    <span class="app-id-short">#${app.id.substring(0, 8)}</span>
                </td>
                <td class="applicant-cell">
                    <div class="applicant-info">
                        <span class="applicant-name">${app.applicantName || 'Unknown'}</span>
                    </div>
                </td>
                <td class="program-cell">
                    <span class="program-type">${app.programType || 'N/A'}</span>
                </td>
                <td class="amount-cell">
                    <span class="amount">${Utils.formatCurrency(app.requestedAmount || 0)}</span>
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${app.status?.toLowerCase()}">${this.formatStatus(app.status)}</span>
                </td>
                <td class="submitted-cell">
                    <span class="submitted-date" title="${Utils.formatDate(app.submittedAt)}">
                        ${Utils.formatRelativeTime(app.submittedAt)}
                    </span>
                </td>
                <td class="sla-cell">
                    <span class="badge ${slaClass}">${slaText}</span>
                </td>
                <td class="risk-cell">
                    <div class="risk-info">
                        ${app.riskScore !== undefined ? `
                            <span class="risk-score risk-score-${this.getRiskLevel(app.riskScore)}">
                                ${app.riskScore}
                            </span>
                        ` : '<span class="risk-score-na">N/A</span>'}
                        ${hasFraudFlags ? `
                            <span class="fraud-indicator-small" title="${app.fraudFlags.length} fraud flag(s)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </span>
                        ` : ''}
                    </div>
                </td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button 
                            class="btn-action btn-view" 
                            onclick="DashboardComponents.viewApplication('${app.id}')"
                            title="View Details"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${isUnassigned ? `
                            <button 
                                class="btn-action btn-claim" 
                                onclick="DashboardComponents.claimApplication('${app.id}')"
                                title="Claim Application"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                Claim
                            </button>
                        ` : ''}
                        <button 
                            class="btn-action" 
                            onclick="QuickActionsModal.showRequestDocuments('${app.id}')"
                            title="Request Documents"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                        </button>
                        <button 
                            class="btn-action" 
                            onclick="QuickActionsModal.showAddNote('${app.id}')"
                            title="Add Note"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button 
                            class="btn-action" 
                            onclick="QuickActionsModal.showStartHuddle('${app.id}')"
                            title="Start Huddle"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </button>
                        <button 
                            class="btn-action" 
                            onclick="QuickActionsModal.showLogDecision('${app.id}')"
                            title="Log Decision"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    renderSortIcon(column) {
        const currentSort = DashboardState.queueSort || {};
        if (currentSort.column !== column) {
            return '<span class="sort-icon">⇅</span>';
        }
        return currentSort.direction === 'asc' 
            ? '<span class="sort-icon active">↑</span>' 
            : '<span class="sort-icon active">↓</span>';
    },

    formatStatus(status) {
        if (!status) return 'Unknown';
        return status.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    },

    switchQueueView(view) {
        if (DashboardState.queueView === view) return;
        
        DashboardState.queueView = view;
        DashboardState.pagination.page = 1; // Reset to first page
        this.loadQueueData();
    },

    sortQueue(column) {
        const currentSort = DashboardState.queueSort || {};
        
        // Toggle direction if same column, otherwise default to ascending
        if (currentSort.column === column) {
            DashboardState.queueSort = {
                column,
                direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
            };
        } else {
            DashboardState.queueSort = {
                column,
                direction: 'asc'
            };
        }

        // Sort the current data locally
        if (DashboardState.queueData && DashboardState.queueData.applications) {
            const applications = [...DashboardState.queueData.applications];
            
            applications.sort((a, b) => {
                let aVal = a[column];
                let bVal = b[column];

                // Handle different data types
                if (column === 'requestedAmount' || column === 'riskScore') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else if (column === 'submittedAt') {
                    aVal = new Date(aVal).getTime();
                    bVal = new Date(bVal).getTime();
                } else {
                    aVal = String(aVal || '').toLowerCase();
                    bVal = String(bVal || '').toLowerCase();
                }

                if (aVal < bVal) return DashboardState.queueSort.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return DashboardState.queueSort.direction === 'asc' ? 1 : -1;
                return 0;
            });

            DashboardState.queueData.applications = applications;
            this.renderQueueView(DashboardState.queueData);
        }
    },

    goToPage(page) {
        if (page < 1) return;
        
        const totalPages = Math.ceil(DashboardState.pagination.totalCount / DashboardState.pagination.limit);
        if (page > totalPages) return;

        DashboardState.pagination.page = page;
        this.loadQueueData();
    },

    async claimApplication(applicationId) {
        try {
            // Show loading state
            const claimBtn = document.querySelector(`[onclick*="claimApplication('${applicationId}')"]`);
            if (claimBtn) {
                claimBtn.disabled = true;
                claimBtn.innerHTML = '<span class="btn-loading">Claiming...</span>';
            }

            const result = await API.claimApplication(applicationId);

            if (result.success) {
                Utils.showToast('Application claimed successfully', 'success');
                
                // Reload queue data
                await this.loadQueueData();
                
                // If WebSocket is connected, it will handle the update
                // Otherwise, we've already reloaded the data
            } else {
                throw new Error(result.message || 'Failed to claim application');
            }
        } catch (error) {
            console.error('Failed to claim application:', error);
            Utils.showToast(error.message || 'Failed to claim application', 'error');
            
            // Re-enable button on error
            const claimBtn = document.querySelector(`[onclick*="claimApplication('${applicationId}')"]`);
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Claim
                `;
            }
        }
    },

    async loadSLAData(startDate, endDate) {
        const container = document.getElementById('sla-view');
        DashboardState.loading.sla = true;

        try {
            const data = await API.getSLAAnalytics(startDate, endDate);
            DashboardState.slaData = data;
            this.renderSLAView(data);
        } catch (error) {
            console.error('Failed to load SLA data:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Failed to load SLA analytics</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="DashboardComponents.loadSLAData()">Retry</button>
                </div>
            `;
        } finally {
            DashboardState.loading.sla = false;
        }
    },

    renderSLAView(data) {
        const container = document.getElementById('sla-view');
        
        const breachedCount = data.breachedApplications?.length || 0;
        const atRiskCount = data.atRiskApplications?.length || 0;
        const bottleneckCount = data.bottlenecks?.length || 0;

        container.innerHTML = `
            <div class="sla-header">
                <h2>SLA Analytics</h2>
                <div class="sla-date-filter">
                    <label for="sla-start-date">From:</label>
                    <input 
                        type="date" 
                        id="sla-start-date" 
                        class="form-input date-input"
                        onchange="DashboardComponents.applySLADateFilter()"
                    >
                    <label for="sla-end-date">To:</label>
                    <input 
                        type="date" 
                        id="sla-end-date" 
                        class="form-input date-input"
                        onchange="DashboardComponents.applySLADateFilter()"
                    >
                    <button 
                        class="btn btn-secondary" 
                        onclick="DashboardComponents.clearSLADateFilter()"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div class="sla-stats">
                <div class="stat-card stat-card-error">
                    <div class="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${breachedCount}</div>
                        <div class="stat-label">SLA Breached</div>
                    </div>
                </div>
                <div class="stat-card stat-card-warning">
                    <div class="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${atRiskCount}</div>
                        <div class="stat-label">At Risk</div>
                    </div>
                </div>
                <div class="stat-card stat-card-info">
                    <div class="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${bottleneckCount}</div>
                        <div class="stat-label">Bottlenecks</div>
                    </div>
                </div>
            </div>

            <div class="sla-content">
                <!-- Breached Applications -->
                <div class="sla-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            SLA Breached Applications
                        </h3>
                        <span class="section-count">${breachedCount}</span>
                    </div>
                    ${this.renderSLAApplicationList(data.breachedApplications, 'breached')}
                </div>

                <!-- At Risk Applications -->
                <div class="sla-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            At Risk Applications
                        </h3>
                        <span class="section-count">${atRiskCount}</span>
                    </div>
                    ${this.renderSLAApplicationList(data.atRiskApplications, 'at-risk')}
                </div>

                <!-- Processing Time Chart -->
                <div class="sla-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="12" y1="20" x2="12" y2="10"></line>
                                <line x1="18" y1="20" x2="18" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="16"></line>
                            </svg>
                            Average Processing Time by Stage
                        </h3>
                    </div>
                    ${this.renderProcessingTimeChart(data.averageProcessingTime)}
                </div>

                <!-- Bottleneck Analysis -->
                <div class="sla-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                            Bottleneck Analysis
                        </h3>
                        <span class="section-count">${bottleneckCount}</span>
                    </div>
                    ${this.renderBottleneckAnalysis(data.bottlenecks)}
                </div>
            </div>
        `;
    },

    renderSLAApplicationList(applications, type) {
        if (!applications || applications.length === 0) {
            return `
                <div class="sla-list-empty">
                    <p>No ${type === 'breached' ? 'breached' : 'at-risk'} applications</p>
                </div>
            `;
        }

        const highlightClass = type === 'breached' ? 'sla-item-breached' : 'sla-item-at-risk';

        return `
            <div class="sla-list">
                ${applications.map(app => `
                    <div class="sla-item ${highlightClass}">
                        <div class="sla-item-header">
                            <div class="sla-item-info">
                                <span class="sla-item-id">#${app.id.substring(0, 8)}</span>
                                <span class="sla-item-name">${app.applicantName || 'Unknown'}</span>
                            </div>
                            <span class="badge ${Utils.getSLABadgeClass(app.slaStatus)}">
                                ${Utils.getSLABadgeText(app.slaStatus)}
                            </span>
                        </div>
                        <div class="sla-item-details">
                            <div class="sla-detail">
                                <span class="sla-detail-label">Program:</span>
                                <span class="sla-detail-value">${app.programType || 'N/A'}</span>
                            </div>
                            <div class="sla-detail">
                                <span class="sla-detail-label">Status:</span>
                                <span class="sla-detail-value">${this.formatStatus(app.status)}</span>
                            </div>
                            <div class="sla-detail">
                                <span class="sla-detail-label">Submitted:</span>
                                <span class="sla-detail-value">${Utils.formatDate(app.submittedAt)}</span>
                            </div>
                            <div class="sla-detail">
                                <span class="sla-detail-label">Deadline:</span>
                                <span class="sla-detail-value ${type === 'breached' ? 'text-error' : 'text-warning'}">
                                    ${Utils.formatDate(app.slaDeadline)}
                                </span>
                            </div>
                            ${app.assignedTo ? `
                            <div class="sla-detail">
                                <span class="sla-detail-label">Assigned To:</span>
                                <span class="sla-detail-value">${app.assignedTo}</span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="sla-item-actions">
                            <button 
                                class="btn btn-primary btn-sm" 
                                onclick="DashboardComponents.viewApplication('${app.id}')"
                            >
                                View Application
                            </button>
                            <button 
                                class="btn btn-secondary btn-sm" 
                                onclick="QuickActionsModal.showRequestDocuments('${app.id}')"
                            >
                                Request Docs
                            </button>
                            <button 
                                class="btn btn-secondary btn-sm" 
                                onclick="QuickActionsModal.showAddNote('${app.id}')"
                            >
                                Add Note
                            </button>
                            <button 
                                class="btn btn-secondary btn-sm" 
                                onclick="QuickActionsModal.showStartHuddle('${app.id}')"
                            >
                                Start Huddle
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderProcessingTimeChart(averageProcessingTime) {
        if (!averageProcessingTime || Object.keys(averageProcessingTime).length === 0) {
            return `
                <div class="chart-empty">
                    <p>No processing time data available</p>
                </div>
            `;
        }

        // Sort stages by processing time (descending)
        const sortedStages = Object.entries(averageProcessingTime)
            .sort(([, a], [, b]) => b - a);

        const maxTime = Math.max(...sortedStages.map(([, time]) => time));

        return `
            <div class="processing-time-chart">
                ${sortedStages.map(([stage, hours]) => {
                    const percentage = (hours / maxTime) * 100;
                    const barClass = hours > 48 ? 'bar-error' : hours > 24 ? 'bar-warning' : 'bar-success';
                    
                    return `
                        <div class="chart-row">
                            <div class="chart-label">
                                <span class="stage-name">${this.formatStatus(stage)}</span>
                            </div>
                            <div class="chart-bar-container">
                                <div class="chart-bar ${barClass}" style="width: ${percentage}%">
                                    <span class="chart-value">${hours.toFixed(1)}h</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderBottleneckAnalysis(bottlenecks) {
        if (!bottlenecks || bottlenecks.length === 0) {
            return `
                <div class="bottleneck-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <p>No bottlenecks detected! All stages are processing within acceptable timeframes.</p>
                </div>
            `;
        }

        return `
            <div class="bottleneck-list">
                ${bottlenecks.map((bottleneck, index) => {
                    const severity = bottleneck.averageTimeInStage > bottleneck.threshold * 2 ? 'high' : 'medium';
                    const recommendation = this.getBottleneckRecommendation(bottleneck);
                    
                    return `
                        <div class="bottleneck-item bottleneck-${severity}">
                            <div class="bottleneck-header">
                                <div class="bottleneck-rank">#${index + 1}</div>
                                <div class="bottleneck-info">
                                    <h4 class="bottleneck-stage">${this.formatStatus(bottleneck.stage)}</h4>
                                    <div class="bottleneck-metrics">
                                        <span class="metric">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            ${bottleneck.averageTimeInStage.toFixed(1)}h avg
                                        </span>
                                        <span class="metric">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                            ${bottleneck.applicationCount} apps
                                        </span>
                                        <span class="metric metric-threshold">
                                            Threshold: ${bottleneck.threshold}h
                                        </span>
                                    </div>
                                </div>
                                <div class="bottleneck-severity">
                                    <span class="severity-badge severity-${severity}">
                                        ${severity === 'high' ? 'High Priority' : 'Medium Priority'}
                                    </span>
                                </div>
                            </div>
                            <div class="bottleneck-recommendation">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <polyline points="2 17 12 22 22 17"></polyline>
                                    <polyline points="2 12 12 17 22 12"></polyline>
                                </svg>
                                <span>${recommendation}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    getBottleneckRecommendation(bottleneck) {
        const stage = bottleneck.stage;
        const avgTime = bottleneck.averageTimeInStage;
        const count = bottleneck.applicationCount;

        // Generate contextual recommendations based on stage and metrics
        if (stage === 'UNDER_REVIEW') {
            if (count > 20) {
                return 'Consider assigning more reviewers or implementing auto-assignment rules to distribute workload.';
            }
            return 'Review process may need streamlining. Consider implementing decision templates or checklists.';
        } else if (stage === 'PENDING_DOCUMENTS') {
            return 'Applicants may need clearer communication about required documents. Consider automated reminders.';
        } else if (stage === 'SUBMITTED') {
            return 'Initial triage is taking too long. Consider implementing auto-assignment or priority queues.';
        } else if (avgTime > 72) {
            return 'Critical delay detected. Immediate attention required to prevent further SLA breaches.';
        } else {
            return 'Monitor this stage closely and consider process improvements or additional resources.';
        }
    },

    applySLADateFilter() {
        const startDateInput = document.getElementById('sla-start-date');
        const endDateInput = document.getElementById('sla-end-date');
        
        const startDate = startDateInput?.value || null;
        const endDate = endDateInput?.value || null;
        
        this.loadSLAData(startDate, endDate);
    },

    clearSLADateFilter() {
        const startDateInput = document.getElementById('sla-start-date');
        const endDateInput = document.getElementById('sla-end-date');
        
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        
        this.loadSLAData();
    }
};

// ============================================================================
// Quick Actions Modal Manager
// ============================================================================
const QuickActionsModal = {
    /**
     * Show Request Documents modal
     */
    showRequestDocuments(applicationId) {
        const documentTypes = [
            { value: 'W9', label: 'W9 Form' },
            { value: 'EIN_VERIFICATION', label: 'EIN Verification' },
            { value: 'BANK_STATEMENT', label: 'Bank Statement' },
            { value: 'TAX_RETURN', label: 'Tax Return' },
            { value: 'BUSINESS_LICENSE', label: 'Business License' },
            { value: 'OTHER', label: 'Other' }
        ];

        const modalHTML = `
            <div class="modal-overlay" id="quick-action-modal">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Request Documents</h3>
                        <button class="modal-close" onclick="QuickActionsModal.close()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="request-documents-form">
                            <div class="form-group">
                                <label class="form-label">Select Documents to Request *</label>
                                <div class="document-types-list">
                                    ${documentTypes.map(doc => `
                                        <div class="form-checkbox">
                                            <input 
                                                type="checkbox" 
                                                id="doc-${doc.value}" 
                                                name="documentTypes" 
                                                value="${doc.value}"
                                            >
                                            <label for="doc-${doc.value}">${doc.label}</label>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="doc-message">Message to Applicant</label>
                                <textarea 
                                    id="doc-message" 
                                    class="form-textarea" 
                                    rows="4"
                                    placeholder="Enter a message to the applicant explaining why these documents are needed..."
                                >Please upload the following documents to complete your application.</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="QuickActionsModal.close()">Cancel</button>
                        <button class="btn btn-primary" onclick="QuickActionsModal.submitRequestDocuments('${applicationId}')">
                            Send Request
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    },

    /**
     * Submit request documents form
     */
    async submitRequestDocuments(applicationId) {
        const form = document.getElementById('request-documents-form');
        const checkboxes = form.querySelectorAll('input[name="documentTypes"]:checked');
        const message = document.getElementById('doc-message').value;

        const documentTypes = Array.from(checkboxes).map(cb => cb.value);

        if (documentTypes.length === 0) {
            Utils.showToast('Please select at least one document type', 'warning');
            return;
        }

        try {
            // Disable submit button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }

            await API.requestDocuments(applicationId, documentTypes, message);
            
            Utils.showToast('Document request sent successfully', 'success');
            this.close();
            DashboardComponents.refreshCurrentView();
        } catch (error) {
            console.error('Failed to request documents:', error);
            Utils.showToast(error.message || 'Failed to send document request', 'error');
            
            // Re-enable button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Request';
            }
        }
    },

    /**
     * Show Add Note modal
     */
    showAddNote(applicationId) {
        const modalHTML = `
            <div class="modal-overlay" id="quick-action-modal">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Add Internal Note</h3>
                        <button class="modal-close" onclick="QuickActionsModal.close()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="add-note-form">
                            <div class="form-group">
                                <label class="form-label" for="note-content">Note *</label>
                                <div class="note-editor">
                                    <div class="editor-toolbar">
                                        <button type="button" class="toolbar-btn" onclick="QuickActionsModal.formatText('bold')" title="Bold">
                                            <strong>B</strong>
                                        </button>
                                        <button type="button" class="toolbar-btn" onclick="QuickActionsModal.formatText('italic')" title="Italic">
                                            <em>I</em>
                                        </button>
                                        <button type="button" class="toolbar-btn" onclick="QuickActionsModal.formatText('underline')" title="Underline">
                                            <u>U</u>
                                        </button>
                                        <span class="toolbar-separator">|</span>
                                        <button type="button" class="toolbar-btn" onclick="QuickActionsModal.insertList('ul')" title="Bullet List">
                                            • List
                                        </button>
                                        <button type="button" class="toolbar-btn" onclick="QuickActionsModal.insertList('ol')" title="Numbered List">
                                            1. List
                                        </button>
                                    </div>
                                    <div 
                                        id="note-content" 
                                        class="note-editor-content" 
                                        contenteditable="true"
                                        placeholder="Enter your internal note here..."
                                    ></div>
                                </div>
                                <small class="form-help">This note will only be visible to staff members.</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="QuickActionsModal.close()">Cancel</button>
                        <button class="btn btn-primary" onclick="QuickActionsModal.submitAddNote('${applicationId}')">
                            Add Note
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    },

    /**
     * Format text in rich text editor
     */
    formatText(command) {
        document.execCommand(command, false, null);
        document.getElementById('note-content').focus();
    },

    /**
     * Insert list in rich text editor
     */
    insertList(type) {
        const command = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
        document.execCommand(command, false, null);
        document.getElementById('note-content').focus();
    },

    /**
     * Submit add note form
     */
    async submitAddNote(applicationId) {
        const noteContent = document.getElementById('note-content');
        const note = noteContent.innerText.trim();

        if (!note) {
            Utils.showToast('Please enter a note', 'warning');
            return;
        }

        try {
            // Disable submit button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Adding...';
            }

            await API.addNote(applicationId, note);
            
            Utils.showToast('Note added successfully', 'success');
            this.close();
            DashboardComponents.refreshCurrentView();
        } catch (error) {
            console.error('Failed to add note:', error);
            Utils.showToast(error.message || 'Failed to add note', 'error');
            
            // Re-enable button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add Note';
            }
        }
    },

    /**
     * Show Start Huddle modal
     */
    showStartHuddle(applicationId) {
        const modalHTML = `
            <div class="modal-overlay" id="quick-action-modal">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Start Teams Huddle</h3>
                        <button class="modal-close" onclick="QuickActionsModal.close()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="start-huddle-form">
                            <div class="form-group">
                                <label class="form-label" for="huddle-participants">Participant Email Addresses *</label>
                                <div id="participants-container">
                                    <div class="participant-input-group">
                                        <input 
                                            type="email" 
                                            class="form-input participant-email" 
                                            placeholder="participant@example.com"
                                            required
                                        >
                                        <button type="button" class="btn-icon" onclick="QuickActionsModal.removeParticipant(this)" title="Remove">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="QuickActionsModal.addParticipant()" style="margin-top: 0.5rem;">
                                    + Add Participant
                                </button>
                                <small class="form-help">Enter email addresses of team members to invite to the huddle.</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Meeting Details</label>
                                <div class="meeting-info">
                                    <p><strong>Start Time:</strong> 5 minutes from now</p>
                                    <p><strong>Duration:</strong> 1 hour</p>
                                    <p><strong>Type:</strong> Microsoft Teams Meeting</p>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="QuickActionsModal.close()">Cancel</button>
                        <button class="btn btn-primary" onclick="QuickActionsModal.submitStartHuddle('${applicationId}')">
                            Create Meeting
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    },

    /**
     * Add participant input field
     */
    addParticipant() {
        const container = document.getElementById('participants-container');
        const inputGroup = document.createElement('div');
        inputGroup.className = 'participant-input-group';
        inputGroup.innerHTML = `
            <input 
                type="email" 
                class="form-input participant-email" 
                placeholder="participant@example.com"
                required
            >
            <button type="button" class="btn-icon" onclick="QuickActionsModal.removeParticipant(this)" title="Remove">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        container.appendChild(inputGroup);
    },

    /**
     * Remove participant input field
     */
    removeParticipant(button) {
        const container = document.getElementById('participants-container');
        const inputGroups = container.querySelectorAll('.participant-input-group');
        
        // Keep at least one input field
        if (inputGroups.length > 1) {
            button.closest('.participant-input-group').remove();
        } else {
            Utils.showToast('At least one participant is required', 'warning');
        }
    },

    /**
     * Submit start huddle form
     */
    async submitStartHuddle(applicationId) {
        const emailInputs = document.querySelectorAll('.participant-email');
        const participants = Array.from(emailInputs)
            .map(input => input.value.trim())
            .filter(email => email);

        if (participants.length === 0) {
            Utils.showToast('Please enter at least one participant email', 'warning');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = participants.filter(email => !emailRegex.test(email));
        if (invalidEmails.length > 0) {
            Utils.showToast('Please enter valid email addresses', 'warning');
            return;
        }

        try {
            // Disable submit button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating...';
            }

            const result = await API.startHuddle(applicationId, participants);
            
            Utils.showToast('Teams meeting created successfully', 'success');
            this.close();
            
            // Open meeting link in new tab
            if (result.meetingLink) {
                window.open(result.meetingLink, '_blank');
            }
            
            DashboardComponents.refreshCurrentView();
        } catch (error) {
            console.error('Failed to start huddle:', error);
            Utils.showToast(error.message || 'Failed to create Teams meeting', 'error');
            
            // Re-enable button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Meeting';
            }
        }
    },

    /**
     * Show Log Decision modal
     */
    showLogDecision(applicationId) {
        const modalHTML = `
            <div class="modal-overlay" id="quick-action-modal">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Log Decision</h3>
                        <button class="modal-close" onclick="QuickActionsModal.close()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="log-decision-form">
                            <div class="form-group">
                                <label class="form-label" for="decision-type">Decision *</label>
                                <select id="decision-type" class="form-select" required>
                                    <option value="">Select decision...</option>
                                    <option value="APPROVED">Approve</option>
                                    <option value="REJECTED">Reject</option>
                                    <option value="DEFERRED">Defer</option>
                                </select>
                            </div>
                            <div class="form-group" id="approved-amount-group" style="display: none;">
                                <label class="form-label" for="approved-amount">Approved Amount</label>
                                <input 
                                    type="number" 
                                    id="approved-amount" 
                                    class="form-input" 
                                    placeholder="Enter approved amount"
                                    min="0"
                                    step="0.01"
                                >
                                <small class="form-help">Leave blank to approve the requested amount.</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="decision-justification">Justification *</label>
                                <textarea 
                                    id="decision-justification" 
                                    class="form-textarea" 
                                    rows="4"
                                    placeholder="Provide justification for this decision..."
                                    required
                                ></textarea>
                                <small class="form-help">Explain the reasoning behind this decision.</small>
                            </div>
                            <div class="form-group" id="override-reason-group" style="display: none;">
                                <label class="form-label" for="override-reason">Override Reason</label>
                                <textarea 
                                    id="override-reason" 
                                    class="form-textarea" 
                                    rows="3"
                                    placeholder="If overriding system recommendation, explain why..."
                                ></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="QuickActionsModal.close()">Cancel</button>
                        <button class="btn btn-primary" onclick="QuickActionsModal.submitLogDecision('${applicationId}')">
                            Submit Decision
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML);

        // Add event listener for decision type change
        const decisionType = document.getElementById('decision-type');
        decisionType.addEventListener('change', (e) => {
            const approvedAmountGroup = document.getElementById('approved-amount-group');
            const overrideReasonGroup = document.getElementById('override-reason-group');
            
            if (e.target.value === 'APPROVED') {
                approvedAmountGroup.style.display = 'block';
                overrideReasonGroup.style.display = 'block';
            } else {
                approvedAmountGroup.style.display = 'none';
                overrideReasonGroup.style.display = e.target.value ? 'block' : 'none';
            }
        });
    },

    /**
     * Submit log decision form
     */
    async submitLogDecision(applicationId) {
        const decision = document.getElementById('decision-type').value;
        const amount = document.getElementById('approved-amount').value;
        const justification = document.getElementById('decision-justification').value.trim();
        const overrideReason = document.getElementById('override-reason').value.trim();

        if (!decision) {
            Utils.showToast('Please select a decision', 'warning');
            return;
        }

        if (!justification) {
            Utils.showToast('Please provide justification', 'warning');
            return;
        }

        try {
            // Disable submit button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            await API.logDecision(
                applicationId, 
                decision, 
                amount || null, 
                justification,
                overrideReason || null
            );
            
            Utils.showToast('Decision logged successfully', 'success');
            this.close();
            DashboardComponents.refreshCurrentView();
        } catch (error) {
            console.error('Failed to log decision:', error);
            Utils.showToast(error.message || 'Failed to log decision', 'error');
            
            // Re-enable button
            const submitBtn = document.querySelector('.modal-footer .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Decision';
            }
        }
    },

    /**
     * Show modal
     */
    showModal(html) {
        const container = document.getElementById('modal-container');
        container.innerHTML = html;
        
        // Trigger animation
        setTimeout(() => {
            const overlay = document.getElementById('quick-action-modal');
            if (overlay) {
                overlay.classList.add('show');
            }
        }, 10);

        // Close on overlay click
        const overlay = document.getElementById('quick-action-modal');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', this.handleEscapeKey);
    },

    /**
     * Handle Escape key press
     */
    handleEscapeKey(e) {
        if (e.key === 'Escape') {
            QuickActionsModal.close();
        }
    },

    /**
     * Close modal
     */
    close() {
        const overlay = document.getElementById('quick-action-modal');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                const container = document.getElementById('modal-container');
                container.innerHTML = '';
            }, 300);
        }

        // Remove escape key listener
        document.removeEventListener('keydown', this.handleEscapeKey);
    }
};

// ============================================================================
// Initialize Dashboard
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/staff-portal.html';
        return;
    }

    // Initialize dashboard
    DashboardComponents.init();
});
