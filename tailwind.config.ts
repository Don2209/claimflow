import type { Config } from 'tailwindcss';

/** Colours resolve to CSS variables in src/styles/index.css so light, dark and ink themes swap at runtime. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        muted: token('muted'),
        primary: token('primary'),
        accent: token('accent'),
        'primary-hover': token('primary-hover'),
        'on-primary': token('on-primary'),
        ok: token('ok'),
        'ok-soft': token('ok-soft'),
        warn: token('warn'),
        'warn-soft': token('warn-soft'),
        danger: token('danger'),
        'danger-soft': token('danger-soft'),
        paper: token('paper'),
        'paper-ink': token('paper-ink'),
      },
      fontFamily: {
        sans: [
          '"Instrument Sans Variable"',
          '"Instrument Fallback"',
          '"Noto Sans Ethiopic Variable"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '"Big Shoulders Display Variable"',
          '"Noto Sans Ethiopic Variable"',
          'Impact',
          '"Arial Narrow"',
          'sans-serif',
        ],
        hand: ['"Reenie Beanie"', '"Segoe Script"', 'cursive'],
      },
      fontSize: {
        // Modular scale. Display sizes are fluid from 360px to 1600px.
        'display-xl': [
          'clamp(4rem, 2.4rem + 7vw, 10rem)',
          { lineHeight: '1.04', letterSpacing: '-0.002em' },
        ],
        'display-lg': [
          'clamp(3rem, 2.1rem + 4vw, 6.25rem)',
          { lineHeight: '1.04', letterSpacing: '0' },
        ],
        'display-md': [
          'clamp(2.375rem, 1.95rem + 2vw, 3.75rem)',
          { lineHeight: '1.06', letterSpacing: '0.002em' },
        ],
        'display-sm': [
          'clamp(1.625rem, 1.5rem + 0.6vw, 2.25rem)',
          { lineHeight: '1.1', letterSpacing: '0.004em' },
        ],
        lead: ['clamp(1.125rem, 1.08rem + 0.25vw, 1.3125rem)', { lineHeight: '1.5' }],
        body: ['1.0625rem', { lineHeight: '1.6' }],
        small: ['0.9375rem', { lineHeight: '1.5' }],
        caption: ['0.8125rem', { lineHeight: '1.4' }],
        micro: ['0.75rem', { lineHeight: '1.35' }],
      },
      borderRadius: {
        sm: '2px',
        md: '3px',
        lg: '4px',
        xl: '4px',
      },
      boxShadow: {
        paper: '0 1px 2px rgb(23 13 54 / 0.16), 0 3px 8px rgb(23 13 54 / 0.08)',
        card: '0 1px 2px rgb(23 13 54 / 0.05), 0 8px 24px -12px rgb(23 13 54 / 0.14)',
        window: '0 2px 4px rgb(23 13 54 / 0.08), 0 28px 64px -24px rgb(23 13 54 / 0.45)',
      },
      maxWidth: {
        page: '82rem',
        prose: '38rem',
      },
      spacing: {
        section: 'clamp(4.5rem, 3.5rem + 5vw, 8.5rem)',
      },
    },
  },
  plugins: [],
} satisfies Config;
