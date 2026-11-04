'use client';

import { useId, useRef, useState } from 'react';
import { Video, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** One short video, sent straight to file storage after the report. Videos are never shrunk on the phone. */
export function VideoPicker({ video, onChange }: { video: File | null; onChange: (f: File | null) => void }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function pick(files: FileList | null) {
    setMessage(null);
    const f = files?.[0];
    if (!f) return;
    if (!TYPES.includes(f.type)) setMessage('Choose an MP4, WebM or MOV video.');
    else if (f.size > MAX_VIDEO_BYTES) setMessage(`That video is ${Math.round(f.size / 1_048_576)} MB. Videos must be under 50 MB. Record a shorter one, about 20 seconds.`);
    else onChange(f);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <input ref={inputRef} id={id} aria-label="Choose a video" type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => pick(e.target.files)} />
      {video ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-sm text-fg"><Video size={16} aria-hidden="true" className="text-fg-muted" />{video.name} <span className="tabular text-fg-muted">{Math.max(1, Math.round(video.size / 1_048_576))} MB</span></p>
          <Button onClick={() => onChange(null)}><X size={16} aria-hidden="true" />Remove the video</Button>
        </div>
      ) : (
        <Button onClick={() => inputRef.current?.click()}><Video size={16} aria-hidden="true" />Add a short video</Button>
      )}
      <p className="hint">Optional. Up to 50 MB, about 20 seconds. Videos use more data than photos.</p>
      {message && <p role="alert" className="field-error">{message}</p>}
    </div>
  );
}
