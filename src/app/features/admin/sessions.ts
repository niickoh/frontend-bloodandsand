import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { CatalogStore } from '../../core/services/catalog.store';
import { ToastService } from '../../core/services/toast.service';
import { Session, User } from '../../core/models';
import { addDays, fromIso, longDate, toIso } from '../../core/utils/date';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Modal } from '../../shared/ui/modal';
import { PlateMeter } from '../../shared/ui/plate-meter';
import { Status } from '../../shared/ui/status';
import { AdminApi } from './admin-api';

@Component({
  selector: 'bs-admin-sessions',
  imports: [FormsModule, RouterLink, Icon, Modal, PlateMeter, Status, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="type-display text-[clamp(2.5rem,8vw,4.5rem)]">Clases</h1>
      <button type="button" class="tape !text-lg" (click)="openCreate()"><bs-icon name="plus" /> Clase puntual</button>
    </div>
    <p class="mt-2 max-w-[60ch] text-sm text-bone/70">Las clases se generan solas desde el horario semanal. Aquí editas una clase concreta (coach, hora, cupos) o la cancelas avisando a los inscritos.</p>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" class="border-2 border-steel p-2 hover:border-ash" (click)="shift(-1)" aria-label="Día anterior"><bs-icon name="chevron-left" /></button>
      <input type="date" class="field !w-auto" [value]="date()" (change)="date.set($any($event.target).value)" aria-label="Fecha" />
      <button type="button" class="border-2 border-steel p-2 hover:border-ash" (click)="shift(1)" aria-label="Día siguiente"><bs-icon name="chevron-right" /></button>
      <button type="button" class="text-sm text-lime underline underline-offset-4" (click)="date.set(today)">Hoy</button>
      <select class="field !w-auto" [ngModel]="coach()" (ngModelChange)="coach.set(+$event)" aria-label="Filtrar por coach">
        <option [ngValue]="0">Todos los coaches</option>
        @for (c of coaches(); track c.id) { <option [ngValue]="c.id">{{ c.fullName }}</option> }
      </select>
    </div>
    <h2 class="mt-6 mb-2 font-semibold">{{ longDate(date()) }}</h2>

    @if (loading()) {
      <div class="h-48 animate-pulse bg-iron"></div>
    } @else {
      <ul class="divide-y divide-steel border-y border-steel">
        @for (s of sessions(); track s.id) {
          <li class="grid grid-cols-[4.5rem_1fr] items-center gap-3 py-3 sm:grid-cols-[4.5rem_1fr_auto_auto]" [class.opacity-55]="s.status === 'cancelled'">
            <span class="type-display pl-2 text-3xl">{{ s.start }}</span>
            <a [routerLink]="['/admin/clases', s.id]" class="min-w-0 hover:text-lime">
              <span class="block font-punch text-xl font-extrabold italic">{{ s.discipline }}</span>
              <span class="block truncate text-sm text-ash">{{ s.coachName ?? 'Sin coach' }} · hasta {{ s.end }}{{ s.templateId ? '' : ' · puntual' }}</span>
            </a>
            <span class="col-start-2 sm:col-start-auto">
              @if (s.status === 'cancelled') { <bs-status value="cancelled" /> } @else { <bs-plate-meter [taken]="s.taken" [capacity]="s.capacity" /> }
            </span>
            <span class="col-start-2 flex gap-1.5 sm:col-start-auto">
              <a [routerLink]="['/admin/clases', s.id]" class="border-2 border-steel px-3 py-1.5 text-sm font-semibold hover:border-ash">Inscritos</a>
              @if (s.status === 'scheduled') {
                <button type="button" class="border-2 border-steel p-1.5 hover:border-ash" (click)="openEdit(s)" [attr.aria-label]="'Editar ' + s.discipline + ' ' + s.start"><bs-icon name="edit" [size]="18" /></button>
                <button type="button" class="border-2 border-steel p-1.5 hover:border-blood hover:text-blood" (click)="openCancel(s)" [attr.aria-label]="'Cancelar ' + s.discipline + ' ' + s.start"><bs-icon name="x" [size]="18" /></button>
              }
            </span>
          </li>
        } @empty {
          <li class="py-6 text-bone/70">No hay clases este día.</li>
        }
      </ul>
    }

    <bs-modal [title]="editing() ? 'Editar clase' : 'Nueva clase puntual'" [open]="modal() === 'form'" (closed)="modal.set(null)">
      <form class="grid grid-cols-2 gap-4" (ngSubmit)="save()" novalidate>
        @if (!editing()) {
          <label class="col-span-2">
            <span class="field-label">Disciplina</span>
            <select class="field" name="disc" [(ngModel)]="draft.disciplineId">
              @for (d of catalog.disciplines(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }
            </select>
            <bs-field-error [error]="form.error('disciplineId')" />
          </label>
        }
        <label><span class="field-label">Fecha</span><input class="field" type="date" name="date" [(ngModel)]="draft.date" /><bs-field-error [error]="form.error('date')" /></label>
        <label><span class="field-label">Hora</span><input class="field" type="time" name="start" [(ngModel)]="draft.start" /></label>
        <label>
          <span class="field-label">Coach</span>
          <select class="field" name="coach" [(ngModel)]="draft.coachId">
            <option [ngValue]="0">Sin asignar</option>
            @for (c of coaches(); track c.id) { <option [ngValue]="c.id">{{ c.fullName }}</option> }
          </select>
          <bs-field-error [error]="form.error('coachId')" />
        </label>
        <label><span class="field-label">Cupos</span><input class="field" type="number" min="1" name="cap" [(ngModel)]="draft.capacity" /><bs-field-error [error]="form.error('capacity')" /></label>
        <label class="col-span-2"><span class="field-label">Nota visible (opcional)</span><input class="field" name="note" maxlength="140" [(ngModel)]="draft.note" placeholder="Ej: traer guantes propios" /></label>
        @if (editing()) { <p class="col-span-2 text-xs text-ash">Si cambias la fecha u hora, avisamos a los inscritos por notificación.</p> }
        <div class="col-span-2"><bs-form-message [message]="form.message()" /></div>
        <button type="submit" class="tape col-span-2" [disabled]="form.busy()">{{ editing() ? 'Guardar cambios' : 'Crear clase' }}</button>
      </form>
    </bs-modal>

    <bs-modal title="Cancelar clase" [open]="modal() === 'cancel'" (closed)="modal.set(null)">
      @if (editing(); as s) {
        <p>{{ s.discipline }} del {{ longDate(s.date) }} a las {{ s.start }} · <span class="font-semibold">{{ s.taken }} {{ s.taken === 1 ? 'persona inscrita' : 'personas inscritas' }}</span>.</p>
        <p class="mt-2 text-sm text-bone/70">Se cancelan todas las reservas, se devuelven las clases de plan y se avisa a cada persona. Los pagos de clase suelta se reembolsan desde Pagos.</p>
        <label class="mt-4 block"><span class="field-label">Motivo (se incluye en el aviso)</span><input class="field" [(ngModel)]="reason" maxlength="200" placeholder="Ej: el coach está enfermo" /></label>
        <bs-form-message [message]="form.message()" />
        <button type="button" class="mt-5 w-full bg-blood px-5 py-3 font-punch text-xl font-extrabold text-bone italic uppercase disabled:opacity-50" [disabled]="form.busy()" (click)="confirmCancel()">Cancelar clase y avisar</button>
      }
    </bs-modal>
  `,
})
export default class AdminSessions implements OnInit {
  private readonly admin = inject(AdminApi);
  protected readonly catalog = inject(CatalogStore);
  private readonly toast = inject(ToastService);
  protected readonly longDate = longDate;
  protected readonly today = toIso(new Date());

  protected readonly date = signal(this.today);
  protected readonly coach = signal(0);
  protected readonly coaches = signal<User[]>([]);
  protected readonly sessions = signal<Session[]>([]);
  protected readonly loading = signal(true);
  protected readonly modal = signal<'form' | 'cancel' | null>(null);
  protected readonly editing = signal<Session | null>(null);
  protected readonly form = new FormState();
  protected draft = { disciplineId: 0, coachId: 0, date: '', start: '18:00', capacity: 12, note: '' };
  protected reason = '';

  private readonly query = computed(() => ({ date: this.date(), coach: this.coach() }));

  constructor() {
    effect(() => void this.load(this.query()));
  }

  ngOnInit() {
    void this.admin.coaches().then((c) => this.coaches.set(c));
  }

  private async load(q: { date: string; coach: number }) {
    this.loading.set(true);
    try {
      this.sessions.set(await this.admin.sessions(q.date, q.date, q.coach || undefined));
    } catch (e) {
      this.toast.error('No se pudieron cargar las clases', toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected shift(n: number) {
    this.date.update((d) => toIso(addDays(fromIso(d), n)));
  }

  protected openCreate() {
    this.editing.set(null);
    this.form.reset();
    this.draft = { disciplineId: this.catalog.disciplines()[0]?.id ?? 0, coachId: 0, date: this.date(), start: '18:00', capacity: 12, note: '' };
    this.modal.set('form');
  }

  protected openEdit(s: Session) {
    this.editing.set(s);
    this.form.reset();
    this.draft = { disciplineId: s.disciplineId, coachId: s.coachId ?? 0, date: s.date, start: s.start, capacity: s.capacity, note: s.note };
    this.modal.set('form');
  }

  protected async save() {
    const d = this.draft;
    const s = this.editing();
    const ok = await this.form.run(() =>
      s
        ? this.admin.updateSession(s.id, { coachId: d.coachId, date: d.date, start: d.start, capacity: d.capacity, note: d.note })
        : this.admin.createSession({ ...d, coachId: d.coachId || null }),
    );
    if (ok) {
      this.modal.set(null);
      this.toast.ok(s ? 'Clase actualizada' : 'Clase creada');
      if (!s) this.date.set(d.date);
      void this.load(this.query());
    }
  }

  protected openCancel(s: Session) {
    this.editing.set(s);
    this.form.reset();
    this.reason = '';
    this.modal.set('cancel');
  }

  protected async confirmCancel() {
    const s = this.editing()!;
    const r = await this.form.run(() => this.admin.cancelSession(s.id, this.reason));
    if (r) {
      this.modal.set(null);
      this.toast.ok('Clase cancelada', `${r.cancelledBookings} ${r.cancelledBookings === 1 ? 'persona avisada' : 'personas avisadas'}.`);
      void this.load(this.query());
    }
  }
}
