import type { Metadata, Viewport } from 'next';
import { Public_Sans, IBM_Plex_Mono } from 'next/font/google';
import { ThemeProvider, THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

// One family for the interface, a monospace for coordinates and keys. Two weights only.
const sans = Public_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'WasteChainMapper', template: '%s | WasteChainMapper' },
  description:
    'A shared map of waste across Rivers State: where it is dumped, collected and treated. Reports are marked as reported until a reviewer checks them, and every estimate says how it was made.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EDF1EA' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1210' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-accent-fg"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
