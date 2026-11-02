import type { Metadata } from 'next';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { ReportFlow } from '@/components/report/ReportFlow';

export const metadata: Metadata = {
  title: 'Report waste',
  description: 'Send a photo and a place to report dumped waste, a blocked drain or waste in a waterway in Rivers State.',
};

export default function ReportPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Report waste"
          description="Photograph the waste, say where it is, and send it. It takes about two minutes. You do not need an account."
        />
        <ReportFlow />
        <section aria-labelledby="other-ways" className="mt-10 rounded-lg bg-panel p-4 sm:p-5">
          <h2 id="other-ways" className="text-lg font-semibold text-fg">Other ways to report</h2>
          <p className="mt-1 text-sm text-fg-muted">
            You can also email a photo and a short note to the reporting address, or tag the WasteChainMapper account on social media with the place.
            Every route goes to the same review queue. Email and this form always work, whatever happens on social networks.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
