/**
 * "CAD date" helpers, shared by the browser and the server.
 *
 * The CAD clock runs on Pacific time (see the taskbar clock), so "today",
 * "expired" and "one year from now" are all computed in that time zone, not
 * in the server's or the viewer's.
 */

export const CAD_TIME_ZONE = 'America/Los_Angeles';

/** Today's CAD date as YYYY-MM-DD. */
export function cadToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: CAD_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** The CAD date `years` from today (Feb 29 becomes Feb 28 in non-leap years). */
export function cadDatePlusYears(years = 1, now: Date = new Date()): string {
  const [y, m, d] = cadToday(now).split('-').map(Number);
  const year = y + years;
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${year}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/** "2026-05-01", "05/01/2026", "2026/5/1" -> "2026-05-01"; anything else -> "". */
export function toIsoDate(v: unknown): string {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
}

/** True when `date` is before today's CAD date. A date of today is still valid. */
export function isPastCadDate(date: unknown, today: string = cadToday()): boolean {
  const iso = toIsoDate(date);
  return !!iso && iso < today;
}

/** Statuses that turn into EXPIRED once their date has passed. Others (SUSPENDED, TAGS STOLEN...) are kept. */
const EXPIRABLE = new Set(['', 'VALID', 'ACTIVE']);

/** The status to show: EXPIRED once the expiration date is before today, otherwise the stored status. */
export function effectiveStatus(status: unknown, expiration: unknown, today: string = cadToday()): string {
  const s = String(status ?? '').trim().toUpperCase();
  return EXPIRABLE.has(s) && isPastCadDate(expiration, today) ? 'EXPIRED' : String(status ?? '');
}

/**
 * A DMV record with its statuses as of today: vehicle registration and
 * insurance, and licenses, show EXPIRED once their date has passed. The stored
 * record is not changed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function liveDmvRecord<T = any>(rec: T, today: string = cadToday()): T {
  const r = rec as any;
  if (!r || !r.data) return rec;
  const d = r.data;
  if (r.type === 'VEHICLE REGISTRATION') {
    const registrationStatus = effectiveStatus(d.registrationStatus, d.registrationExpiration, today);
    const insuranceStatus = effectiveStatus(d.insuranceStatus, d.insuranceExpiration, today);
    if (registrationStatus === String(d.registrationStatus ?? '') && insuranceStatus === String(d.insuranceStatus ?? '')) return rec;
    return { ...r, data: { ...d, registrationStatus, insuranceStatus } };
  }
  if (r.type === 'LICENSE' || r.type === 'SECURITY GUARD LICENSE') {
    const status = effectiveStatus(d.status, d.expirationDate, today);
    if (status === String(d.status ?? '')) return rec;
    return { ...r, data: { ...d, status } };
  }
  return rec;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function liveDmvRecords<T = any>(records: T[] | undefined | null, today: string = cadToday()): T[] {
  return (records || []).map(r => liveDmvRecord(r, today));
}
