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
