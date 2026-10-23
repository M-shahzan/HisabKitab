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
        emerald: {
          50: "#ECFDF5", // Light mint
          100: "#D3F9E8", // Mint
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#087F5B", // Primary emerald
          700: "#065F46", // Deep emerald
          800: "#064E3B", // Dark green
          900: "#043729",
          950: "#022118",
        },
        retail: {
          bg: "#F8FAF8",
          surface: "#FFFFFF",
          text: "#182522",
          muted: "#64748B",
          border: "#E2E8F0",
          primary: "#087F5B",
          deep: "#065F46",
          dark: "#064E3B",
          mint: "#D3F9E8",
          lightMint: "#ECFDF5",
          success: "#16A34A",
          warning: "#F59E0B",
          error: "#DC2626",
          info: "#2563EB",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        button: "12px",
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(6, 95, 70, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)",
        cardHover: "0 10px 25px -4px rgba(6, 95, 70, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.04)",
        glow: "0 0 24px rgba(8, 127, 91, 0.25)",
        pulseGlow: "0 0 35px rgba(8, 127, 91, 0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "wave-1": "wave 1.2s ease-in-out infinite",
        "wave-2": "wave 1.4s ease-in-out 0.2s infinite",
        "wave-3": "wave 1.1s ease-in-out 0.4s infinite",
      },
      keyframes: {
        wave: {
          "0%, 100%": { height: "8px" },
          "50%": { height: "32px" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
