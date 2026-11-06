import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Booking, BookingStatus, Session } from '../../core/models';
import { addDays, longDate, toIso } from '../../core/utils/date';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Modal } from '../../shared/ui/modal';
import { PlateMeter } from '../../shared/ui/plate-meter';
import { PAYMENT_LABEL, Status } from '../../shared/ui/status';
import { Roster as RosterData, StaffApi, StudentHit } from './staff-api';

/** Class roster with full booking CRUD. Used by coaches (their classes) and admins (any class). */
@Component({
  selector: 'bs-roster',
  imports: [FormsModule, RouterLink, Icon, Modal, PlateMeter, Status, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-5xl px-4 pt-6 pb-28 md:px-6 md:pt-10">
      <a [routerLink]="backLink()" class="inline-flex items-center gap-1 text-sm text-bone/60 hover:text-bone"><bs-icon name="chevron-left" [size]="16" /> Volver</a>

      @if (data(); as d) {
        @let s = d.session;
        <header class="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-sm text-ash">{{ longDate(s.date) }}</p>
            <h1 class="type-display text-[clamp(2.75rem,10vw,5rem)]">{{ s.discipline }} {{ s.start }}</h1>
            <p class="text-bone/70">{{ s.coachName ?? 'Sin coach asignado' }} · hasta {{ s.end }}</p>
            @if (s.status === 'cancelled') { <p class="mt-2"><bs-status value="cancelled" /> <span class="ml-2 text-sm text-ash">{{ s.note }}</span></p> }
            @else if (s.note) { <p class="mt-2 text-sm text-blood">{{ s.note }}</p> }
          </div>
          <div class="flex flex-col items-start gap-3 sm:items-end">
            <bs-plate-meter [taken]="s.taken" [capacity]="s.capacity" />
            @if (s.status === 'scheduled') {
              <button type="button" class="tape" (click)="openAdd()"><bs-icon name="plus" /> Agregar persona</button>
            }
          </div>
        </header>

        @if (active().length) {
          <ul class="mt-6 divide-y divide-steel border-y border-steel">
            @for (b of active(); track b.id) {
              <li class="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div class="min-w-0">
                  <p class="flex flex-wrap items-center gap-2 font-semibold">
                    {{ b.name }} <bs-status [value]="b.status" />
                    @if (!b.userId) { <span class="text-xs text-ash">invitado</span> }
                  </p>
                  <p class="truncate text-sm text-ash">
                    <a [href]="'tel:' + b.phone" class="hover:text-bone">{{ b.phone }}</a> · {{ b.email }} · {{ payment[b.payment] }}
                  </p>
                  @if (b.notes) { <p class="mt-1 text-sm text-bone/70">“{{ b.notes }}”</p> }
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button type="button" (click)="setStatus(b, 'attended')" [disabled]="busyId() === b.id"
                    class="min-h-10 rounded-full border px-4 text-sm font-semibold" [class]="b.status === 'attended' ? 'border-lime bg-lime text-ink' : 'border-steel hover:border-lime'">Asistió</button>
                  <button type="button" (click)="setStatus(b, 'no_show')" [disabled]="busyId() === b.id"
                    class="min-h-10 rounded-full border px-4 text-sm font-semibold" [class]="b.status === 'no_show' ? 'border-blood bg-blood-fill text-bone' : 'border-steel hover:border-blood'">No vino</button>
                  <button type="button" class="grid size-10 place-items-center rounded-full border border-steel hover:border-ash" (click)="openEdit(b)" [attr.aria-label]="'Editar reserva de ' + b.name"><bs-icon name="edit" [size]="18" /></button>
                  <button type="button" class="grid size-10 place-items-center rounded-full border border-steel hover:border-ash" (click)="openMove(b)" [attr.aria-label]="'Cambiar de clase a ' + b.name"><bs-icon name="move" [size]="18" /></button>
                  <button type="button" class="grid size-10 place-items-center rounded-full border border-steel hover:border-blood hover:text-blood" (click)="setStatus(b, 'cancelled')" [attr.aria-label]="'Cancelar reserva de ' + b.name"><bs-icon name="x" [size]="18" /></button>
                </div>
              </li>
            }
          </ul>
        } @else {
          <div class="mt-6 rounded-[var(--radius-card)] border border-dashed border-steel p-6 text-bone/70">Nadie reservado todavía.</div>
        }

        @if (cancelled().length) {
          <details class="group mt-8">
            <summary class="flex cursor-pointer list-none items-center gap-2 font-semibold text-bone/70">
              <bs-icon name="chevron-right" class="transition-transform group-open:rotate-90" /> Canceladas ({{ cancelled().length }})
            </summary>
            <ul class="mt-3 divide-y divide-steel border-y border-steel text-sm">
              @for (b of cancelled(); track b.id) {
                <li class="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span class="text-ash">{{ b.name }} · {{ b.email }}</span>
                  <span class="flex gap-2">
                    <button type="button" class="underline hover:text-lime" (click)="setStatus(b, 'confirmed')">Reactivar</button>
                    <button type="button" class="underline hover:text-blood" (click)="remove(b)">Eliminar</button>
                  </span>
                </li>
              }
            </ul>
          </details>
        }
      } @else if (error()) {
        <p class="mt-6 rounded-[var(--radius-field)] border-l-4 border-blood bg-blood/10 p-4">{{ error() }}</p>
      } @else {
        <div class="mt-6 h-64 animate-pulse rounded-[var(--radius-card)] bg-iron"></div>
      }
    </section>

    <!-- Add person -->
    <bs-modal title="Agregar a la clase" [open]="modal() === 'add'" (closed)="modal.set(null)">
      <div role="tablist" class="mb-5 grid grid-cols-2 rounded-full border border-steel p-1">
        <button type="button" role="tab" [attr.aria-selected]="addMode() === 'student'" (click)="addMode.set('student')"
          class="min-h-10 rounded-full text-sm font-semibold" [class]="addMode() === 'student' ? 'bg-lime text-ink' : 'text-bone/70'">Alumno con cuenta</button>
        <button type="button" role="tab" [attr.aria-selected]="addMode() === 'guest'" (click)="addMode.set('guest')"
          class="min-h-10 rounded-full text-sm font-semibold" [class]="addMode() === 'guest' ? 'bg-lime text-ink' : 'text-bone/70'">Invitado</button>
      </div>
      <form class="grid gap-4" (ngSubmit)="add()" novalidate>
        @if (addMode() === 'student') {
          <label>
            <span class="field-label">Buscar por nombre o correo</span>
            <input class="field" name="q" autocomplete="off" [ngModel]="query()" (ngModelChange)="search($event)" placeholder="Ej: Camila" />
          </label>
          @if (picked(); as p) {
            <p class="flex items-center justify-between border-2 border-lime p-3 text-sm">
              <span><span class="font-semibold">{{ p.fullName }}</span> · {{ p.email }} @if (p.plan) { · <span class="text-lime">{{ p.plan }}</span> }</span>
              <button type="button" class="underline" (click)="picked.set(null)">Cambiar</button>
            </p>
          } @else {
            <ul class="max-h-56 divide-y divide-steel overflow-y-auto border border-steel empty:hidden">
              @for (h of hits(); track h.id) {
                <li><button type="button" class="w-full px-3 py-2 text-left text-sm hover:bg-steel" (click)="pick(h)">
                  <span class="font-semibold">{{ h.fullName }}</span> · {{ h.email }} @if (h.plan) { · <span class="text-lime">{{ h.plan }}</span> }
                </button></li>
              }
            </ul>
          }
          <bs-field-error [error]="addForm.error('userId')" />
        } @else {
          <label><span class="field-label">Nombre y apellido</span><input class="field" name="name" [(ngModel)]="guest.name" /><bs-field-error [error]="addForm.error('name')" /></label>
          <label><span class="field-label">Correo</span><input class="field" name="email" type="email" [(ngModel)]="guest.email" /><bs-field-error [error]="addForm.error('email')" /></label>
          <label><span class="field-label">Teléfono</span><input class="field" name="phone" type="tel" [(ngModel)]="guest.phone" /><bs-field-error [error]="addForm.error('phone')" /></label>
        }
        <label>
          <span class="field-label">Cómo se cubre</span>
          <select class="field" name="payment" [(ngModel)]="addPayment">
            <option value="staff">Pagó en recepción / cortesía</option>
            @if (addMode() === 'student') { <option value="plan">Descontar de su plan</option> }
            <option value="free">Clase gratis</option>
          </select>
          <bs-field-error [error]="addForm.error('payment')" />
        </label>
        <label><span class="field-label">Nota (opcional)</span><input class="field" name="notes" [(ngModel)]="addNotes" maxlength="200" /></label>
        @if (auth.isAdmin()) {
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="force" [(ngModel)]="addForce" class="size-4 accent-lime" /> Permitir aunque la clase esté llena</label>
        }
        <bs-form-message [message]="addForm.message()" />
        <button type="submit" class="tape" [disabled]="addForm.busy()">Agregar</button>
      </form>
    </bs-modal>

    <!-- Edit -->
    <bs-modal title="Editar reserva" [open]="modal() === 'edit'" (closed)="modal.set(null)">
      <form class="grid gap-4" (ngSubmit)="saveEdit()" novalidate>
        <label><span class="field-label">Nombre</span><input class="field" name="ename" [(ngModel)]="edit.name" /><bs-field-error [error]="editForm.error('name')" /></label>
        <label><span class="field-label">Teléfono</span><input class="field" name="ephone" type="tel" [(ngModel)]="edit.phone" /></label>
        <label><span class="field-label">Nota</span><textarea class="field min-h-24" name="enotes" [(ngModel)]="edit.notes" maxlength="200"></textarea></label>
        <label>
          <span class="field-label">Estado</span>
          <select class="field" name="estatus" [(ngModel)]="edit.status">
            <option value="confirmed">Confirmada</option>
            <option value="attended">Asistió</option>
            <option value="no_show">No vino</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </label>
        <bs-form-message [message]="editForm.message()" />
        <div class="flex flex-wrap justify-between gap-3">
          <button type="button" class="inline-flex items-center gap-1.5 text-sm text-blood underline" (click)="remove(editing()!)"><bs-icon name="trash" [size]="16" /> Eliminar reserva</button>
          <button type="submit" class="tape" [disabled]="editForm.busy()">Guardar</button>
        </div>
      </form>
    </bs-modal>

    <!-- Move -->
    <bs-modal title="Cambiar de clase" [open]="modal() === 'move'" (closed)="modal.set(null)">
      <p class="mb-3 text-sm text-bone/70">Elige la clase de destino para {{ editing()?.name }}. Le avisaremos del cambio.</p>
      <ul class="max-h-[50dvh] divide-y divide-steel overflow-y-auto border-y border-steel">
        @for (t of targets(); track t.id) {
          <li>
            <button type="button" class="flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-steel disabled:opacity-40"
              [disabled]="t.taken >= t.capacity || moveForm.busy()" (click)="move(t)">
              <span><span class="font-semibold">{{ t.discipline }} {{ t.start }}</span> <span class="text-sm text-ash">· {{ longDate(t.date) }}</span></span>
              <bs-plate-meter [taken]="t.taken" [capacity]="t.capacity" />
            </button>
          </li>
        } @empty {
          <li class="py-4 text-sm text-ash">No hay otras clases en los próximos 14 días.</li>
        }
      </ul>
      <bs-form-message [message]="moveForm.message()" />
    </bs-modal>
  `,
})
export default class Roster implements OnInit {
  private readonly staff = inject(StaffApi);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();
  protected readonly longDate = longDate;
  protected readonly payment = PAYMENT_LABEL;

  protected readonly data = signal<RosterData | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);
  protected readonly modal = signal<'add' | 'edit' | 'move' | null>(null);

  protected readonly active = computed(() => this.data()?.bookings.filter((b) => b.status !== 'cancelled') ?? []);
  protected readonly cancelled = computed(() => this.data()?.bookings.filter((b) => b.status === 'cancelled') ?? []);
  protected readonly backLink = computed(() => (this.auth.isAdmin() ? '/admin/clases' : '/coach'));

  // add
  protected readonly addForm = new FormState();
  protected readonly addMode = signal<'student' | 'guest'>('student');
  protected readonly query = signal('');
  protected readonly hits = signal<StudentHit[]>([]);
  protected readonly picked = signal<StudentHit | null>(null);
  protected guest = { name: '', email: '', phone: '' };
  protected addPayment: 'staff' | 'plan' | 'free' = 'staff';
  protected addNotes = '';
  protected addForce = false;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  // edit / move
  protected readonly editForm = new FormState();
  protected readonly moveForm = new FormState();
  protected readonly editing = signal<Booking | null>(null);
  protected edit = { name: '', phone: '', notes: '', status: 'confirmed' as BookingStatus };
  protected readonly targets = signal<Session[]>([]);

  ngOnInit() {
    void this.load();
  }

  private async load() {
    try {
      this.data.set(await this.staff.roster(Number(this.id())));
    } catch (e) {
      this.error.set(toApiError(e).message);
    }
  }

  protected async setStatus(b: Booking, status: BookingStatus) {
    if (b.status === status) status = 'confirmed'; // tapping again undoes attendance marks
    this.busyId.set(b.id);
    try {
      await this.staff.updateBooking(b.id, { status });
      await this.load();
      if (status === 'cancelled') this.toast.ok('Reserva cancelada', `Avisamos a ${b.name}.`);
    } catch (e) {
      this.toast.error('No se pudo actualizar', toApiError(e).message);
    } finally {
      this.busyId.set(null);
    }
  }

  protected openAdd() {
    this.addForm.reset();
    this.picked.set(null);
    this.hits.set([]);
    this.query.set('');
    this.guest = { name: '', email: '', phone: '' };
    this.addPayment = 'staff';
    this.addNotes = '';
    this.addForce = false;
    this.modal.set('add');
  }

  protected search(q: string) {
    this.query.set(q);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(async () => this.hits.set(q.trim().length >= 2 ? await this.staff.searchStudents(q.trim()) : []), 250);
  }

  protected pick(h: StudentHit) {
    this.picked.set(h);
    if (h.plan) this.addPayment = 'plan';
  }

  protected async add() {
    if (this.addMode() === 'student' && !this.picked()) {
      this.addForm.check({ userId: 'Busca y elige un alumno.' });
      return;
    }
    const input =
      this.addMode() === 'student'
        ? { userId: this.picked()!.id, payment: this.addPayment, notes: this.addNotes, force: this.addForce }
        : { ...this.guest, payment: this.addPayment, notes: this.addNotes, force: this.addForce };
    const b = await this.addForm.run(() => this.staff.addBooking(Number(this.id()), input));
    if (b) {
      this.modal.set(null);
      this.toast.ok('Persona agregada', `${b.name} quedó en la clase. Código ${b.code}.`);
      await this.load();
    }
  }

  protected openEdit(b: Booking) {
    this.editing.set(b);
    this.edit = { name: b.name, phone: b.phone, notes: b.notes, status: b.status };
    this.editForm.reset();
    this.modal.set('edit');
  }

  protected async saveEdit() {
    const b = this.editing()!;
    const ok = await this.editForm.run(() => this.staff.updateBooking(b.id, { ...this.edit, status: this.edit.status !== b.status ? this.edit.status : undefined }));
    if (ok) {
      this.modal.set(null);
      this.toast.ok('Reserva actualizada');
      await this.load();
    }
  }

  protected async openMove(b: Booking) {
    this.editing.set(b);
    this.moveForm.reset();
    this.modal.set('move');
    const from = toIso(new Date());
    const to = toIso(addDays(new Date(), 14));
    const list = this.auth.isAdmin() ? await this.staff.allSessions(from, to) : await this.staff.mySessions(from, to);
    this.targets.set(list.filter((s) => s.id !== b.sessionId && s.status === 'scheduled' && new Date(s.startsAt).getTime() > Date.now()));
  }

  protected async move(t: Session) {
    const b = this.editing()!;
    const ok = await this.moveForm.run(() => this.staff.updateBooking(b.id, { sessionId: t.id }));
    if (ok) {
      this.modal.set(null);
      this.toast.ok('Clase cambiada', `${b.name} pasó a ${t.discipline} del ${longDate(t.date)} a las ${t.start}.`);
      await this.load();
    }
  }

  protected async remove(b: Booking) {
    if (!confirm(`¿Eliminar la reserva de ${b.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await this.staff.deleteBooking(b.id);
      this.modal.set(null);
      this.toast.ok('Reserva eliminada');
      await this.load();
    } catch (e) {
      this.toast.error('No se pudo eliminar', toApiError(e).message);
    }
  }
}
