'use client';

import useSWR from 'swr';
import { getVideoUrl } from '@/lib/api';
import { Skeleton } from './Skeleton';

/** A stored video. Its address is short-lived, so it is fetched only when shown. */
export function VideoClip({ id, token, label }: { id: string; token?: string | null; label: string }) {
  const { data, error } = useSWR(['video-url', id, token ?? ''], () => getVideoUrl(id, token), { revalidateOnFocus: false });
  if (error) return <p className="flex aspect-video items-center justify-center bg-panel-2 px-2 text-center text-sm text-fg-muted">The video could not be loaded.</p>;
  if (!data) return <Skeleton className="aspect-video w-full" />;
  return (
    <video controls preload="metadata" className="aspect-video w-full bg-fg" aria-label={label}>
      <source src={data.url} type={data.mimeType} />
    </video>
  );
}
