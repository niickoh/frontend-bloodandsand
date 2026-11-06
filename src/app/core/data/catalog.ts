// Static gym info. Disciplines, plans and the timetable come from the API.

export const GYM = {
  name: 'Blood & Sand',
  address: 'Av. Ejemplo 1234, Santiago',
  mapsUrl: 'https://maps.google.com/?q=Santiago,+Chile',
  email: 'hola@bloodandsand.cl',
  phone: '+56 9 1234 5678',
  instagram: 'https://www.instagram.com/',
  timezone: 'America/Santiago',
  hours: [
    { days: 'Lunes a viernes', time: '06:30 – 22:00' },
    { days: 'Sábado', time: '09:00 – 14:00' },
    { days: 'Domingo y festivos', time: 'Cerrado' },
  ],
};

/** Photos available in public/img; disciplines reference them by `image`. */
export const IMAGES = new Set(['box', 'fuerza', 'funcional', 'hero']);
export const imageFor = (name: string) => (IMAGES.has(name) ? name : 'hero');

export const ROLE_LABEL = { admin: 'Admin', coach: 'Coach', student: 'Alumno' } as const;

/**
 * Each discipline keeps one color everywhere (schedule, cards, bookings), so people recognize it at a glance.
 * Box = blood, Fuerza = lime, Funcional = pink (campaign color), Evaluación = sand. New ones rotate.
 */
const ACCENTS = {
  blood: { text: 'text-blood', bg: 'bg-blood-fill', border: 'border-l-blood', dot: 'bg-blood' },
  lime: { text: 'text-lime', bg: 'bg-lime', border: 'border-l-lime', dot: 'bg-lime' },
  pink: { text: 'text-pink', bg: 'bg-pink', border: 'border-l-pink', dot: 'bg-pink' },
  sand: { text: 'text-bone', bg: 'bg-bone', border: 'border-l-bone', dot: 'bg-bone' },
} as const;
const BY_SLUG: Record<string, keyof typeof ACCENTS> = { box: 'blood', fuerza: 'lime', funcional: 'pink', evaluacion: 'sand' };
const ROTATION = ['blood', 'lime', 'pink', 'sand'] as const;

export function accentFor(slug: string) {
  const key = BY_SLUG[slug] ?? ROTATION[[...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % ROTATION.length];
  return ACCENTS[key];
}
