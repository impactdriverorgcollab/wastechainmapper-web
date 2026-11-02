import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountLink } from '@/components/account/AccountLink';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { MapLoader } from '@/components/map/MapLoader';

export const metadata: Metadata = {
  title: 'Map',
  description: 'Dump sites, collection points, facilities, water problems and flood-risk zones across Rivers State.',
};

export default function MapPage() {
  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <SiteHeader>
        <Link href="/report" className="btn-primary">Report waste</Link>
        <AccountLink />
      </SiteHeader>
      <main id="main" className="relative min-h-0 flex-1">
        <MapLoader />
      </main>
    </div>
  );
}
