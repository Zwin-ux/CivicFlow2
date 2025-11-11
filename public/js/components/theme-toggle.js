/**
 * Theme Toggle Component
 * Provides UI for switching between light, dark, and auto themes
 */

class ThemeToggle {
  constructor(containerSelector) {
    this.container = typeof containerSelector === 'string' 
      ? document.querySelector(containerSelector)
      : containerSelector;
    
    if (!this.container) {
      console.warn('ThemeToggle: Container not found');
      return;
    }
    
    this.render();
    this.attachEventListeners();
    this.updateUI();
    
    // Listen for theme changes
    window.addEventListener('theme:change', () => this.updateUI());
  }
  
  /**
   * Render the toggle component
   */
  render() {
    this.container.innerHTML = `
      <div class="theme-toggle">
        <button class="theme-toggle-btn" data-theme="light" title="Light theme">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <span class="theme-label">Light</span>
        </button>
        <button class="theme-toggle-btn" data-theme="dark" title="Dark theme">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span class="theme-label">Dark</span>
        </button>
        <button class="theme-toggle-btn" data-theme="auto" title="Auto (system preference)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span class="theme-label">Auto</span>
        </button>
      </div>
    `;
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const theme = button.dataset.theme;
        if (window.themeSystem) {
          window.themeSystem.setTheme(theme);
        }
      });
    });
  }
  
  /**
   * Update UI to reflect current theme
   */
  updateUI() {
    if (!window.themeSystem) return;
    
    const currentTheme = window.themeSystem.getTheme();
    const buttons = this.container.querySelectorAll('.theme-toggle-btn');
    
    buttons.forEach(button => {
      if (button.dataset.theme === currentTheme) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
}

// Auto-initialize if data-theme-toggle attribute is present
document.addEventListener('DOMContentLoaded', () => {
  const toggleContainers = document.querySelectorAll('[data-theme-toggle]');
  toggleContainers.forEach(container => {
    new ThemeToggle(container);
  });
});

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeToggle;
}
