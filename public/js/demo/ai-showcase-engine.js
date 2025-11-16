/**
 * AI Showcase Engine
 * Generates synthetic risk scores, document analysis, and recommendations for the demo mode.
 */

const RISK_LEVELS = [
  { label: 'Low', color: '#10b981', range: [0, 40] },
  { label: 'Medium', color: '#f59e0b', range: [41, 70] },
  { label: 'High', color: '#ef4444', range: [71, 100] }
];

class AIShowcaseEngine {
  constructor(orchestrator, options = {}) {
    this.orchestrator = orchestrator;
    this.interval = options.interval || 7000;
    this.timer = null;
    this.listeners = new Map();
    this.isRunning = false;

    this._bindToOrchestrator();
  }

  _bindToOrchestrator() {
    if (this.orchestrator && this.orchestrator.registerComponent) {
      this.orchestrator.registerComponent('aiShowcaseEngine', this);
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  emit(event, payload) {
    (this.listeners.get(event) || []).forEach((handler) => handler(payload));
  }

  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this._scheduleNextInsight();
    this.emit('started');
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit('stopped');
  }

  triggerInsight() {
    const insight = {
      risk: this._generateRiskScore(),
      document: this._generateDocumentAnalysis(),
      recommendations: this._generateRecommendations()
    };

    this.emit('insight', insight);
    this._flashThinking();
  }

  _scheduleNextInsight() {
    if (!this.isRunning) {
      return;
    }
    this.timer = setTimeout(() => {
      this.triggerInsight();
      this._scheduleNextInsight();
    }, this.interval);
  }

  _flashThinking() {
    this.emit('thinking', true);
    setTimeout(() => this.emit('thinking', false), 1200);
  }

  _generateRiskScore() {
    const score = Math.floor(40 + Math.random() * 55);
    const level = RISK_LEVELS.find((entry) => score >= entry.range[0] && score <= entry.range[1]) || RISK_LEVELS[0];
    const components = [
      { label: 'Document Confidence', value: 92 - Math.random() * 10 },
      { label: 'AI Risk Index', value: 55 + Math.random() * 40 },
      { label: 'Compliance Visibility', value: 75 + Math.random() * 20 }
    ];

    return {
      score,
      label: level.label,
      color: level.color,
      components
    };
  }

  _generateDocumentAnalysis() {
    const fields = [
      'Revenue Statement',
      'Ownership Proof',
      'Cash Flow Forecast',
      'Collateral Registry'
    ];
    const highlighted = fields.filter(() => Math.random() > 0.35);
    const issues = ['Missing signature', 'Outdated docs', 'Formatting mismatch'];

    return {
      confidence: Math.floor(80 + Math.random() * 15),
      highlighted,
      issues: issues.filter(() => Math.random() > 0.5).slice(0, 2),
      notes: 'AI flagged potential duplicate payment entries and recommended manual review.'
    };
  }

  _generateRecommendations() {
    const outcomes = [
      'Queue for expedited approval',
      'Request supplemental collateral',
      'Schedule compliance review',
      'Archive and monitor for updates',
      'Trigger AI-generated follow-up questions',
      'Escalate to underwriting'
    ];
    const shuffled = outcomes.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map((item, index) => ({
      id: `rec-${Date.now()}-${index}`,
      title: item,
      confidence: Math.floor(75 + Math.random() * 20)
    }));
  }
}

if (typeof window !== 'undefined') {
  window.AIShowcaseEngine = AIShowcaseEngine;
  window.aiShowcase = new AIShowcaseEngine(window.demoOrchestrator);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIShowcaseEngine;
}
