import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WasteWatch — Rivers State Waste Intelligence',
  description:
    'Environmental intelligence platform tracking waste distribution and illegal dumping sites in Rivers State, Nigeria.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
