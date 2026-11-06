import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '../core/services/booking.store';
import { CatalogStore } from '../core/services/catalog.store';
import { Plan } from '../core/models';
import { money } from '../core/utils/date';
import { Icon } from './ui/icon';
import { ConfigService } from '../core/config/app-config';

/**
 * Pricing table. Store pattern: unit price per class so plans compare at a glance,
 * the featured plan is visually raised, guarantees sit right under the prices.
 */
@Component({
  selector: 'bs-plan-list',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!catalog.loaded()) {
      <div class="grid gap-4 lg:grid-cols-3" aria-busy="true">
        @for (i of [1, 2, 3]; track i) { <div class="h-[26rem] animate-pulse rounded-[var(--radius-card)] bg-iron"></div> }
      </div>
    }
    <ul class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
      @for (p of plans(); track p.id) {
        <li
          class="relative flex flex-col rounded-[var(--radius-card)] p-6"
          [class]="p.featured ? 'border-2 border-blood-fill bg-iron-2 shadow-[0_24px_60px_-24px_rgba(225,29,42,0.55)] md:col-span-2 lg:col-span-1 lg:-my-3 lg:py-9' : 'border border-steel bg-iron'"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-xl font-bold">{{ p.name }}</h3>
            @if (p.featured) {
              <span class="rounded-full bg-blood-fill px-3 py-1 text-xs font-bold text-sand">Más elegido</span>
            } @else if (store.membership()?.planId === p.id) {
              <span class="rounded-full border border-lime px-3 py-1 text-xs font-bold text-lime">Tu plan</span>
            }
          </div>

          <p class="mt-4 flex items-baseline gap-1.5">
            <span class="type-display text-5xl">{{ money(p.price) }}</span>
            <span class="text-sm text-ash">{{ period(p) }}</span>
          </p>
          <p class="mt-1 text-sm font-semibold text-lime">{{ unit(p) }}</p>

          <ul class="mt-6 flex-1 space-y-2.5 text-[0.95rem]">
            @for (perk of p.perks; track perk) {
              <li class="flex gap-2.5">
                <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full" [class]="p.featured ? 'bg-blood-fill text-sand' : 'bg-iron-2 text-lime'">
                  <bs-icon name="check" [size]="13" />
                </span>
                {{ perk }}
              </li>
            }
          </ul>

          @if (store.membership()?.planId === p.id) {
            <a routerLink="/reservar" class="tape-ghost mt-7 w-full">Reservar con mi plan</a>
          } @else if (!p.sellable || !cfg.planes.comprar) {
            @if (cfg.reservas.activo) {
              <a routerLink="/reservar" class="tape-ghost mt-7 w-full">Reservar una clase</a>
            }
          } @else {
            <a [routerLink]="['/planes', p.slug, 'pago']" class="mt-7 w-full" [class]="p.featured ? 'tape tape-lg' : 'tape-ghost'">Elegir {{ p.name }}</a>
          }
        </li>
      }
    </ul>

    @if (catalog.loaded()) {
      <ul class="mt-8 grid gap-3 text-sm text-bone/75 sm:grid-cols-3">
        <li class="flex items-center gap-2.5"><bs-icon name="check" [size]="18" class="text-lime" /> Sin matrícula ni contrato de permanencia</li>
        <li class="flex items-center gap-2.5"><bs-icon name="check" [size]="18" class="text-lime" /> Primera clase y evaluación gratis</li>
        <li class="flex items-center gap-2.5"><bs-icon name="check" [size]="18" class="text-lime" /> Paga con Webpay o Mercado Pago</li>
      </ul>
    }
  `,
})
export class PlanList {
  protected readonly store = inject(BookingStore);
  protected readonly catalog = inject(CatalogStore);
  protected readonly cfg = inject(ConfigService).value;
  protected readonly money = money;

  /** Drop-in first, then by price, so the ladder reads left to right. */
  protected readonly plans = computed(() =>
    [...this.catalog.plans()].sort((a, b) => Number(a.sellable) - Number(b.sellable) || a.sort - b.sort),
  );

  protected period(p: Plan) {
    if (!p.sellable) return 'por clase';
    return p.periodDays === 30 ? 'al mes' : `por ${p.periodDays} días`;
  }

  protected unit(p: Plan) {
    if (!p.sellable) return 'Pagas solo cuando vienes';
    if (p.credits === null) return '3 veces por semana: ' + money(Math.round(p.price / 12)) + ' por clase';
    return money(Math.round(p.price / p.credits)) + ' por clase';
  }
}
