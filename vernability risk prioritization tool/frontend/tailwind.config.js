/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          darkest: '#000000',
          dark: '#09090b',
          card: '#111114',
          border: '#27272a',
          hover: '#18181b',
          accent: '#06b6d4',
          purple: '#8b5cf6',
        },
        risk: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#10b981',
        }
      }
    },
  },
  plugins: [],
}
