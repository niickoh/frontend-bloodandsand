import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { toApiError } from '../../core/api/api-error';
import { BookingStore } from '../../core/services/booking.store';
import { CatalogStore } from '../../core/services/catalog.store';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentService } from '../../core/services/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { Booking, Quote } from '../../core/models';
import { longDate, money, toIso } from '../../core/utils/date';
import { downloadIcs } from '../../core/utils/ics';
import { accentFor } from '../../core/data/catalog';
import { DayStrip } from './day-strip';
import { PlateMeter } from '../../shared/ui/plate-meter';
import { Icon } from '../../shared/ui/icon';
import { PaymentForm, PayRequest } from '../../shared/payment-form';
import { ConfigService } from '../../core/config/app-config';

type Step = 1 | 2 | 3;

@Component({
  selector: 'bs-booking',
  imports: [RouterLink, DayStrip, PlateMeter, Icon, PaymentForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.html',
})
export default class BookingPage {
  protected readonly store = inject(BookingStore);
  protected readonly catalog = inject(CatalogStore);
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationService);
  protected readonly cfg = inject(ConfigService).value;
  private readonly payments = inject(PaymentService);
  private readonly toast = inject(ToastService);

  /** Query params (?d=box&fecha=2026-11-05&s=123) bound by the router. */
  readonly d = input<string>();
  readonly fecha = input<string>();
  readonly s = input<string>();

  protected readonly money = money;
  protected readonly longDate = longDate;
  protected readonly accent = accentFor;

  protected readonly filters = computed(() => [{ id: 'todas', label: 'Todas' }, ...this.catalog.disciplines().map((x) => ({ id: x.slug, label: x.name }))]);
  protected readonly filter = linkedSignal(() => this.d() || 'todas');

  protected readonly date = linkedSignal<string>(() => {
    const wanted = this.fecha();
    const valid = this.store.days().map(toIso);
    if (wanted && valid.includes(wanted)) return wanted;
    this.store.sessions();
    return valid.find((iso) => this.store.availability(iso, this.filter()) !== 'nada') ?? valid[0];
  });

  protected readonly sessions = computed(() => this.store.sessionsFor(this.date(), this.filter()));

  protected readonly selectedId = linkedSignal<number | null>(() => {
    this.date();
    this.filter();
    const s = Number(this.s());
    return Number.isFinite(s) && s > 0 ? s : null;
  });
  protected readonly selected = computed(() => this.store.sessions().find((x) => x.id === this.selectedId()) ?? null);
  protected readonly isPast = (startsAt: string) => new Date(startsAt).getTime() < Date.now();

  protected readonly step = signal<Step>(1);
  protected readonly busy = signal(false);
  protected readonly done = signal<Booking | null>(null);
  protected readonly quote = signal<Quote | null>(null);
  protected readonly payError = signal<string | null>(null);

  // Contact: the account's data when logged in, else the last guest contact
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly touched = signal(false);
  protected readonly nameOk = computed(() => this.name().trim().split(/\s+/).length >= 2);
  protected readonly emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email().trim()));
  protected readonly phoneOk = computed(() => this.phone().replace(/\D/g, '').length >= 8);
  protected readonly contactOk = computed(() => this.nameOk() && this.emailOk() && this.phoneOk());
  protected readonly contact = computed(() => ({ name: this.name().trim(), email: this.email().trim(), phone: this.phone().trim() }));

  constructor() {
    effect(() => {
      const u = this.auth.user();
      const c = u ? { name: u.fullName, email: u.email, phone: u.phone } : this.store.guestContact();
      this.name.set(c.name);
      this.email.set(c.email);
      this.phone.set(c.phone);
    });
  }

  protected pick(id: number) {
    this.selectedId.set(id);
  }

  protected async next() {
    this.payError.set(null);
    if (this.step() === 1 && this.selected()) {
      this.step.set(2);
    } else if (this.step() === 2) {
      this.touched.set(true);
      if (!this.contactOk()) return;
      this.busy.set(true);
      try {
        this.quote.set(await this.store.quote(this.selected()!.id, this.email().trim()));
        this.step.set(3);
      } catch (e) {
        this.toast.error('No pudimos preparar tu reserva', toApiError(e).message);
      } finally {
        this.busy.set(false);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected back() {
    this.payError.set(null);
    this.step.update((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  protected async confirmFree() {
    const s = this.selected();
    if (!s) return;
    this.busy.set(true);
    try {
      const b = await this.store.book(s.id, this.contact());
      this.finish(b);
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async pay(req: PayRequest) {
    const s = this.selected();
    if (!s) return;
    this.payError.set(null);
    this.busy.set(true);
    try {
      const checkout = await this.payments.checkoutClass(s.id, this.contact(), req.provider);
      if (this.payments.follow(checkout)) return; // left the app to pay; we come back to /pago/resultado
      try {
        const order = await this.payments.confirmFake(checkout.order.id, checkout.token, req.cardNumber ?? '');
        this.store.afterBooking(this.contact());
        const b: Booking = this.bookingFromSession(order.bookingCode ?? '', order.amount);
        this.finish(b);
      } catch (e) {
        const err = toApiError(e);
        this.payError.set(err.message);
        void this.store.loadSessions(); // the held seat was released
      }
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }

  private bookingFromSession(code: string, amount: number): Booking {
    const s = this.selected()!;
    const c = this.contact();
    return {
      id: 0, code, sessionId: s.id, discipline: s.discipline, slug: s.slug, coachName: s.coachName, startsAt: s.startsAt, endsAt: s.endsAt,
      date: s.date, start: s.start, end: s.end, userId: this.auth.user()?.id ?? null, ...c, status: 'confirmed', payment: 'paid', amount,
      membershipId: null, orderId: null, notes: '', cancelledAt: null, createdAt: new Date().toISOString(), canCancel: true, refundsCredit: false,
    };
  }

  private finish(b: Booking) {
    this.done.set(b);
    window.scrollTo({ top: 0 });
    if (this.notifications.permission() === 'granted' && !this.auth.loggedIn()) void this.notifications.subscribe(b.email);
  }

  private fail(e: unknown) {
    const err = toApiError(e);
    this.toast.error('No pudimos reservar', err.message);
    if (['session_full', 'session_started', 'session_cancelled', 'already_booked'].includes(err.code)) {
      this.step.set(1);
      void this.store.loadSessions();
    }
  }

  protected addToCalendar(b: Booking) {
    downloadIcs(b);
  }

  protected async enableAlerts(b: Booking) {
    await this.notifications.request(this.auth.loggedIn() ? '' : b.email);
  }

  protected restart() {
    this.done.set(null);
    this.step.set(1);
    this.selectedId.set(null);
    this.quote.set(null);
  }
}
