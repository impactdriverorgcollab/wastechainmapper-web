import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { HotspotsLoader } from '@/components/map/HotspotsLoader';

export const metadata: Metadata = {
  title: 'Hotspots',
  description: 'Groups of waste sites that sit close together in Rivers State, ranked for attention.',
};

export default function HotspotsPage() {
  return (
    <PageShell wide>
      <PageHeader title="Waste hotspots" description="Where reported waste is concentrated, and where it keeps coming back. Tap a zone for its details." />
      <HotspotsLoader />
    </PageShell>
  );
}
