'use client';

import { Pause, Play, X } from 'lucide-react';
import { formatDate } from '@/lib/format';

interface Props {
  /** Earliest and latest dates, as milliseconds. */
  min: number;
  max: number;
  value: number;
  shown: number;
  total: number;
  playing: boolean;
  onChange: (value: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onClose: () => void;
}

/** Historical playback: drag back in time and sites that were not yet reported disappear. */
export function HistoryBar({ min, max, value, shown, total, playing, onChange, onPlayingChange, onClose }: Props) {
  const day = 86_400_000;
  return (
    <div className="rounded-lg bg-panel-2 p-3 shadow-raised" role="group" aria-label="History of the map">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary"
          aria-label={playing ? 'Pause history' : 'Play history'}
          onClick={() => onPlayingChange(!playing)}
          disabled={value >= max && !playing && min >= max}
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="history-range" className="sr-only">Show the map as it was on this date</label>
          <input
            id="history-range"
            type="range"
            min={min}
            max={max}
            step={day}
            value={value}
            onChange={(e) => { onPlayingChange(false); onChange(Number(e.target.value)); }}
            className="block h-11 w-full accent-accent"
            aria-valuetext={`${formatDate(new Date(value).toISOString())}, ${shown} of ${total} sites`}
          />
        </div>
        <button type="button" className="btn-ghost" aria-label="Close history" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="tabular px-1 text-sm text-fg-muted" aria-live="polite">
        As of <span className="font-semibold text-fg">{formatDate(new Date(value).toISOString())}</span>: {shown} of {total} sites had been reported.
        Status changes made later are not replayed.
      </p>
    </div>
  );
}
