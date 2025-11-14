const plugin = require('tailwindcss/plugin');

const civiccopyPlugin = plugin(({ addUtilities, theme }) => {
  addUtilities(
    {
      '.bg-cc-surface': { backgroundColor: 'var(--cc-surface)' },
      '.bg-cc-surface-soft': { backgroundColor: 'var(--cc-surface-soft)' },
      '.text-cc-muted': { color: 'var(--cc-muted)' },
      '.text-cc-accent': { color: 'var(--cc-accent)' },
      '.border-cc-glass': { borderColor: 'var(--cc-surface-glass)' },
      '.shadow-cc-sm': { boxShadow: 'var(--shadow-sm)' },
      '.shadow-cc-md': { boxShadow: 'var(--shadow-md)' },
    },
    ['responsive', 'hover']
  );
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}', './public/**/*.{html,js}'],
  theme: {
    fontFamily: {
      sans: ['Inter', 'SF Pro Display', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
    },
    extend: {
      colors: {
        'cc-bg': 'var(--cc-bg)',
        'cc-surface': 'var(--cc-surface)',
        'cc-text': 'var(--cc-text)',
        'cc-muted': 'var(--cc-muted)',
        'cc-accent': 'var(--cc-accent)',
      },
      spacing: {
        's-2': 'var(--s-2)',
        's-4': 'var(--s-4)',
        's-8': 'var(--s-8)',
        's-12': 'var(--s-12)',
        's-16': 'var(--s-16)',
      },
      borderRadius: {
        'r-2': 'var(--r-2)',
        'r-4': 'var(--r-4)',
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--line-normal)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--line-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--line-normal)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--line-snug)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--line-tight)' }],
      },
      transitionDuration: {
        micro: 'var(--dur-micro)',
        gentle: 'var(--dur-gentle)',
        progress: 'var(--dur-progress)',
      },
    },
  },
  plugins: [civiccopyPlugin],
};
