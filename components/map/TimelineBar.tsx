'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { WasteFlow } from '@/lib/types';

interface Props {
  flows: WasteFlow[];
  index: number;
  playing: boolean;
  onIndexChange: (i: number) => void;
  onPlayingChange: (p: boolean) => void;
}

/** Replays recorded waste routes in the order they were recorded. */
export function TimelineBar({ flows, index, playing, onIndexChange, onPlayingChange }: Props) {
  const current = index > 0 ? flows[index - 1] : undefined;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-panel p-1 shadow-raised">
      <button
        type="button"
        className="btn-ghost"
        aria-label="Restart from the first flow"
        onClick={() => { onIndexChange(0); onPlayingChange(true); }}
      >
        <RotateCcw size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn-ghost"
        aria-label={playing ? 'Pause the replay' : 'Play the replay'}
        onClick={() => {
          // Pressing play at the end starts over.
          if (!playing && index >= flows.length) onIndexChange(0);
          onPlayingChange(!playing);
        }}
      >
        {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
      </button>

      <div className="min-w-0 flex-1 px-2">
        <label htmlFor="timeline-range" className="sr-only">Waste flow replay position</label>
        <input
          id="timeline-range"
          type="range"
          min={0}
          max={flows.length}
          value={index}
          onChange={(e) => { onPlayingChange(false); onIndexChange(Number(e.target.value)); }}
          aria-valuetext={`${index} of ${flows.length} flows`}
          className="block w-full accent-accent"
        />
        <p className="tabular flex justify-between text-xs text-fg-muted">
          <span>{current ? `Recorded ${formatDate(current.createdAt, false)}` : 'Before the first flow'}</span>
          <span>{index} of {flows.length} flows, last 30 days</span>
        </p>
      </div>
    </div>
  );
}
