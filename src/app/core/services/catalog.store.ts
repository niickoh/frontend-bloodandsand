import { computed, inject, Injectable, signal } from '@angular/core';
import { Api } from '../api/api.service';
import { Discipline, Plan, Template } from '../models';

/** Disciplines, plans and weekly timetable. Loaded once and shared. */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly api = inject(Api);

  readonly disciplines = signal<Discipline[]>([]);
  readonly plans = signal<Plan[]>([]);
  readonly timetable = signal<Template[]>([]);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly sellablePlans = computed(() => this.plans().filter((p) => p.sellable));
  readonly dropIn = computed(() => this.plans().find((p) => !p.sellable) ?? null);

  private loading: Promise<void> | null = null;

  load(force = false): Promise<void> {
    if (this.loading && !force) return this.loading;
    this.loading = this.api
      .get<{ disciplines: Discipline[]; plans: Plan[] }>('/catalog')
      .then((c) => {
        this.disciplines.set(c.disciplines);
        this.plans.set(c.plans);
        this.loaded.set(true);
        this.error.set(null);
      })
      .catch((e) => {
        this.error.set(e.message);
        this.loading = null;
      });
    return this.loading;
  }

  async loadTimetable() {
    this.timetable.set(await this.api.get<Template[]>('/timetable'));
  }

  discipline(slug: string) {
    return this.disciplines().find((d) => d.slug === slug) ?? null;
  }

  plan(slug: string) {
    return this.plans().find((p) => p.slug === slug) ?? null;
  }
}
