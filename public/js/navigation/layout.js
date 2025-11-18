class NavigationLayout {
  constructor() {
    this.sidebar = document.querySelector('[data-sidebar]');
    this.sidebarToggle = document.querySelector('[data-sidebar-toggle]');
    this.themeToggle = document.querySelector('[data-theme-toggle]');
    this.commandTrigger = document.querySelector('[data-command-trigger]');
    this.commandPalette = document.querySelector('[data-command-palette]');
    this.commandInput = this.commandPalette?.querySelector('input');
    this.commandList = this.commandPalette?.querySelector('[data-command-list]');
    this.activityIndicator = document.querySelector('[data-ws-status]');
    this.mobileNav = document.querySelector('[data-mobile-nav]');
    this.navItems = [
      { label: 'Dashboard', path: '/investor-dashboard.html', icon: '🏠' },
      { label: 'Applications', path: '/applications-list.html', icon: '📋' },
      { label: 'Documents', path: '/demo-landing.html', icon: '🗂️' },
      { label: 'AI Insights', path: '/demo-investor.html', icon: '🤖' },
      { label: 'Settings', path: '/demo-settings.html', icon: '⚙️' }
    ];
    this.historyMax = 6;

    document.addEventListener('DOMContentLoaded', () => {
      this.init();
    });
  }

  init() {
    this.bindSidebar();
    this.bindTheme();
    this.bindCommandPalette();
    this.bindMobileNav();
    this.subscribeNavigation();
    this.connectWebSocketIndicator();
    this.initMobileGestures();
  }

  bindSidebar() {
    if (!this.sidebar || !this.sidebarToggle) return;
    const persisted = window.AppState?.getState('ui.sidebarOpen');
    const isOpen = persisted !== undefined ? persisted : true;
    this.sidebar.dataset.collapsed = isOpen ? 'false' : 'true';
    this.sidebarToggle.addEventListener('click', () => {
      const currentlyCollapsed = this.sidebar.dataset.collapsed === 'true';
      this.sidebar.dataset.collapsed = currentlyCollapsed ? 'false' : 'true';
      window.AppState?.setState('ui.sidebarOpen', this.sidebar.dataset.collapsed === 'false');
    });

    window.AppState?.subscribe('ui.sidebarOpen', (value) => {
      this.sidebar.dataset.collapsed = value ? 'false' : 'true';
    });
  }

  bindTheme() {
    if (!this.themeToggle) return;
    this.themeToggle.addEventListener('click', () => {
      window.ThemeManager?.toggleTheme();
    });
  }

  bindCommandPalette() {
    if (!this.commandTrigger || !this.commandPalette) return;
    this.buildCommandList();
    this.commandTrigger.addEventListener('click', () => this.toggleCommandPalette(true));
    this.commandPalette.addEventListener('click', (event) => {
      if (event.target === this.commandPalette) {
        this.toggleCommandPalette(false);
      }
    });
    if (this.commandInput) {
      this.commandInput.addEventListener('input', () => this.filterCommandList());
      this.commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.toggleCommandPalette(false);
        }
      });
    }
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.toggleCommandPalette(true);
      }
    });
    window.AppState?.subscribe('navigation.history', () => this.buildCommandList());
  }

  toggleCommandPalette(open) {
    if (!this.commandPalette) return;
    this.commandPalette.classList.toggle('open', open);
    if (open && this.commandInput) {
      this.commandInput.value = '';
      this.filterCommandList();
      this.commandInput.focus();
    }
  }

  buildCommandList() {
    if (!this.commandList) return;
    const history = window.AppState?.getState('navigation.history') || [];
    const entries = [...history];
    this.navItems.forEach((item) => {
      if (!entries.find((entry) => entry.path === item.path)) {
        entries.push(item);
      }
    });
    this.commandList.innerHTML = '';
    entries.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${item.icon} ${item.label}`;
      button.addEventListener('click', () => {
        window.location.href = item.path;
        window.AppState?.setState('navigation.currentPage', item.path);
        this.toggleCommandPalette(false);
      });
      this.commandList.appendChild(button);
    });
  }

  filterCommandList() {
    if (!this.commandList || !this.commandInput) return;
    const term = this.commandInput.value.toLowerCase();
    this.commandList.querySelectorAll('button').forEach((button) => {
      const match = button.textContent.toLowerCase().includes(term);
      button.style.display = match ? 'block' : 'none';
    });
  }

  bindMobileNav() {
    if (!this.mobileNav) return;
    this.mobileNav.querySelectorAll('button[data-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const path = button.dataset.target;
        window.location.href = path;
        window.AppState?.setState('navigation.currentPage', path);
      });
    });
  }

  subscribeNavigation() {
    const updateActive = (path) => {
      if (!path) return;
      this.navItems.forEach((item) => {
        const selector = `.sidebar-link[data-target="${item.path}"]`;
        const element = document.querySelector(selector);
        if (element) {
          element.classList.toggle('active', item.path === path);
        }
      });
      this.mobileNav?.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('active', button.dataset.target === path);
      });
      this.logNavigation(path);
    };

    document.addEventListener('DOMContentLoaded', () => {
      const initial = window.AppState?.getState('navigation.currentPage');
      updateActive(initial || window.location.pathname);
    });

    window.AppState?.subscribe('navigation.currentPage', (value) => {
      updateActive(value);
    });
  }

  connectWebSocketIndicator() {
    if (!this.activityIndicator || !window.WebSocketManager) return;
    const setStatus = (text, statusClass) => {
      this.activityIndicator.textContent = text;
      this.activityIndicator.dataset.status = statusClass;
    };
    setStatus('Connecting...', 'connecting');
    window.WebSocketManager.on('connection:open', () => setStatus('Live', 'connected'));
    window.WebSocketManager.on('connection:close', () => setStatus('Offline', 'disconnected'));
    window.WebSocketManager.on('connection:error', () => setStatus('Error', 'error'));
  }

  logNavigation(path) {
    const matched = this.navItems.find((item) => item.path === path);
    if (!matched || !window.AppState) return;
    const history = window.AppState.getState('navigation.history') || [];
    const filtered = history.filter((item) => item.path !== matched.path);
    const next = [{ ...matched, timestamp: Date.now(), icon: matched.icon }, ...filtered].slice(0, this.historyMax);
    window.AppState.setState('navigation.history', next);
  }

  initMobileGestures() {
    if (!this.mobileNav) return;
    let startY = null;
    const threshold = 60;

    this.mobileNav.addEventListener('touchstart', (event) => {
      startY = event.touches[0].clientY;
    }, { passive: true });

    this.mobileNav.addEventListener('touchend', (event) => {
      if (startY === null) return;
      const endY = event.changedTouches[0].clientY;
      const delta = startY - endY;
      if (delta > threshold) {
        this.toggleCommandPalette(true);
      }
      startY = null;
    });
  }
}

new NavigationLayout();
