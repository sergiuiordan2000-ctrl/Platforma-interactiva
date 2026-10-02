/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ora României (Faza 5.6, P-5): data și ora sondajelor se afișează și se introduc în ora României
 * (`Europe/Bucharest`), indiferent de fusul orar al dispozitivului. Serverul lucrează în UTC (ISO 8601).
 */

const TZ = 'Europe/Bucharest';

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function roParts(d: Date): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const p: Record<string, string> = {};
  for (const part of partsFormat.formatToParts(d)) p[part.type] = part.value;
  return { y: Number(p.year), mo: Number(p.month), d: Number(p.day), h: Number(p.hour), mi: Number(p.minute), s: Number(p.second) };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO (UTC) → valoarea unui câmp `datetime-local` (`YYYY-MM-DDTHH:mm`), în ora României. */
export function isoToRoInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = roParts(d);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** Valoarea unui câmp `datetime-local`, interpretată ca oră a României → ISO (UTC). `null` dacă nu e validă. */
export function roInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  if (isNaN(wall)) return null;
  // decalajul României față de UTC la momentul t (2 h iarna, 3 h vara)
  const offsetAt = (t: number): number => {
    const p = roParts(new Date(t));
    return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000;
  };
  // două treceri: a doua corectează valorile din apropierea schimbării orei
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t);
  return new Date(t).toISOString();
}

/** Data și ora, în ora României (de ex. „30 iun. 2027, 23:59”). */
export function formatRoDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Numai data, în ora României (de ex. „30 iun. 2027”). */
export function formatRoDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('ro-RO', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}
