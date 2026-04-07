import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        paper: "#ffffff",
        cream: "#f2f2f2",
        accent: "#00ff97",
        "accent-hover": "#00e085",
        "accent-dark": "#00cc78",
        "accent-light": "#e6fff5",
        muted: "#555555",
        subtle: "#777777",
        "dark-card": "#1a1a1a",
        "dark-card-alt": "#2a2a2a",
        border: "#e0e0e0",
        // Legacy aliases for existing classes
        surface: "#000000",
        "surface-raised": "#111111",
        "surface-border": "rgba(255,255,255,0.1)",
        "accent-dim": "#00cc78",
      },
      fontFamily: {
        heading: ["Barlow", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
