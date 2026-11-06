import { computed, inject, Injectable, signal } from '@angular/core';
import { ConfigService } from '../config/app-config';
import { Api } from '../api/api.service';
import { Checkout, Contact, Order, Provider } from '../models';

/** Starts checkouts and follows the provider's next step (in-app card, redirect or form post). */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(Api);
  private readonly cfg = inject(ConfigService).value.pagos;
  private readonly all = signal<Provider[]>([]);
  /** Providers the API offers AND config.json leaves on (pagos.simulado / webpay / mercadopago). */
  readonly providers = computed(() =>
    this.all().filter((p) => (p.name === 'fake' ? this.cfg.simulado : (this.cfg as Record<string, boolean>)[p.name] ?? true)),
  );
  readonly ready = signal(false);
  private loaded: Promise<void> | null = null;

  loadProviders() {
    this.loaded ??= this.api.get<Provider[]>('/payments/providers').then((p) => {
      this.all.set(p);
      this.ready.set(true);
    });
    return this.loaded;
  }

  checkoutClass(sessionId: number, contact: Contact, provider: string) {
    return this.api.post<Checkout>('/checkout/class', { sessionId, ...contact, provider });
  }

  checkoutPlan(planId: number, provider: string) {
    return this.api.post<Checkout>('/checkout/plan', { planId, provider });
  }

  confirmFake(orderId: number, token: string, cardNumber: string) {
    return this.api.post<Order>(`/payments/fake/${orderId}/confirm`, { token, cardNumber });
  }

  order(id: number, token?: string) {
    return this.api.get<Order>(`/orders/${id}`, { token });
  }

  /** Leaves the app to pay at Webpay or Mercado Pago. Returns false for in-app (fake) payments. */
  follow(c: Checkout): boolean {
    const a = c.action;
    if (a.kind === 'redirect' && a.url) {
      location.assign(a.url);
      return true;
    }
    if (a.kind === 'form_post' && a.url) {
      const form = Object.assign(document.createElement('form'), { method: 'POST', action: a.url });
      for (const [name, value] of Object.entries(a.fields ?? {})) {
        form.appendChild(Object.assign(document.createElement('input'), { type: 'hidden', name, value }));
      }
      document.body.appendChild(form);
      form.submit();
      return true;
    }
    return false;
  }
}
