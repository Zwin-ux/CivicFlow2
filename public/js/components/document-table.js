class DocumentTable {
  constructor(options = {}) {
    this.containerId = options.containerId || 'document-table';
    this.appStateKey = options.stateKey || 'data.dashboardSummary';
    this.container = document.getElementById(this.containerId);
    this.unsubscribe = null;
    this.documents = [];
    this.init();
  }

  init() {
    if (!this.container || !window.AppState) return;
    this.unsubscribe = window.AppState.subscribe(this.appStateKey, (state) => {
      if (!state) return;
      this.documents = state.documents || [];
      this.render();
    });
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    if (!this.documents.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'grid-placeholder';
      placeholder.textContent = 'No documents available yet.';
      this.container.appendChild(placeholder);
      return;
    }
    const table = document.createElement('table');
    table.className = 'analytics-table';
    table.innerHTML = `
      <thead>
        <tr><th>Document</th><th>Type</th><th>Status</th><th>Action</th></tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    this.documents.forEach((doc) => {
      const row = document.createElement('tr');
      const statusCell = document.createElement('td');
      const statusInput = document.createElement('input');
      statusInput.value = doc.status || 'unknown';
      statusInput.className = 'inline-input';
      statusInput.addEventListener('change', () => this.updateStatus(doc, statusInput.value));
      statusCell.appendChild(statusInput);

      const actionCell = document.createElement('td');
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.type = 'button';
      saveBtn.className = 'quick-action';
      saveBtn.addEventListener('click', () => this.saveDocument(doc));
      actionCell.appendChild(saveBtn);

      row.innerHTML = `
        <td>${doc.name}</td>
        <td>${doc.type || 'N/A'}</td>
      `;
      row.appendChild(statusCell);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
    this.container.appendChild(table);
  }

  updateStatus(doc, status) {
    doc.status = status;
    this.upsertState();
  }

  saveDocument(doc) {
    if (!window.WebSocketManager) return;
    window.WebSocketManager.send('document:update', {
      documentId: doc.id,
      status: doc.status,
      name: doc.name
    });
    if (window.showToastNotification) {
      window.showToastNotification({
        title: 'Document Saved',
        message: `${doc.name} status saved as ${doc.status}`,
        color: 'var(--color-primary-600)'
      });
    }
  }

  upsertState() {
    if (!window.AppState) return;
    const current = window.AppState.getState(this.appStateKey) || {};
    window.AppState.setState(this.appStateKey, {
      ...current,
      documents: [...this.documents]
    });
  }

  destroy() {
    this.unsubscribe?.();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentTable;
}

if (typeof window !== 'undefined') {
  window.DocumentTable = DocumentTable;
}
