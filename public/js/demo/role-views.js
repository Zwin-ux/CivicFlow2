class RoleViews {
  constructor(options = {}) {
    this.configUrl = options.configUrl || '/data/role-configs.json';
    this.containerSelector = options.containerSelector || 'main';
    this.panel = null;
    this.roles = [];
    this.currentRole = options.initialRole || 'investor';
    this.avatarNode = null;
    this.titleNode = null;
    this.focusNode = null;
    this.descriptionNode = null;
    this.featuresNode = null;
    this.actionsNode = null;
    this.chipNode = null;

    this._loadConfig()
      .then(() => this._buildPanel())
      .catch((error) => console.warn('[RoleViews] Could not load role data', error));
  }

  async _loadConfig() {
    const response = await fetch(this.configUrl);
    const payload = await response.json();
    this.roles = payload.roles || [];
  }

  _buildPanel() {
    const host = document.querySelector(this.containerSelector) || document.body;
    if (!host) {
      return;
    }

    this.panel = document.createElement('section');
    this.panel.className = 'role-view-panel';
    this.panel.setAttribute('aria-live', 'polite');
    this.panel.innerHTML = `
      <div class="role-view-card role-view-intro">
        <div class="role-view-chip">
          <span class="role-view-avatar">IN</span>
          <div class="role-view-meta">
            <span class="role-view-title">Role</span>
            <span class="role-view-focus"></span>
          </div>
        </div>
        <p class="role-view-description"></p>
      </div>
      <div class="role-view-grid">
        <div class="role-view-card">
          <h4>Key features</h4>
          <ul class="role-view-features"></ul>
        </div>
        <div class="role-view-card">
          <h4>Quick actions</h4>
          <div class="role-view-actions"></div>
        </div>
      </div>
    `;

    if (host.tagName.toLowerCase() === 'body') {
      host.appendChild(this.panel);
    } else if (host.parentElement) {
      host.parentElement.insertBefore(this.panel, host.nextSibling);
    } else {
      host.appendChild(this.panel);
    }

    this.avatarNode = this.panel.querySelector('.role-view-avatar');
    this.titleNode = this.panel.querySelector('.role-view-title');
    this.focusNode = this.panel.querySelector('.role-view-focus');
    this.descriptionNode = this.panel.querySelector('.role-view-description');
    this.featuresNode = this.panel.querySelector('.role-view-features');
    this.actionsNode = this.panel.querySelector('.role-view-actions');
    this.chipNode = this.panel.querySelector('.role-view-chip');

    this.updateRole(this.currentRole);
  }

  updateRole(roleId) {
    const role = this.roles.find((item) => item.id === roleId);
    if (!role) {
      return;
    }
    this.currentRole = roleId;
    if (this.panel) {
      this.panel.setAttribute('data-role', role.id);
    }
    if (this.avatarNode) {
      this.avatarNode.textContent = role.avatar || '??';
    }
    if (this.titleNode) {
      this.titleNode.textContent = role.label;
    }
    if (this.focusNode) {
      this.focusNode.textContent = role.focus || '';
    }
    if (this.descriptionNode) {
      this.descriptionNode.textContent = role.description;
    }
    if (this.chipNode) {
      this.chipNode.style.background = role.color || 'var(--color-demo-bg)';
      this.chipNode.style.borderColor = role.color ? `${role.color}33` : 'transparent';
    }

    if (this.featuresNode) {
      this.featuresNode.innerHTML = '';
      (role.features || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        this.featuresNode.appendChild(li);
      });
    }

    if (this.actionsNode) {
      this.actionsNode.innerHTML = '';
      (role.quickActions || []).forEach((action) => {
        const link = document.createElement('a');
        link.href = action.href || '#';
        link.textContent = action.label;
        link.className = 'role-view-action';
        this.actionsNode.appendChild(link);
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.RoleViews = RoleViews;
}
