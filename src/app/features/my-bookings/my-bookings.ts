import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { BookingStore } from '../../core/services/booking.store';
import { ToastService } from '../../core/services/toast.service';
import { Booking } from '../../core/models';
import { fromIso, longDate, money, weekdayShort } from '../../core/utils/date';
import { downloadIcs } from '../../core/utils/ics';
import { Icon } from '../../shared/ui/icon';
import { accentFor } from '../../core/data/catalog';
import { PAYMENT_LABEL, Status } from '../../shared/ui/status';
import { ConfigService } from '../../core/config/app-config';

@Component({
  selector: 'bs-my-bookings',
  imports: [RouterLink, Icon, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-4xl px-4 pt-8 pb-28 md:px-6 md:pt-12">
      <h1 class="page-title">
        <span class="type-display block">Mis</span>
        <span class="type-outline block">reservas</span>
      </h1>

      @if (store.membership(); as m) {
        <div class="mt-8 flex flex-wrap items-end justify-between gap-4 rounded-[var(--radius-card)] bg-lime p-5 text-ink">
          <div>
            <p class="text-sm font-semibold text-ink/70">Tu plan</p>
            <p class="type-display text-4xl">{{ m.planName }}</p>
            <p class="text-sm">Vigente hasta el {{ longDate(m.endsAt.slice(0, 10)).toLowerCase() }}</p>
          </div>
          <p class="font-punch text-4xl font-extrabold italic">
            {{ m.creditsLeft === null ? 'Ilimitado' : m.creditsLeft + (m.creditsLeft === 1 ? ' clase' : ' clases') }}
          </p>
        </div>
      } @else {
        <div class="card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
          <p class="max-w-[44ch] text-bone/80">Sin plan activo: cada clase se paga al reservar. Con un plan reservas sin pagar cada vez.</p>
          @if (cfg.planes.activo) { <a routerLink="/planes" class="tape">Ver planes</a> }
        </div>
      }

      <h2 class="mt-12 font-punch text-3xl font-extrabold italic">Próximas</h2>
      @if (store.upcoming().length) {
        <ul class="mt-4 space-y-3">
          @for (b of store.upcoming(); track b.id) {
            <li class="grid grid-cols-[4.5rem_1fr] overflow-hidden rounded-[var(--radius-card)] border border-steel bg-iron sm:grid-cols-[5.5rem_1fr_auto]">
              <div class="flex flex-col items-center justify-center border-r border-dashed border-steel py-4" [class]="tone(b.slug)">
                <span class="text-xs font-semibold capitalize">{{ wd(b.date) }}</span>
                <span class="type-display text-4xl">{{ day(b.date) }}</span>
              </div>
              <div class="min-w-0 p-4">
                <p class="font-punch text-2xl leading-tight font-extrabold italic">{{ b.discipline }} · {{ b.start }}</p>
                <p class="text-sm text-ash">{{ longDate(b.date) }}{{ b.coachName ? ' · ' + b.coachName : '' }} · {{ payLabel(b) }}</p>
                <p class="mt-1 text-xs text-bone/50">Código {{ b.code }}</p>
              </div>
              <div class="col-span-2 flex border-t border-steel sm:col-span-1 sm:flex-col sm:border-t-0 sm:border-l">
                @if (cfg.reservas.agregarCalendario) {
                  <button type="button" class="flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm hover:bg-steel" (click)="ics(b)">
                    <bs-icon name="download" [size]="16" /> Calendario
                  </button>
                }
                @if (b.canCancel && cfg.reservas.cancelar) {
                  @if (confirming() === b.id) {
                    <button type="button" class="flex flex-1 items-center justify-center gap-1.5 bg-blood-fill px-4 py-3 text-sm font-semibold text-bone" (click)="cancel(b)" [disabled]="busy()">
                      {{ busy() ? 'Cancelando…' : 'Sí, cancelar' }}
                    </button>
                  } @else {
                    <button type="button" class="flex flex-1 items-center justify-center gap-1.5 border-l border-steel px-4 py-3 text-sm text-bone/80 hover:bg-steel sm:border-t sm:border-l-0" (click)="confirming.set(b.id)">
                      <bs-icon name="x" [size]="16" /> Cancelar
                    </button>
                  }
                }
              </div>
              @if (confirming() === b.id) {
                <p class="col-span-full border-t border-steel px-4 py-2 text-sm text-bone/75">
                  @if (b.payment === 'plan') {
                    {{ b.refundsCredit ? 'Faltan más de 3 horas: liberas tu cupo y recuperas la clase del plan.' : 'Faltan menos de 3 horas: liberas el cupo pero no recuperas la clase.' }}
                  } @else if (b.payment === 'paid') {
                    Liberas tu cupo. Para devolver el pago, escríbenos indicando el código {{ b.code }}.
                  } @else {
                    Liberas tu cupo para otra persona.
                  }
                  <button type="button" class="ml-1 underline" (click)="confirming.set(null)">Mantener reserva</button>
                </p>
              }
            </li>
          }
        </ul>
      } @else {
        <div class="mt-4 rounded-[var(--radius-card)] border border-dashed border-steel p-6">
          <p class="text-bone/75">No tienes clases reservadas. Elige un horario y asegura tu cupo.</p>
          @if (cfg.reservas.activo) { <a routerLink="/reservar" class="tape mt-4">Reservar clase</a> }
        </div>
      }

      @if (store.history().length) {
        <details class="group mt-12">
          <summary class="flex cursor-pointer list-none items-center gap-2 font-punch text-2xl font-extrabold italic">
            <bs-icon name="chevron-right" class="transition-transform group-open:rotate-90" /> Historial ({{ store.history().length }})
          </summary>
          <ul class="mt-4 divide-y divide-steel border-y border-steel text-sm">
            @for (b of store.history(); track b.id) {
              <li class="flex items-center justify-between gap-4 py-3">
                <span [class.text-ash]="b.status === 'cancelled'">{{ b.discipline }} · {{ longDate(b.date) }} {{ b.start }}</span>
                <bs-status [value]="b.status === 'confirmed' ? 'attended' : b.status" />
              </li>
            }
          </ul>
        </details>
      }
    </section>
  `,
})
export default class MyBookings implements OnInit {
  protected readonly cfg = inject(ConfigService).value;
  protected readonly store = inject(BookingStore);
  private readonly toast = inject(ToastService);
  protected readonly confirming = signal<number | null>(null);
  protected readonly busy = signal(false);
  protected readonly longDate = longDate;

  ngOnInit() {
    void this.store.loadMine();
  }

  protected wd = (iso: string) => weekdayShort(fromIso(iso));
  protected day = (iso: string) => fromIso(iso).getDate();
  protected tone = (slug: string) => accentFor(slug).text;
  protected payLabel = (b: Booking) => (b.payment === 'paid' ? `Pagada ${money(b.amount)}` : PAYMENT_LABEL[b.payment]);

  protected ics(b: Booking) {
    downloadIcs(b);
  }

  protected async cancel(b: Booking) {
    this.busy.set(true);
    try {
      await this.store.cancel(b.id);
      this.toast.ok('Reserva cancelada', `${b.discipline} del ${longDate(b.date)}. Tu cupo quedó libre para otra persona.`);
    } catch (e) {
      this.toast.error('No se pudo cancelar', toApiError(e).message);
    } finally {
      this.busy.set(false);
      this.confirming.set(null);
    }
  }
}
