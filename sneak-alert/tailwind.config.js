/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ds-bg': '#101217',
        'ds-surface': '#171920',
        'ds-border': '#1c2128',
        'ds-blue': {
          DEFAULT: '#60a5fa',
          deep: '#172554',
          border: '#1e3a8a',
        },
        'ds-indigo': {
          DEFAULT: '#818cf8',
          deep: '#1e1b4b',
          border: '#312e81',
        },
        'ds-cyan': {
          DEFAULT: '#22d3ee',
          deep: '#083344',
          border: '#164e63',
        },
        'ds-orange': {
          DEFAULT: '#fb923c',
          deep: '#431407',
          border: '#7c2d12',
        },
        'ds-red': {
          DEFAULT: '#ef4444',
          deep: '#450a0a',
          border: '#7f1d1d',
        },
        'ds-green': {
          DEFAULT: '#00C853',
        },
        'ds-text-dim': '#8b8e94',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
