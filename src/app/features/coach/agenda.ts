import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Session } from '../../core/models';
import { addDays, longDate, toIso } from '../../core/utils/date';
import { Icon } from '../../shared/ui/icon';
import { PlateMeter } from '../../shared/ui/plate-meter';
import { Status } from '../../shared/ui/status';
import { StaffApi } from '../staff/staff-api';

/** Coach home: their classes week by week, as set up by the admin. */
@Component({
  selector: 'bs-coach-agenda',
  imports: [RouterLink, Icon, PlateMeter, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-5xl px-4 pt-8 pb-28 md:px-6 md:pt-12">
      <h1 class="page-title">
        <span class="type-display block">Mis</span>
        <span class="type-outline block">clases</span>
      </h1>
      <p class="mt-3 text-bone/70">Hola, {{ auth.firstName() }}. Toca una clase para ver quién viene, marcar asistencia o mover reservas.</p>

      <div class="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-card)] bg-steel text-center">
        <div class="bg-iron p-4"><p class="type-display text-4xl">{{ todayCount() }}</p><p class="text-xs text-ash">clases hoy</p></div>
        <div class="bg-iron p-4"><p class="type-display text-4xl">{{ weekCount() }}</p><p class="text-xs text-ash">esta semana</p></div>
        <div class="bg-iron p-4"><p class="type-display text-4xl">{{ weekPeople() }}</p><p class="text-xs text-ash">reservas esta semana</p></div>
      </div>

      <div class="mt-10 flex items-center justify-between gap-3">
        <button type="button" class="grid size-11 place-items-center rounded-full border border-steel hover:border-ash" (click)="shift(-7)" aria-label="Semana anterior"><bs-icon name="chevron-left" /></button>
        <p class="font-punch text-xl font-extrabold italic">{{ rangeLabel() }}</p>
        <button type="button" class="grid size-11 place-items-center rounded-full border border-steel hover:border-ash" (click)="shift(7)" aria-label="Semana siguiente"><bs-icon name="chevron-right" /></button>
      </div>

      @if (error()) {
        <p class="mt-6 rounded-[var(--radius-field)] border-l-4 border-blood bg-blood/10 p-4">{{ error() }}</p>
      } @else if (loading()) {
        <div class="mt-6 h-64 animate-pulse rounded-[var(--radius-card)] bg-iron"></div>
      } @else if (!groups().length) {
        <div class="mt-6 rounded-[var(--radius-card)] border border-dashed border-steel p-6 text-bone/70">No tienes clases asignadas esta semana. El admin las asigna desde el horario.</div>
      } @else {
        @for (g of groups(); track g.date) {
          <h2 class="mt-8 mb-2 font-semibold" [class.text-lime]="g.date === today">{{ g.date === today ? 'Hoy · ' : '' }}{{ longDate(g.date) }}</h2>
          <ul class="divide-y divide-steel border-y border-steel">
            @for (s of g.items; track s.id) {
              <li>
                <a [routerLink]="['/coach/clase', s.id]" class="grid grid-cols-[5rem_1fr_auto] items-center gap-3 py-3 hover:bg-iron" [class.opacity-50]="s.status === 'cancelled' || past(s)">
                  <span class="type-display pl-2 text-3xl">{{ s.start }}</span>
                  <span>
                    <span class="block font-punch text-xl font-extrabold italic">{{ s.discipline }}</span>
                    @if (s.status === 'cancelled') { <bs-status value="cancelled" /> } @else { <bs-plate-meter [taken]="s.taken" [capacity]="s.capacity" /> }
                  </span>
                  <bs-icon name="chevron-right" class="pr-2 text-ash" />
                </a>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
})
export default class CoachAgenda {
  private readonly staff = inject(StaffApi);
  protected readonly auth = inject(AuthService);
  protected readonly longDate = longDate;
  protected readonly today = toIso(new Date());

  protected readonly start = signal(this.monday(new Date()));
  protected readonly sessions = signal<Session[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly groups = computed(() => {
    const map = new Map<string, Session[]>();
    for (const s of this.sessions()) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return [...map.entries()].map(([date, items]) => ({ date, items }));
  });
  protected readonly todayCount = computed(() => this.sessions().filter((s) => s.date === this.today && s.status === 'scheduled').length);
  protected readonly weekCount = computed(() => this.sessions().filter((s) => s.status === 'scheduled').length);
  protected readonly weekPeople = computed(() => this.sessions().reduce((n, s) => n + (s.status === 'scheduled' ? s.taken : 0), 0));
  protected readonly rangeLabel = computed(() => {
    const a = this.start();
    const b = addDays(a, 6);
    const f = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    return `${f(a)} – ${f(b)}`;
  });

  constructor() {
    effect(() => void this.load(this.start()));
  }

  private monday(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return addDays(x, -((x.getDay() + 6) % 7));
  }

  protected shift(days: number) {
    this.start.update((d) => addDays(d, days));
  }

  protected past = (s: Session) => new Date(s.endsAt).getTime() < Date.now();

  private async load(from: Date) {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.sessions.set(await this.staff.mySessions(toIso(from), toIso(addDays(from, 6))));
    } catch (e) {
      this.error.set(toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }
}
