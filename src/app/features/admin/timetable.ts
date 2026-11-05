import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import { CatalogStore } from '../../core/services/catalog.store';
import { ToastService } from '../../core/services/toast.service';
import { Template, User } from '../../core/models';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Modal } from '../../shared/ui/modal';
import { AdminApi, TemplateInput } from './admin-api';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

@Component({
  selector: 'bs-admin-timetable',
  imports: [FormsModule, Icon, Modal, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="type-display text-[clamp(2.5rem,8vw,4.5rem)]">Horario semanal</h1>
      <div class="flex gap-2">
        <button type="button" class="tape-ghost !text-lg" (click)="regenerate()" [disabled]="busy()">Generar clases</button>
        <button type="button" class="tape !text-lg" (click)="openCreate(1)"><bs-icon name="plus" /> Agregar</button>
      </div>
    </div>
    <p class="mt-2 max-w-[62ch] text-sm text-bone/70">
      Cada bloque se repite todas las semanas. El sistema crea las clases de los próximos días automáticamente; los coaches ven aquí lo que les asignes.
    </p>

    <div class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      @for (day of week(); track day.weekday) {
        <section>
          <h2 class="flex items-center justify-between border-b-2 border-steel pb-2 font-punch text-2xl font-extrabold italic">
            {{ day.name }}
            <button type="button" class="p-1 text-ash hover:text-lime" (click)="openCreate(day.weekday)" [attr.aria-label]="'Agregar clase el ' + day.name"><bs-icon name="plus" [size]="18" /></button>
          </h2>
          <ul class="mt-2 space-y-1.5">
            @for (t of day.items; track t.id) {
              <li>
                <button type="button" class="grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-2 bg-iron px-3 py-2 text-left hover:bg-steel" [class.opacity-50]="!t.active" (click)="openEdit(t)">
                  <span class="type-display text-xl">{{ t.startTime }}</span>
                  <span class="min-w-0">
                    <span class="block truncate font-semibold">{{ t.discipline }}</span>
                    <span class="block truncate text-xs" [class]="t.coachName ? 'text-ash' : 'text-pink'">{{ t.coachName ?? 'Sin coach' }}</span>
                  </span>
                  <span class="text-xs text-ash">{{ t.capacity }} cupos{{ t.active ? '' : ' · pausada' }}</span>
                </button>
              </li>
            } @empty {
              <li class="py-2 text-sm text-ash">Sin clases.</li>
            }
          </ul>
        </section>
      }
    </div>

    <bs-modal [title]="editing() ? 'Editar bloque' : 'Nuevo bloque semanal'" [open]="open()" (closed)="open.set(false)">
      <form class="grid grid-cols-2 gap-4" (ngSubmit)="save()" novalidate>
        <label class="col-span-2">
          <span class="field-label">Disciplina</span>
          <select class="field" name="disc" [(ngModel)]="draft.disciplineId">
            @for (d of catalog.disciplines(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }
          </select>
          <bs-field-error [error]="form.error('disciplineId')" />
        </label>
        <label>
          <span class="field-label">Día</span>
          <select class="field" name="wd" [(ngModel)]="draft.weekday">
            @for (n of days; track n; let i = $index) { <option [ngValue]="i + 1">{{ n }}</option> }
          </select>
        </label>
        <label><span class="field-label">Hora</span><input class="field" type="time" name="time" [(ngModel)]="draft.startTime" /><bs-field-error [error]="form.error('startTime')" /></label>
        <label>
          <span class="field-label">Coach</span>
          <select class="field" name="coach" [(ngModel)]="draft.coachId">
            <option [ngValue]="null">Sin asignar</option>
            @for (c of coaches(); track c.id) { <option [ngValue]="c.id">{{ c.fullName }}</option> }
          </select>
          <bs-field-error [error]="form.error('coachId')" />
        </label>
        <label><span class="field-label">Cupos</span><input class="field" type="number" min="1" name="cap" [(ngModel)]="draft.capacity" /><bs-field-error [error]="form.error('capacity')" /></label>
        <label class="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="active" [(ngModel)]="draft.active" class="size-4 accent-lime" /> Activa (si la pausas, no se generan nuevas clases)</label>
        @if (editing()) { <p class="col-span-2 text-xs text-ash">Los cambios se aplican a las próximas clases. Si cambias día u hora, las clases que ya tienen reservas se mantienen en su horario original.</p> }
        <div class="col-span-2"><bs-form-message [message]="form.message()" /></div>
        <div class="col-span-2 flex items-center justify-between gap-3">
          @if (editing()) {
            <button type="button" class="inline-flex items-center gap-1.5 text-sm text-blood underline" (click)="remove()"><bs-icon name="trash" [size]="16" /> Eliminar bloque</button>
          } @else { <span></span> }
          <button type="submit" class="tape" [disabled]="form.busy()">Guardar</button>
        </div>
      </form>
    </bs-modal>
  `,
})
export default class AdminTimetable implements OnInit {
  private readonly admin = inject(AdminApi);
  protected readonly catalog = inject(CatalogStore);
  private readonly toast = inject(ToastService);
  protected readonly days = DAYS;

  protected readonly templates = signal<Template[]>([]);
  protected readonly coaches = signal<User[]>([]);
  protected readonly open = signal(false);
  protected readonly busy = signal(false);
  protected readonly editing = signal<Template | null>(null);
  protected readonly form = new FormState();
  protected draft: TemplateInput = { disciplineId: 0, coachId: null, weekday: 1, startTime: '18:00', capacity: 12, active: true };

  protected readonly week = computed(() => DAYS.map((name, i) => ({ name, weekday: i + 1, items: this.templates().filter((t) => t.weekday === i + 1) })));

  ngOnInit() {
    void this.load();
    void this.admin.coaches().then((c) => this.coaches.set(c));
  }

  private async load() {
    this.templates.set(await this.admin.templates());
  }

  protected openCreate(weekday: number) {
    this.editing.set(null);
    this.form.reset();
    this.draft = { disciplineId: this.catalog.disciplines()[0]?.id ?? 0, coachId: null, weekday, startTime: '18:00', capacity: 12, active: true };
    this.open.set(true);
  }

  protected openEdit(t: Template) {
    this.editing.set(t);
    this.form.reset();
    this.draft = { disciplineId: t.disciplineId, coachId: t.coachId, weekday: t.weekday, startTime: t.startTime, capacity: t.capacity, active: t.active };
    this.open.set(true);
  }

  protected async save() {
    const t = this.editing();
    const r = await this.form.run<unknown>(() => (t ? this.admin.updateTemplate(t.id, this.draft) : this.admin.createTemplate(this.draft)));
    if (!r) return;
    this.open.set(false);
    const kept = (r as { keptWithBookings?: number }).keptWithBookings ?? 0;
    this.toast.ok(t ? 'Horario actualizado' : 'Bloque agregado', kept ? `${kept} clases con reservas se mantienen en su horario anterior.` : 'Las próximas clases ya están generadas.');
    void this.load();
  }

  protected async remove() {
    const t = this.editing();
    if (!t || !confirm(`¿Eliminar ${t.discipline} de los ${DAYS[t.weekday - 1].toLowerCase()} a las ${t.startTime}?`)) return;
    try {
      const r = await this.admin.deleteTemplate(t.id);
      this.open.set(false);
      this.toast.ok('Bloque eliminado', r.keptWithBookings ? `${r.keptWithBookings} clases con reservas se mantienen; cancélalas desde Clases si corresponde.` : undefined);
      void this.load();
    } catch (e) {
      this.toast.error('No se pudo eliminar', toApiError(e).message);
    }
  }

  protected async regenerate() {
    this.busy.set(true);
    try {
      const r = await this.admin.generate();
      this.toast.ok('Clases al día', r.created ? `Se crearon ${r.created} clases nuevas.` : 'No faltaba ninguna clase.');
    } finally {
      this.busy.set(false);
    }
  }
}
