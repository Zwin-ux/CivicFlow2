/**
 * Investor Dashboard
 * Displays key metrics with demo indicators and loading states
 */

(function() {
    'use strict';

    // State
    let loadingTimeout = null;
    let metricsData = null;
    let isDemo = false;

    /**
     * Initialize dashboard
     */
    async function init() {
        showLoadingState();
        
        // Set timeout to show demo data after 3 seconds if API is slow
        loadingTimeout = setTimeout(() => {
            console.log('Loading timeout - showing demo data');
            loadDashboardData(true);
        }, 3000);

        // Try to load real data
        await loadDashboardData();
    }

    /**
     * Show loading skeleton screens
     */
    function showLoadingState() {
        const metricsGrid = document.getElementById('metrics-grid');
        const statusGrid = document.getElementById('status-grid');

        // Clear existing content
        metricsGrid.innerHTML = '';
        statusGrid.innerHTML = '';

        // Add skeleton loaders for metrics
        for (let i = 0; i < 4; i++) {
            const skeleton = SkeletonLoader.createCard({
                count: 1,
                height: '140px',
                showImage: false,
                showActions: false
            });
            skeleton.style.gridColumn = 'span 1';
            metricsGrid.appendChild(skeleton);
        }

        // Add skeleton loaders for status items
        for (let i = 0; i < 4; i++) {
            const skeleton = SkeletonLoader.createCard({
                count: 1,
                height: '120px',
                showImage: false,
                showActions: false
            });
            statusGrid.appendChild(skeleton);
        }
    }

    /**
     * Load dashboard data from API
     * @param {boolean} forceDemo - Force demo data
     */
    async function loadDashboardData(forceDemo = false) {
        try {
            // Clear timeout if data loads successfully
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                loadingTimeout = null;
            }

            // Fetch dashboard metrics
            const response = await ApiClient.getDashboardMetrics();
            
            metricsData = response.data;
            isDemo = response.isDemo || forceDemo;

            // Render dashboard
            renderMetrics(metricsData, isDemo);
            renderStatusBreakdown(metricsData, isDemo);

            // Show demo banner if in demo mode
            if (isDemo) {
                showDemoBanner();
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            
            // Fallback to demo data on error
            metricsData = ApiClient.FALLBACK_DATA || FALLBACK_DATA.dashboardMetrics;
            isDemo = true;
            
            renderMetrics(metricsData, isDemo);
            renderStatusBreakdown(metricsData, isDemo);
            showDemoBanner();
        }
    }

    /**
     * Render key metrics cards
     * @param {Object} data - Metrics data
     * @param {boolean} isDemoData - Whether data is demo data
     */
    function renderMetrics(data, isDemoData) {
        const metricsGrid = document.getElementById('metrics-grid');
        metricsGrid.innerHTML = '';

        // Calculate approval rate
        const approvalRate = data.approvalRate || 
            (data.statusBreakdown ? 
                ((data.statusBreakdown.approved / data.totalApplications) * 100).toFixed(1) : 
                0);

        const metrics = [
            {
                label: 'Total Applications',
                value: data.totalApplications || 0,
                change: '+12% from last month',
                changeType: 'positive'
            },
            {
                label: 'Approval Rate',
                value: `${approvalRate}%`,
                change: '+5% from last month',
                changeType: 'positive'
            },
            {
                label: 'Total Loan Amount',
                value: formatCurrency(data.totalLoanAmount || 0),
                change: '+$250K from last month',
                changeType: 'positive'
            },
            {
                label: 'Pending Review',
                value: data.statusBreakdown?.pending || 0,
                change: 'Requires attention',
                changeType: 'neutral'
            }
        ];

        metrics.forEach(metric => {
            const card = createMetricCard(metric, isDemoData);
            metricsGrid.appendChild(card);
        });

        // Smooth fade-in animation
        setTimeout(() => {
            metricsGrid.querySelectorAll('.metric-card').forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    
                    requestAnimationFrame(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    });
                }, index * 100);
            });
        }, 10);
    }

    /**
     * Create a metric card element
     * @param {Object} metric - Metric data
     * @param {boolean} isDemoData - Whether data is demo data
     * @returns {HTMLElement} Metric card element
     */
    function createMetricCard(metric, isDemoData) {
        const card = document.createElement('div');
        card.className = 'metric-card';

        const label = document.createElement('div');
        label.className = 'metric-label';
        label.textContent = metric.label;

        // Add demo indicator to label if demo data
        if (isDemoData) {
            const demoIcon = DemoIndicator.createIcon({
                tooltip: 'This is simulated data for demonstration purposes'
            });
            label.appendChild(demoIcon);
        }

        const value = document.createElement('div');
        value.className = 'metric-value';
        value.textContent = metric.value;

        const change = document.createElement('div');
        change.className = `metric-change ${metric.changeType}`;
        change.textContent = metric.change;

        card.appendChild(label);
        card.appendChild(value);
        card.appendChild(change);

        return card;
    }

    /**
     * Render application status breakdown
     * @param {Object} data - Metrics data
     * @param {boolean} isDemoData - Whether data is demo data
     */
    function renderStatusBreakdown(data, isDemoData) {
        const statusGrid = document.getElementById('status-grid');
        statusGrid.innerHTML = '';

        const breakdown = data.statusBreakdown || {
            pending: 0,
            underReview: 0,
            approved: 0,
            rejected: 0
        };

        const statusItems = [
            {
                label: 'Pending',
                value: breakdown.pending || 0,
                badgeClass: 'pending'
            },
            {
                label: 'Under Review',
                value: breakdown.underReview || 0,
                badgeClass: 'under-review'
            },
            {
                label: 'Approved',
                value: breakdown.approved || 0,
                badgeClass: 'approved'
            },
            {
                label: 'Rejected',
                value: breakdown.rejected || 0,
                badgeClass: 'rejected'
            }
        ];

        statusItems.forEach(item => {
            const statusItem = createStatusItem(item, isDemoData);
            statusGrid.appendChild(statusItem);
        });

        // Smooth fade-in animation
        setTimeout(() => {
            statusGrid.querySelectorAll('.status-item').forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.9)';
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    
                    requestAnimationFrame(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                    });
                }, index * 100);
            });
        }, 10);
    }

    /**
     * Create a status item element
     * @param {Object} item - Status item data
     * @param {boolean} isDemoData - Whether data is demo data
     * @returns {HTMLElement} Status item element
     */
    function createStatusItem(item, isDemoData) {
        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';

        const label = document.createElement('div');
        label.className = 'status-item-label';
        label.textContent = item.label;

        const value = document.createElement('div');
        value.className = 'status-item-value';
        value.textContent = item.value;

        const badge = document.createElement('div');
        badge.className = `status-badge ${item.badgeClass}`;
        badge.textContent = item.label;

        statusItem.appendChild(label);
        statusItem.appendChild(value);
        statusItem.appendChild(badge);

        // Add demo indicator if demo data
        if (isDemoData) {
            const demoIcon = DemoIndicator.createIcon({
                tooltip: 'This is simulated data for demonstration purposes'
            });
            demoIcon.style.marginLeft = '0.5rem';
            label.appendChild(demoIcon);
        }

        return statusItem;
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
            message: 'You\'re viewing a demonstration with sample data. This showcases the platform\'s capabilities.',
            dismissible: true
        });

        if (banner) {
            main.insertBefore(banner, main.firstChild);
        }
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

    // Initialize dashboard when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
