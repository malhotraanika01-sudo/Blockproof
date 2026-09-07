/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Common User portal — public-safety, trustworthy
        civic: {
          50: '#eef4ff', 100: '#dbe7ff', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af', 900: '#172554',
        },
        // Investigator workspace — forensic slate
        forensic: {
          50: '#f4f6f8', 100: '#e5e9ee', 500: '#475569', 600: '#334155', 700: '#1e293b', 900: '#0b1220',
        },
        // Head command center — mission-control teal on near-black
        command: {
          bg: '#0b0f14', panel: '#131a22', line: '#233040', accent: '#14b8a6', accent2: '#7c3aed',
        },
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1)' },
    },
  },
  plugins: [],
};
