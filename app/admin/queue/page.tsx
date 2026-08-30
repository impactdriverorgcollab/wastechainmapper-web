import { VerificationQueue } from '@/components/admin/VerificationQueue';

export default function QueuePage() {
  return (
    <main className="p-4">
      <div className="mb-4">
        <p className="section-header">Verification queue</p>
        <p className="text-xs text-text-secondary">
          Scraped reports awaiting review. Approve to link to a dump site; reject to discard.
        </p>
      </div>
      <VerificationQueue />
    </main>
  );
}
