/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Jade color scale
        jade: {
          50: '#ECFDF5',
          100: '#B7E5BA',
          200: '#8FD4A4',
          300: '#5CA87C',
          400: '#3D8A5F',
          500: '#288760',
          600: '#1A5140',
          700: '#112E24',
        },
        // Background scale
        bg: {
          DEFAULT: '#0A1C16',
          card: '#122720',
          elev: '#17332A',
          high: '#1D4033',
        },
        // Text scale
        text: {
          DEFAULT: '#F0FDF4',
          sub: '#A7F3D0',
          muted: '#6EE7B7',
          faint: '#3F9B7A',
          ghost: '#2D6A4F',
        },
        // Semantic colors
        semantic: {
          green: '#4ADE80',
          'green-bg': 'rgba(74, 222, 128, 0.12)',
          yellow: '#FBBF24',
          'yellow-bg': 'rgba(251, 191, 36, 0.12)',
          red: '#F87171',
          'red-bg': 'rgba(248, 113, 113, 0.12)',
          blue: '#60A5FA',
          'blue-bg': 'rgba(96, 165, 250, 0.12)',
        },
        // Border colors
        border: {
          DEFAULT: 'rgba(92, 168, 124, 0.12)',
          mid: 'rgba(92, 168, 124, 0.25)',
          bright: 'rgba(92, 168, 124, 0.45)',
        },
      },
      borderRadius: {
        btn: '10px',
        card: '14px',
        modal: '20px',
        badge: '20px',
      },
      boxShadow: {
        sm: '0 2px 6px rgba(0, 0, 0, 0.3)',
        glow: '0 4px 14px rgba(92, 168, 124, 0.35)',
        lg: '0 20px 60px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'grad-btn': 'linear-gradient(135deg, #5CA87C 0%, #3D8A5F 100%)',
        'grad-card': 'linear-gradient(145deg, #17332A 0%, #122720 100%)',
        'grad-hero': 'linear-gradient(135deg, #5CA87C 0%, #288760 50%, #1A5140 100%)',
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.2', letterSpacing: '-0.6px', fontWeight: '900' }],
        h1: ['28px', { lineHeight: '1.2', letterSpacing: '-0.4px', fontWeight: '800' }],
        h2: ['22px', { lineHeight: '1.3', letterSpacing: '-0.3px', fontWeight: '800' }],
        h3: ['18px', { lineHeight: '1.4', letterSpacing: '-0.3px', fontWeight: '800' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        small: ['13px', { lineHeight: '1.5', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '600' }],
        tiny: ['11px', { lineHeight: '1.3', fontWeight: '700' }],
        micro: ['10px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '800' }],
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
