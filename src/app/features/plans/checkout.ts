import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { BookingStore } from '../../core/services/booking.store';
import { CatalogStore } from '../../core/services/catalog.store';
import { PaymentService } from '../../core/services/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { longDate, money } from '../../core/utils/date';
import { PaymentForm, PayRequest } from '../../shared/payment-form';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'bs-checkout',
  imports: [RouterLink, PaymentForm, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-5xl px-4 pt-8 pb-28 md:px-6 md:pt-12">
      @if (plan(); as p) {
        <a routerLink="/planes" class="inline-flex items-center gap-1 text-sm text-bone/60 hover:text-bone"><bs-icon name="chevron-left" [size]="16" /> Planes</a>
        <div class="mt-6 grid gap-10 md:grid-cols-[1fr_1.1fr]">
          <div>
            <h1 class="page-title">
              <span class="type-display block">{{ p.name }}</span>
              <span class="type-outline block">{{ p.periodDays }} días</span>
            </h1>
            <p class="mt-4 font-punch text-5xl font-extrabold text-lime italic">{{ money(p.price) }}</p>
            <ul class="mt-6 space-y-2">
              @for (perk of p.perks; track perk) {
                <li class="flex gap-2"><bs-icon name="check" [size]="18" class="mt-1 text-lime" /> {{ perk }}</li>
              }
            </ul>
            <p class="mt-6 text-sm text-bone/70">Lo contratas como {{ auth.user()?.fullName }} ({{ auth.user()?.email }}).</p>
            @if (store.membership(); as m) {
              <p class="mt-4 rounded-[var(--radius-field)] border-l-4 border-pink bg-iron p-4 text-sm">
                Ya tienes el plan {{ m.planName }} hasta el {{ longDate(m.endsAt.slice(0, 10)).toLowerCase() }}. Si contratas este, reemplaza al actual desde hoy.
              </p>
            }
          </div>
          <div class="card p-5 md:p-7">
            <h2 class="mb-5 font-punch text-3xl font-extrabold italic">Pago</h2>
            @if (error()) {
              <p class="mb-5 rounded-[var(--radius-field)] border-l-4 border-blood bg-blood/10 p-4 text-sm" role="alert">{{ error() }}</p>
            }
            <bs-payment-form [amount]="p.price" [busy]="busy()" (paid)="pay($event)" />
          </div>
        </div>
      } @else if (catalog.loaded()) {
        <h1 class="type-display text-5xl">Ese plan no existe</h1>
        <a routerLink="/planes" class="tape mt-6">Ver planes</a>
      }
    </section>
  `,
})
export default class Checkout {
  protected readonly store = inject(BookingStore);
  protected readonly catalog = inject(CatalogStore);
  protected readonly auth = inject(AuthService);
  private readonly payments = inject(PaymentService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly slug = input.required<string>();

  protected readonly plan = computed(() => {
    const p = this.catalog.plan(this.slug());
    return p && p.sellable ? p : null;
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly money = money;
  protected readonly longDate = longDate;

  protected async pay(req: PayRequest) {
    const p = this.plan();
    if (!p) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      const c = await this.payments.checkoutPlan(p.id, req.provider);
      if (this.payments.follow(c)) return;
      await this.payments.confirmFake(c.order.id, c.token, req.cardNumber ?? '');
      await this.store.loadMine();
      this.toast.ok('Plan activo', `${p.name} activado. Ya puedes reservar tus clases.`);
      await this.router.navigate(['/reservar']);
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.busy.set(false);
    }
  }
}
