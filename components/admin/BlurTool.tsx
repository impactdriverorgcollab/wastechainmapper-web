'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Undo2 } from 'lucide-react';
import { saveRedacted } from '@/lib/api';
import { Button } from '@/components/ui/Button';

type Box = { x: number; y: number; w: number; h: number };

/** Pixelates the boxes in place. Coarse blocks cannot be reversed, unlike a light blur. */
function pixelate(ctx: CanvasRenderingContext2D, img: HTMLImageElement, boxes: Box[]) {
  ctx.drawImage(img, 0, 0);
  for (const b of boxes) {
    const x = Math.max(0, Math.round(b.w < 0 ? b.x + b.w : b.x));
    const y = Math.max(0, Math.round(b.h < 0 ? b.y + b.h : b.y));
    const w = Math.min(img.naturalWidth - x, Math.round(Math.abs(b.w)));
    const h = Math.min(img.naturalHeight - y, Math.round(Math.abs(b.h)));
    if (w < 2 || h < 2) continue;
    const block = Math.max(12, Math.round(Math.min(w, h) / 6));
    for (let by = y; by < y + h; by += block) {
      for (let bx = x; bx < x + w; bx += block) {
        const px = ctx.getImageData(bx, by, 1, 1).data;
        const r = px[0], g = px[1], bl = px[2];
        ctx.fillStyle = `rgb(${r},${g},${bl})`;
        ctx.fillRect(bx, by, Math.min(block, x + w - bx), Math.min(block, y + h - by));
      }
    }
  }
}

/**
 * For a reviewer: drag boxes over faces and number plates, then save a copy with them pixelated. The
 * public sees the copy; the original stays unchanged for the record.
 */
export function BlurTool({ src, evidenceId, token, onDone, onCancel }: { src: string; evidenceId: string; token: string; onDone: () => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current!;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      pixelate(c.getContext('2d')!, img, []);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d')!;
    pixelate(ctx, img, boxes);
    if (draft) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(2, img.naturalWidth / 300);
      ctx.strokeRect(draft.x, draft.y, draft.w, draft.h);
    }
  }, [boxes, draft]);

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const c = canvasRef.current!;
      pixelate(c.getContext('2d')!, imgRef.current!, boxes);
      await saveRedacted(evidenceId, c.toDataURL('image/jpeg', 0.85), token);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The blurred copy did not save.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">Drag a box over each face or number plate. The public will see this copy. The original is kept for the record.</p>
      <canvas
        ref={canvasRef}
        className="h-auto w-full cursor-crosshair touch-none rounded border border-line-strong"
        aria-label="The photo. Drag to mark an area to blur."
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const p = point(e); setDraft({ x: p.x, y: p.y, w: 0, h: 0 }); }}
        onPointerMove={(e) => { if (!draft) return; const p = point(e); setDraft({ ...draft, w: p.x - draft.x, h: p.y - draft.y }); }}
        onPointerUp={() => { if (draft && Math.abs(draft.w) > 4 && Math.abs(draft.h) > 4) setBoxes((b) => [...b, draft]); setDraft(null); }}
      />
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={save} loading={busy} disabled={boxes.length === 0}>Save the blurred copy</Button>
        <Button onClick={() => setBoxes((b) => b.slice(0, -1))} disabled={boxes.length === 0}><Undo2 size={16} aria-hidden="true" />Undo</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
