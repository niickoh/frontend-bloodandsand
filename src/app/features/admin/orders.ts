import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { Order } from '../../core/models';
import { money } from '../../core/utils/date';
import { FormState } from '../../shared/form-state';
import { FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Modal } from '../../shared/ui/modal';
import { PROVIDER_LABEL, Status } from '../../shared/ui/status';
import { AdminApi } from './admin-api';

const PAGE = 50;

@Component({
  selector: 'bs-admin-orders',
  imports: [FormsModule, RouterLink, Icon, Modal, Status, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title type-display">Pagos</h1>

    <div class="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <label class="relative">
        <span class="sr-only">Buscar</span>
        <bs-icon name="search" [size]="18" class="absolute top-3.5 left-3 text-ash" />
        <input class="field !pl-10" placeholder="Comprador o detalle" [ngModel]="q()" (ngModelChange)="search($event)" />
      </label>
      <select class="field" [ngModel]="statusF()" (ngModelChange)="statusF.set($event); page.set(0)" aria-label="Estado">
        <option value="">Todos los estados</option>
        <option value="paid">Pagadas</option>
        <option value="pending">Pendientes</option>
        <option value="failed">Rechazadas</option>
        <option value="expired">Expiradas</option>
        <option value="cancelled">Canceladas</option>
        <option value="refunded">Reembolsadas</option>
      </select>
      <select class="field" [ngModel]="kind()" (ngModelChange)="kind.set($event); page.set(0)" aria-label="Tipo">
        <option value="">Planes y clases</option>
        <option value="plan">Planes</option>
        <option value="class">Clases sueltas</option>
      </select>
    </div>

    <p class="mt-4 text-sm text-ash">{{ total() }} {{ total() === 1 ? 'orden' : 'órdenes' }} · {{ money(pageTotal()) }} pagado en esta página</p>
    <div class="mt-2 overflow-x-auto border-y border-steel">
      <table class="w-full min-w-[720px] text-left text-sm">
        <thead class="text-ash"><tr><th class="py-2 pl-2 font-normal">#</th><th class="font-normal">Detalle</th><th class="font-normal">Comprador</th><th class="font-normal">Medio</th><th class="text-right font-normal">Monto</th><th class="pr-2 pl-4 font-normal">Estado</th></tr></thead>
        <tbody class="divide-y divide-steel">
          @for (o of items(); track o.id) {
            <tr class="cursor-pointer hover:bg-iron" (click)="openDetail(o)">
              <td class="py-2.5 pl-2 text-ash">{{ o.id }}</td>
              <td><span class="font-semibold">{{ o.description }}</span><br /><span class="text-ash">{{ when(o.createdAt) }}</span></td>
              <td>
                @if (o.userId) { <a [routerLink]="['/admin/usuarios', o.userId]" class="hover:text-lime" (click)="$event.stopPropagation()">{{ o.buyerName }}</a> } @else { {{ o.buyerName }} }
                <br /><span class="text-ash">{{ o.buyerEmail }}</span>
              </td>
              <td>{{ provider[o.provider] ?? o.provider }}</td>
              <td class="text-right font-semibold">{{ money(o.amount) }}</td>
              <td class="pr-2 pl-4"><bs-status [value]="o.status" /></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="py-6 pl-2 text-bone/70">{{ loading() ? 'Cargando…' : 'No hay pagos con estos filtros.' }}</td></tr>
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

    <bs-modal [title]="'Orden #' + (detail()?.id ?? '')" [open]="!!detail()" (closed)="detail.set(null)">
      @if (detail(); as o) {
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt class="text-ash">Detalle</dt><dd>{{ o.description }}</dd>
          <dt class="text-ash">Monto</dt><dd class="font-semibold">{{ money(o.amount) }}</dd>
          <dt class="text-ash">Estado</dt><dd><bs-status [value]="o.status" /></dd>
          <dt class="text-ash">Medio</dt><dd>{{ provider[o.provider] ?? o.provider }}</dd>
          <dt class="text-ash">Comprador</dt><dd>{{ o.buyerName }} · {{ o.buyerEmail }} · {{ o.buyerPhone }}</dd>
          <dt class="text-ash">Creada</dt><dd>{{ when(o.createdAt) }}</dd>
          @if (o.paidAt) { <dt class="text-ash">Pagada</dt><dd>{{ when(o.paidAt) }}</dd> }
          @if (o.bookingCode) { <dt class="text-ash">Reserva</dt><dd class="font-semibold">{{ o.bookingCode }}</dd> }
          @for (kv of detailRows(); track kv[0]) { <dt class="text-ash">{{ kv[0] }}</dt><dd class="break-all">{{ kv[1] }}</dd> }
        </dl>
        @if (o.status === 'paid') {
          <div class="mt-6 border-t border-steel pt-5">
            <label class="block"><span class="field-label">Motivo del reembolso</span><input class="field" [(ngModel)]="note" maxlength="200" /></label>
            <p class="mt-2 text-xs text-ash">
              {{ o.provider === 'fake' ? 'Pago de prueba: solo se marca como reembolsado.' : 'Se solicita la devolución a ' + (provider[o.provider] ?? o.provider) + '.' }}
              La reserva o el plan asociado se cancelan.
            </p>
            <bs-form-message [message]="refundForm.message()" />
            <button type="button" class="mt-4 w-full bg-blood-fill px-5 py-3 font-punch text-xl font-extrabold text-bone italic uppercase disabled:opacity-50" [disabled]="refundForm.busy()" (click)="refund(o)">
              Reembolsar {{ money(o.amount) }}
            </button>
          </div>
        }
      }
    </bs-modal>
  `,
})
export default class AdminOrders {
  private readonly admin = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly money = money;
  protected readonly provider: Record<string, string | undefined> = PROVIDER_LABEL;
  protected readonly PAGE = PAGE;

  readonly status = input<string>();
  protected readonly statusF = linkedSignal(() => this.status() ?? '');
  protected readonly q = signal('');
  private readonly debounced = signal('');
  protected readonly kind = signal('');
  protected readonly page = signal(0);
  protected readonly items = signal<Order[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly pages = computed(() => Math.ceil(this.total() / PAGE));
  protected readonly pageTotal = computed(() => this.items().reduce((n, o) => n + (o.status === 'paid' ? o.amount : 0), 0));
  protected readonly detail = signal<Order | null>(null);
  protected readonly detailRows = computed(() =>
    Object.entries(this.detail()?.detail ?? {})
      .filter(([, v]) => v !== '' && v !== null && typeof v !== 'object')
      .map(([k, v]) => [k, String(v)] as const),
  );
  protected readonly refundForm = new FormState();
  protected note = '';
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly query = computed(() => ({ q: this.debounced(), status: this.statusF(), kind: this.kind(), offset: this.page() * PAGE }));

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

  private async load(q: { q: string; status: string; kind: string; offset: number }) {
    this.loading.set(true);
    try {
      const r = await this.admin.orders({ ...q, limit: PAGE });
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (e) {
      this.toast.error('No se pudieron cargar los pagos', toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected when = (iso: string) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' });

  protected async openDetail(o: Order) {
    this.refundForm.reset();
    this.note = '';
    this.detail.set(await this.admin.order(o.id));
  }

  protected async refund(o: Order) {
    if (!confirm(`¿Reembolsar ${money(o.amount)} a ${o.buyerName}?`)) return;
    const r = await this.refundForm.run(() => this.admin.refund(o.id, this.note));
    if (r) {
      this.detail.set(null);
      this.toast.ok('Reembolso registrado', `Orden #${o.id}.`);
      void this.load(this.query());
    }
  }
}
