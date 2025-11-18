class InlineEditor {
  constructor(options = {}) {
    this.containerId = options.containerId || 'inline-editor';
    this.stateKey = options.stateKey || 'data.dashboardSummary';
    this.container = document.getElementById(this.containerId);
    this.textarea = null;
    this.status = null;
    this.unsubscribe = null;
    this.note = '';
    this.init();
  }

  init() {
    if (!this.container || !window.AppState) return;
    this.container.innerHTML = `
      <div class="inline-editor">
        <h3>Workspace Note</h3>
        <textarea placeholder="Capture a quick insight..."></textarea>
        <button type="button">Save note</button>
        <span class="text-muted" data-editor-status>Saved</span>
      </div>
    `;
    this.textarea = this.container.querySelector('textarea');
    this.status = this.container.querySelector('[data-editor-status]');
    this.container.querySelector('button').addEventListener('click', () => this.save());
    this.unsubscribe = window.AppState.subscribe(this.stateKey, (state) => {
      if (!state) return;
      this.note = state.workspaceNote || '';
      if (this.textarea && this.textarea.value !== this.note) {
        this.textarea.value = this.note;
        this.setStatus('Saved');
      }
    });
  }

  save() {
    if (!this.textarea) return;
    const value = this.textarea.value.trim();
    this.note = value;
    this.setStatus('Saving…');
    window.AppState?.setState(this.stateKey, {
      ...window.AppState.getState(this.stateKey),
      workspaceNote: value
    });
    if (window.WebSocketManager) {
      window.WebSocketManager.send('workspace:note', { note: value });
    }
    setTimeout(() => this.setStatus('Saved'), 400);
  }

  setStatus(text) {
    if (this.status) {
      this.status.textContent = text;
    }
  }

  destroy() {
    this.unsubscribe?.();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InlineEditor;
}

if (typeof window !== 'undefined') {
  window.InlineEditor = InlineEditor;
}
