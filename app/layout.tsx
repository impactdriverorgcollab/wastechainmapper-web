import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { palette } from '@/lib/palette';
import './globals.css';

// One family for the interface, a monospace for coordinates and keys. Two weights only.
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'WasteChainMapper', template: '%s | WasteChainMapper' },
  description:
    'A map of illegal dump sites, waste collection and water monitoring across Rivers State and the Niger Delta. Sites found in the news are marked unconfirmed until a reviewer checks them.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: palette.canvas,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-accent-fg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
