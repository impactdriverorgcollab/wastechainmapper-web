import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { ThemeProvider, THEME_SCRIPT } from '@/lib/theme';
import { TableLabels } from '@/components/ui/TableLabels';
import './globals.css';

// IBM Plex Sans for the interface and Plex Mono for figures and coordinates: one family, two cuts. Two weights.
// The files are kept in the project (app/fonts, SIL Open Font License). Fetching them from Google when
// the site compiles failed silently on a bad connection and left the whole site in a fallback font.
const sans = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});
const mono = localFont({
  src: './fonts/ibm-plex-mono-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'WasteChainMapper', template: '%s | WasteChainMapper' },
  description:
    'A shared map of waste across Rivers State: where it is dumped, collected and treated. Reports are marked as reported until a reviewer checks them, and every estimate says how it was made.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#141817' },
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
        <TableLabels />
      </body>
    </html>
  );
}
