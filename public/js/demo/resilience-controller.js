class ResilienceController {
  constructor(options = {}) {
    this.services =
      options.services || [
        {
          id: 'api-gateway',
          label: 'API Gateway',
          description: 'Handles every inbound API call and enforces circuit breaker limits.'
        },
        {
          id: 'document-store',
          label: 'Document Storage',
          description: 'Stores uploaded documents and serves them to reviewers.'
        },
        {
          id: 'ai-engine',
          label: 'AI Analysis Engine',
          description: 'Processes documents, surface risk scores, and writes annotations.'
        },
        {
          id: 'notification-service',
          label: 'Notification Hub',
          description: 'Delivers toast notifications, emails, and Teams cards.'
        },
        {
          id: 'workflow-processor',
          label: 'Workflow Processor',
          description: 'Runs review automation jobs and agenda scheduling.'
        }
      ];
    this.state = {};
    this.history = [];
    this.listeners = new Map();
    this.activeTimers = new Map();
    this.circuitState = 'healthy'; // healthy, degraded, tripped

    this.services.forEach((service) => {
      this.state[service.id] = {
        status: 'healthy',
        severity: 'low',
        lastUpdated: new Date()
      };
    });
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

  getService(id) {
    return this.services.find((item) => item.id === id);
  }

  getStatus(id) {
    return this.state[id];
  }

  getCircuitState() {
    return this.circuitState;
  }

  simulateFailure(serviceId, options = {}) {
    const service = this.getService(serviceId);
    if (!service) {
      return false;
    }

    const duration = options.duration || 7000;
    const severity = options.severity || 'medium';

    this._updateService(serviceId, 'failed', severity);
    this.logEvent('service-failure', {
      serviceId,
      label: service.label,
      severity,
      duration
    });
    this._refreshCircuitState();

    if (this.activeTimers.has(serviceId)) {
      clearTimeout(this.activeTimers.get(serviceId));
    }

    const timerId = setTimeout(() => this.triggerRecovery(serviceId), duration);
    this.activeTimers.set(serviceId, timerId);

    return true;
  }

  triggerRecovery(serviceId) {
    const service = this.getService(serviceId);
    if (!service) {
      return false;
    }

    this._updateService(serviceId, 'recovering', 'medium');
    this.logEvent('recovery-started', { serviceId, label: service.label });

    if (this.activeTimers.has(serviceId)) {
      clearTimeout(this.activeTimers.get(serviceId));
      this.activeTimers.delete(serviceId);
    }

    setTimeout(() => {
      this._updateService(serviceId, 'healthy', 'low');
      this.logEvent('recovered', { serviceId, label: service.label });
      this._refreshCircuitState();
    }, 1200);

    return true;
  }

  manualRecover(serviceId) {
    if (!this.activeTimers.has(serviceId)) {
      return this.triggerRecovery(serviceId);
    }

    clearTimeout(this.activeTimers.get(serviceId));
    this.activeTimers.delete(serviceId);
    return this.triggerRecovery(serviceId);
  }

  logEvent(type, payload = {}) {
    const entry = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type,
      timestamp: new Date(),
      ...payload
    };

    this.history.unshift(entry);
    if (this.history.length > 25) {
      this.history.pop();
    }

    this.emit('history-updated', this.history.slice());
    return entry;
  }

  getHistory(limit = 10) {
    return this.history.slice(0, limit);
  }

  _updateService(id, status, severity) {
    if (!this.state[id]) {
      this.state[id] = {};
    }
    this.state[id].status = status;
    this.state[id].severity = severity;
    this.state[id].lastUpdated = new Date();
    this.emit('service-updated', { id, ...this.state[id] });
  }

  _refreshCircuitState() {
    const failed = Object.values(this.state).filter((item) => item.status === 'failed').length;
    if (failed === 0) {
      this.circuitState = 'healthy';
    } else if (failed < 3) {
      this.circuitState = 'degraded';
    } else {
      this.circuitState = 'tripped';
    }

    this.emit('circuit-state-changed', this.circuitState);
  }
}

if (typeof window !== 'undefined') {
  window.ResilienceController = ResilienceController;
}
