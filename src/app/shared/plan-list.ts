import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '../core/services/booking.store';
import { CatalogStore } from '../core/services/catalog.store';
import { money } from '../core/utils/date';
import { Icon } from './ui/icon';

/** Plans as a price ladder; the featured plan is the poster, the rest stay quiet. */
@Component({
  selector: 'bs-plan-list',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!catalog.loaded()) {
      <div class="grid gap-4 lg:grid-cols-3" aria-busy="true">
        @for (i of [1, 2, 3]; track i) { <div class="h-96 animate-pulse bg-iron"></div> }
      </div>
    }
    <ul class="grid gap-4 lg:grid-cols-3 lg:items-stretch">
      @for (p of catalog.plans(); track p.id) {
        <li class="relative flex flex-col p-6 md:p-7" [class]="p.featured ? 'bg-lime text-ink lg:-my-4 lg:py-10' : 'border border-steel bg-iron'">
          @if (p.featured) {
            <span class="absolute -top-3 left-6 bg-ink px-3 py-1 font-punch text-sm font-bold text-lime italic">El más elegido</span>
          }
          <h3 class="type-display text-4xl">{{ p.name }}</h3>
          <p class="mt-3 flex items-baseline gap-2">
            <span class="font-punch text-5xl font-extrabold italic">{{ money(p.price) }}</span>
            <span [class]="p.featured ? 'text-ink/70' : 'text-ash'">{{ p.sellable ? (p.periodDays === 30 ? 'al mes' : p.periodDays + ' días') : 'por clase' }}</span>
          </p>
          <ul class="mt-5 flex-1 space-y-2">
            @for (perk of p.perks; track perk) {
              <li class="flex gap-2">
                <bs-icon name="check" [size]="18" [class]="p.featured ? 'mt-1 text-ink' : 'mt-1 text-lime'" />
                {{ perk }}
              </li>
            }
          </ul>
          @if (store.membership()?.planId === p.id) {
            <p class="mt-6 border-2 px-4 py-2 text-center font-semibold" [class]="p.featured ? 'border-ink' : 'border-lime text-lime'">Es tu plan actual</p>
          } @else if (!p.sellable) {
            <a routerLink="/reservar" class="tape-ghost mt-6">Reservar una clase</a>
          } @else {
            <a
              [routerLink]="['/planes', p.slug, 'pago']"
              class="mt-6"
              [class]="p.featured ? 'inline-flex items-center justify-center bg-ink px-5 py-3 font-punch text-xl font-extrabold text-lime italic uppercase hover:bg-iron' : 'tape'"
              >Contratar {{ p.name }}</a
            >
          }
        </li>
      }
    </ul>
  `,
})
export class PlanList {
  protected readonly store = inject(BookingStore);
  protected readonly catalog = inject(CatalogStore);
  protected readonly money = money;
}
