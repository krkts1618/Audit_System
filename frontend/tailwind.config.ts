/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#f8fafc",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        indigo: {
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
        amber: {
          100: "#fef3c7",
          500: "#f59e0b",
        },
        emerald: {
          100: "#d1fae5",
          500: "#10b981",
        },
        crimson: {
          500: "#ef4444",
          600: "#dc2626",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glow-indigo": "0 0 15px -3px rgba(99, 102, 241, 0.4)",
        "glow-crimson": "0 0 15px -3px rgba(239, 68, 68, 0.6)",
      },
    },
  },
};
