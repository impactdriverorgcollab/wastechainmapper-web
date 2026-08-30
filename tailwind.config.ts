import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base palette — muted, not consumer-SaaS
        surface: {
          DEFAULT: '#0f1117',
          1: '#161b24',
          2: '#1e2533',
          3: '#252d3d',
        },
        border: '#2a3347',
        muted: '#4a5568',
        subtle: '#718096',
        text: {
          DEFAULT: '#e2e8f0',
          secondary: '#a0aec0',
          dim: '#718096',
        },
        // Confidence tiers — the one functional accent system
        // These are ONLY used for data encoding, not decorative color
        tier: {
          low: '#8B9467',      // muted olive — unconfirmed
          medium: '#C9913B',   // amber — corroborated
          high: '#B94040',     // deep red — field-verified, certain
        },
      },
      fontFamily: {
        // Document-grade sans — readable at data-dense sizes
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Monospace for coordinates, IDs, technical data
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
