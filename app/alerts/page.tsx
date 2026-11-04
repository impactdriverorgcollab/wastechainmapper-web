import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { SubscribeForm } from '@/components/alerts/AlertForms';

export const metadata: Metadata = {
  title: 'Email alerts',
  description: 'Get an email when sites are checked in your area, when heavy rain is forecast near blocked drains, and once a week the areas to watch.',
};

export default function AlertsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Email alerts" description="Choose your areas and what you want to hear about. We email only when there is something new, at most once a day." />
        <SubscribeForm />
      </div>
    </PageShell>
  );
}
