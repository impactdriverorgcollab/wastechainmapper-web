'use client';

import { useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { preparePhoto, type PreparedPhoto } from '@/lib/imageTools';
import { Button } from '@/components/ui/Button';

export interface PickedPhoto extends PreparedPhoto {
  id: string;
  capturedAt: string;
}

interface Props {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  max?: number;
}

export function PhotoPicker({ photos, onChange, max = 4 }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMessage(null);
    setBusy(true);
    const next = [...photos];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= max) { setMessage(`You can add up to ${max} photos.`); break; }
        try {
          const prepared = await preparePhoto(file);
          next.push({ ...prepared, id: `${Date.now()}-${next.length}`, capturedAt: new Date(file.lastModified || Date.now()).toISOString() });
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'That photo could not be added.');
        }
      }
      onChange(next);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        aria-label="Choose photos"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => void addFiles(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => inputRef.current?.click()} loading={busy} disabled={photos.length >= max}>
          <Camera size={16} aria-hidden="true" />
          {photos.length === 0 ? 'Add a photo' : 'Add another photo'}
        </Button>
        <p className="text-sm text-fg-muted">{photos.length} of {max}. Photos are shrunk on your phone before they are sent.</p>
      </div>

      <div aria-live="polite" className="min-h-5">
        {message && <p className="mt-2 text-sm text-warning">{message}</p>}
      </div>

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="relative overflow-hidden rounded-lg bg-panel-2">
              {/* A data address made on this device, so next/image has nothing to optimise. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt={`Photo ${i + 1} of the waste`} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-fg hover:bg-panel-3"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
