import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { PaymentService } from '../core/services/payment.service';
import { money } from '../core/utils/date';
import { Icon } from './ui/icon';

export interface PayRequest {
  provider: string;
  cardNumber?: string;
}

const luhn = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
};

/**
 * Lets the buyer pick a provider. Webpay and Mercado Pago take the buyer to their own secure page;
 * the "fake" provider (development only) shows a card form here.
 */
@Component({
  selector: 'bs-payment-form',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (payments.providers().length > 1) {
      <div role="radiogroup" aria-label="Medio de pago" class="grid gap-2 sm:grid-cols-2">
        @for (p of payments.providers(); track p.name) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="provider() === p.name"
            (click)="provider.set(p.name)"
            class="flex min-h-14 items-center gap-2 rounded-[var(--radius-field)] border-2 px-3 text-left text-sm font-semibold transition-colors"
            [class]="provider() === p.name ? 'border-lime bg-lime/10 text-bone' : 'border-steel text-bone/70 hover:border-ash'"
          >
            <bs-icon [name]="p.name === 'fake' ? 'card' : 'share'" />
            {{ p.label }}
          </button>
        }
      </div>
    }

    @if (provider() === 'fake') {
      <form class="mt-5 grid grid-cols-2 gap-4" (submit)="$event.preventDefault(); submitCard()" novalidate>
        <label class="col-span-2">
          <span class="field-label">Número de tarjeta</span>
          <input class="field font-punch text-xl tracking-wider" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242"
            [value]="number()" (input)="setNumber($any($event.target))" [attr.aria-invalid]="touched() && !numberOk()" />
          @if (touched() && !numberOk()) { <span class="mt-1 block text-sm text-blood">Revisa el número: deben ser 16 dígitos válidos.</span> }
        </label>
        <label class="col-span-2">
          <span class="field-label">Nombre en la tarjeta</span>
          <input class="field" autocomplete="cc-name" [value]="holder()" (input)="holder.set($any($event.target).value)" />
          @if (touched() && !holderOk()) { <span class="mt-1 block text-sm text-blood">Escribe el nombre como aparece en la tarjeta.</span> }
        </label>
        <label>
          <span class="field-label">Vencimiento</span>
          <input class="field" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" [value]="exp()" (input)="setExp($any($event.target))" />
          @if (touched() && !expOk()) { <span class="mt-1 block text-sm text-blood">Fecha vencida o incompleta.</span> }
        </label>
        <label>
          <span class="field-label">CVV</span>
          <input class="field" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123" [value]="cvv()" (input)="cvv.set($any($event.target).value.replace(/\\D/g, ''))" />
          @if (touched() && !cvvOk()) { <span class="mt-1 block text-sm text-blood">3 o 4 dígitos.</span> }
        </label>
        <p class="col-span-2 text-xs text-ash">Pago de prueba: 4242 4242 4242 4242 se aprueba y 4000 0000 0000 0002 se rechaza. No se cobra nada.</p>
        <button type="submit" class="tape col-span-2 tape-lg" [disabled]="busy()">
          @if (busy()) { Procesando pago… } @else { Pagar {{ money(amount()) }} }
        </button>
      </form>
    } @else if (provider()) {
      <p class="mt-5 text-sm text-bone/70">
        Te llevaremos a {{ label() }} para pagar de forma segura. Tu cupo queda guardado 15 minutos mientras completas el pago.
      </p>
      <button type="button" class="tape mt-5 w-full tape-lg" [disabled]="busy()" (click)="paid.emit({ provider: provider() })">
        @if (busy()) { Conectando… } @else { Pagar {{ money(amount()) }} con {{ label() }} }
      </button>
    } @else if (payments.ready()) {
      <p class="mt-4 rounded-[var(--radius-field)] border border-steel p-4 text-sm text-bone/75">Los pagos en línea no están disponibles por ahora. Escríbenos o paga en recepción.</p>
    } @else {
      <p class="mt-4 text-sm text-ash">Cargando medios de pago…</p>
    }
  `,
})
export class PaymentForm {
  protected readonly payments = inject(PaymentService);
  readonly amount = input.required<number>();
  readonly busy = input(false);
  readonly paid = output<PayRequest>();

  protected readonly money = money;
  protected readonly provider = linkedSignal(() => this.payments.providers()[0]?.name ?? '');
  protected readonly label = computed(() => this.payments.providers().find((p) => p.name === this.provider())?.label ?? '');

  protected readonly number = signal('');
  protected readonly holder = signal('');
  protected readonly exp = signal('');
  protected readonly cvv = signal('');
  protected readonly touched = signal(false);

  private readonly digits = computed(() => this.number().replace(/\D/g, ''));
  protected readonly numberOk = computed(() => this.digits().length === 16 && luhn(this.digits()));
  protected readonly holderOk = computed(() => this.holder().trim().length >= 3);
  protected readonly cvvOk = computed(() => /^\d{3,4}$/.test(this.cvv()));
  protected readonly expOk = computed(() => {
    const m = /^(\d{2})\/(\d{2})$/.exec(this.exp());
    if (!m) return false;
    const month = Number(m[1]);
    return month >= 1 && month <= 12 && new Date(2000 + Number(m[2]), month, 0, 23, 59).getTime() > Date.now();
  });

  constructor() {
    void this.payments.loadProviders();
  }

  protected setNumber(el: HTMLInputElement) {
    const v = el.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
    this.number.set(v);
    el.value = v;
  }

  protected setExp(el: HTMLInputElement) {
    const d = el.value.replace(/\D/g, '').slice(0, 4);
    const v = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    this.exp.set(v);
    el.value = v;
  }

  protected submitCard() {
    this.touched.set(true);
    if (!(this.numberOk() && this.holderOk() && this.expOk() && this.cvvOk())) return;
    this.paid.emit({ provider: 'fake', cardNumber: this.digits() });
  }
}
