/**
 * Investor Dashboard
 * Displays key metrics with demo indicators, live status, and activity feed
 */

(function () {
  'use strict';

  const ACTIVITY_LIMIT = 8;
  const ACTIVITY_CONTAINER_ID = 'activity-feed';
  const LIVE_STATUS_ID = 'live-status';
  const EVENT_TOAST_CONFIG = {
    new_application: {
      title: 'New Application',
      color: '#3b82f6',
      message: (payload) =>
        `${payload.businessName || 'An applicant'} submitted ${formatCurrency(payload.loanAmount || 0)}`
    },
    approval_granted: {
      title: 'Approved',
      color: '#10b981',
      message: (payload) =>
        `${payload.businessName || 'An applicant'} approved for ${formatCurrency(payload.loanAmount || 0)}`
    },
    rejection_issued: {
      title: 'Rejected',
      color: '#ef4444',
      message: (payload) =>
        `${payload.businessName || 'An applicant'} application rejected`
    },
    status_change: {
      title: 'Status Change',
      color: '#f59e0b',
      message: (payload) =>
        `${payload.businessName || 'An application'} moved to ${payload.newStatus || 'an updated state'}`
    },
    review_completed: {
      title: 'Review Complete',
      color: '#8b5cf6',
      message: (payload) =>
        `${payload.businessName || 'An applicant'} review completed`
    }
  };

  let loadingTimeout = null;
  let metricsData = null;
  let isDemo = false;
  let activityFeed = [];
  let liveDashboardListenerAttached = false;
  let liveDashboardAttachAttempts = 0;
  let liveIndicatorEl = null;
  let analyticsChart = null;
  let documentTable = null;
  let inlineEditor = null;
  let overlayMessage = '';
  const trendHistory = [];
  const TOP_APP_LIMIT = 4;
  const TREND_HISTORY_LIMIT = 12;
  const docPreviewFallback = [
    { name: 'Bank Statement Q4', type: 'Statement', status: 'verified' },
    { name: 'Tax Return 2023', type: 'Tax', status: 'pending' },
    { name: 'Business License', type: 'License', status: 'verified' },
    { name: 'Insurance Certificate', type: 'Certificate', status: 'pending' }
  ];

  async function init() {
    showLoadingState();
    attachActivityRefresh();
    await loadDashboardData();
    initWidgets();
    initLiveDashboardUpdates();
    subscribeWebSocketFeed();
    renderActivityFeed();
    updateLiveStatus('Connecting…');
  }

  function initWidgets() {
    analyticsChart =
      analyticsChart || new window.AnalyticsChart({ canvasId: 'analytics-trend', stateKey: 'data.dashboardSummary' });
    documentTable =
      documentTable || new window.DocumentTable({ containerId: 'document-table', stateKey: 'data.dashboardSummary' });
    inlineEditor =
      inlineEditor || new window.InlineEditor({ containerId: 'inline-editor', stateKey: 'data.dashboardSummary' });
  }

  function attachActivityRefresh() {
    const refreshButton = document.getElementById('refresh-activity');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        loadDashboardData();
      });
    }
  }

  async function loadDashboardData(forceDemo = false) {
    try {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }

      loadingTimeout = setTimeout(() => {
        loadDashboardData(true);
      }, 3500);

      const response = await ApiClient.getDashboardMetrics();
      metricsData = response.data;
      isDemo = response.isDemo || forceDemo;

      renderMetrics(metricsData, isDemo);
      renderTrendChart();
      renderTopApplications();
      renderDocumentPreview();
      renderStatusBreakdown(metricsData, isDemo);
      updateDashboardState();

      if (isDemo) {
        showDemoBanner();
      }
    } catch (error) {
      console.warn('Dashboard data failed, falling back to demo', error);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      metricsData = ApiClient.FALLBACK_DATA?.dashboardMetrics || {
        totalApplications: 0,
        totalLoanAmount: 0,
        statusBreakdown: {
          pending: 0,
          underReview: 0,
          approved: 0,
          rejected: 0
        }
      };
      isDemo = true;
      renderMetrics(metricsData, isDemo);
      renderTrendChart();
      renderTopApplications();
      renderDocumentPreview();
      renderStatusBreakdown(metricsData, isDemo);
      updateDashboardState();
      showDemoBanner();
    }
  }

  function showLoadingState() {
    const metricsGrid = document.getElementById('metrics-grid');
    const statusGrid = document.getElementById('status-grid');
    if (metricsGrid) {
      metricsGrid.innerHTML = '';
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
    }
    if (statusGrid) {
      statusGrid.innerHTML = '';
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
  }

  function renderMetrics(data, isDemoData) {
    const metricsGrid = document.getElementById('metrics-grid');
    if (!metricsGrid) return;
    metricsGrid.innerHTML = '';
    const approvalRate =
      data.approvalRate ||
      (data.statusBreakdown
        ? ((data.statusBreakdown.approved / data.totalApplications) * 100).toFixed(1)
        : 0);
    const metrics = [
      {
        key: 'totalApplications',
        label: 'Total Applications',
        value: data.totalApplications || 0,
        change: '+12% from last month',
        changeType: 'positive'
      },
      {
        key: 'approvalRate',
        label: 'Approval Rate',
        value: `${approvalRate}%`,
        change: '+5% from last month',
        changeType: 'positive'
      },
      {
        key: 'totalLoanAmount',
        label: 'Total Loan Amount',
        value: formatCurrency(data.totalLoanAmount || 0),
        change: '+$250K from last month',
        changeType: 'positive'
      },
      {
        key: 'pendingReview',
        label: 'Pending Review',
        value: data.statusBreakdown?.pending || 0,
        change: 'Requires attention',
        changeType: 'neutral'
      }
    ];
    metrics.forEach((metric) => {
      const card = createMetricCard(metric, isDemoData);
      metricsGrid.appendChild(card);
    });
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
    updateDashboardState();
  }

  function createMetricCard(metric, isDemoData) {
    const card = document.createElement('div');
    card.className = 'metric-card';
    if (metric.key) {
      card.dataset.metricKey = metric.key;
    }
    const label = document.createElement('div');
    label.className = 'metric-label';
    label.textContent = metric.label;
    if (isDemoData) {
      const demoIcon = DemoIndicator.createIcon({
        tooltip: 'Simulated data'
      });
      label.appendChild(demoIcon);
    }
    const value = document.createElement('div');
    value.className = 'metric-value';
    value.textContent = metric.value;
    if (metric.key) {
      value.dataset.metricKey = metric.key;
    }
    const change = document.createElement('div');
    change.className = `metric-change ${metric.changeType}`;
    change.textContent = metric.change;
    card.appendChild(label);
    card.appendChild(value);
    card.appendChild(change);
    return card;
  }

  function renderStatusBreakdown(data, isDemoData) {
    const statusGrid = document.getElementById('status-grid');
    if (!statusGrid) return;
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
        badgeClass: 'under_review'
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
    statusItems.forEach((item) => {
      const statusItem = createStatusItem(item, isDemoData);
      statusGrid.appendChild(statusItem);
    });
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
    updateDashboardState();
  }

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
    if (isDemoData) {
      const demoIcon = DemoIndicator.createIcon({
        tooltip: 'Simulated data'
      });
      demoIcon.style.marginLeft = '0.5rem';
      label.appendChild(demoIcon);
    }
    return statusItem;
  }

  function showDemoBanner() {
    const main = document.querySelector('main');
    if (!main || document.querySelector('.demo-indicator-banner')) return;
    const banner = DemoIndicator.createBanner({
      title: 'Demo Mode Active',
      message: 'You\'re viewing simulated data.',
      dismissible: true
    });
    if (banner) {
      main.insertBefore(banner, main.firstChild);
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function calculateApprovalRate(data) {
    const total = data.totalApplications || 0;
    const approved = data.statusBreakdown?.approved || 0;
    if (!total) {
      return 0;
    }
    return ((approved / total) * 100).toFixed(1);
  }

  function highlightMetricCard(key) {
    if (!key) return;
    const card = document.querySelector(`.metric-card[data-metric-key="${key}"]`);
    if (!card) return;
    card.classList.add('metric-updated');
    setTimeout(() => card.classList.remove('metric-updated'), 1200);
  }

  function initLiveDashboardUpdates() {
    if (liveDashboardListenerAttached) {
      return;
    }
    const orchestrator = window.demoOrchestrator;
    if (!orchestrator) {
      liveDashboardAttachAttempts++;
      if (liveDashboardAttachAttempts <= 6) {
        setTimeout(initLiveDashboardUpdates, 800);
      }
      return;
    }
    orchestrator.on('simulated-event', handleRealtimeEvent);
    liveDashboardListenerAttached = true;
    updateLiveStatus('Live');
  }

  function subscribeWebSocketFeed() {
    const ws = window.WebSocketManager;
    if (!ws) return;
    ws.on('dashboard:event', handleRealtimeEvent);
    ws.on('application:event', handleRealtimeEvent);
    ws.on('connection:open', () => updateLiveStatus('Live'));
    ws.on('connection:close', () => updateLiveStatus('Disconnected'));
    ws.on('connection:error', () => updateLiveStatus('Error'));
  }

  function handleRealtimeEvent(event) {
    const type = event.type || event.eventType || event.payload?.type || event.data?.type;
    const payload = event.payload || event.data || {};
    if (!type) return;
    processRealtimeUpdate(type, payload);
    const message = buildActivityMessage(type, payload);
    if (message) {
      addActivity({
        type,
        message,
        timestamp: payload.timestamp || new Date().toISOString()
      });
    }
    showActivityToast(type, payload);
  }

  function processRealtimeUpdate(type, payload) {
    if (!metricsData) {
      metricsData = {
        totalApplications: 0,
        totalLoanAmount: 0,
        statusBreakdown: {
          pending: 0,
          underReview: 0,
          approved: 0,
          rejected: 0
        }
      };
    }
    const breakdown = metricsData.statusBreakdown || {};
    switch (type) {
      case 'new_application':
        metricsData.totalApplications = (metricsData.totalApplications || 0) + 1;
        adjustStatusCount('pending', 1, breakdown);
        highlightMetricCard('totalApplications');
        break;
      case 'approval_granted':
        adjustStatusCount(payload.previousStatus || 'pending', -1, breakdown);
        adjustStatusCount('approved', 1, breakdown);
        metricsData.totalLoanAmount =
          (metricsData.totalLoanAmount || 0) + (payload.loanAmount || 0);
        highlightMetricCard('totalLoanAmount');
        break;
      case 'rejection_issued':
        adjustStatusCount(payload.previousStatus || 'pending', -1, breakdown);
        adjustStatusCount('rejected', 1, breakdown);
        highlightMetricCard('pendingReview');
        break;
      case 'status_change':
      case 'review_completed':
        adjustStatusCount(payload.previousStatus, -1, breakdown);
        adjustStatusCount(payload.newStatus || 'under_review', 1, breakdown);
        highlightMetricCard('pendingReview');
        break;
      default:
        break;
    }
    metricsData.statusBreakdown = breakdown;
    metricsData.approvalRate = calculateApprovalRate(metricsData);
    renderMetrics(metricsData, true);
    renderTrendChart();
    renderTopApplications();
    renderDocumentPreview();
    renderStatusBreakdown(metricsData, true);
    updateDashboardState();
  }

  function adjustStatusCount(status, delta, breakdown) {
    const key = mapStatusToBreakdownKey(status);
    if (!key) return;
    breakdown[key] = Math.max((breakdown[key] || 0) + delta, 0);
  }

  function mapStatusToBreakdownKey(status) {
    if (!status) return null;
    const normalized = status.toLowerCase().replace(/[\s\-_]/g, '');
    if (normalized.includes('underreview')) {
      return 'underReview';
    }
    if (normalized.includes('pending')) {
      return 'pending';
    }
    if (normalized.includes('approved')) {
      return 'approved';
    }
    if (normalized.includes('rejected')) {
      return 'rejected';
    }
    return null;
  }

  function buildActivityMessage(type, payload) {
    const templates = {
      new_application: (data) =>
        `${data.businessName || 'Applicant'} submitted ${formatCurrency(data.loanAmount || 0)}`,
      approval_granted: (data) =>
        `${data.businessName || 'Applicant'} approved for ${formatCurrency(data.loanAmount || 0)}`,
      rejection_issued: (data) => `${data.businessName || 'Applicant'} was rejected`,
      status_change: (data) =>
        `${data.businessName || 'Application'} moved to ${data.newStatus || 'an updated status'}`,
      review_completed: (data) =>
        `${data.businessName || 'Application'} review completed by ${data.reviewer || 'the team'}`
    };
    const template = templates[type];
    return template ? template(payload) : payload.summary || 'Live update received';
  }

  function addActivity(entry) {
    activityFeed.unshift(entry);
    if (activityFeed.length > ACTIVITY_LIMIT) {
      activityFeed.pop();
    }
    renderActivityFeed();
    updateOverlayMessage(entry.message);
    updateDashboardState();
  }

  function deriveTopApplications() {
    if (!metricsData?.topApplications?.length) {
      return [
        {
          id: 'APP-2024-001234',
          name: 'Acme Manufacturing LLC',
          amount: '$150,000',
          status: 'Under Review'
        },
        {
          id: 'APP-2024-001235',
          name: 'Northwind Trading Co.',
          amount: '$82,500',
          status: 'Pending'
        },
        {
          id: 'APP-2024-001236',
          name: 'Morrow Logistics',
          amount: '$120,000',
          status: 'Approved'
        },
        {
          id: 'APP-2024-001237',
          name: 'Tailwind Distillery',
          amount: '$64,200',
          status: 'Requested Info'
        }
      ].slice(0, TOP_APP_LIMIT);
    }
    return metricsData.topApplications.slice(0, TOP_APP_LIMIT);
  }

  function renderTrendChart() {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = [...trendHistory].reverse();
    const values = data.map((point) => point.total || 0);
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    if (!values.length) {
      ctx.fillStyle = 'var(--color-neutral-100)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'var(--color-neutral-500)';
      ctx.font = '14px var(--font-sans)';
      ctx.fillText('No trend data yet', width / 2 - 50, height / 2);
      return;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    const stepX = width / (values.length - 1 || 1);
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = Math.min(stepX * index, width - 1);
      const y = height - ((value - min) / range) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = Math.min(stepX * index, width - 1);
      const y = height - ((value - min) / range) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = 'var(--color-primary-500)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function renderTopApplications() {
    const container = document.getElementById('top-applications');
    if (!container) return;
    const applications = deriveTopApplications();
    container.innerHTML = '';
    applications.forEach((app) => {
      const card = document.createElement('article');
      card.className = 'top-application-card';
      card.innerHTML = `
        <strong>${app.status}</strong>
        <span class="business-name">${app.name}</span>
        <span class="card-meta">Loan: ${app.amount}</span>
        <span class="card-meta">ID: ${app.id}</span>
        <a class="view-details" href="/application-detail.html?id=${app.id}">View details</a>
      `;
      container.appendChild(card);
    });
  }

  function renderDocumentPreview() {
    const container = document.getElementById('document-preview');
    if (!container) return;
    const documents = metricsData?.documents || docPreviewFallback;
    container.innerHTML = '';
    documents.slice(0, 4).forEach((doc) => {
      const card = document.createElement('div');
      card.className = 'document-card';
      card.innerHTML = `
        <strong>${doc.type}</strong>
        <span class="document-label">${doc.name}</span>
        <span class="document-meta">Status: ${doc.status}</span>
      `;
      container.appendChild(card);
    });
  }

  function renderActivityFeed() {
    const container = document.getElementById(ACTIVITY_CONTAINER_ID);
    if (!container) return;
    if (!activityFeed.length) {
      container.innerHTML = '<div class="activity-empty">Waiting for live events…</div>';
      return;
    }
    container.innerHTML = '';
    activityFeed.forEach((item) => {
      const node = document.createElement('article');
      node.className = 'activity-item';
      const title = document.createElement('strong');
      title.textContent = item.type.replace('_', ' ').toUpperCase();
      const message = document.createElement('span');
      message.textContent = item.message;
      const meta = document.createElement('div');
      meta.className = 'activity-meta';
      const time = document.createElement('span');
      time.textContent = new Date(item.timestamp).toLocaleTimeString();
      const source = document.createElement('span');
      source.textContent = isDemo ? 'Demo stream' : 'Live data';
      meta.appendChild(time);
      meta.appendChild(source);
      node.appendChild(title);
      node.appendChild(message);
      node.appendChild(meta);
      container.appendChild(node);
    });
  }

  function showActivityToast(type, payload) {
    if (!window.showToastNotification) return;
    const config = EVENT_TOAST_CONFIG[type];
    if (!config) return;
    window.showToastNotification({
      title: config.title,
      message: config.message(payload),
      color: config.color
    });
  }

  function updateLiveStatus(text) {
    const element = document.getElementById(LIVE_STATUS_ID);
    if (!element) return;
    element.textContent = text;
    element.classList.remove('disconnected');
    if (text === 'Disconnected' || text === 'Error') {
      element.classList.add('disconnected');
    }
  }

  function updateDashboardState() {
    if (!window.AppState) return;
    const trendPoint = {
      timestamp: Date.now(),
      total: metricsData?.totalApplications || 0
    };
    trendHistory.unshift(trendPoint);
    if (trendHistory.length > TREND_HISTORY_LIMIT) {
      trendHistory.pop();
    }
    window.AppState.setState('data.dashboardSummary', {
      metrics: metricsData,
      activity: activityFeed,
      trends: [...trendHistory],
      topApplications: deriveTopApplications(),
      documents: metricsData?.documents || docPreviewFallback,
      updatedAt: Date.now(),
      isDemo,
      overlayMessage
    });
  }

  function updateOverlayMessage(message) {
    overlayMessage = message;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
