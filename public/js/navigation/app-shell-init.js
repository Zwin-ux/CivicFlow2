(() => {
  if (window.__appShellInit) return;
  window.__appShellInit = true;

  const CSS_ASSETS = [
    '/css/app/base.css',
    '/css/layout.css',
    '/css/app/navigation.css'
  ];

  const SCRIPT_ASSETS = [
    '/js/state/app-state.js',
    '/js/theme/theme-manager.js',
    '/js/realtime/websocket-manager.js',
    '/js/cache/cache-manager.js',
    '/js/navigation/layout.js'
  ];

  const NAV_ITEMS = [
    { label: 'Dashboard', path: '/investor-dashboard.html', icon: '🏠' },
    { label: 'Applications', path: '/applications-list.html', icon: '📋' },
    { label: 'Documents', path: '/demo-landing.html', icon: '🗂️' },
    { label: 'AI Insights', path: '/demo-investor.html', icon: '🤖' },
    { label: 'Settings', path: '/demo-settings.html', icon: '⚙️' }
  ];

  const TOOL_ACTIONS = [
    { label: 'Quick actions', href: '/applications-list.html' },
    { label: 'Demo showcase', href: '/demo-landing.html' }
  ];

  const DEPENDENCIES_LOADED = new Set();

  function ensureLink(href) {
    if (document.head.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src) {
    if (document.body.querySelector(`script[src="${src}"]`) || document.head.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.defer = false;
    document.body.appendChild(script);
  }

  function ensureAssets() {
    CSS_ASSETS.forEach(ensureLink);
    SCRIPT_ASSETS.forEach(ensureScript);
  }

  function createTopBar() {
    if (document.querySelector('.app-top-bar')) return null;
    const header = document.createElement('header');
    header.className = 'app-top-bar';
    header.innerHTML = `
      <button type="button" class="sidebar-toggle" data-sidebar-toggle aria-label="Toggle sidebar">☰</button>
      <a class="logo" href="/">
        <img src="/images/logo.svg" alt="CivicFlow2" class="logo-image" width="40" height="40">
        <div>
          <strong class="logo-name">CivicFlow2</strong>
          <small class="logo-tagline">Modern lending CRM</small>
        </div>
      </a>
      <nav>${NAV_ITEMS.map((item) => `<a href="${item.path}">${item.icon} ${item.label}</a>`).join('')}</nav>
      <div class="top-actions">
        <button type="button" data-command-trigger>⌘K</button>
        <button type="button" data-theme-toggle>Toggle Theme</button>
        <span data-ws-status>Connecting...</span>
      </div>
    `;
    return header;
  }

  function createSidebar() {
    if (document.querySelector('[data-sidebar]')) return null;
    const aside = document.createElement('aside');
    aside.className = 'app-sidebar';
    aside.setAttribute('data-sidebar', '');
    aside.innerHTML = `
      <div class="sidebar-section">
        <h3>Main</h3>
        ${NAV_ITEMS.map((item) => `<a class="sidebar-link" data-target="${item.path}">${item.icon} ${item.label}</a>`).join('')}
      </div>
      <div class="sidebar-section">
        <h3>Tools</h3>
        <a class="sidebar-link" data-target="/demo-investor.html">📊 AI Insights</a>
        <a class="sidebar-link" data-target="/demo-settings.html">⚙️ Settings</a>
      </div>
      <div class="sidebar-section">
        <h3>Quick Actions</h3>
        ${TOOL_ACTIONS.map((action) => `<a class="quick-action" href="${action.href}">${action.label}</a>`).join('')}
      </div>
    `;
    return aside;
  }

  function createCommandPalette() {
    if (document.querySelector('.command-palette')) return null;
    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.setAttribute('data-command-palette', '');
    palette.innerHTML = `
      <div class="command-card">
        <p class="text-muted">Quick search</p>
        <input type="search" placeholder="Search pages..." aria-label="Command palette search">
        <ul data-command-list></ul>
      </div>
    `;
    return palette;
  }

  function createMobileNav() {
    if (document.querySelector('[data-mobile-nav]')) return null;
    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.setAttribute('data-mobile-nav', '');
    nav.innerHTML = NAV_ITEMS.map((item) => `
      <button type="button" data-target="${item.path}">
        <span>${item.icon}</span>
        <small>${item.label}</small>
      </button>
    `).join('');
    return nav;
  }

  function hideLegacyNav() {
    document.querySelectorAll('.navbar, header.navbar, nav.navbar').forEach((el) => {
      el.style.display = 'none';
    });
  }

  function wrapContent(topBarEl, sidebarEl, paletteEl, mobileNavEl) {
    if (document.querySelector('.app-main')) return;
    const body = document.body;
    const layout = document.createElement('div');
    layout.className = 'app-layout';

    const nodes = Array.from(body.children).filter((node) => {
      if (!node || node.nodeType !== 1) return false;
      if (node === topBarEl || node === sidebarEl || node === paletteEl || node === mobileNavEl) return false;
      if (node.tagName === 'SCRIPT' || node.tagName === 'LINK' || node.tagName === 'STYLE') return false;
      return true;
    });

    nodes.forEach((node) => layout.appendChild(node));

    const appMain = document.createElement('div');
    appMain.className = 'app-main';
    if (sidebarEl) {
      appMain.appendChild(sidebarEl);
    }
    appMain.appendChild(layout);

    body.appendChild(appMain);

    if (paletteEl) body.appendChild(paletteEl);
    if (mobileNavEl) body.appendChild(mobileNavEl);
  }

  function initShell() {
    const alreadyStructured = !!document.querySelector('.app-main');
    if (alreadyStructured) return;
    hideLegacyNav();
    const topBarEl = document.querySelector('.app-top-bar') || createTopBar();
    const sidebarEl = document.querySelector('[data-sidebar]') || createSidebar();
    const paletteEl = document.querySelector('.command-palette') || createCommandPalette();
    const mobileNavEl = document.querySelector('[data-mobile-nav]') || createMobileNav();

    if (topBarEl) document.body.insertBefore(topBarEl, document.body.firstChild);
    wrapContent(topBarEl, sidebarEl, paletteEl, mobileNavEl);
  }

  ensureAssets();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('app-shell');
      initShell();
      window.dispatchEvent(new CustomEvent('app-shell:ready'));
    });
  } else {
    document.body.classList.add('app-shell');
    initShell();
    window.dispatchEvent(new CustomEvent('app-shell:ready'));
  }
})();
