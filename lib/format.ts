const LOCALE = 'en-NG';

export const NOT_RECORDED = 'Not recorded';

export function formatDate(iso: string | null | undefined, withYear = true): string {
  if (!iso) return NOT_RECORDED;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_RECORDED;
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }) });
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (value == null || Number.isNaN(value)) return NOT_RECORDED;
  return value.toLocaleString(LOCALE, { maximumFractionDigits });
}

export function formatTonnes(value: number | null | undefined): string {
  if (value == null) return NOT_RECORDED;
  return `${formatNumber(value, 1)} t`;
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return NOT_RECORDED;
  return `${Math.round(rate * 100)}%`;
}

export function formatCoords(lat: number | null | undefined, lng: number | null | undefined, digits = 4): string {
  if (lat == null || lng == null) return NOT_RECORDED;
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`;
}

/** Only http and https links are rendered as links. Citizen reports use whatsapp: ids. */
export function isWebUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString(LOCALE)} ${count === 1 ? one : many}`;
}
