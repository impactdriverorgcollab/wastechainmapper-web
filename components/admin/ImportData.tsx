'use client';

import { useId, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { getWaterSources, runImport } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { downloadCsv, parseCsv, type ParsedCsv } from '@/lib/csv';
import { formatNumber } from '@/lib/format';
import { IMPORT_TEMPLATES } from '@/lib/imports';
import type { ImportKind, ImportResult } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/States';

const MAX_ROWS = 1000;
const SHOWN_ERRORS = 50;

const headerKey = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[()]/g, '');

export function ImportData() {
  const session = useSession();
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<ImportKind>('dump-sites');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [saved, setSaved] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'check' | 'import' | 'list' | null>(null);

  const template = IMPORT_TEMPLATES.find((t) => t.kind === kind)!;

  function reset(keepFile = false) {
    setResult(null);
    setSaved(null);
    setProblem('');
    if (!keepFile) {
      setParsed(null);
      setFileName('');
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onFile(file: File | undefined) {
    reset(true);
    if (!file) { setParsed(null); setFileName(''); return; }
    setFileName(file.name);
    const csv = parseCsv(await file.text());
    const have = new Set(csv.headers.map(headerKey));
    const missing = template.columns.filter((c) => c.required && !have.has(c.name)).map((c) => c.name);
    if (!csv.rows.length) setProblem('The file has no rows under its header line.');
    else if (csv.rows.length > MAX_ROWS) setProblem(`A file can have at most ${MAX_ROWS} rows. This one has ${formatNumber(csv.rows.length)}. Split it and upload the parts one by one.`);
    else if (missing.length) setProblem(`The file is missing the column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Download the template to see the layout.`);
    setParsed(csv);
  }

  const ignored = parsed
    ? parsed.headers.filter((h) => h && !template.columns.some((c) => c.name === headerKey(h)))
    : [];
  const ready = !!parsed && !problem && !!session.token;

  async function submit(dryRun: boolean) {
    if (!parsed || !session.token) return;
    setBusy(dryRun ? 'check' : 'import');
    setProblem('');
    try {
      const r = await runImport(kind, parsed.rows, dryRun, session.token);
      if (dryRun) { setResult(r); setSaved(null); } else { setSaved(r); setResult(null); }
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'The file was not processed. Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function downloadWaterPoints() {
    setBusy('list');
    setProblem('');
    try {
      const points = await getWaterSources();
      downloadCsv('water-points.csv', [
        ['source_ref', 'name', 'lga', 'latitude', 'longitude', 'condition'],
        ...points.map((p) => [p.sourceRef ?? p.id, p.name, p.lga, p.latitude, p.longitude, p.condition]),
      ]);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'The list could not be loaded. Try again.');
    } finally {
      setBusy(null);
    }
  }

  if (session.ready && session.user && session.user.role !== 'ADMIN') {
    return (
      <EmptyState title="Only administrators can import data">
        Ask an administrator to upload the file.
      </EmptyState>
    );
  }

  const clean = result && result.errors.length === 0;

  return (
    <div className="space-y-8">
      <section aria-labelledby="what-heading" className="rounded-lg bg-panel p-4 sm:p-6">
        <h2 id="what-heading" className="text-lg font-semibold">1. Choose what you are uploading</h2>
        <div className="mt-4 max-w-sm">
          <SelectField
            label="Kind of data"
            value={kind}
            onChange={(e) => { setKind(e.target.value as ImportKind); reset(); }}
          >
            {IMPORT_TEMPLATES.map((t) => <option key={t.kind} value={t.kind}>{t.title}</option>)}
          </SelectField>
        </div>
        <p className="mt-4 max-w-prose text-sm text-fg-muted">{template.summary}</p>

        <div className="table-wrap mt-4" tabIndex={0} role="region" aria-label={`Columns for ${template.title}`}>
          <table className="data-table">
            <caption className="sr-only">Columns for {template.title}</caption>
            <thead>
              <tr><th scope="col">Column</th><th scope="col">Needed</th><th scope="col">What to put in it</th></tr>
            </thead>
            <tbody>
              {template.columns.map((c) => (
                <tr key={c.name}>
                  <td className="primary">{c.name}</td>
                  <td>{c.required ? 'Required' : 'Optional'}</td>
                  <td className="whitespace-normal">{c.help}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => downloadCsv(`${kind}-template.csv`, [template.columns.map((c) => c.name), template.example])}>
            <Download size={16} aria-hidden="true" />
            Download the template
          </Button>
          {kind === 'water-readings' && (
            <Button onClick={downloadWaterPoints} loading={busy === 'list'}>
              <Download size={16} aria-hidden="true" />
              Download the water point list
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="file-heading" className="rounded-lg bg-panel p-4 sm:p-6">
        <h2 id="file-heading" className="text-lg font-semibold">2. Check your file</h2>
        <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">
          Save the spreadsheet as CSV. Checking changes nothing. Nothing is saved until you confirm in step 3, and one bad row stops the whole file.
        </p>
        <label htmlFor={fileId} className="label">CSV file</label>
        <input
          id={fileId}
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="input max-w-md"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {fileName && parsed && !problem && (
          <p className="mt-2 text-sm text-fg-muted">
            {fileName}: {formatNumber(parsed.rows.length)} rows.
            {ignored.length > 0 && ` These columns are not used and will be ignored: ${ignored.join(', ')}.`}
          </p>
        )}
        {problem && <p role="alert" className="mt-3 text-sm text-danger">{problem}</p>}
        <div className="mt-4">
          <Button variant="primary" disabled={!ready} loading={busy === 'check'} onClick={() => submit(true)}>
            Check the file
          </Button>
        </div>

        <div role="status" aria-live="polite">
          {result && result.errors.length > 0 && (
            <div className="mt-6">
              <p className="text-base font-semibold text-fg">
                {formatNumber(result.errors.length)} problem{result.errors.length === 1 ? '' : 's'} found. Nothing was saved.
              </p>
              <p className="mt-1 text-sm text-fg-muted">Fix the rows below in your spreadsheet, save it again and choose the file again. Row numbers match the spreadsheet, where row 1 is the header.</p>
              <div className="table-wrap mt-3" tabIndex={0} role="region" aria-label="Problems found in the file">
                <table className="data-table">
                  <caption className="sr-only">Problems found in the file</caption>
                  <thead><tr><th scope="col" className="num">Row</th><th scope="col">Problem</th></tr></thead>
                  <tbody>
                    {result.errors.slice(0, SHOWN_ERRORS).map((e, i) => (
                      <tr key={i}><td className="num">{e.row}</td><td className="whitespace-normal">{e.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.errors.length > SHOWN_ERRORS && (
                <p className="mt-2 text-sm text-fg-muted">Showing the first {SHOWN_ERRORS}. Fix these and check again to see the rest.</p>
              )}
            </div>
          )}
          {clean && (
            <p className="mt-6 text-base text-fg">
              The file is clean. It will add {formatNumber(result.created)} new
              {result.updated > 0 && `, update ${formatNumber(result.updated)} existing`}
              {result.skipped > 0 && ` and skip ${formatNumber(result.skipped)} already imported`} row{result.total === 1 ? '' : 's'}.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="confirm-heading" className="rounded-lg bg-panel p-4 sm:p-6">
        <h2 id="confirm-heading" className="text-lg font-semibold">3. Import</h2>
        <p className="mb-4 mt-1 max-w-prose text-sm text-fg-muted">Available once the file has passed the check.</p>
        <Button
          variant="primary"
          disabled={!clean || (result?.created === 0 && result?.updated === 0)}
          loading={busy === 'import'}
          onClick={() => submit(false)}
        >
          Import the data
        </Button>
        <div role="status" aria-live="polite">
          {saved && (
            <p className="mt-4 text-base text-success">
              {saved.committed
                ? `Imported. ${formatNumber(saved.created)} added, ${formatNumber(saved.updated)} updated, ${formatNumber(saved.skipped)} skipped. It now shows on the public pages.`
                : `Nothing was saved: ${saved.errors[0]?.message ?? 'the file changed since the check.'} Check the file again.`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
