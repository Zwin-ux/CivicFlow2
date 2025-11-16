(function () {
  function initialize() {
    if (typeof window === 'undefined' || typeof window.RoleSwitcher === 'undefined') {
      return;
    }

    const orchestrator = window.demoOrchestrator;
    const roleSwitcher = new window.RoleSwitcher({
      configUrl: '/data/role-configs.json'
    });

    const initialRole =
      orchestrator?.getState?.().currentRole || roleSwitcher.getCurrentRole() || 'investor';

    const containerSelector = document.querySelector('main')
      ? 'main'
      : document.querySelector('.container')
      ? '.container'
      : 'body';

    const roleViews = new window.RoleViews({
      initialRole,
      configUrl: '/data/role-configs.json',
      containerSelector
    });

    if (orchestrator && orchestrator.registerComponent) {
      orchestrator.registerComponent('roleSwitcher', roleSwitcher);
      orchestrator.registerComponent('roleViews', roleViews);
    }

    roleSwitcher.on('role-switched', ({ role }) => {
      if (!role) {
        return;
      }
      if (orchestrator) {
        orchestrator.switchRole(role);
      }
      if (roleViews) {
        roleViews.updateRole(role);
      }
    });

    if (orchestrator && orchestrator.on) {
      orchestrator.on('role-switched', (payload) => {
        const newRole = payload?.newRole || payload?.role;
        if (!newRole) {
          return;
        }
        if (roleSwitcher.getCurrentRole() !== newRole) {
          roleSwitcher.switchTo(newRole, { silent: true });
        }
        roleViews.updateRole(newRole);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
