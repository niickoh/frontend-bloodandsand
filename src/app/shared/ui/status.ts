import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const LABELS: Record<string, [string, string]> = {
  // bookings
  pending_payment: ['Esperando pago', 'border-pink text-pink'],
  confirmed: ['Confirmada', 'border-lime text-lime'],
  attended: ['Asistió', 'border-bone text-bone'],
  no_show: ['No vino', 'border-blood text-blood'],
  cancelled: ['Cancelada', 'border-steel text-ash'],
  // orders
  pending: ['Pendiente', 'border-pink text-pink'],
  paid: ['Pagada', 'border-lime text-lime'],
  failed: ['Rechazada', 'border-blood text-blood'],
  expired: ['Expirada', 'border-steel text-ash'],
  refunded: ['Reembolsada', 'border-bone text-bone'],
  // sessions / users
  scheduled: ['Programada', 'border-lime text-lime'],
  active: ['Activa', 'border-lime text-lime'],
  inactive: ['Inactiva', 'border-steel text-ash'],
};

@Component({
  selector: 'bs-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `<span class="inline-block border px-1.5 py-px text-xs font-semibold whitespace-nowrap" [class]="cls()">{{ label() }}</span>`,
})
export class Status {
  readonly value = input.required<string>();
  protected readonly label = computed(() => LABELS[this.value()]?.[0] ?? this.value());
  protected readonly cls = computed(() => LABELS[this.value()]?.[1] ?? 'border-steel text-ash');
}

export const PAYMENT_LABEL: Record<string, string> = {
  free: 'Gratis',
  plan: 'Con plan',
  paid: 'Pagada',
  staff: 'Agregada por staff',
};

export const PROVIDER_LABEL: Record<string, string> = {
  fake: 'Prueba',
  webpay: 'Webpay',
  mercadopago: 'Mercado Pago',
};
