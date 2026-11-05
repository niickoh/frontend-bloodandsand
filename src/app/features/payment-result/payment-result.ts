import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BookingStore } from '../../core/services/booking.store';
import { PaymentService } from '../../core/services/payment.service';
import { Order } from '../../core/models';
import { money } from '../../core/utils/date';
import { Icon } from '../../shared/ui/icon';

/**
 * Where Webpay / Mercado Pago send the buyer back. The API already settled the order;
 * we poll briefly in case the provider's webhook arrives a few seconds later.
 */
@Component({
  selector: 'bs-payment-result',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-4 pt-12 pb-28 md:px-6 md:pt-20" aria-live="polite">
      @if (order(); as o) {
        @switch (o.status) {
          @case ('paid') {
            <span class="grid size-14 place-items-center rounded-full bg-lime text-ink"><bs-icon name="check" [size]="30" /></span>
            <h1 class="mt-6 text-[clamp(3.5rem,16vw,7.5rem)]">
              <span class="type-display block">Pago</span>
              <span class="type-outline block">recibido</span>
            </h1>
            <p class="mt-6 text-lg">{{ o.description }} · <span class="font-semibold text-lime">{{ money(o.amount) }}</span></p>
            @if (o.kind === 'class') {
              <p class="mt-2 text-bone/75">Tu clase quedó confirmada. Código <span class="font-punch text-xl font-extrabold text-lime italic">{{ o.bookingCode }}</span>.</p>
            } @else {
              <p class="mt-2 text-bone/75">Tu plan ya está activo. Reserva tus clases cuando quieras.</p>
            }
            <div class="mt-8 flex flex-wrap gap-3">
              <a routerLink="/reservar" class="tape">Reservar {{ o.kind === 'plan' ? 'mi primera clase' : 'otra clase' }}</a>
              @if (auth.loggedIn()) { <a routerLink="/mis-reservas" class="tape-ghost">Mis reservas</a> }
            </div>
          }
          @case ('pending') {
            <h1 class="page-title"><span class="type-display block">Confirmando</span><span class="type-outline block">tu pago</span></h1>
            <p class="mt-6 text-bone/75">Estamos esperando la confirmación del medio de pago. No cierres esta página.</p>
            <div class="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-steel"><div class="bar h-full w-1/3 rounded-full bg-lime"></div></div>
          }
          @default {
            <span class="grid size-14 place-items-center rounded-full bg-blood text-bone"><bs-icon name="x" [size]="30" /></span>
            <h1 class="mt-6 text-[clamp(3rem,13vw,6rem)]"><span class="type-display block">Pago no</span><span class="type-outline block">realizado</span></h1>
            <p class="mt-6 text-bone/75">{{ failText(o.status) }} No se hizo ningún cargo y el cupo quedó libre.</p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a [routerLink]="o.kind === 'plan' ? '/planes' : '/reservar'" class="tape">Intentar de nuevo</a>
            </div>
          }
        }
      } @else if (error()) {
        <h1 class="type-display text-5xl">No encontramos ese pago</h1>
        <p class="mt-4 text-bone/75">{{ error() }}</p>
        <a routerLink="/" class="tape mt-6">Ir al inicio</a>
      } @else {
        <p class="text-bone/70">Cargando…</p>
      }
    </section>
  `,
  styles: `
    .bar {
      animation: slide 1.2s ease-in-out infinite;
    }
    @keyframes slide {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(300%);
      }
    }
  `,
})
export default class PaymentResult implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly payments = inject(PaymentService);
  private readonly store = inject(BookingStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly order$ = input<string>(undefined, { alias: 'order' });
  readonly t = input<string>();

  protected readonly order = signal<Order | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly money = money;
  private timer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit() {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
    void this.poll(0);
  }

  private async poll(attempt: number) {
    const id = Number(this.order$());
    if (!id) {
      this.error.set('El enlace de pago no es válido.');
      return;
    }
    try {
      const o = await this.payments.order(id, this.t());
      this.order.set(o);
      if (o.status === 'pending' && attempt < 15) {
        this.timer = setTimeout(() => void this.poll(attempt + 1), 2000);
      } else if (o.status === 'paid') {
        void this.store.loadMine();
        void this.store.loadSessions();
      }
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  protected failText(status: string) {
    return status === 'cancelled' ? 'Cancelaste el pago.' : status === 'expired' ? 'El tiempo para pagar se agotó.' : 'El banco rechazó el pago.';
  }
}
