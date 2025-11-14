const apiBase = '/api/v1/sba-demo';
const crmBase = `${apiBase}/crm`;
const urlParams = new URLSearchParams(window.location.search);
const selectedRole = (urlParams.get('role') || 'REVIEWER').toUpperCase();
const rehearsalSeed = (urlParams.get('seed') || '').trim();
const demoBadgeEl = document.getElementById('demoBadge');
const demoBroadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('octodoc-demo-bus') : null;
let roleShowcase = null;
let session = null;
const polling = {};
let crmSnapshot = null;
let sessionStream = null;
let latestDocuments = [];
let sessionAnalytics = null;
let jobStages = [];
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

hydrateRoleContext();
updateSessionPulse();
loadControlOverview();
attachEventListeners();
updateDemoBadge('idle');

window.addEventListener('demo:intake-upload', event => {
  if (!event.detail?.files?.length) return;
  handleFiles(event.detail.files);
});

function el(id) {
  return document.getElementById(id);
}

function closestTarget(event, selector) {
  if (!(event.target instanceof Element)) return null;
  return event.target.closest(selector);
}

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatScore(score) {
  return typeof score === 'number' && Number.isFinite(score) ? `${score}%` : '--';
}

function formatStatusLabel(status) {
  if (!status) return 'Processing';
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'needs_attention':
      return 'Needs attention';
    case 'rejected':
      return 'Rejected';
    case 'processing':
      return 'Processing';
    case 'queued':
      return 'Queued';
    case 'done':
      return 'Done';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

function formatRiskLabel(level) {
  const normalized = (level || 'LOW').toUpperCase();
  if (normalized === 'HIGH') return 'HIGH';
  if (normalized === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

async function hydrateRoleContext() {
  try {
    const res = await fetch(`/api/v1/sba-demo/roles/${selectedRole}`);
    if (!res.ok) return;
    roleShowcase = await res.json();
    renderRoleContext(roleShowcase);
  } catch (err) {
    console.warn('Unable to hydrate role context', err);
  }
}

function renderRoleContext(role) {
  if (!role) return;
  el('roleEyebrow').textContent = role.title;
  el('roleHeadline').textContent = role.headline;
  el('roleDescription').textContent = role.description;
  el('roleHeroStat').innerHTML = `<span class="metric-label">${role.primaryAction}</span><span class="metric-value">${role.heroStat}</span>`;
  const highlights = el('roleHighlights');
  highlights.innerHTML = '';
  role.highlights.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    highlights.appendChild(li);
  });
}

function renderChecklist(checklist) {
  const container = el('checklist');
  container.innerHTML = '';
  checklist.forEach(item => {
    const div = document.createElement('div');
    div.className = 'check-item';
    div.innerHTML = `<input type="checkbox" data-id="${item.id}" ${item.required ? 'checked' : ''} disabled> <strong>${item.title}</strong> ${item.required ? '<em>(required)</em>' : ''}`;
    container.appendChild(div);
  });
}

async function startDemo() {
  const loanType = el('loanType').value;
  const applicantName = el('applicantName').value;
  const email = el('email').value;
  const startBtn = el('startBtn');
  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';
  try {
    const payload = { loanType, applicantName, email };
    if (rehearsalSeed) {
      payload.seed = rehearsalSeed;
    }
    const res = await fetch(apiBase + '/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to start session');
    session = await res.json();
    updateDemoBadge('active', { loanType: session.loanType, expiresAt: session.expiresAt });
    document.body.dataset.demoMode = 'active';
    el('scheduleBtn').disabled = false;
    el('scheduleBtn').setAttribute('aria-disabled', 'false');
    latestDocuments = [];
    sessionAnalytics = null;
    renderUploads([]);
    renderSuggestionStream([], null);
    updateSessionPulse(null);
    clearAiDetail();
    stopStream();
    fetchDocs();
    loadCrmOverview();
    loadTimeline();
    connectStream();
    loadControlOverview(true);
  } catch (error) {
    console.error('Unable to start demo session', error);
    alert('Failed to start demo session. Please try again.');
    updateDemoBadge('error');
  } finally {
    startBtn.textContent = 'Start OctoDoc Demo';
    startBtn.disabled = false;
  }
}

function connectStream() {
  if (!session) return;
  stopStream();
  sessionStream = new EventSource(`${apiBase}/stream/${session.sessionId}`);
  sessionStream.onmessage = event => {
    if (!event.data) return;
    try {
      const payload = JSON.parse(event.data);
      applyStreamPayload(payload);
    } catch (err) {
      console.warn('Failed to parse SSE payload', err);
    }
  };
  sessionStream.onerror = () => {
    stopStream();
    setTimeout(() => connectStream(), 4000);
  };
}

function stopStream() {
  if (sessionStream) {
    sessionStream.close();
    sessionStream = null;
  }
}

function applyStreamPayload(payload) {
  if (payload.analytics) {
    sessionAnalytics = payload.analytics;
    updateSessionPulse(sessionAnalytics);
  }
  if (payload.crm) {
    crmSnapshot = payload.crm;
    renderPipelineStages(crmSnapshot.pipelineStages || []);
    renderRelationshipCards(crmSnapshot.relationshipHealth || []);
    renderActionItems(crmSnapshot.actionItems || []);
    renderInsights(crmSnapshot.engagementInsights || []);
    renderQuickReplies(crmSnapshot.quickReplies || []);
  }
  if (payload.timeline) {
    renderTimeline(payload.timeline);
  }
  if (payload.documents) {
    latestDocuments = mergeDocuments(latestDocuments, payload.documents);
    renderUploads(latestDocuments);
    renderSuggestionStream(latestDocuments, sessionAnalytics);
    markDemoReady();
  }
  if (payload.jobs) {
    jobStages = payload.jobs;
    window.octodocJobs = jobStages;
    renderProcessingTimeline(jobStages);
  }
}

function mergeDocuments(existing, updates) {
  const map = new Map();
  existing.forEach(doc => map.set(doc.documentId, { ...doc }));
  updates.forEach(doc => {
    const previous = map.get(doc.documentId) || {};
    map.set(doc.documentId, { ...previous, ...doc });
  });
  return Array.from(map.values());
}

async function fetchDocs() {
  if (!session) return;
  try {
    const res = await fetch(`${apiBase}/documents/${session.sessionId}`);
    if (!res.ok) return;
    const data = await res.json();
    renderChecklist(data.requiredChecklist || []);
    latestDocuments = data.documents || [];
    if (data.analytics) {
      sessionAnalytics = data.analytics;
      updateSessionPulse(sessionAnalytics);
    }
    renderUploads(latestDocuments);
    renderSuggestionStream(latestDocuments, sessionAnalytics);
  } catch (err) {
    console.warn('Failed to load documents', err);
  }
}

function renderUploads(docs) {
  const container = el('uploads');
  if (!container) return;
  if (!docs.length) {
    container.innerHTML = '<p class="empty-state">Upload files to see AI analysis, quality, and risk insights.</p>';
    return;
  }
  const sorted = [...docs].sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
  container.innerHTML = sorted
    .map(doc => {
      const qualityScore = doc.analysis?.quality?.score ?? doc.qualityScore;
      const riskScore = doc.analysis?.risk?.score ?? doc.riskScore;
      const aiConfidence = doc.analysis ? Math.round((doc.analysis.ai.confidence || 0) * 100) : doc.aiConfidence;
      const suggestions = (doc.analysis?.suggestions || doc.suggestions || []).slice(0, 2);
      const suggestionsMarkup = suggestions.length
        ? '<ul class="doc-suggestions">' +
          suggestions.map(s => `<li><span class="pill ${s.severity || 'info'}">${s.severity || 'info'}</span> ${s.title}</li>`).join('') +
          '</ul>'
        : '';
      const updatedLabel = doc.analysis?.processing?.completedAt
        ? `Updated ${formatTime(doc.analysis.processing.completedAt)}`
        : `Uploaded ${formatTime(doc.uploadedAt)}`;
      const revalidateButton =
        doc.status === 'needs_attention'
          ? `<button class="ghost-btn tiny" data-action="revalidate" data-doc="${doc.documentId}">Re-run validation</button>`
          : '';
      const viewButton = doc.analysis
        ? `<button class="ghost-btn tiny" data-action="view-analysis" data-doc="${doc.documentId}">AI readout</button>`
        : '';
      return `<article class="doc-card status-${doc.status || 'processing'}">
        <header>
          <div>
            <strong>${doc.originalName}</strong>
            <small>${formatBytes(doc.size)} | ${doc.documentType || 'Unclassified'}</small>
          </div>
          <span class="badge ${doc.status === 'accepted' ? 'accepted' : doc.status === 'needs_attention' ? 'attention' : 'processing'}">${formatStatusLabel(doc.status)}</span>
        </header>
        <div class="doc-metrics">
          <div class="doc-chip">
            <span>Quality</span>
            <strong>${formatScore(qualityScore)}</strong>
          </div>
          <div class="doc-chip">
            <span>Risk</span>
            <strong>${formatScore(riskScore)}</strong>
          </div>
          <div class="doc-chip">
            <span>AI confidence</span>
            <strong>${formatScore(typeof aiConfidence === 'number' ? Math.round(aiConfidence) : null)}</strong>
          </div>
        </div>
        <p class="ai-summary">${doc.analysis?.ai?.summary || doc.aiSummary || 'AI Copilot is still analyzing this document.'}</p>
        ${suggestionsMarkup}
        <footer>
          <small>${updatedLabel}</small>
          <div class="doc-actions">
            ${revalidateButton}${viewButton}
          </div>
        </footer>
      </article>`;
    })
    .join('');
}

function renderSuggestionStream(docs, analytics) {
  const container = el('suggestions');
  if (!container) return;
  const docSuggestions = docs.flatMap(doc =>
    (doc.analysis?.suggestions || doc.suggestions || []).map(suggestion => ({
      ...suggestion,
      docId: doc.documentId,
      docName: doc.originalName,
    }))
  );
  const recommendedActions = (analytics?.recommendedActions || []).map(action => ({
    id: `action-${action}`,
    title: action,
    detail: 'AI session recommendation',
    severity: 'info',
  }));
  const queue = [...docSuggestions, ...recommendedActions].slice(0, 4);
  if (!queue.length) {
    container.innerHTML = '<div class="ok">All documents look good so far.</div>';
    return;
  }
  container.innerHTML = queue
    .map(
      item => {
        const detailText = (item.detail || '') + (item.docName ? ` <small>(${item.docName})</small>` : '');
        const actionButton = item.docId
          ? `<button class="ghost-btn tiny" data-action="revalidate" data-doc="${item.docId}">Re-run</button>`
          : '';
        return `
      <div class="suggestion severity-${item.severity || 'info'}">
        <div>
          <strong>${item.title}</strong>
          <p>${detailText}</p>
        </div>
        ${actionButton}
      </div>`;
      }
    )
    .join('');
}

function renderProcessingTimeline(jobs) {
  const container = el('processingTimeline');
  if (!container) return;
  if (!jobs || !jobs.length) {
    container.innerHTML = '<p class="empty-state">Uploads stream through OctoDoc\'s stages here.</p>';
    return;
  }
  const ordered = [...jobs].sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));
  const latest = ordered.slice(0, 2);
  container.innerHTML = latest
    .map(job => {
      const stageMarkup = (job.stages || [])
        .map(
          stage => `
        <div class="stage-pill ${stage.status || 'pending'}">
          <span>${stage.label}</span>
          <small>${stage.detail || formatStageStatus(stage.status)}</small>
        </div>`
        )
        .join('');
      return `
      <div class="processing-job">
        <div class="processing-job__meta">
          <div>
            <strong>${job.status === 'done' ? 'Processed' : 'Processing'} · ${formatStatusLabel(job.status)}</strong>
            <small>${formatTime(job.completedAt || job.startedAt)}</small>
          </div>
          <div>${job.documentId?.slice(0, 8) || 'pending'}</div>
        </div>
        <div class="processing-stage-grid">
          ${stageMarkup}
        </div>
      </div>`;
    })
    .join('');
  emitDemoEvent('demo:timeline-update', { jobs: latest });
}

function formatStageStatus(status) {
  switch (status) {
    case 'running':
      return 'In progress';
    case 'done':
      return 'Complete';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
}

function markDemoReady() {
  if (document.body.classList.contains('demo-ready')) {
    return;
  }
  const root = document.querySelector('main.container');
  if (root) {
    document.body.classList.add('demo-ready');
    root.setAttribute('data-demo-ready', 'true');
  }
}

function updateDemoBadge(state, context = {}) {
  if (!demoBadgeEl) return;
  let label = 'Demo mode · idle';
  if (state === 'active') {
    const loanLabel = context.loanType === '5a' ? 'SBA 5(a)' : 'SBA 504';
    label = `Demo mode · ${loanLabel}`;
  } else if (state === 'error') {
    label = 'Demo mode · retry needed';
  }
  demoBadgeEl.textContent = label;
  demoBadgeEl.dataset.state = state;
  emitDemoEvent('demo:session-state', { state, context });
}

function emitDemoEvent(name, detail) {
  const payload = { detail };
  window.dispatchEvent(new CustomEvent(name, payload));
  demoBroadcast?.postMessage({ name, detail });
}

function updateSessionPulse(analytics = null) {
  el('metricDocs').textContent = analytics?.totalDocuments ?? 0;
  el('metricDocsDetail').textContent = analytics
    ? `${analytics.acceptedDocuments} accepted | ${analytics.needsAttentionDocuments} flagged`
    : 'Upload files to begin';
  el('metricQuality').textContent = analytics ? formatScore(analytics.averageQualityScore) : '--';
  el('metricQualityDetail').textContent = analytics ? 'Avg quality score' : 'Avg quality';
  el('metricRisk').textContent = analytics ? formatRiskLabel(analytics.riskLevel) : 'LOW';
  el('metricRiskDetail').textContent = analytics ? `Avg risk ${formatScore(analytics.averageRiskScore)}` : 'Avg risk';
  const action = analytics?.recommendedActions?.[0] || 'Kick off a session to unlock AI guidance.';
  el('metricAction').textContent = action;
  el('metricActionDetail').textContent = analytics?.highlights?.[0] || 'Highlights from AI will appear here.';
}

async function loadCrmOverview() {
  if (!session) return;
  try {
    const res = await fetch(`${crmBase}/${session.sessionId}/overview`);
    if (!res.ok) return;
    crmSnapshot = await res.json();
    renderPipelineStages(crmSnapshot.pipelineStages || []);
    renderRelationshipCards(crmSnapshot.relationshipHealth || []);
    renderActionItems(crmSnapshot.actionItems || []);
    renderInsights(crmSnapshot.engagementInsights || []);
    renderQuickReplies(crmSnapshot.quickReplies || []);
  } catch (err) {
    console.warn('Unable to load CRM snapshot', err);
  }
}

async function loadTimeline() {
  if (!session) return;
  try {
    const res = await fetch(`${crmBase}/${session.sessionId}/timeline`);
    if (!res.ok) return;
    const data = await res.json();
    renderTimeline(data.events || []);
  } catch (err) {
    console.warn('Unable to load timeline', err);
  }
}

function renderPipelineStages(stages) {
  const container = el('pipelineStages');
  if (!container) return;
  if (!stages.length) {
    container.innerHTML = '<p class="empty-state">Pipeline will populate after you start a session.</p>';
    return;
  }
  const momentumIcons = { up: '^ momentum', down: 'v momentum', flat: '= momentum' };
  container.innerHTML = stages
    .map(
      stage => `
      <article class="pipeline-card">
        <header>
          <p class="label">${stage.stage}</p>
          <span class="momentum ${stage.momentum}">${momentumIcons[stage.momentum] || '= momentum'}</span>
        </header>
        <p class="value">${stage.count} files</p>
        <p class="meta">${currencyFormatter.format(stage.avgAmount)} | ${stage.stuck} to unblock</p>
      </article>`
    )
    .join('');
}

function renderRelationshipCards(items) {
  const container = el('relationshipList');
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">Relationship insights appear once a demo session is active.</p>';
    return;
  }
  container.innerHTML = items
    .map(
      item => `
      <article class="relationship-card sentiment-${item.sentiment.toLowerCase()}">
        <header>
          <strong>${item.businessName}</strong>
          <span class="pill">${item.stage}</span>
        </header>
        <p class="borrower">${item.borrowerName}</p>
        <p class="meta">${currencyFormatter.format(item.requestedAmount)} | Owner ${item.owner}</p>
        <p class="meta">Last touch ${formatTime(item.lastTouch)} | Next ${item.nextStep}</p>
        <p class="meta">${item.outstandingItems} open items</p>
      </article>`
    )
    .join('');
}

function renderActionItems(items) {
  const container = el('actionItems');
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">OctoDoc will queue next actions once documents arrive.</p>';
    return;
  }
  container.innerHTML = items
    .map(
      item => `
      <article class="action-card priority-${item.priority.toLowerCase()}">
        <header>
          <span>${item.label}</span>
          <span class="pill">${item.channel}</span>
        </header>
        <p class="meta">Owner ${item.owner} | ${item.relatedBorrower}</p>
        <p class="meta">Due ${formatTime(item.dueAt)}</p>
        <small>${item.recommendedTemplate}</small>
      </article>`
    )
    .join('');
}

function renderQuickReplies(replies) {
  const container = el('quickReplies');
  if (!container) return;
  if (!replies.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = replies
    .map(
      reply => `
      <button class="quick-reply" data-body="${encodeURIComponent(reply.body)}" data-channel="${reply.channel}">
        <span>${reply.label}</span>
        <small>${reply.channel} | ${reply.tone}</small>
      </button>`
    )
    .join('');
}

function renderInsights(insights) {
  const container = el('insightStream');
  if (!container) return;
  if (!insights.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = insights
    .map(
      insight => `
      <article class="insight-card ${insight.severity}">
        <h4>${insight.title}</h4>
        <p>${insight.detail}</p>
        <small>${insight.impact}</small>
      </article>`
    )
    .join('');
}

function renderTimeline(events) {
  const container = el('relationshipTimeline');
  if (!container) return;
  if (!events.length) {
    container.innerHTML = '<p class="empty-state">Timeline events arrive once the CRM snapshot loads.</p>';
    return;
  }
  container.innerHTML = events
    .map(
      event => {
        const attachment = event.attachment ? ` | ${event.attachment}` : '';
        return `
      <article class="timeline-event">
        <div class="time">${formatTime(event.timestamp)}</div>
        <div>
          <p class="summary"><strong>${event.actor}</strong> | ${event.channel}</p>
          <p>${event.summary}</p>
          <small>${event.impact}${attachment}</small>
        </div>
      </article>`;
      }
    )
    .join('');
}

async function handleFiles(files) {
  if (!session) {
    alert('Start a demo session first');
    return;
  }
  for (const file of files) {
    const form = new FormData();
    form.append('sessionId', session.sessionId);
    form.append('file', file, file.name);
    try {
      const res = await fetch(apiBase + '/upload', { method: 'POST', body: form });
      if (!res.ok) {
        alert('Upload failed');
        continue;
      }
      const data = await res.json();
      pollJob(data.jobId);
      fetchDocs();
      loadControlOverview(true);
    } catch (error) {
      console.warn('Upload failed', error);
    }
  }
}

function pollJob(jobId) {
  if (polling[jobId]) return;
  polling[jobId] = setInterval(async () => {
    try {
      const res = await fetch(apiBase + '/status/' + jobId);
      if (!res.ok) throw new Error('Job not found');
      const data = await res.json();
      if (data.status === 'done' || data.status === 'failed') {
        clearInterval(polling[jobId]);
        delete polling[jobId];
        fetchDocs();
        loadControlOverview(true);
        const msg = document.createElement('div');
        msg.className = 'visually-hidden';
        msg.setAttribute('role', 'status');
        msg.textContent = `Document processing ${data.status}`;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
      }
    } catch (error) {
      clearInterval(polling[jobId]);
      delete polling[jobId];
    }
  }, 900);
}

async function loadAnalysis(documentId) {
  try {
    const res = await fetch(`${apiBase}/analysis/${documentId}`);
    if (!res.ok) throw new Error('Analysis not ready');
    const payload = await res.json();
    renderAiDetail(payload);
  } catch (err) {
    alert('AI analysis is still running. Please try again once processing completes.');
  }
}

function renderAiDetail(payload) {
  const container = el('aiDetailContent');
  if (!container || !payload?.analysis) {
    container.innerHTML = '<p class="empty-state">Select a processed document to see AI quality, risk, and extraction details.</p>';
    return;
  }
  const { document, analysis, validation } = payload;
  const entityList = (analysis.ai.extractedEntities || [])
    .map(entity => `<li><strong>${entity.label}</strong> - ${entity.value} (${formatScore(Math.round((entity.confidence || 0) * 100))})</li>`)
    .join('');
  const qualityList = (analysis.quality.issues || []).map(issue => `<li>${issue}</li>`).join('');
  const recommendationList = (analysis.suggestions || []).map(s => `<li><span class="pill ${s.severity}">${s.severity}</span> ${s.title}</li>`).join('');
  const validationList = (validation?.reasons || []).map(reason => `<li>${reason}</li>`).join('');
  const qualityBlock = qualityList ? `<section><h4>Quality Alerts</h4><ul>${qualityList}</ul></section>` : '';
  const validationBlock = validationList ? `<section><h4>Validation Reasons</h4><ul>${validationList}</ul></section>` : '';
  const recommendationBlock = recommendationList ? `<section><h4>Recommendations</h4><ul>${recommendationList}</ul></section>` : '';
  const entitiesBlock = entityList ? `<section><h4>Extracted Entities</h4><ul>${entityList}</ul></section>` : '';

  container.innerHTML = `
    <div class="ai-detail__header">
      <div>
        <strong>${document.originalName}</strong>
        <small>${formatBytes(document.size)} | ${document.documentType || 'Unclassified'}</small>
      </div>
      <span class="badge ${document.status === 'accepted' ? 'accepted' : document.status === 'needs_attention' ? 'attention' : 'processing'}">${formatStatusLabel(document.status)}</span>
    </div>
    <div class="ai-grid">
      <div>
        <p>Quality Score</p>
        <strong>${formatScore(analysis.quality.score)}</strong>
        <small>${analysis.quality.summary}</small>
      </div>
      <div>
        <p>Risk Score</p>
        <strong>${formatScore(analysis.risk.score)}</strong>
        <small>${analysis.risk.summary}</small>
      </div>
      <div>
        <p>AI Confidence</p>
        <strong>${formatScore(Math.round((analysis.ai.confidence || 0) * 100))}</strong>
        <small>${analysis.ai.summary}</small>
      </div>
    </div>
    ${qualityBlock}
    ${validationBlock}
    ${recommendationBlock}
    ${entitiesBlock}
  `;
}

function clearAiDetail() {
  const container = el('aiDetailContent');
  if (container) {
    container.innerHTML = '<p class="empty-state">Select a processed document to see AI quality, risk, and extraction details.</p>';
  }
}

async function loadControlOverview(force = false) {
  if (!force && !session) return;
  try {
    const res = await fetch(`${apiBase}/control-room/overview`);
    if (!res.ok) return;
    const data = await res.json();
    renderControlOverview(data);
  } catch (err) {
    console.warn('Unable to load control overview', err);
  }
}

function renderControlOverview(data) {
  const container = el('controlOverview');
  if (!container) return;
  if (!data) {
    container.innerHTML = '<p class="empty-state">Unable to load control signals.</p>';
    return;
  }
  const sessions = (data.sessions || [])
    .slice(0, 3)
    .map(item => `<li><strong>${item.sessionId.slice(0, 6)}</strong> | ${item.totalDocuments} docs | ${formatRiskLabel(item.riskLevel)}</li>`)
    .join('') || '<li>No live sessions</li>';
  const docs = (data.recentDocuments || [])
    .slice(0, 3)
    .map(doc => `<li>${doc.originalName} <small>${formatStatusLabel(doc.status)}</small></li>`)
    .join('') || '<li>No uploads yet</li>';
  container.innerHTML = `
    <div class="control-row">
      <span>Demo mode</span>
      <span class="pill ${data.demoMode?.active ? 'attention' : 'success'}">${data.demoMode?.active ? 'Active' : 'Off'}</span>
    </div>
    <div class="control-row">
      <span>Redis</span>
      <span class="pill ${data.redis?.healthy ? 'success' : 'attention'}">${data.redis?.healthy ? 'Healthy' : 'Degraded'}</span>
    </div>
    <div class="control-preview">
      <p class="label">Live sessions</p>
      <ul>${sessions}</ul>
    </div>
    <div class="control-preview">
      <p class="label">Recent docs</p>
      <ul>${docs}</ul>
    </div>
  `;
}

function attachEventListeners() {
  const startBtn = el('startBtn');
  startBtn.addEventListener('click', startDemo);
  startBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter') startDemo();
  });

  el('scheduleBtn').addEventListener('click', async () => {
    if (!session) return;
    const res = await fetch(apiBase + '/schedule-pickup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId }),
    });
    if (!res.ok) {
      alert('Failed to schedule');
      return;
    }
    const data = await res.json();
    alert('Pickup scheduled: ' + new Date(data.scheduledAt).toLocaleString());
  });

  const refreshBtn = el('refreshCrm');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadCrmOverview();
      loadTimeline();
    });
  }

  const controlRefresh = el('controlRefresh');
  if (controlRefresh) {
    controlRefresh.addEventListener('click', () => loadControlOverview(true));
  }

  const quickReplyContainer = el('quickReplies');
  if (quickReplyContainer) {
    quickReplyContainer.addEventListener('click', async e => {
      const target = closestTarget(e, '.quick-reply');
      if (!target) return;
      const message = decodeURIComponent(target.dataset.body || '');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
          alert('Copied reply to clipboard');
        } else {
          prompt('Copy the quick reply below', message);
        }
      } catch (err) {
        prompt('Copy the quick reply below', message);
      }
    });
  }

  el('suggestions').addEventListener('click', async e => {
    const target = closestTarget(e, '[data-action="revalidate"]');
    if (!target) return;
    const docId = target.getAttribute('data-doc');
    if (!docId) return;
    const res = await fetch(apiBase + '/validate/' + docId, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data?.jobId) pollJob(data.jobId);
    }
  });

  el('uploads').addEventListener('click', e => {
    const revalidate = closestTarget(e, '[data-action="revalidate"]');
    if (revalidate) {
      const docId = revalidate.getAttribute('data-doc');
      if (docId) {
        fetch(apiBase + '/validate/' + docId, { method: 'POST' })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (data?.jobId) pollJob(data.jobId);
          });
      }
      return;
    }
    const viewBtn = closestTarget(e, '[data-action="view-analysis"]');
    if (viewBtn) {
      const docId = viewBtn.getAttribute('data-doc');
      if (docId) loadAnalysis(docId);
    }
  });

  const aiClear = el('aiDetailClear');
  if (aiClear) {
    aiClear.addEventListener('click', clearAiDetail);
  }

  window.addEventListener('beforeunload', stopStream);
}
