'use client';

import { useId, useState, type FormEvent } from 'react';
import { MapPin } from 'lucide-react';
import type { GazetteerEntry } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface Props {
  places: GazetteerEntry[];
  busy?: boolean;
  onPlace: (placeId: string) => Promise<void> | void;
}

const label = (p: GazetteerEntry) => `${p.communityName} (${p.lga})`;

/**
 * For a story the scraper could not place. The reviewer picks the community it is about from the
 * gazetteer, and the story takes that community's position on the map.
 */
export function PlacePicker({ places, busy = false, onPlace }: Props) {
  const listId = useId();
  const inputId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const typed = value.trim().toLowerCase();
    // Accept the full "Name (Area)" text from the list, or a plain name when it is unambiguous.
    const exact = places.filter((p) => label(p).toLowerCase() === typed);
    const byName = places.filter((p) => p.communityName.toLowerCase() === typed);
    const match = exact[0] ?? (byName.length === 1 ? byName[0] : undefined);
    if (!match) {
      setError(
        byName.length > 1
          ? 'More than one community has that name. Pick one from the list, with its area.'
          : 'Pick a community from the list.',
      );
      return;
    }
    setError('');
    void onPlace(match.id);
  }

  return (
    <form onSubmit={submit} className="rounded bg-warning-soft p-3" noValidate>
      <label htmlFor={inputId} className="label flex items-center gap-2 text-warning">
        <MapPin size={16} aria-hidden="true" />
        This story has no place yet. Which community is it about?
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          list={listId}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          className="input flex-1"
          placeholder="Start typing a community name"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <Button type="submit" loading={busy}>Save place</Button>
      </div>
      <datalist id={listId}>
        {places.map((p) => <option key={p.id} value={label(p)} />)}
      </datalist>
      {error && <p id={`${inputId}-error`} className="field-error">{error}</p>}
    </form>
  );
}
