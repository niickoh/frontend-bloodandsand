import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { Booking, BookingStatus } from '../../core/models';
import { addDays, longDate, money, toIso } from '../../core/utils/date';
import { Icon } from '../../shared/ui/icon';
import { PAYMENT_LABEL } from '../../shared/ui/status';
import { StaffApi } from '../staff/staff-api';
import { AdminApi } from './admin-api';

const PAGE = 50;

@Component({
  selector: 'bs-admin-bookings',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="page-title type-display">Reservas</h1>
      <a routerLink="/admin/clases" class="tape"><bs-icon name="plus" /> Nueva reserva</a>
    </div>
    <p class="mt-2 text-sm text-bone/70">Para crear una reserva elige la clase y usa «Agregar persona».</p>

    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
      <label class="relative">
        <span class="sr-only">Buscar</span>
        <bs-icon name="search" [size]="18" class="absolute top-3.5 left-3 text-ash" />
        <input class="field !pl-10" placeholder="Nombre, correo o código" [ngModel]="q()" (ngModelChange)="search($event)" />
      </label>
      <input type="date" class="field" [ngModel]="from()" (ngModelChange)="from.set($event); page.set(0)" aria-label="Desde" />
      <input type="date" class="field" [ngModel]="to()" (ngModelChange)="to.set($event); page.set(0)" aria-label="Hasta" />
      <select class="field" [ngModel]="status()" (ngModelChange)="status.set($event); page.set(0)" aria-label="Estado">
        <option value="">Todos los estados</option>
        <option value="confirmed">Confirmadas</option>
        <option value="attended">Asistió</option>
        <option value="no_show">No vino</option>
        <option value="cancelled">Canceladas</option>
        <option value="pending_payment">Esperando pago</option>
      </select>
    </div>

    <p class="mt-4 text-sm text-ash">{{ total() }} {{ total() === 1 ? 'reserva' : 'reservas' }}</p>
    <div class="mt-2 overflow-x-auto border-y border-steel">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="text-ash">
          <tr><th class="py-2 pl-2 font-normal">Clase</th><th class="font-normal">Persona</th><th class="font-normal">Pago</th><th class="font-normal">Código</th><th class="pr-2 font-normal">Estado</th></tr>
        </thead>
        <tbody class="divide-y divide-steel">
          @for (b of items(); track b.id) {
            <tr class="hover:bg-iron">
              <td class="py-2.5 pl-2">
                <a [routerLink]="['/admin/clases', b.sessionId]" class="hover:text-lime"><span class="font-semibold">{{ b.discipline }} {{ b.start }}</span><br /><span class="text-ash">{{ longDate(b.date) }}</span></a>
              </td>
              <td>
                @if (b.userId) { <a [routerLink]="['/admin/usuarios', b.userId]" class="font-semibold hover:text-lime">{{ b.name }}</a> } @else { <span class="font-semibold">{{ b.name }}</span> <span class="text-xs text-ash">invitado</span> }
                <br /><span class="text-ash">{{ b.email }}</span>
              </td>
              <td>{{ payLabel(b) }}</td>
              <td class="font-punch text-base font-bold italic">{{ b.code }}</td>
              <td class="pr-2">
                <select class="border border-steel bg-iron px-2 py-1 text-sm" [ngModel]="b.status" (ngModelChange)="setStatus(b, $event)" [attr.aria-label]="'Estado de la reserva ' + b.code" [disabled]="b.status === 'pending_payment'">
                  @if (b.status === 'pending_payment') { <option value="pending_payment">Esperando pago</option> }
                  <option value="confirmed">Confirmada</option>
                  <option value="attended">Asistió</option>
                  <option value="no_show">No vino</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="py-6 pl-2 text-bone/70">{{ loading() ? 'Cargando…' : 'No hay reservas con estos filtros.' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    @if (total() > PAGE) {
      <div class="mt-4 flex items-center gap-3">
        <button type="button" class="tape-ghost tape-sm" [disabled]="page() === 0" (click)="page.update((p) => p - 1)">Anterior</button>
        <span class="text-sm text-ash">Página {{ page() + 1 }} de {{ pages() }}</span>
        <button type="button" class="tape-ghost tape-sm" [disabled]="page() + 1 >= pages()" (click)="page.update((p) => p + 1)">Siguiente</button>
      </div>
    }
  `,
})
export default class AdminBookings {
  private readonly admin = inject(AdminApi);
  private readonly staff = inject(StaffApi);
  private readonly toast = inject(ToastService);
  protected readonly PAGE = PAGE;
  protected readonly longDate = longDate;

  protected readonly q = signal('');
  protected readonly debounced = signal('');
  protected readonly from = signal(toIso(new Date()));
  protected readonly to = signal(toIso(addDays(new Date(), 14)));
  protected readonly status = signal('');
  protected readonly page = signal(0);
  protected readonly items = signal<Booking[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly pages = computed(() => Math.ceil(this.total() / PAGE));
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly query = computed(() => ({ q: this.debounced(), from: this.from(), to: this.to(), status: this.status(), offset: this.page() * PAGE }));

  constructor() {
    effect(() => void this.load(this.query()));
  }

  protected search(v: string) {
    this.q.set(v);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.debounced.set(v.trim());
      this.page.set(0);
    }, 300);
  }

  private async load(q: { q: string; from: string; to: string; status: string; offset: number }) {
    this.loading.set(true);
    try {
      const r = await this.admin.bookings({ ...q, limit: PAGE });
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (e) {
      this.toast.error('No se pudieron cargar las reservas', toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected payLabel = (b: Booking) => (b.payment === 'paid' ? `${PAYMENT_LABEL['paid']} ${money(b.amount)}` : PAYMENT_LABEL[b.payment]);

  protected async setStatus(b: Booking, status: BookingStatus) {
    try {
      const updated = await this.staff.updateBooking(b.id, { status });
      this.items.update((list) => list.map((x) => (x.id === b.id ? updated : x)));
      this.toast.ok('Reserva actualizada', `${b.name}: ${status === 'cancelled' ? 'cancelada y avisada' : 'estado cambiado'}.`);
    } catch (e) {
      this.toast.error('No se pudo actualizar', toApiError(e).message);
      void this.load(this.query());
    }
  }
}
