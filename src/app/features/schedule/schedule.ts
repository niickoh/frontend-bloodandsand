import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '../../core/services/booking.store';
import { CatalogStore } from '../../core/services/catalog.store';
import { isoWeekday, toIso } from '../../core/utils/date';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TONES = ['border-l-lime', 'border-l-bone', 'border-l-pink', 'border-l-ash'];

@Component({
  selector: 'bs-schedule',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-7xl px-4 pt-8 pb-28 md:px-6 md:pt-12">
      <h1 class="page-title">
        <span class="type-display block">Horario</span>
        <span class="type-outline block">de clases</span>
      </h1>
      <p class="mt-4 max-w-[52ch] text-bone/75">Toca una clase para reservarla en su próxima fecha. Puedes reservar hasta 14 días antes.</p>

      <div class="mt-8 flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrar por disciplina">
        @for (f of filters(); track f.id) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="filter() === f.id"
            (click)="filter.set(f.id)"
            class="chip"
            [class]="filter() === f.id ? 'border-lime bg-lime text-ink' : 'border-steel text-bone/80 hover:border-ash'"
          >
            {{ f.label }}
          </button>
        }
      </div>

      <div class="scrollbar-none -mx-4 mt-8 flex gap-1 overflow-x-auto px-4 md:hidden" role="tablist" aria-label="Día de la semana">
        @for (col of columns(); track col.weekday) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="day() === col.weekday"
            (click)="day.set(col.weekday)"
            class="shrink-0 px-3 py-2 font-punch text-lg font-bold italic uppercase"
            [class]="day() === col.weekday ? 'bg-lime text-ink' : 'text-bone/60'"
          >
            {{ col.name.slice(0, 3) }}
          </button>
        }
      </div>

      @if (!catalog.timetable().length) {
        <div class="mt-10 grid gap-3 md:grid-cols-3 lg:grid-cols-6" aria-busy="true">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="h-64 animate-pulse rounded-[var(--radius-card)] bg-iron"></div> }
        </div>
      }
      <div class="mt-4 grid gap-6 md:mt-10 md:grid-cols-3 lg:gap-3" [class]="columns().length > 6 ? 'lg:grid-cols-7' : 'lg:grid-cols-6'">
        @for (col of columns(); track col.weekday) {
          <div [class]="col.weekday === day() ? 'block' : 'hidden md:block'">
            <h2 class="hidden border-b-2 border-steel pb-2 font-punch text-2xl font-extrabold italic md:block" [class.!border-lime]="col.isToday">
              {{ col.name }} @if (col.isToday) { <span class="text-sm font-bold text-lime">hoy</span> }
            </h2>
            <ul class="mt-3 space-y-2">
              @for (c of col.items; track c.id) {
                <li>
                  <a
                    routerLink="/reservar"
                    [queryParams]="{ d: slugOf(c.disciplineId), fecha: col.date }"
                    class="block rounded-xl border-l-4 bg-iron px-3 py-2.5 transition-colors hover:bg-iron-2"
                    [class]="tone(c.disciplineId)"
                  >
                    <span class="type-display block text-2xl">{{ c.startTime }}</span>
                    <span class="block font-semibold">{{ c.discipline }}</span>
                    <span class="block text-sm text-ash">{{ c.coachName ?? 'Coach por confirmar' }}</span>
                  </a>
                </li>
              } @empty {
                <li class="text-sm text-ash">Sin clases de esta disciplina.</li>
              }
            </ul>
          </div>
        }
      </div>
      @if (columns().length < 7) { <p class="mt-10 text-sm text-ash">Domingo y festivos cerrado.</p> }
    </section>
  `,
})
export default class Schedule implements OnInit {
  private readonly store = inject(BookingStore);
  protected readonly catalog = inject(CatalogStore);
  protected readonly filters = computed(() => [{ id: 'todas', label: 'Todas' }, ...this.catalog.disciplines().map((d) => ({ id: d.slug, label: d.name }))]);
  protected readonly filter = signal('todas');
  protected readonly day = signal(isoWeekday(new Date()));

  ngOnInit() {
    void this.catalog.loadTimetable();
  }

  protected slugOf = (id: number) => this.catalog.disciplines().find((d) => d.id === id)?.slug ?? 'todas';
  protected tone = (id: number) => TONES[Math.max(0, this.catalog.disciplines().findIndex((d) => d.id === id)) % TONES.length];

  protected readonly columns = computed(() => {
    const f = this.filter();
    const today = isoWeekday(new Date());
    const tpl = this.catalog.timetable();
    const hasSunday = tpl.some((t) => t.weekday === 7);
    return WEEKDAYS.slice(0, hasSunday ? 7 : 6).map((name, i) => {
      const weekday = i + 1;
      const next = this.store.days().find((d) => isoWeekday(d) === weekday)!;
      return {
        name,
        weekday,
        isToday: weekday === today,
        date: toIso(next),
        items: tpl.filter((t) => t.weekday === weekday && (f === 'todas' || this.slugOf(t.disciplineId) === f)),
      };
    });
  });
}
