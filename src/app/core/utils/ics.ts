import { Booking } from '../models';
import { GYM } from '../data/catalog';

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Downloads an .ics file so the class lands in Google Calendar, Outlook or Apple Calendar. */
export function downloadIcs(b: Booking) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Blood and Sand//Reservas//ES',
    'BEGIN:VEVENT',
    `UID:${b.code}@bloodandsand.cl`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.startsAt)}`,
    `DTEND:${stamp(b.endsAt)}`,
    `SUMMARY:${b.discipline} · Blood & Sand`,
    `DESCRIPTION:Reserva ${b.code}${b.coachName ? ' con ' + b.coachName : ''}. Llega 10 minutos antes.`,
    `LOCATION:${GYM.address}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${b.discipline} en 2 horas`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `blood-and-sand-${b.code}.ics` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
