import type { Config } from 'tailwindcss';
import { palette, tierColors } from './lib/palette';

// Design tokens. Components use these utilities only, with no arbitrary values.
//
//   Type scale   six sizes: xs 12, sm 14, base 16, lg 20, xl 24, 2xl 32
//   Radius       DEFAULT 4px for controls, lg 8px for panels and dialogs
//   Shadow       raised (menus, map panels) and overlay (dialogs). Flat surfaces have none.
//   Spacing      Tailwind's 4px scale
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.25rem', { lineHeight: '1.75rem' }],
      xl: ['1.5rem', { lineHeight: '1.875rem' }],
      '2xl': ['2rem', { lineHeight: '2.25rem' }],
    },
    borderRadius: {
      none: '0',
      DEFAULT: '0.25rem',
      lg: '0.5rem',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      raised: '0 2px 8px rgba(0, 0, 0, 0.35)',
      overlay: '0 8px 24px rgba(0, 0, 0, 0.5)',
    },
    extend: {
      colors: {
        canvas: palette.canvas,
        panel: { DEFAULT: palette.panel, 2: palette.panel2, 3: palette.panel3 },
        line: { DEFAULT: palette.line, strong: palette.lineStrong },
        fg: { DEFAULT: palette.fg, muted: palette.fgMuted, subtle: palette.fgSubtle },
        accent: {
          DEFAULT: palette.accent,
          hover: palette.accentHover,
          pressed: palette.accentPressed,
          fg: palette.accentFg,
          soft: palette.accentSoft,
        },
        success: { DEFAULT: palette.success, soft: palette.successSoft },
        warning: { DEFAULT: palette.warning, soft: palette.warningSoft },
        danger: { DEFAULT: palette.danger, soft: palette.dangerSoft },
        tier: tierColors,
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      minHeight: { 11: '2.75rem' },
      minWidth: { 11: '2.75rem' },
    },
  },
  plugins: [],
};

export default config;
