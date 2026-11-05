import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { BookingStore } from '../../core/services/booking.store';
import { monthName, toIso, weekdayShort } from '../../core/utils/date';

/** Two-week calendar: a swipeable strip on phones, a 7-column grid from tablet up. */
@Component({
  selector: 'bs-day-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-3 flex items-baseline justify-between">
      <p class="font-punch text-2xl font-extrabold italic capitalize">{{ month() }}</p>
      <p class="flex items-center gap-3 text-xs text-ash">
        <span class="flex items-center gap-1"><span class="size-2 bg-lime"></span>Cupos</span>
        <span class="flex items-center gap-1"><span class="size-2 bg-pink"></span>Últimos</span>
      </p>
    </div>
    <div role="listbox" aria-label="Elige el día" class="scrollbar-none -mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0">
      @for (d of days(); track d.iso) {
        <button
          type="button"
          role="option"
          [attr.aria-selected]="d.iso === selected()"
          [attr.aria-label]="d.label"
          [disabled]="d.state === 'nada'"
          (click)="selected.set(d.iso)"
          class="flex w-14 shrink-0 snap-start flex-col items-center gap-1 border-2 py-2.5 transition-colors md:w-auto"
          [class]="
            d.iso === selected()
              ? 'border-lime bg-lime text-ink'
              : d.state === 'nada'
                ? 'border-transparent text-bone/25'
                : 'border-steel text-bone hover:border-ash'
          "
        >
          <span class="text-xs font-semibold capitalize">{{ d.today ? 'Hoy' : d.wd }}</span>
          <span class="font-display text-2xl leading-none">{{ d.day }}</span>
          <span class="size-1.5" [class]="d.iso === selected() ? 'bg-ink' : d.state === 'libre' ? 'bg-lime' : d.state === 'pocos' ? 'bg-pink' : 'bg-transparent'"></span>
        </button>
      }
    </div>
  `,
})
export class DayStrip {
  private readonly store = inject(BookingStore);
  readonly filter = input('todas');
  readonly selected = model.required<string>();

  protected readonly days = computed(() => {
    const today = toIso(new Date());
    const f = this.filter();
    this.store.sessions(); // refresh when availability changes
    return this.store.days().map((date) => {
      const iso = toIso(date);
      return {
        iso,
        day: date.getDate(),
        wd: weekdayShort(date),
        today: iso === today,
        state: this.store.availability(iso, f),
        label: date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }),
      };
    });
  });

  protected readonly month = computed(() => monthName(new Date(this.selected() + 'T00:00:00')));
}
