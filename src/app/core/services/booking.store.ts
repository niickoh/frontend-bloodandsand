import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Api } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { Booking, Contact, Membership, Quote, Session } from '../models';
import { addDays, toIso } from '../utils/date';
import { persistedSignal } from './storage';

export const BOOKING_WINDOW_DAYS = 14;

/** Sessions with availability, the member's bookings and plan. Backed by the Go API. */
@Injectable({ providedIn: 'root' })
export class BookingStore {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);

  readonly sessions = signal<Session[]>([]);
  readonly sessionsLoaded = signal(false);
  readonly myBookings = signal<Booking[]>([]);
  readonly membership = signal<Membership | null>(null);
  readonly membershipHistory = signal<Membership[]>([]);
  /** Last contact used by a guest, so the form is prefilled next time. */
  readonly guestContact = persistedSignal<Contact>('contact', { name: '', email: '', phone: '' });

  readonly days = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i));
  });

  readonly upcoming = computed(() => {
    const now = Date.now();
    return this.myBookings()
      .filter((b) => (b.status === 'confirmed' || b.status === 'pending_payment') && new Date(b.endsAt).getTime() > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  readonly history = computed(() => {
    const ids = new Set(this.upcoming().map((b) => b.id));
    return this.myBookings()
      .filter((b) => !ids.has(b.id))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  });

  constructor() {
    // Member data follows the session: load on login, clear on logout.
    effect(() => {
      const user = this.auth.user();
      if (user) {
        void this.loadMine();
      } else {
        this.myBookings.set([]);
        this.membership.set(null);
        this.membershipHistory.set([]);
      }
      void this.loadSessions();
    });
  }

  async loadSessions() {
    const days = this.days();
    const list = await this.api.get<Session[]>('/sessions', { from: toIso(days[0]), to: toIso(days[days.length - 1]) });
    this.sessions.set(list);
    this.sessionsLoaded.set(true);
  }

  async loadMine() {
    if (!this.auth.loggedIn()) return;
    const [bookings, m] = await Promise.all([
      this.api.get<Booking[]>('/me/bookings'),
      this.api.get<{ current: Membership | null; history: Membership[] }>('/me/membership'),
    ]);
    this.myBookings.set(bookings);
    this.membership.set(m.current);
    this.membershipHistory.set(m.history);
  }

  sessionsFor(isoDate: string, slug = 'todas') {
    return this.sessions().filter((s) => s.date === isoDate && (slug === 'todas' || s.slug === slug));
  }

  availability(isoDate: string, slug: string): 'libre' | 'pocos' | 'nada' {
    const now = Date.now();
    const open = this.sessionsFor(isoDate, slug).filter((s) => new Date(s.startsAt).getTime() > now && s.taken < s.capacity);
    if (!open.length) return 'nada';
    const left = open.reduce((n, s) => n + (s.capacity - s.taken), 0);
    return left <= 3 ? 'pocos' : 'libre';
  }

  quote(sessionId: number, email: string) {
    return this.api.post<Quote>('/bookings/quote', { sessionId, email });
  }

  async book(sessionId: number, contact: Contact) {
    const b = await this.api.post<Booking>('/bookings', { sessionId, ...contact });
    this.afterBooking(contact);
    return b;
  }

  afterBooking(contact: Contact) {
    if (!this.auth.loggedIn()) this.guestContact.set(contact);
    void this.loadSessions();
    void this.loadMine();
  }

  async cancel(id: number) {
    const b = await this.api.post<Booking>(`/me/bookings/${id}/cancel`);
    await Promise.all([this.loadMine(), this.loadSessions()]);
    return b;
  }
}
