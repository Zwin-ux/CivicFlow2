class AnalyticsChart {
  constructor(options = {}) {
    this.canvasId = options.canvasId || 'trend-chart';
    this.appStateKey = options.stateKey || 'data.dashboardSummary';
    this.chartType = options.chartType || 'line';
    this.canvas = document.getElementById(this.canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.data = [];
    this.overlay = '';
    this.unsubscribe = null;
    this.init();
  }

  init() {
    if (!this.canvas || !window.AppState) {
      return;
    }
    this.unsubscribe = window.AppState.subscribe(this.appStateKey, (value) => {
      if (!value) return;
      this.data = value.trends || [];
      this.overlay = value.overlayMessage || '';
      this.render();
    });
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);
    if (!this.data.length) {
      ctx.fillStyle = 'var(--color-neutral-200)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'var(--color-neutral-500)';
      ctx.font = '14px var(--font-sans)';
      ctx.fillText('Waiting for data…', width / 2 - 40, height / 2);
      return;
    }

    const values = this.data.map((point) => point.total || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    const stepX = width / (Math.max(values.length - 1, 1));

    ctx.beginPath();
    values.forEach((value, index) => {
      const x = Math.min(stepX * index, width);
      const y = height - ((value - min) / range) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    values.forEach((value, index) => {
      const x = Math.min(stepX * index, width);
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

    if (this.overlay) {
      ctx.font = '12px var(--font-sans)';
      ctx.fillStyle = 'var(--color-neutral-900)';
      ctx.textAlign = 'right';
      ctx.fillText(this.overlay, width - 10, height - 12);
    }
  }

  destroy() {
    this.unsubscribe?.();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsChart;
}

if (typeof window !== 'undefined') {
  window.AnalyticsChart = AnalyticsChart;
}
