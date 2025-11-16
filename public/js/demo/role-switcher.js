/**
 * Role Switcher for Demo Mode
 * Adds a dropdown control, keyboard shortcuts, and handles UI updates
 */

class RoleSwitcher {
  constructor(options = {}) {
    this.configUrl = options.configUrl || '/data/role-configs.json';
    this.roles = [];
    this.currentRole = 'investor';
    this.container = null;
    this.dropdown = null;
    this.label = null;
    this.badge = null;
    this.listeners = new Map();
    this.keyboardBindings = [];

    this._loadConfig()
      .then(() => this._buildUi())
      .catch((err) => console.warn('[RoleSwitcher] Could not load config', err));
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

  _loadConfig() {
    return fetch(this.configUrl)
      .then((response) => response.json())
      .then((payload) => {
        this.roles = payload.roles || [];
        const storedRole = localStorage.getItem('demoRole');
        if (storedRole && this.roles.find((role) => role.id === storedRole)) {
          this.currentRole = storedRole;
          return;
        }

        if (!this.roles.find((role) => role.id === this.currentRole)) {
          this.currentRole = this.roles[0]?.id || 'investor';
        }
      });
  }

  _buildUi() {
    const navContainer =
      document.querySelector('.navbar .container') ||
      document.querySelector('.navbar .nav-content') ||
      document.querySelector('.navbar');
    if (!navContainer) {
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'demo-role-switcher';
    this.container.className = 'role-switcher';
    this.container.innerHTML = `
      <button class="role-switcher-button" aria-haspopup="true" aria-expanded="false">
        <span class="role-switcher-avatar">AP</span>
        <span class="role-switcher-label">Role</span>
        <span class="role-switcher-badge">Demo</span>
      </button>
      <div class="role-switcher-dropdown" role="menu"></div>
    `;

    navContainer.appendChild(this.container);

    this.dropdown = this.container.querySelector('.role-switcher-dropdown');
    this.label = this.container.querySelector('.role-switcher-label');
    this.badge = this.container.querySelector('.role-switcher-badge');

    this.container.querySelector('.role-switcher-button').addEventListener('click', () => {
      const expanded = this.container.classList.toggle('open');
      this.container.querySelector('.role-switcher-button').setAttribute('aria-expanded', expanded);
    });

    this.roles.forEach((role) => {
      const item = document.createElement('button');
      item.className = 'role-switcher-item';
      item.type = 'button';
      item.innerHTML = `
        <span class="role-switcher-item-avatar">${role.avatar}</span>
        <span>
          <strong>${role.label}</strong>
          <small>${role.description}</small>
        </span>
        <span class="role-switcher-shortcut">${role.shortcut}</span>
      `;
      item.addEventListener('click', () => this.switchTo(role.id));
      this.dropdown.appendChild(item);
      if (role.shortcut) {
        this._bindShortcut(role.shortcut, () => this.switchTo(role.id));
      }
    });

    this._updateUi();
  }

  _bindShortcut(combo, handler) {
    const targetKey = combo.split('+').pop().trim().toLowerCase();
    const listener = (event) => {
      if (!event.altKey) {
        return;
      }
      if (event.key.toLowerCase() === targetKey) {
        event.preventDefault();
        handler();
      }
    };
    document.addEventListener('keydown', listener);
    this.keyboardBindings.push(listener);
  }

  switchTo(roleId, options = {}) {
    const role = this.roles.find((item) => item.id === roleId);
    if (!role || roleId === this.currentRole) {
      return;
    }
    this.currentRole = roleId;
    this._updateUi();
    localStorage.setItem('demoRole', roleId);
    const silent = options.silent === true;
    if (!silent) {
      this.emit('role-switched', { role: roleId });
    }
    this.container.classList.remove('open');
    this.container.querySelector('.role-switcher-button').setAttribute('aria-expanded', false);
  }

  getCurrentRole() {
    return this.currentRole;
  }

  _updateUi() {
    const role = this.roles.find((item) => item.id === this.currentRole);
    if (!role || !this.label) {
      return;
    }
    this.label.textContent = role.label;
    this.container.querySelector('.role-switcher-avatar').textContent = role.avatar || '??';
    this.badge.textContent = role.shortcut || 'Demo';
    this.container.setAttribute('data-role', role.id);
  }
}

if (typeof window !== 'undefined') {
  window.RoleSwitcher = RoleSwitcher;
}
