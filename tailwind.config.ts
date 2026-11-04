import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { themes, triplet, type Theme } from './lib/palette';

// Design tokens. Components use these utilities only, with no arbitrary values.
//
//   Colour       two themes, written as CSS variables (see lib/palette.ts). The html element carries
//                the class "dark" for the dark theme.
//   Type scale   xs 12, sm 14, base 16, lg 20, xl 24, 2xl 32, and 3xl 44 for the home page headline only
//   Type         IBM Plex Sans for the interface, IBM Plex Mono for figures, coordinates and references
//   Radius       DEFAULT 4px for controls, lg 6px for panels and dialogs
//   Shadow       raised (menus, map panels) and overlay (dialogs). Flat surfaces have none.
//   Spacing      Tailwind's 4px scale
const NAMES: [keyof Theme, string][] = [
  ['canvas', 'canvas'], ['panel', 'panel'], ['panel2', 'panel-2'], ['panel3', 'panel-3'],
  ['line', 'line'], ['lineStrong', 'line-strong'],
  ['fg', 'fg'], ['fgMuted', 'fg-muted'], ['fgSubtle', 'fg-subtle'],
  ['accent', 'accent'], ['accentHover', 'accent-hover'], ['accentPressed', 'accent-pressed'], ['accentFg', 'accent-fg'], ['accentSoft', 'accent-soft'],
  ['success', 'success'], ['successSoft', 'success-soft'], ['warning', 'warning'], ['warningSoft', 'warning-soft'],
  ['danger', 'danger'], ['dangerSoft', 'danger-soft'], ['shadow', 'shadow'],
  ['tierLow', 'tier-low'], ['tierMedium', 'tier-medium'], ['tierHigh', 'tier-high'],
];

const vars = (t: Theme) => Object.fromEntries(NAMES.map(([key, css]) => [`--c-${css}`, triplet(t[key] as string)]));
const c = (css: string) => `rgb(var(--c-${css}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.25rem', { lineHeight: '1.75rem' }],
      xl: ['1.5rem', { lineHeight: '1.875rem' }],
      '2xl': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.015em' }],
      '3xl': ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.025em' }],
    },
    borderRadius: { none: '0', DEFAULT: '0.25rem', lg: '0.375rem', full: '9999px' },
    boxShadow: {
      none: 'none',
      raised: '0 1px 2px rgb(var(--c-shadow) / 0.10), 0 4px 12px rgb(var(--c-shadow) / 0.08)',
      overlay: '0 12px 32px rgb(var(--c-shadow) / 0.24)',
    },
    extend: {
      // For panels that only fit on a screen of some height, which rules out a phone held sideways.
      screens: { tall: { raw: '(min-height: 600px)' } },
      maxHeight: { menu: 'calc(100dvh - 4rem)' },
      colors: {
        canvas: c('canvas'),
        panel: { DEFAULT: c('panel'), 2: c('panel-2'), 3: c('panel-3') },
        line: { DEFAULT: c('line'), strong: c('line-strong') },
        fg: { DEFAULT: c('fg'), muted: c('fg-muted'), subtle: c('fg-subtle') },
        accent: { DEFAULT: c('accent'), hover: c('accent-hover'), pressed: c('accent-pressed'), fg: c('accent-fg'), soft: c('accent-soft') },
        success: { DEFAULT: c('success'), soft: c('success-soft') },
        warning: { DEFAULT: c('warning'), soft: c('warning-soft') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
        tier: { low: c('tier-low'), medium: c('tier-medium'), high: c('tier-high') },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      minHeight: { 11: '2.75rem' },
      minWidth: { 11: '2.75rem' },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': { ...vars(themes.light), colorScheme: 'light' },
        '.dark': { ...vars(themes.dark), colorScheme: 'dark' },
      });
    }),
  ],
};

export default config;
