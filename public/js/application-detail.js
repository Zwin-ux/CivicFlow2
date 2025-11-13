/**
 * Application Detail
 * Displays detailed application information with demo indicators
 */

(function() {
    'use strict';

    // State
    let loadingTimeout = null;
    let applicationData = null;
    let isDemo = false;
    let applicationId = null;

    /**
     * Initialize application detail
     */
    async function init() {
        // Get application ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        applicationId = urlParams.get('id');

        if (!applicationId) {
            showError('No application ID provided');
            return;
        }

        // Show loading state with message
        showLoadingState();
        showLoadingMessage();
        
        // Set timeout to show demo data after 3 seconds if API is slow
        loadingTimeout = setTimeout(() => {
            console.log('Loading timeout - showing demo data');
            hideLoadingMessage();
            loadApplicationDetail(true);
        }, 3000);

        // Try to load real data
        await loadApplicationDetail();
    }

    /**
     * Show loading message
     */
    function showLoadingMessage() {
        const main = document.querySelector('main');
        const loadingMsg = document.createElement('div');
        loadingMsg.id = 'loading-message';
        loadingMsg.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--surface);
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 1000;
            animation: slideDown 0.3s ease;
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 16px;
            height: 16px;
            border: 2px solid var(--border-color);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        `;

        const text = document.createElement('span');
        text.textContent = 'Loading application details...';
        text.style.color = 'var(--text-primary)';
        text.style.fontSize = '0.875rem';
        text.style.fontWeight = '500';

        loadingMsg.appendChild(spinner);
        loadingMsg.appendChild(text);
        main.appendChild(loadingMsg);

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Hide loading message
     */
    function hideLoadingMessage() {
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) {
            loadingMsg.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => loadingMsg.remove(), 300);
        }
    }

    /**
     * Show loading skeleton screens
     */
    function showLoadingState() {
        const content = document.getElementById('detail-content');
        content.innerHTML = '';

        // Header skeleton - larger for header section
        const headerSkeleton = SkeletonLoader.createCard({
            count: 1,
            height: '220px',
            showImage: false,
            showActions: false
        });
        headerSkeleton.style.marginBottom = '1.5rem';
        content.appendChild(headerSkeleton);

        // Loan details skeleton
        const loanSkeleton = createSectionSkeleton('Loan Details', '180px');
        content.appendChild(loanSkeleton);

        // Business info skeleton
        const businessSkeleton = createSectionSkeleton('Business Information', '200px');
        content.appendChild(businessSkeleton);

        // Contact info skeleton
        const contactSkeleton = createSectionSkeleton('Contact Information', '150px');
        content.appendChild(contactSkeleton);

        // Documents skeleton
        const documentsSkeleton = createSectionSkeleton('Documents', '300px');
        content.appendChild(documentsSkeleton);

        // Timeline skeleton
        const timelineSkeleton = createSectionSkeleton('Timeline', '250px');
        content.appendChild(timelineSkeleton);
    }

    /**
     * Create section skeleton with title
     */
    function createSectionSkeleton(title, height) {
        const section = document.createElement('div');
        section.className = 'detail-section';
        section.style.marginBottom = '1.5rem';

        // Section title skeleton
        const titleSkeleton = document.createElement('div');
        titleSkeleton.style.height = '24px';
        titleSkeleton.style.width = '200px';
        titleSkeleton.style.background = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
        titleSkeleton.style.backgroundSize = '200% 100%';
        titleSkeleton.style.animation = 'shimmer 1.5s infinite';
        titleSkeleton.style.borderRadius = '4px';
        titleSkeleton.style.marginBottom = '1rem';

        // Content skeleton
        const contentSkeleton = document.createElement('div');
        contentSkeleton.style.height = height;
        contentSkeleton.style.background = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
        contentSkeleton.style.backgroundSize = '200% 100%';
        contentSkeleton.style.animation = 'shimmer 1.5s infinite';
        contentSkeleton.style.borderRadius = '8px';

        section.appendChild(titleSkeleton);
        section.appendChild(contentSkeleton);

        return section;
    }

    /**
     * Load application detail from API
     * @param {boolean} forceDemo - Force demo data
     */
    async function loadApplicationDetail(forceDemo = false) {
        try {
            // Clear timeout if data loads successfully
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                loadingTimeout = null;
            }

            // Fetch application detail
            const response = await ApiClient.getApplicationDetail(applicationId);
            
            applicationData = response.data;
            isDemo = response.isDemo || forceDemo;

            // Hide loading message
            hideLoadingMessage();

            // Render application detail with smooth transition
            setTimeout(() => {
                renderApplicationDetail(applicationData, isDemo);

                // Show demo banner if in demo mode
                if (isDemo) {
                    showDemoBanner();
                }
            }, 200);

        } catch (error) {
            console.error('Error loading application detail:', error);
            
            // Hide loading message
            hideLoadingMessage();
            
            // Fallback to demo data on error
            applicationData = FALLBACK_DATA.applicationDetail;
            isDemo = true;
            
            setTimeout(() => {
                renderApplicationDetail(applicationData, isDemo);
                showDemoBanner();
            }, 200);
        }
    }

    /**
     * Render application detail
     * @param {Object} application - Application data
     * @param {boolean} isDemoData - Whether data is demo data
     */
    function renderApplicationDetail(application, isDemoData) {
        const content = document.getElementById('detail-content');
        content.innerHTML = '';

        // Header
        const header = createDetailHeader(application, isDemoData);
        content.appendChild(header);

        // Loan Details Section
        const loanSection = createLoanDetailsSection(application, isDemoData);
        content.appendChild(loanSection);

        // Business Information
        if (application.businessInfo) {
            const businessSection = createBusinessInfoSection(application.businessInfo, isDemoData);
            content.appendChild(businessSection);
        }

        // Contact Information
        if (application.contactInfo) {
            const contactSection = createContactInfoSection(application.contactInfo, isDemoData);
            content.appendChild(contactSection);
        }

        // Documents - Always show section, even if empty
        const documentsSection = createDocumentsSection(
            application.documents || [], 
            isDemoData
        );
        content.appendChild(documentsSection);

        // Timeline - Always show section, even if empty
        const timelineSection = createTimelineSection(
            application.timeline || [], 
            isDemoData
        );
        content.appendChild(timelineSection);

        // Notes
        if (application.notes && application.notes.length > 0) {
            const notesSection = createNotesSection(application.notes, isDemoData);
            content.appendChild(notesSection);
        }

        // Smooth fade-in animation with stagger effect
        requestAnimationFrame(() => {
            content.querySelectorAll('.detail-header, .detail-section').forEach((el, index) => {
                // Set initial state
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                
                // Trigger animation with stagger
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 80);
            });
        });
    }

    /**
     * Create detail header
     */
    function createDetailHeader(application, isDemoData) {
        const header = document.createElement('div');
        header.className = 'detail-header';

        const headerTop = document.createElement('div');
        headerTop.className = 'detail-header-top';

        const title = document.createElement('div');
        title.className = 'detail-title';

        const h1 = document.createElement('h1');
        h1.textContent = application.businessName;

        // Add demo indicator if demo data
        if (isDemoData) {
            const demoIcon = DemoIndicator.createIcon({
                tooltip: 'This is simulated data for demonstration purposes'
            });
            h1.appendChild(demoIcon);
        }

        const subtitle = document.createElement('div');
        subtitle.className = 'detail-subtitle';
        subtitle.textContent = `Application ID: ${application.id}`;

        title.appendChild(h1);
        title.appendChild(subtitle);

        const badges = document.createElement('div');
        badges.className = 'detail-badges';

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

        headerTop.appendChild(title);
        headerTop.appendChild(badges);

        // Detail grid
        const grid = document.createElement('div');
        grid.className = 'detail-grid';

        // Loan Amount
        const amountItem = createDetailItem('Loan Amount', formatCurrency(application.loanAmount), true);
        grid.appendChild(amountItem);

        // Applicant Name
        const applicantItem = createDetailItem('Applicant', application.applicantName);
        grid.appendChild(applicantItem);

        // Submitted Date
        const dateItem = createDetailItem('Submitted', formatDate(application.submittedAt));
        grid.appendChild(dateItem);

        // Program Type
        if (application.programType) {
            const programItem = createDetailItem('Program', application.programType);
            grid.appendChild(programItem);
        }

        // Risk Score
        if (application.riskScore) {
            const riskItem = createDetailItem('Risk Score', application.riskScore);
            grid.appendChild(riskItem);
        }

        header.appendChild(headerTop);
        header.appendChild(grid);

        return header;
    }

    /**
     * Create detail item
     */
    function createDetailItem(label, value, large = false) {
        const item = document.createElement('div');
        item.className = 'detail-item';

        const labelEl = document.createElement('div');
        labelEl.className = 'detail-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('div');
        valueEl.className = `detail-value ${large ? 'large' : ''}`;
        valueEl.textContent = value;

        item.appendChild(labelEl);
        item.appendChild(valueEl);

        return item;
    }

    /**
     * Create loan details section
     */
    function createLoanDetailsSection(application, isDemoData) {
        const section = document.createElement('div');
        section.className = 'detail-section';

        const header = createSectionHeader('Loan Details', isDemoData);
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'detail-grid';

        // Loan Amount
        grid.appendChild(createDetailItem('Requested Amount', formatCurrency(application.loanAmount)));

        // Program Type
        if (application.programType) {
            grid.appendChild(createDetailItem('Program Type', application.programType));
        }

        // Purpose
        if (application.purpose) {
            grid.appendChild(createDetailItem('Loan Purpose', application.purpose));
        }

        // Term
        if (application.loanTerm) {
            grid.appendChild(createDetailItem('Loan Term', `${application.loanTerm} months`));
        }

        // Risk Score
        if (application.riskScore) {
            const riskLevel = application.riskScore >= 70 ? 'Low Risk' : 
                            application.riskScore >= 50 ? 'Medium Risk' : 'High Risk';
            grid.appendChild(createDetailItem('Risk Assessment', `${application.riskScore}/100 (${riskLevel})`));
        }

        // Submitted Date
        grid.appendChild(createDetailItem('Submission Date', formatDate(application.submittedAt)));

        // Last Updated
        if (application.updatedAt) {
            grid.appendChild(createDetailItem('Last Updated', formatDate(application.updatedAt)));
        }

        section.appendChild(grid);

        return section;
    }

    /**
     * Create business info section
     */
    function createBusinessInfoSection(businessInfo, isDemoData) {
        const section = document.createElement('div');
        section.className = 'detail-section';

        const header = createSectionHeader('Business Information', isDemoData);
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'detail-grid';

        if (businessInfo.ein) {
            grid.appendChild(createDetailItem('EIN', businessInfo.ein));
        }
        if (businessInfo.yearEstablished) {
            grid.appendChild(createDetailItem('Year Established', businessInfo.yearEstablished));
        }
        if (businessInfo.employeeCount) {
            grid.appendChild(createDetailItem('Employees', businessInfo.employeeCount));
        }
        if (businessInfo.industry) {
            grid.appendChild(createDetailItem('Industry', businessInfo.industry));
        }
        if (businessInfo.annualRevenue) {
            grid.appendChild(createDetailItem('Annual Revenue', formatCurrency(businessInfo.annualRevenue)));
        }

        section.appendChild(grid);

        return section;
    }

    /**
     * Create contact info section
     */
    function createContactInfoSection(contactInfo, isDemoData) {
        const section = document.createElement('div');
        section.className = 'detail-section';

        const header = createSectionHeader('Contact Information', isDemoData);
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'detail-grid';

        if (contactInfo.email) {
            grid.appendChild(createDetailItem('Email', contactInfo.email));
        }
        if (contactInfo.phone) {
            grid.appendChild(createDetailItem('Phone', contactInfo.phone));
        }
        if (contactInfo.address) {
            grid.appendChild(createDetailItem('Address', contactInfo.address));
        }

        section.appendChild(grid);

        return section;
    }

    /**
     * Create documents section
     */
    function createDocumentsSection(documents, isDemoData) {
        const section = document.createElement('div');
        section.className = 'detail-section';

        const header = createSectionHeader('Documents', isDemoData);
        section.appendChild(header);

        const list = document.createElement('div');
        list.className = 'documents-list';

        if (documents && documents.length > 0) {
            documents.forEach(doc => {
                const item = createDocumentItem(doc, isDemoData);
                list.appendChild(item);
            });
        } else {
            // Show placeholder when no documents
            const placeholder = createDocumentPlaceholder(isDemoData);
            list.appendChild(placeholder);
        }

        section.appendChild(list);

        return section;
    }

    /**
     * Create document item
     */
    function createDocumentItem(doc, isDemoData) {
        const item = document.createElement('div');
        item.className = 'document-item';
        
        // Make clickable if URL is available
        if (doc.url) {
            item.style.cursor = 'pointer';
            item.onclick = () => {
                window.open(doc.url, '_blank');
            };
        } else {
            // If no URL but in demo mode, show placeholder with link to sample
            item.style.opacity = '0.8';
        }

        const info = document.createElement('div');
        info.className = 'document-info';

        const icon = document.createElement('div');
        icon.className = 'document-icon';
        // Use different icons based on document type
        const iconMap = {
            'TAX_RETURN': 'Metrics',
            'BANK_STATEMENT': '',
            'BUSINESS_LICENSE': '',
            'FINANCIAL_STATEMENT': '',
            'BUSINESS_PLAN': '',
            'ARTICLES_OF_INCORPORATION': '',
            'default': ''
        };
        icon.textContent = iconMap[doc.type] || iconMap.default;
        
        // Dim icon if no URL
        if (!doc.url) {
            icon.style.opacity = '0.5';
        }

        const details = document.createElement('div');
        details.className = 'document-details';

        const nameContainer = document.createElement('div');
        nameContainer.style.display = 'flex';
        nameContainer.style.alignItems = 'center';
        nameContainer.style.gap = '0.5rem';

        const name = document.createElement('span');
        name.className = 'document-name';
        name.textContent = doc.name;
        nameContainer.appendChild(name);

        // Add demo indicator if this is demo data
        if (isDemoData) {
            const demoIcon = DemoIndicator.createIcon({
                tooltip: 'This is a simulated document for demonstration purposes'
            });
            nameContainer.appendChild(demoIcon);
        }

        const meta = document.createElement('div');
        meta.className = 'document-meta';
        const typeLabel = doc.type ? doc.type.replace(/_/g, ' ').toLowerCase() : 'document';
        let metaText = `${typeLabel} • Uploaded ${formatDate(doc.uploadedAt)}`;
        
        if (doc.url) {
            metaText += ' • Click to view';
        } else if (isDemoData) {
            metaText += ' • ';
            const sampleLink = document.createElement('a');
            sampleLink.href = '/demo-documents/sample-tax-return-2023.html';
            sampleLink.target = '_blank';
            sampleLink.style.color = 'var(--primary-color)';
            sampleLink.textContent = 'View sample document';
            sampleLink.onclick = (e) => e.stopPropagation();
            
            const textNode = document.createTextNode(metaText);
            meta.appendChild(textNode);
            meta.appendChild(sampleLink);
        } else {
            metaText += ' • File unavailable';
        }
        
        if (!meta.hasChildNodes()) {
            meta.textContent = metaText;
        }

        details.appendChild(nameContainer);
        details.appendChild(meta);

        info.appendChild(icon);
        info.appendChild(details);

        const status = document.createElement('span');
        status.className = `document-status ${doc.status.toLowerCase()}`;
        status.textContent = doc.status;

        item.appendChild(info);
        item.appendChild(status);

        return item;
    }

    /**
     * Create document placeholder when no documents available
     */
    function createDocumentPlaceholder(isDemoData) {
        const placeholder = document.createElement('div');
        placeholder.style.textAlign = 'center';
        placeholder.style.padding = '3rem 1rem';
        placeholder.style.color = 'var(--text-secondary)';

        const icon = document.createElement('div');
        icon.style.fontSize = '3rem';
        icon.style.marginBottom = '1rem';
        icon.textContent = '';

        const message = document.createElement('div');
        message.style.fontSize = '1rem';
        message.style.fontWeight = '500';
        message.textContent = 'No documents uploaded yet';

        const submessage = document.createElement('div');
        submessage.style.fontSize = '0.875rem';
        submessage.style.marginTop = '0.5rem';
        submessage.textContent = isDemoData 
            ? 'In demo mode, sample documents would appear here'
            : 'Documents will appear here once uploaded';

        // If demo mode, show link to sample documents
        if (isDemoData) {
            const demoLink = document.createElement('div');
            demoLink.style.marginTop = '1rem';
            
            const link = document.createElement('a');
            link.href = '/demo-documents/sample-tax-return-2023.html';
            link.target = '_blank';
            link.style.color = 'var(--primary-color)';
            link.style.textDecoration = 'none';
            link.style.fontWeight = '500';
            link.textContent = 'View sample SBA documents →';
            
            demoLink.appendChild(link);
            placeholder.appendChild(demoLink);
        }

        placeholder.appendChild(icon);
        placeholder.appendChild(message);
        placeholder.appendChild(submessage);

        return placeholder;
    }

    /**
     * Create unavailable document item (when document exists but file is missing)
     */
    function createUnavailableDocumentItem(docName, docType, isDemoData) {
        const item = document.createElement('div');
        item.className = 'document-item';
        item.style.opacity = '0.7';

        const info = document.createElement('div');
        info.className = 'document-info';

        const icon = document.createElement('div');
        icon.className = 'document-icon';
        icon.textContent = '';
        icon.style.opacity = '0.5';

        const details = document.createElement('div');
        details.className = 'document-details';

        const nameContainer = document.createElement('div');
        nameContainer.style.display = 'flex';
        nameContainer.style.alignItems = 'center';
        nameContainer.style.gap = '0.5rem';

        const name = document.createElement('span');
        name.className = 'document-name';
        name.textContent = docName;
        nameContainer.appendChild(name);

        // Add demo indicator if this is demo data
        if (isDemoData) {
            const demoIcon = DemoIndicator.createIcon({
                tooltip: 'This is a placeholder for demonstration purposes'
            });
            nameContainer.appendChild(demoIcon);
        }

        const meta = document.createElement('div');
        meta.className = 'document-meta';
        meta.textContent = 'Document unavailable';

        // Add link to demo document if in demo mode
        if (isDemoData) {
            const demoLink = document.createElement('a');
            demoLink.href = '/demo-documents/sample-tax-return-2023.html';
            demoLink.target = '_blank';
            demoLink.style.color = 'var(--primary-color)';
            demoLink.style.marginLeft = '0.5rem';
            demoLink.textContent = '(view sample)';
            meta.appendChild(demoLink);
        }

        details.appendChild(nameContainer);
        details.appendChild(meta);

        info.appendChild(icon);
        info.appendChild(details);

        const status = document.createElement('span');
        status.className = 'document-status pending';
        status.textContent = 'UNAVAILABLE';

        item.appendChild(info);
        item.appendChild(status);

        return item;
    }

    /**
     * Create timeline section
     */
    function createTimelineSection(timeline, isDemoData) {
        const section = document.createElement('div');
        section.className = 'detail-section';

        const header = createSectionHeader('Application Timeline', isDemoData);
        section.appendChild(header);

        if (timeline && timeline.length > 0) {
            const timelineEl = document.createElement('div');
            timelineEl.className = 'timeline';

            timeline.forEach(item => {
                const timelineItem = createTimelineItem(item);
                timelineEl.appendChild(timelineItem);
            });

            section.appendChild(timelineEl);
        } else {
            // Show placeholder when no timeline
            const placeholder = document.createElement('div');
            placeholder.style.textAlign = 'center';
            placeholder.style.padding = '2rem 1rem';
            placeholder.style.color = 'var(--text-secondary)';
            placeholder.textContent = 'No timeline events yet';
            section.appendChild(placeholder);
        }

        return section;
    }

    /**
     * Create timeline item
     */
    function createTimelineItem(item) {
        const el = document.createElement('div');
        el.className = 'timeline-item';

        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        
        // Color marker based on event type
        if (item.type === 'APPROVED') {
            marker.style.background = 'var(--success-color)';
        } else if (item.type === 'REJECTED') {
            marker.style.background = 'var(--error-color)';
        } else if (item.type === 'SUBMITTED') {
            marker.style.background = 'var(--primary-color)';
        }

        const content = document.createElement('div');
        content.className = 'timeline-content';

        const event = document.createElement('div');
        event.className = 'timeline-event';
        event.textContent = item.event;

        const meta = document.createElement('div');
        meta.className = 'timeline-meta';
        
        // Format timestamp with time
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        meta.textContent = `${dateStr} at ${timeStr} • ${item.user}`;

        // Add description if available
        if (item.description) {
            const description = document.createElement('div');
            description.style.fontSize = '0.875rem';
            description.style.color = 'var(--text-secondary)';
            description.style.marginTop = '0.25rem';
            description.textContent = item.description;
            content.appendChild(description);
        }

        content.appendChild(event);
        content.appendChild(meta);

        el.appendChild(marker);
        el.appendChild(content);

        return el;
    }

    /**
     * Create notes section
     */
    function createNotesSection(notes, isDemoData) {
        const section = document.createElement('div');
        section.className = 'detail-section';

        const header = createSectionHeader('Notes', isDemoData);
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'section-content';

        notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.style.padding = '1rem';
            noteEl.style.background = 'var(--background)';
            noteEl.style.borderRadius = '8px';
            noteEl.style.borderLeft = '3px solid var(--primary-color)';

            const noteContent = document.createElement('div');
            noteContent.textContent = note.content;
            noteContent.style.marginBottom = '0.5rem';

            const noteMeta = document.createElement('div');
            noteMeta.style.fontSize = '0.875rem';
            noteMeta.style.color = 'var(--text-secondary)';
            noteMeta.textContent = `${note.createdBy} • ${formatDate(note.createdAt)}`;

            noteEl.appendChild(noteContent);
            noteEl.appendChild(noteMeta);

            content.appendChild(noteEl);
        });

        section.appendChild(content);

        return section;
    }

    /**
     * Create section header
     */
    function createSectionHeader(title, isDemoData) {
        const header = document.createElement('div');
        header.className = 'section-header';

        const titleEl = document.createElement('h2');
        titleEl.className = 'section-title';
        titleEl.textContent = title;

        if (isDemoData) {
            const demoIcon = DemoIndicator.createIcon({
                tooltip: 'This is simulated data for demonstration purposes'
            });
            titleEl.appendChild(demoIcon);
        }

        header.appendChild(titleEl);

        return header;
    }

    /**
     * Show error message
     */
    function showError(message) {
        const content = document.getElementById('detail-content');
        content.innerHTML = `
            <div class="detail-section" style="text-align: center; padding: 3rem;">
                <h2 style="color: var(--error-color); margin-bottom: 1rem;">Error</h2>
                <p style="color: var(--text-secondary);">${message}</p>
                <a href="/applications-list.html" style="display: inline-block; margin-top: 1rem; color: var(--primary-color); text-decoration: none; font-weight: 600;">← Back to Applications</a>
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
            return;
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
     */
    function normalizeStatus(status) {
        return status.toLowerCase().replace(/_/g, '_');
    }

    /**
     * Format status for display
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
     */
    function formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
