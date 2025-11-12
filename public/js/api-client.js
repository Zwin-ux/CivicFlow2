/**
 * API Client with Automatic Fallbacks
 * Provides graceful degradation to demo data when API calls fail
 */

// ============================================================================
// API Response Interface
// ============================================================================
/**
 * @typedef {Object} ApiResponse
 * @property {*} data - The response data
 * @property {boolean} isDemo - Whether this is demo/fallback data
 * @property {string} [error] - Error message if request failed
 * @property {string} [message] - Optional message from server
 */

// ============================================================================
// Fallback Demo Data
// ============================================================================
const FALLBACK_DATA = {
    // Dashboard metrics
    dashboardMetrics: {
        totalApplications: 47,
        approvalRate: 62.5,
        totalLoanAmount: 1847500,
        statusBreakdown: {
            pending: 8,
            underReview: 12,
            approved: 18,
            rejected: 9
        },
        recentActivity: [
            {
                id: 'demo-001',
                type: 'APPLICATION_SUBMITTED',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                description: 'New application from Acme Corp'
            },
            {
                id: 'demo-002',
                type: 'APPLICATION_APPROVED',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                description: 'TechStart Inc approved for $50,000'
            }
        ]
    },

    // Applications list
    applications: [
        {
            id: 'demo-app-001',
            businessName: 'Acme Manufacturing Co.',
            applicantName: 'John Smith',
            loanAmount: 75000,
            status: 'UNDER_REVIEW',
            submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            programType: 'Small Business Loan',
            riskScore: 72
        },
        {
            id: 'demo-app-002',
            businessName: 'TechStart Solutions',
            applicantName: 'Sarah Johnson',
            loanAmount: 50000,
            status: 'APPROVED',
            submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            programType: 'Innovation Grant',
            riskScore: 85
        },
        {
            id: 'demo-app-003',
            businessName: 'Green Energy LLC',
            applicantName: 'Michael Chen',
            loanAmount: 125000,
            status: 'PENDING_DOCUMENTS',
            submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
            programType: 'Green Business Loan',
            riskScore: 68
        },
        {
            id: 'demo-app-004',
            businessName: 'Downtown Bakery',
            applicantName: 'Maria Garcia',
            loanAmount: 25000,
            status: 'SUBMITTED',
            submittedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
            programType: 'Micro Business Loan',
            riskScore: 78
        },
        {
            id: 'demo-app-005',
            businessName: 'Riverside Consulting',
            applicantName: 'David Lee',
            loanAmount: 100000,
            status: 'REJECTED',
            submittedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
            programType: 'Professional Services Loan',
            riskScore: 45
        }
    ],

    // Application detail
    applicationDetail: {
        id: 'demo-app-001',
        businessName: 'Acme Manufacturing Co.',
        applicantName: 'John Smith',
        loanAmount: 75000,
        status: 'UNDER_REVIEW',
        submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        programType: 'Small Business Loan',
        purpose: 'Equipment purchase and working capital',
        loanTerm: 60,
        riskScore: 72,
        contactInfo: {
            email: 'john.smith@acmemfg.example',
            phone: '(555) 123-4567',
            address: '123 Industrial Pkwy, Springfield, IL 62701'
        },
        businessInfo: {
            ein: '12-3456789',
            yearEstablished: 2018,
            employeeCount: 15,
            industry: 'Manufacturing',
            annualRevenue: 850000
        },
        documents: [
            {
                id: 'doc-001',
                name: 'Business Tax Return 2023.pdf',
                type: 'TAX_RETURN',
                uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
                status: 'VERIFIED',
                url: '/demo-documents/sample-tax-return-2023.html'
            },
            {
                id: 'doc-002',
                name: 'Bank Statements Q4 2023.pdf',
                type: 'BANK_STATEMENT',
                uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
                status: 'VERIFIED',
                url: '/demo-documents/sample-bank-statement-q4-2023.html'
            },
            {
                id: 'doc-003',
                name: 'Business License.pdf',
                type: 'BUSINESS_LICENSE',
                uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
                status: 'PENDING',
                url: '/demo-documents/sample-business-license.html'
            }
        ],
        timeline: [
            {
                timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
                event: 'Application submitted',
                user: 'John Smith',
                type: 'SUBMITTED',
                description: 'Initial application submitted with all required documents'
            },
            {
                timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
                event: 'Application received',
                user: 'System',
                type: 'RECEIVED',
                description: 'Application passed initial validation checks'
            },
            {
                timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
                event: 'Assigned to reviewer',
                user: 'System',
                type: 'ASSIGNED',
                description: 'Automatically assigned to Jane Reviewer based on workload'
            },
            {
                timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
                event: 'Documents verified',
                user: 'Jane Reviewer',
                type: 'DOCUMENT_VERIFIED',
                description: 'All submitted documents have been verified and are complete'
            },
            {
                timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
                event: 'Under review',
                user: 'Jane Reviewer',
                type: 'UNDER_REVIEW',
                description: 'Financial analysis and risk assessment in progress'
            }
        ],
        notes: [
            {
                id: 'note-001',
                content: 'Strong financials, good credit history. Business has shown consistent growth over the past 3 years.',
                createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
                createdBy: 'Jane Reviewer',
                isInternal: true
            }
        ]
    },

    // Health check
    health: {
        status: 'healthy',
        demoMode: true,
        services: {
            database: 'unavailable',
            redis: 'unavailable',
            ai: 'unavailable'
        },
        timestamp: new Date().toISOString()
    }
};

// ============================================================================
// API Client with Fallback
// ============================================================================
const ApiClient = {
    baseURL: '/api/v1',
    timeout: 3000, // 3 second timeout before falling back to demo data

    /**
     * Fetch with automatic fallback to demo data
     * @param {string} url - API endpoint URL
     * @param {*} fallbackData - Data to return if API fails
     * @param {Object} options - Fetch options
     * @returns {Promise<ApiResponse>}
     */
    async fetchWithFallback(url, fallbackData, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            // Check if response indicates demo mode
            const isDemo = response.headers.get('X-Demo-Mode') === 'true';

            if (!response.ok) {
                // API returned error, use fallback
                console.warn(`API request failed (${response.status}): ${url}`);
                return {
                    data: fallbackData,
                    isDemo: true,
                    error: `API returned ${response.status}`
                };
            }

            const data = await response.json();

            return {
                data: data.data || data,
                isDemo: isDemo || data.isDemo || false,
                message: data.message
            };

        } catch (error) {
            clearTimeout(timeoutId);

            // Network error, timeout, or other failure - use fallback
            console.warn(`API request failed: ${url}`, error.message);

            return {
                data: fallbackData,
                isDemo: true,
                error: error.name === 'AbortError' ? 'Request timeout' : error.message
            };
        }
    },

    /**
     * Get dashboard metrics
     * @returns {Promise<ApiResponse>}
     */
    async getDashboardMetrics() {
        return this.fetchWithFallback(
            `${this.baseURL}/reporting/dashboard`,
            FALLBACK_DATA.dashboardMetrics
        );
    },

    /**
     * Get applications list
     * @param {Object} filters - Optional filters (status, programType, etc.)
     * @returns {Promise<ApiResponse>}
     */
    async getApplications(filters = {}) {
        const params = new URLSearchParams(filters);
        const url = `${this.baseURL}/applications${params.toString() ? '?' + params.toString() : ''}`;
        
        return this.fetchWithFallback(
            url,
            FALLBACK_DATA.applications
        );
    },

    /**
     * Get application detail by ID
     * @param {string} applicationId - Application ID
     * @returns {Promise<ApiResponse>}
     */
    async getApplicationDetail(applicationId) {
        return this.fetchWithFallback(
            `${this.baseURL}/applications/${applicationId}`,
            FALLBACK_DATA.applicationDetail
        );
    },

    /**
     * Get health check status
     * @returns {Promise<ApiResponse>}
     */
    async getHealth() {
        return this.fetchWithFallback(
            `${this.baseURL}/health`,
            FALLBACK_DATA.health
        );
    },

    /**
     * Submit new application
     * @param {FormData} formData - Application form data
     * @returns {Promise<ApiResponse>}
     */
    async submitApplication(formData) {
        const fallbackResponse = {
            id: 'demo-app-' + Date.now(),
            status: 'SUBMITTED',
            message: 'Application submitted successfully (demo mode)'
        };

        return this.fetchWithFallback(
            `${this.baseURL}/applications`,
            fallbackResponse,
            {
                method: 'POST',
                body: formData,
                headers: {} // Let browser set Content-Type for FormData
            }
        );
    },

    /**
     * Update application status
     * @param {string} applicationId - Application ID
     * @param {string} status - New status
     * @returns {Promise<ApiResponse>}
     */
    async updateApplicationStatus(applicationId, status) {
        const fallbackResponse = {
            id: applicationId,
            status: status,
            message: 'Status updated successfully (demo mode)'
        };

        return this.fetchWithFallback(
            `${this.baseURL}/applications/${applicationId}/status`,
            fallbackResponse,
            {
                method: 'PATCH',
                body: JSON.stringify({ status })
            }
        );
    },

    /**
     * Get user profile
     * @returns {Promise<ApiResponse>}
     */
    async getUserProfile() {
        const fallbackProfile = {
            id: 'demo-user-001',
            username: 'demo.user',
            email: 'demo@example.com',
            role: 'REVIEWER',
            firstName: 'Demo',
            lastName: 'User'
        };

        return this.fetchWithFallback(
            `${this.baseURL}/auth/me`,
            fallbackProfile
        );
    }
};

// ============================================================================
// Export for use in other scripts
// ============================================================================
if (typeof window !== 'undefined') {
    window.ApiClient = ApiClient;
    window.FALLBACK_DATA = FALLBACK_DATA;
}
