const pad = (n: number) => String(n).padStart(2, '0');

export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** 1 = Monday … 7 = Sunday */
export const isoWeekday = (d: Date) => ((d.getDay() + 6) % 7) + 1;

export const addMinutes = (hhmm: string, min: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + min;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};

export const sessionDateTime = (iso: string, hhmm: string) => {
  const d = fromIso(iso);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

const fmtLong = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtWeekdayShort = new Intl.DateTimeFormat('es-CL', { weekday: 'short' });
const fmtMonth = new Intl.DateTimeFormat('es-CL', { month: 'long' });

export const longDate = (iso: string) => {
  const s = fmtLong.format(fromIso(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const weekdayShort = (d: Date) => fmtWeekdayShort.format(d).replace('.', '');
export const monthName = (d: Date) => fmtMonth.format(d);

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
export const money = (n: number) => (n === 0 ? 'Gratis' : clp.format(n));

/** Deterministic pseudo-random 0..1 from a string, so fake occupancy is stable between reloads. */
export const seeded = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
};
