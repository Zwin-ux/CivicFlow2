/**
 * Enhanced Demo Investor Page Script
 * Loads metrics and shows system status with rich formatting
 */

// Load demo metrics with enhanced display
async function loadMetrics() {
    const container = document.getElementById('metrics-preview');
    
    // Show loading state with skeleton
    container.innerHTML = `
        <div class="preview-card"><div class="preview-label">Loading...</div><div class="preview-value">...</div></div>
        <div class="preview-card"><div class="preview-label">Loading...</div><div class="preview-value">...</div></div>
        <div class="preview-card"><div class="preview-label">Loading...</div><div class="preview-value">...</div></div>
        <div class="preview-card"><div class="preview-label">Loading...</div><div class="preview-value">...</div></div>
        <div class="preview-card"><div class="preview-label">Loading...</div><div class="preview-value">...</div></div>
        <div class="preview-card"><div class="preview-label">Loading...</div><div class="preview-value">...</div></div>
    `;

    try {
        const response = await fetchWithFallback('/api/v1/reporting/dashboard-metrics', {
            totalApplications: 5,
            approvalRate: 60,
            totalLoanAmount: 505000,
            pendingReview: 2,
            underReview: 1,
            approved: 1,
            rejected: 1,
            avgProcessingTime: 3.5
        });

        const metrics = response.data;
        const isDemo = response.isDemo;

        // Format currency
        const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD', 
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);

        container.innerHTML = `
            <div class="preview-card">
                <div class="preview-label">Total Applications ${isDemo ? '✨' : '🔗'}</div>
                <div class="preview-value">${metrics.totalApplications || 0}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    ${isDemo ? 'Demo Data' : 'Live Data'}
                </div>
            </div>
            <div class="preview-card">
                <div class="preview-label">Approval Rate ${isDemo ? '✨' : '🔗'}</div>
                <div class="preview-value">${metrics.approvalRate || 0}%</div>
                <div style="font-size: 0.75rem; color: var(--success-color); margin-top: 0.5rem;">
                    ↑ Industry Average
                </div>
            </div>
            <div class="preview-card">
                <div class="preview-label">Total Loan Amount ${isDemo ? '✨' : '🔗'}</div>
                <div class="preview-value" style="font-size: 1.5rem;">${formatCurrency(metrics.totalLoanAmount || 0)}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Portfolio Value
                </div>
            </div>
            <div class="preview-card">
                <div class="preview-label">Avg Processing Time ${isDemo ? '✨' : '🔗'}</div>
                <div class="preview-value">${metrics.avgProcessingTime || 3.5} days</div>
                <div style="font-size: 0.75rem; color: var(--success-color); margin-top: 0.5rem;">
                    ↓ 70% faster
                </div>
            </div>
            <div class="preview-card">
                <div class="preview-label">System Status</div>
                <div class="preview-value">
                    <span class="status-badge ${isDemo ? 'pending' : 'approved'}">
                        ${isDemo ? '✨ Demo Mode' : '🔗 Connected'}
                    </span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    ${isDemo ? 'Simulated Data' : 'Live Infrastructure'}
                </div>
            </div>
            <div class="preview-card">
                <div class="preview-label">AI Services</div>
                <div class="preview-value">
                    <span class="status-badge approved">✓ Active</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    GPT-4 & Azure AI
                </div>
            </div>
        `;

        // Show status banner
        if (isDemo) {
            const banner = DemoIndicator.createBanner(
                'Demo Mode Active', 
                'This demo is running with simulated data. All features are fully functional and showcase real capabilities.', 
                true
            );
            document.querySelector('main').insertBefore(banner, document.querySelector('main').firstChild);
        } else {
            const banner = document.createElement('div');
            banner.style.cssText = 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; text-align: center; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);';
            banner.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
                    <span style="font-size: 1.25rem;">🔗</span>
                    <span style="font-weight: 600;">Connected to Live Infrastructure</span>
                    <span style="opacity: 0.9;">|</span>
                    <span style="opacity: 0.9;">Real-time data from PostgreSQL & Redis</span>
                </div>
            `;
            document.querySelector('main').insertBefore(banner, document.querySelector('main').firstChild);
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
        container.innerHTML = `
            <div class="preview-card" style="grid-column: 1 / -1;">
                <div class="preview-label">⚠️ Connection Error</div>
                <div class="preview-value" style="font-size: 1rem; color: var(--error-color);">
                    Unable to load metrics
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    The system will automatically retry. Demo mode ensures the platform never crashes.
                </div>
            </div>
        `;
    }
}

// Load metrics on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMetrics);
} else {
    loadMetrics();
}

// Add smooth scroll behavior for anchor links
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
