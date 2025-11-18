class ThemeManager {
  constructor() {
    this.THEME_KEY = 'civicflow-theme';
    this.THEMES = {
      LIGHT: 'light',
      DARK: 'dark',
      AUTO: 'auto'
    };

    this.currentTheme = this.loadStoredTheme() || this.THEMES.AUTO;
    this.systemPreference = this.detectSystemTheme();

    this.applyTheme(this.currentTheme);
    this.watchSystemPreference();

    window.addEventListener('storage', (event) => {
      if (event.key === this.THEME_KEY && event.newValue) {
        this.currentTheme = event.newValue;
        this.applyTheme(this.currentTheme);
      }
    });
  }

  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.THEMES.DARK;
    }
    return this.THEMES.LIGHT;
  }

  watchSystemPreference() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event) => {
      this.systemPreference = event.matches ? this.THEMES.DARK : this.THEMES.LIGHT;

      if (this.currentTheme === this.THEMES.AUTO) {
        this.applyTheme(this.currentTheme);
      }

      window.dispatchEvent(new CustomEvent('theme:system-change', {
        detail: { systemPreference: this.systemPreference }
      }));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(listener);
    }
  }

  loadStoredTheme() {
    try {
      const stored = window.localStorage.getItem(this.THEME_KEY);
      if (stored && Object.values(this.THEMES).includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Unable to read theme:', error);
    }
    return null;
  }

  setStoredTheme(theme) {
    try {
      window.localStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      console.warn('Unable to persist theme:', error);
    }
  }

  getActiveTheme(theme = this.currentTheme) {
    if (theme === this.THEMES.AUTO) {
      return this.systemPreference;
    }
    return theme;
  }

  applyTheme(theme) {
    const activeTheme = this.getActiveTheme(theme);
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.documentElement.dataset.themeMode = theme;

    this.updateMetaThemeColor(activeTheme);

    window.dispatchEvent(new CustomEvent('theme:change', {
      detail: {
        theme,
        activeTheme
      }
    }));

    if (window.AppState) {
      window.AppState.setState('ui.theme', theme);
    }

    this.currentTheme = theme;
  }

  updateMetaThemeColor(theme) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }

    meta.content = theme === this.THEMES.DARK ? '#0f172a' : '#ffffff';
  }

  setTheme(theme) {
    if (!Object.values(this.THEMES).includes(theme)) return;

    this.setStoredTheme(theme);
    this.applyTheme(theme);
  }

  toggleTheme() {
    const order = [this.THEMES.LIGHT, this.THEMES.DARK, this.THEMES.AUTO];
    const currentIndex = order.indexOf(this.currentTheme);
    const next = order[(currentIndex + 1) % order.length];
    this.setTheme(next);
  }
}

const themeManager = new ThemeManager();
window.ThemeManager = themeManager;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
