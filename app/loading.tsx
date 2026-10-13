import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="page py-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <Skeleton className="mt-8 h-64 w-full" />
    </div>
  );
}
