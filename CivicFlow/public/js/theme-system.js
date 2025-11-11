/**
 * Theme System with Dark Mode Support
 * Handles theme switching, persistence, and system preference detection
 */

class ThemeSystem {
  constructor() {
    this.THEME_KEY = 'app-theme';
    this.THEMES = {
      LIGHT: 'light',
      DARK: 'dark',
      AUTO: 'auto'
    };
    
    this.currentTheme = this.getStoredTheme() || this.THEMES.AUTO;
    this.systemPreference = this.getSystemPreference();
    
    // Initialize theme
    this.init();
  }
  
  /**
   * Initialize the theme system
   */
  init() {
    // Apply initial theme
    this.applyTheme(this.currentTheme);
    
    // Listen for system preference changes
    this.watchSystemPreference();
    
    // Emit ready event
    window.dispatchEvent(new CustomEvent('theme:ready', {
      detail: { theme: this.getActiveTheme() }
    }));
  }
  
  /**
   * Get stored theme from localStorage
   */
  getStoredTheme() {
    try {
      return localStorage.getItem(this.THEME_KEY);
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Store theme in localStorage
   */
  setStoredTheme(theme) {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }
  
  /**
   * Get system color scheme preference
   */
  getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.THEMES.DARK;
    }
    return this.THEMES.LIGHT;
  }
  
  /**
   * Watch for system preference changes
   */
  watchSystemPreference() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', (e) => {
          this.systemPreference = e.matches ? this.THEMES.DARK : this.THEMES.LIGHT;
          
          // If using auto theme, update the applied theme
          if (this.currentTheme === this.THEMES.AUTO) {
            this.applyTheme(this.THEMES.AUTO);
          }
          
          window.dispatchEvent(new CustomEvent('theme:system-change', {
            detail: { systemPreference: this.systemPreference }
          }));
        });
      }
      // Legacy browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener((e) => {
          this.systemPreference = e.matches ? this.THEMES.DARK : this.THEMES.LIGHT;
          if (this.currentTheme === this.THEMES.AUTO) {
            this.applyTheme(this.THEMES.AUTO);
          }
        });
      }
    }
  }
  
  /**
   * Get the currently active theme (resolves 'auto' to actual theme)
   */
  getActiveTheme() {
    if (this.currentTheme === this.THEMES.AUTO) {
      return this.systemPreference;
    }
    return this.currentTheme;
  }
  
  /**
   * Apply theme to the document
   */
  applyTheme(theme) {
    const activeTheme = theme === this.THEMES.AUTO ? this.systemPreference : theme;
    
    // Update data attribute on html element
    document.documentElement.setAttribute('data-theme', activeTheme);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(activeTheme);
    
    // Emit theme change event
    window.dispatchEvent(new CustomEvent('theme:change', {
      detail: {
        theme: theme,
        activeTheme: activeTheme
      }
    }));
  }
  
  /**
   * Update meta theme-color tag
   */
  updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    // Set color based on theme
    const color = theme === this.THEMES.DARK ? '#1e1e1e' : '#ffffff';
    metaThemeColor.content = color;
  }
  
  /**
   * Set theme
   */
  setTheme(theme) {
    if (!Object.values(this.THEMES).includes(theme)) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }
    
    this.currentTheme = theme;
    this.setStoredTheme(theme);
    this.applyTheme(theme);
  }
  
  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const activeTheme = this.getActiveTheme();
    const newTheme = activeTheme === this.THEMES.DARK ? this.THEMES.LIGHT : this.THEMES.DARK;
    this.setTheme(newTheme);
  }
  
  /**
   * Get current theme setting
   */
  getTheme() {
    return this.currentTheme;
  }
}

// Initialize theme system
const themeSystem = new ThemeSystem();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeSystem;
}
