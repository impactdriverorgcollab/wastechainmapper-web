/** Quote a CSV field. Fields with commas, quotes or line breaks are wrapped, quotes are doubled. */
function field(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  // A leading = + - @ can make a spreadsheet run the cell as a formula, so defuse it.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // The byte order mark makes Excel read the file as UTF-8, so community names keep their letters.
  return String.fromCharCode(0xfeff) + rows.map((r) => r.map(field).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ParsedCsv { headers: string[]; rows: Record<string, string>[] }

/**
 * Reads a CSV file as saved by Excel or Google Sheets: quoted fields, doubled quotes, line breaks
 * inside quotes, a byte order mark, and a semicolon separator (Excel in some regions).
 */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const table: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      table.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); table.push(row); }

  const [head, ...body] = table;
  const headers = (head ?? []).map((h) => h.trim());
  const rows = body
    // A row of only empty cells is a blank line a spreadsheet left behind.
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, rows };
}
