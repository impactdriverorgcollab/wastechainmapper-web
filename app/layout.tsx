import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WasteChainMapper — Waste & Water Flow Intelligence',
  description:
    'Geospatial intelligence platform tracking municipal waste flows and water-use patterns across Port Harcourt and the Niger Delta. Source → collection → transfer → processing → disposal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
