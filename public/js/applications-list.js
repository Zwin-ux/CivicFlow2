/**
 * Applications List
 * Displays application cards with demo indicators and loading states
 */

(function() {
    'use strict';

    // State
    let loadingTimeout = null;
    let applicationsData = [];
    let isDemo = false;
    let liveAppListenerAttached = false;
    let liveAppAttachAttempts = 0;
    const MAX_LIVE_APP_ATTACH_ATTEMPTS = 6;
    const LIVE_APP_ATTACH_DELAY = 800;

    /**
     * Initialize applications list
     */
    async function init() {
        showLoadingState();
        
        // Set timeout to show demo data after 3 seconds if API is slow
        loadingTimeout = setTimeout(() => {
            console.log('Loading timeout - showing demo data');
            loadApplications(true);
        }, 3000);

        // Try to load real data
        await loadApplications();
        initLiveApplicationFeed();
    }

    /**
     * Show loading skeleton screens
     */
    function showLoadingState() {
        const grid = document.getElementById('applications-grid');
        grid.innerHTML = '';

        // Add skeleton loaders for application cards
        for (let i = 0; i < 6; i++) {
            const skeleton = SkeletonLoader.createCard({
                count: 1,
                height: '280px',
                showImage: false,
                showActions: true
            });
            grid.appendChild(skeleton);
        }
    }

    /**
     * Load applications from API
     * @param {boolean} forceDemo - Force demo data
     */
    async function loadApplications(forceDemo = false) {
        try {
            // Clear timeout if data loads successfully
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                loadingTimeout = null;
            }

            // Fetch applications
            const response = await ApiClient.getApplications();
            
            applicationsData = response.data;
            isDemo = response.isDemo || forceDemo;

            // Render applications
            renderApplications(applicationsData, isDemo);

            // Show demo banner if in demo mode
            if (isDemo) {
                showDemoBanner();
            }

        } catch (error) {
            console.error('Error loading applications:', error);
            
            // Fallback to demo data on error
            applicationsData = FALLBACK_DATA.applications || [];
            isDemo = true;
            
            renderApplications(applicationsData, isDemo);
            showDemoBanner();
        }
    }

    /**
     * Render applications grid
     * @param {Array} applications - Applications data
     * @param {boolean} isDemoData - Whether data is demo data
     */
    function renderApplications(applications, isDemoData) {
        const grid = document.getElementById('applications-grid');
        grid.innerHTML = '';

        if (!applications || applications.length === 0) {
            showEmptyState();
            return;
        }

        applications.forEach((app, index) => {
            const card = createApplicationCard(app, isDemoData);
            grid.appendChild(card);

            // Smooth fade-in animation
            setTimeout(() => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            }, index * 50);
        });
    }

    /**
     * Create an application card element
     * @param {Object} application - Application data
     * @param {boolean} isDemoData - Whether data is demo data
     * @returns {HTMLElement} Application card element
     */
    function createApplicationCard(application, isDemoData) {
        const card = document.createElement('div');
        card.className = 'application-card';
        card.setAttribute('data-application-id', application.id);

        // Card Header
        const header = document.createElement('div');
        header.className = 'card-header';

        const title = document.createElement('div');
        title.className = 'card-title';

        const businessName = document.createElement('div');
        businessName.className = 'business-name';
        businessName.textContent = application.businessName;

        // Add demo indicator to business name if demo data
        if (isDemoData) {
            const demoIcon = DemoIndicator.createIcon({
                tooltip: 'This is simulated data for demonstration purposes'
            });
            businessName.appendChild(demoIcon);
        }

        const applicantName = document.createElement('div');
        applicantName.className = 'applicant-name';
        applicantName.textContent = application.applicantName;

        title.appendChild(businessName);
        title.appendChild(applicantName);

        const badges = document.createElement('div');
        badges.className = 'card-badges';

        // Status badge
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${normalizeStatus(application.status)}`;
        statusBadge.textContent = formatStatus(application.status);
        badges.appendChild(statusBadge);

        // Demo badge if demo data
        if (isDemoData) {
            const demoBadge = DemoIndicator.createBadge({
                text: 'Demo',
                tooltip: 'This is simulated data'
            });
            badges.appendChild(demoBadge);
        }

        header.appendChild(title);
        header.appendChild(badges);

        // Card Body
        const body = document.createElement('div');
        body.className = 'card-body';

        const info = document.createElement('div');
        info.className = 'card-info';

        // Loan Amount
        const amountRow = document.createElement('div');
        amountRow.className = 'info-row';
        
        const amountLabel = document.createElement('span');
        amountLabel.className = 'info-label';
        amountLabel.textContent = 'Loan Amount';
        
        const amountValue = document.createElement('span');
        amountValue.className = 'info-value loan-amount';
        amountValue.textContent = formatCurrency(application.loanAmount);
        
        amountRow.appendChild(amountLabel);
        amountRow.appendChild(amountValue);

        // Program Type (if available)
        if (application.programType) {
            const programRow = document.createElement('div');
            programRow.className = 'info-row';
            
            const programLabel = document.createElement('span');
            programLabel.className = 'info-label';
            programLabel.textContent = 'Program';
            
            const programValue = document.createElement('span');
            programValue.className = 'info-value';
            programValue.textContent = application.programType;
            
            programRow.appendChild(programLabel);
            programRow.appendChild(programValue);
            info.appendChild(programRow);
        }

        info.appendChild(amountRow);

        // Risk Score (if available)
        if (application.riskScore) {
            const riskRow = document.createElement('div');
            riskRow.className = 'info-row';
            
            const riskLabel = document.createElement('span');
            riskLabel.className = 'info-label';
            riskLabel.textContent = 'Risk Score';
            
            const riskValue = document.createElement('span');
            riskValue.className = 'info-value';
            riskValue.textContent = application.riskScore;
            
            riskRow.appendChild(riskLabel);
            riskRow.appendChild(riskValue);
            info.appendChild(riskRow);
        }

        body.appendChild(info);

        // Card Footer
        const footer = document.createElement('div');
        footer.className = 'card-footer';

        const submittedDate = document.createElement('div');
        submittedDate.className = 'submitted-date';
        submittedDate.innerHTML = `
            <span></span>
            <span>${formatDate(application.submittedAt)}</span>
        `;

        const viewDetails = document.createElement('a');
        viewDetails.className = 'view-details';
        viewDetails.href = '#';
        viewDetails.innerHTML = 'View Details →';
        viewDetails.onclick = (e) => {
            e.preventDefault();
            navigateToDetail(application.id);
        };

        footer.appendChild(submittedDate);
        footer.appendChild(viewDetails);

        // Assemble card
        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);

        // Make entire card clickable
        card.onclick = (e) => {
            // Don't navigate if clicking on the view details link
            if (e.target.closest('.view-details')) {
                return;
            }
            navigateToDetail(application.id);
        };

        return card;
    }

    /**
     * Navigate to application detail page
     * @param {string} applicationId - Application ID
     */
    function navigateToDetail(applicationId) {
        console.log('Navigating to application detail:', applicationId);
        window.location.href = `/application-detail.html?id=${applicationId}`;
    }

    /**
     * Show empty state
     */
    function showEmptyState() {
        const grid = document.getElementById('applications-grid');
        grid.innerHTML = `
            <div class="empty-state">
                <h2>No Applications Found</h2>
                <p>There are currently no applications to display.</p>
            </div>
        `;
    }

    /**
     * Show demo mode banner
     */
    function showDemoBanner() {
        const main = document.querySelector('main');
        const existingBanner = document.querySelector('.demo-indicator-banner');
        
        if (existingBanner) {
            return; // Banner already exists
        }

        const banner = DemoIndicator.createBanner({
            title: 'Demo Mode Active',
            message: 'You\'re viewing demonstration data. This showcases the platform\'s capabilities.',
            dismissible: true
        });

        if (banner) {
            main.insertBefore(banner, main.firstChild);
        }
    }

    /**
     * Normalize status for CSS class
     * @param {string} status - Status string
     * @returns {string} Normalized status
     */
    function normalizeStatus(status) {
        return status.toLowerCase().replace(/_/g, '_');
    }

    /**
     * Format status for display
     * @param {string} status - Status string
     * @returns {string} Formatted status
     */
    function formatStatus(status) {
        return status
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Format number as currency
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    /**
     * Initialize live application feed listeners
     */
    function initLiveApplicationFeed() {
        if (liveAppListenerAttached) {
            return;
        }

        const orchestrator = window.demoOrchestrator;

        if (!orchestrator) {
            liveAppAttachAttempts++;
            if (liveAppAttachAttempts <= MAX_LIVE_APP_ATTACH_ATTEMPTS) {
                setTimeout(initLiveApplicationFeed, LIVE_APP_ATTACH_DELAY);
            }
            return;
        }

        orchestrator.on('simulated-event', handleApplicationLiveEvent);
        liveAppListenerAttached = true;
    }

    /**
     * Handle simulated events for application list
     */
    function handleApplicationLiveEvent(event) {
        if (!event) {
            return;
        }

        switch (event.type) {
            case 'new_application':
                prependLiveApplication(mapEventToApplication(event.data));
                break;
            case 'status_change':
            case 'approval_granted':
            case 'rejection_issued':
            case 'review_completed':
                updateApplicationCardStatus(event.data);
                break;
            default:
                break;
        }
    }

    /**
     * Map event data to application card data
     */
    function mapEventToApplication(data = {}) {
        const applicationId = data.applicationId || `APP-${Date.now()}`;
        return {
            id: applicationId,
            businessName: data.businessName || 'Live Application',
            applicantName: data.applicantName || 'Demo Applicant',
            status: data.status || data.newStatus || 'pending',
            loanAmount: data.loanAmount || 0,
            programType: data.programType || data.loanProgram || 'SBA 7(a)',
            submittedAt: data.submittedAt || new Date().toISOString(),
            riskScore: data.riskScore,
            reviewType: data.reviewType
        };
    }

    /**
     * Prepend a new application card with animation
     */
    function prependLiveApplication(application) {
        const grid = document.getElementById('applications-grid');
        if (!grid || !application) {
            return;
        }

        const card = createApplicationCard(application, true);
        card.classList.add('live-slide-in');
        grid.insertBefore(card, grid.firstChild);
        requestAnimationFrame(() => {
            card.classList.add('live-visible');
        });

        applicationsData.unshift(application);
        if (applicationsData.length > 12) {
            applicationsData.pop();
        }

        const gridChildren = grid.querySelectorAll('.application-card');
        if (gridChildren.length > 12) {
            const last = gridChildren[gridChildren.length - 1];
            last?.remove();
        }

        setTimeout(() => {
            card.classList.remove('live-slide-in', 'live-visible');
        }, 800);
    }

    /**
     * Update existing card status based on event
     */
    function updateApplicationCardStatus(data = {}) {
        const applicationId = data.applicationId || data.id;
        if (!applicationId) {
            return;
        }

        const card = document.querySelector(`[data-application-id="${applicationId}"]`);
        const status = data.newStatus || data.status;

        if (card && status) {
            const badge = card.querySelector('.status-badge');
            if (badge) {
                const normalized = normalizeStatus(status);
                badge.className = `status-badge ${normalized}`;
                badge.textContent = formatStatus(status);
                badge.classList.add('status-transition');
                setTimeout(() => badge.classList.remove('status-transition'), 900);
            }
        }

        const index = applicationsData.findIndex((app) => app.id === applicationId);
        if (index !== -1) {
            applicationsData[index].status = status;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
