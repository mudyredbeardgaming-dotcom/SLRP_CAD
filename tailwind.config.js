/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // StrataMDT neutral scale: cool, slightly blue-tinted layers.
        // Overrides Tailwind's default gray so every existing gray-* class
        // picks up the new look automatically.
        gray: {
          50: '#f6f8fb',
          100: '#e9edf3',
          200: '#d3d9e2',
          300: '#b3bccb',
          400: '#8d97a8',
          500: '#687387',
          600: '#353d4d',
          700: '#232a37',
          750: '#1d232f',
          800: '#161b25',
          850: '#11151d',
          900: '#0c0f16',
          950: '#07090d',
        },
        // Brand accent (sky/cyan family)
        accent: {
          300: '#7dd8fc',
          400: '#38c3f8',
          500: '#0ea8e9',
          600: '#0287c7',
          700: '#036ca1',
        },
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        panel: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)',
        modal: '0 1px 0 0 rgb(255 255 255 / 0.05) inset, 0 24px 64px -16px rgb(0 0 0 / 0.75)',
        glow: '0 0 0 1px rgb(14 168 233 / 0.35), 0 8px 28px -8px rgb(14 168 233 / 0.45)',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 160ms ease-out',
        'scale-in': 'scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
