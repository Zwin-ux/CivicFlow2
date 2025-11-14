import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
    "../../public/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        "cc-bg": "var(--cc-bg)",
        "cc-surface": "var(--cc-surface)",
        "cc-muted": "var(--cc-muted)",
        "cc-accent": "var(--cc-accent)",
        "cc-text": "var(--cc-text)",
      },
      borderRadius: {
        "r-2": "var(--r-2)",
        "r-4": "var(--r-4)",
      },
      spacing: {
        "s-2": "var(--s-2)",
        "s-4": "var(--s-4)",
        "s-8": "var(--s-8)",
        "s-12": "var(--s-12)",
        "s-16": "var(--s-16)",
      },
      boxShadow: {
        "cc-sm": "var(--shadow-sm)",
        "cc-md": "var(--shadow-md)",
      },
      transitionDuration: {
        micro: "var(--dur-micro)",
        gentle: "var(--dur-gentle)",
        progress: "var(--dur-progress)",
      },
    },
  },
  plugins: [],
};

export default config;
