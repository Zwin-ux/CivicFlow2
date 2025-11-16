/**
 * Toast Notification Center
 * Handles queued toast notifications, animation, sound, and history for demo mode
 */

const DEFAULT_TEMPLATES = {
  eventTypes: {
    new_application: {
      title: 'New Application Submitted',
      icon: '[NEW]',
      color: '#3b82f6',
      priority: 'normal',
      notificationTemplate: '{businessName} submitted a loan application for {loanAmount}',
      animationType: 'slide-in',
      displayDuration: 5000,
      soundEffect: 'notification.mp3'
    },
    status_change: {
      title: 'Application Status Updated',
      icon: '[STAT]',
      color: '#8b5cf6',
      priority: 'normal',
      notificationTemplate: '{businessName} status changed to {newStatus}',
      animationType: 'fade-in',
      displayDuration: 4000,
      soundEffect: 'status-change.mp3'
    },
    document_uploaded: {
      title: 'Document Uploaded',
      icon: '[DOC]',
      color: '#06b6d4',
      priority: 'low',
      notificationTemplate: '{businessName} uploaded {documentType}',
      animationType: 'slide-in',
      displayDuration: 3500,
      soundEffect: 'upload.mp3'
    },
    review_completed: {
      title: 'Review Completed',
      icon: '[RVW]',
      color: '#10b981',
      priority: 'normal',
      notificationTemplate: '{reviewer} completed review for {businessName}',
      animationType: 'bounce-in',
      displayDuration: 5000,
      soundEffect: 'success.mp3'
    },
    approval_granted: {
      title: 'Application Approved',
      icon: '[OK]',
      color: '#10b981',
      priority: 'high',
      notificationTemplate: '{businessName} approved for {loanAmount}',
      animationType: 'bounce-in',
      displayDuration: 7000,
      soundEffect: 'celebration.mp3'
    },
    rejection_issued: {
      title: 'Application Rejected',
      icon: '[NO]',
      color: '#ef4444',
      priority: 'high',
      notificationTemplate: '{businessName} application rejected',
      animationType: 'shake',
      displayDuration: 6000,
      soundEffect: 'alert.mp3'
    },
    comment_added: {
      title: 'New Comment Added',
      icon: '[CM]',
      color: '#f59e0b',
      priority: 'low',
      notificationTemplate: '{commenter} commented on {businessName}',
      animationType: 'slide-in',
      displayDuration: 4000,
      soundEffect: 'message.mp3'
    },
    ai_analysis_complete: {
      title: 'AI Analysis Complete',
      icon: '[AI]',
      color: '#06b6d4',
      priority: 'normal',
      notificationTemplate: 'AI analysis complete for {businessName} (Risk: {riskScore})',
      animationType: 'pulse',
      displayDuration: 5000,
      soundEffect: 'ai-complete.mp3'
    }
  }
};

class ToastNotificationCenter {
  constructor(options = {}) {
    this.container = null;
    this.historyPanel = null;
    this.historyList = null;
    this.queue = [];
    this.activeCount = 0;
    this.maxVisible = options.maxVisible || 3;
    this.maxHistory = options.maxHistory || 25;
    this.soundEnabled = options.soundEnabled !== false;
    this.templates = DEFAULT_TEMPLATES;
    this.templatePath = options.templatePath || '/data/demo-event-templates.json';
    this.audioContext = null;
    this.containerReady = false;
    this.historyCollapsed = true;

    this._initDOM();
    this._loadTemplates();
  }

  _initDOM() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._setupContainers());
    } else {
      this._setupContainers();
    }
  }

  _setupContainers() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-notification-stack';
      document.body.appendChild(this.container);
    }

    if (!this.historyPanel) {
      this.historyPanel = this._createHistoryPanel();
      document.body.appendChild(this.historyPanel);
    }

    this.containerReady = true;
    this._drainQueue();
  }

  _loadTemplates() {
    fetch(this.templatePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load notification templates');
        }
        return response.json();
      })
      .then((payload) => {
        if (payload && payload.eventTypes) {
          this.templates = payload;
        }
      })
      .catch((error) => {
        console.warn('[ToastNotificationCenter] Using fallback templates', error);
      });
  }

  _createHistoryPanel() {
    const panel = document.createElement('section');
    panel.className = 'toast-history-panel collapsed';
    panel.innerHTML = `
      <div class="toast-history-header">
        <div class="toast-history-title">
          <span>Notifications</span>
          <span class="toast-history-count" data-history-count>0</span>
        </div>
        <div class="toast-history-actions">
          <button type="button" class="toast-history-toggle" data-action="toggle" aria-expanded="false">Expand</button>
          <button type="button" class="toast-mute-toggle" data-action="mute" aria-pressed="${!this.soundEnabled}">${this.soundEnabled ? 'Mute' : 'Unmute'}</button>
        </div>
      </div>
      <div class="toast-history-list" data-history-list></div>
    `;

    const toggleButton = panel.querySelector('[data-action="toggle"]');
    const muteButton = panel.querySelector('[data-action="mute"]');
    toggleButton.addEventListener('click', () => this._toggleHistory());
    muteButton.addEventListener('click', () => this.toggleSound());
    this.historyList = panel.querySelector('[data-history-list]');
    this.historyCountEl = panel.querySelector('[data-history-count]');

    return panel;
  }

  _toggleHistory() {
    if (!this.historyPanel) return;
    this.historyCollapsed = !this.historyCollapsed;
    this.historyPanel.classList.toggle('collapsed', this.historyCollapsed);
    this.historyPanel.classList.toggle('expanded', !this.historyCollapsed);

    const toggleButton = this.historyPanel.querySelector('[data-action="toggle"]');
    const expanded = !this.historyCollapsed;
    if (toggleButton) {
      toggleButton.textContent = expanded ? 'Collapse' : 'Expand';
      toggleButton.setAttribute('aria-expanded', `${expanded}`);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.historyPanel) {
      const muteButton = this.historyPanel.querySelector('[data-action="mute"]');
      if (muteButton) {
        muteButton.textContent = this.soundEnabled ? 'Mute' : 'Unmute';
        muteButton.setAttribute('aria-pressed', `${!this.soundEnabled}`);
      }
    }
  }

  notify(config = {}) {
    const type = config.type || 'custom';
    const template = this._getTemplate(type);
    const data = config.data || {};
    const message = config.message || this._formatTemplate(template.notificationTemplate, data);

    const payload = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: config.title || template.title || 'Notification',
      message,
      icon: config.icon || template.icon || '',
      color: config.color || template.color || '#2563eb',
      priority: config.priority || template.priority || 'normal',
      animation: config.animation || template.animationType || 'slide-in',
      duration: Number.isFinite(config.duration) ? config.duration : template.displayDuration || 4500,
      sound: config.sound || template.soundEffect || null,
      timestamp: new Date(),
      type,
      data
    };

    this.queue.push(payload);
    this._drainQueue();
    this._addToHistory(payload);

    return payload.id;
  }

  _drainQueue() {
    if (!this.containerReady) {
      return;
    }

    while (this.activeCount < this.maxVisible && this.queue.length > 0) {
      const next = this.queue.shift();
      this._renderToast(next);
    }
  }

  _renderToast(payload) {
    if (!this.container) {
      return;
    }

    this.activeCount += 1;
    const toast = document.createElement('article');
    toast.className = `toast-notification toast-${payload.priority} ${payload.animation}`;
    toast.style.setProperty('--toast-accent', payload.color);
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', payload.priority === 'high' ? 'assertive' : 'polite');
    toast.innerHTML = `
      <div class="toast-notification-icon">${payload.icon}</div>
      <div class="toast-notification-content">
        <div class="toast-notification-title">${payload.title}</div>
        <div class="toast-notification-message">${payload.message}</div>
        <div class="toast-notification-meta">
          <span class="toast-notification-type">${payload.type.replace(/_/g, ' ')}</span>
          <span class="toast-notification-time">${this._formatTime(payload.timestamp)}</span>
        </div>
      </div>
      <button class="toast-notification-close" type="button" aria-label="Dismiss notification">&times;</button>
      <div class="toast-notification-progress">
        <div class="toast-notification-progress-bar"></div>
      </div>
    `;

    const closeButton = toast.querySelector('.toast-notification-close');
    const progressBar = toast.querySelector('.toast-notification-progress-bar');

    const duration = payload.duration;
    const removeToast = () => this._dismissToast(toast);

    toast.addEventListener('mouseenter', () => {
      if (toast.timeout) {
        clearTimeout(toast.timeout);
      }
    });

    toast.addEventListener('mouseleave', () => {
      toast.timeout = setTimeout(removeToast, duration);
      if (progressBar) {
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '0%';
      }
    });

    closeButton.addEventListener('click', removeToast);

    this.container.appendChild(toast);

    window.requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
      if (progressBar) {
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '0%';
      }
    });

    toast.timeout = setTimeout(removeToast, duration);
    this._playSound(payload.sound);
  }

  _dismissToast(toast) {
    if (!toast || toast.dataset.dismissed) {
      return;
    }

    toast.dataset.dismissed = 'true';
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hidden');

    clearTimeout(toast.timeout);
    toast.timeout = null;

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.activeCount = Math.max(this.activeCount - 1, 0);
      this._drainQueue();
    }, 300);
  }

  _formatTemplate(template = '', data = {}) {
    return template.replace(/\{([^}]+)\}/g, (_, key) => {
      if (key.includes('.')) {
        return key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), data) || '';
      }
      return data[key] || '';
    });
  }

  _getTemplate(type) {
    return this.templates.eventTypes[type] || {};
  }

  _addToHistory(payload) {
    if (!this.historyList) {
      return;
    }

    this.historyList.insertAdjacentHTML('afterbegin', `
      <article class="toast-history-item" data-priority="${payload.priority}">
        <div class="toast-history-icon">${payload.icon}</div>
        <div class="toast-history-body">
          <strong>${payload.title}</strong>
          <p>${payload.message}</p>
          <time>${this._formatTime(payload.timestamp)}</time>
        </div>
      </article>
    `);

    let currentItems = this.historyList.querySelectorAll('.toast-history-item');
    if (currentItems.length > this.maxHistory) {
      currentItems[currentItems.length - 1].remove();
      currentItems = this.historyList.querySelectorAll('.toast-history-item');
    }

    if (this.historyCountEl) {
      this.historyCountEl.textContent = `${currentItems.length}`;
    }
  }

  _formatTime(timestamp) {
    if (!timestamp) {
      return '';
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    return formatter.format(timestamp);
  }

  _playSound(effectName) {
    if (!this.soundEnabled || !effectName) {
      return;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const toneMap = {
        'notification.mp3': 420,
        'status-change.mp3': 320,
        'upload.mp3': 480,
        'success.mp3': 520,
        'celebration.mp3': 640,
        'alert.mp3': 240,
        'message.mp3': 360,
        'ai-complete.mp3': 580
      };

      oscillator.frequency.value = toneMap[effectName] || 440;
      oscillator.type = 'triangle';
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (error) {
      console.warn('[ToastNotificationCenter] Unable to play sound', error);
    }
  }
}

const toastCenter = new ToastNotificationCenter();

if (typeof window !== 'undefined') {
  window.NotificationCenter = toastCenter;
  window.showToastNotification = (config) => toastCenter.notify(config);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToastNotificationCenter;
}
