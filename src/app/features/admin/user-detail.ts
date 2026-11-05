import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { CatalogStore } from '../../core/services/catalog.store';
import { ToastService } from '../../core/services/toast.service';
import { Booking, Membership, Order, Role, User } from '../../core/models';
import { addDays, longDate, money, toIso } from '../../core/utils/date';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Modal } from '../../shared/ui/modal';
import { Status } from '../../shared/ui/status';
import { AdminApi } from './admin-api';

@Component({
  selector: 'bs-admin-user-detail',
  imports: [FormsModule, RouterLink, Icon, Modal, Status, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/usuarios" class="inline-flex items-center gap-1 text-sm text-bone/60 hover:text-bone"><bs-icon name="chevron-left" [size]="16" /> Usuarios</a>

    @if (user(); as u) {
      <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="type-display text-[clamp(2.25rem,7vw,4rem)]">{{ u.fullName }}</h1>
          <p class="text-bone/70">{{ u.email }} · desde {{ date(u.createdAt) }}{{ u.lastLoginAt ? ' · último ingreso ' + date(u.lastLoginAt) : '' }}</p>
        </div>
        <bs-status [value]="u.active ? 'active' : 'inactive'" />
      </div>

      <div class="mt-8 grid gap-10 xl:grid-cols-2">
        <form class="grid content-start gap-4" (ngSubmit)="save()" novalidate>
          <h2 class="font-punch text-2xl font-extrabold italic">Datos y perfil</h2>
          <label><span class="field-label">Nombre y apellido</span><input class="field" name="name" [(ngModel)]="draft.fullName" /><bs-field-error [error]="form.error('fullName')" /></label>
          <label><span class="field-label">Correo</span><input class="field" name="email" type="email" [(ngModel)]="draft.email" /><bs-field-error [error]="form.error('email')" /></label>
          <label><span class="field-label">Teléfono</span><input class="field" name="phone" [(ngModel)]="draft.phone" /><bs-field-error [error]="form.error('phone')" /></label>
          <div class="grid grid-cols-2 gap-4">
            <label>
              <span class="field-label">Perfil</span>
              <select class="field" name="role" [(ngModel)]="draft.role">
                <option value="student">Alumno</option><option value="coach">Coach</option><option value="admin">Admin</option>
              </select>
              <bs-field-error [error]="form.error('role')" />
            </label>
            <label>
              <span class="field-label">Estado</span>
              <select class="field" name="active" [(ngModel)]="draft.active">
                <option [ngValue]="true">Activa</option><option [ngValue]="false">Desactivada</option>
              </select>
              <bs-field-error [error]="form.error('active')" />
            </label>
          </div>
          <p class="text-xs text-ash">Cambiar el perfil o desactivar la cuenta cierra sus sesiones abiertas.</p>
          <bs-form-message [message]="form.message()" />
          <div class="flex flex-wrap gap-3">
            <button type="submit" class="tape" [disabled]="form.busy()">Guardar</button>
            <button type="button" class="tape-ghost" (click)="modal.set('password')">Nueva contraseña</button>
          </div>
          @if (u.id !== auth.user()?.id) {
            <button type="button" class="justify-self-start text-sm text-blood underline" (click)="remove()">Eliminar usuario</button>
          }
        </form>

        @if (u.role === 'student') {
          <section>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-punch text-2xl font-extrabold italic">Planes</h2>
              <button type="button" class="tape !px-3 !py-1 !text-base" (click)="openAssign()"><bs-icon name="plus" [size]="18" /> Asignar plan</button>
            </div>
            <ul class="mt-3 divide-y divide-steel border-y border-steel text-sm">
              @for (m of memberships(); track m.id) {
                <li class="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <span class="font-semibold">{{ m.planName }}</span> · {{ date(m.startsAt) }} al {{ date(m.endsAt) }}
                    @if (m.creditsTotal !== null) { · {{ m.creditsLeft }}/{{ m.creditsTotal }} clases } @else { · ilimitado }
                    @if (!m.orderId) { <span class="text-xs text-ash">· asignado</span> }
                  </span>
                  <span class="flex items-center gap-2">
                    <bs-status [value]="isActive(m) ? 'active' : m.status === 'cancelled' ? 'cancelled' : 'expired'" />
                    @if (isActive(m)) { <button type="button" class="underline hover:text-lime" (click)="openAdjust(m)">Ajustar</button> }
                  </span>
                </li>
              } @empty {
                <li class="py-3 text-bone/70">Sin planes.</li>
              }
            </ul>
          </section>
        }
      </div>

      @if (u.role === 'student') {
        <div class="mt-12 grid gap-10 xl:grid-cols-2">
          <section>
            <h2 class="font-punch text-2xl font-extrabold italic">Reservas recientes</h2>
            <ul class="mt-3 divide-y divide-steel border-y border-steel text-sm">
              @for (b of bookings(); track b.id) {
                <li class="flex items-center justify-between gap-2 py-2.5">
                  <a [routerLink]="['/admin/clases', b.sessionId]" class="hover:text-lime">{{ b.discipline }} · {{ longDate(b.date) }} {{ b.start }}</a>
                  <bs-status [value]="b.status" />
                </li>
              } @empty {
                <li class="py-3 text-bone/70">Sin reservas.</li>
              }
            </ul>
          </section>
          <section>
            <h2 class="font-punch text-2xl font-extrabold italic">Pagos</h2>
            <ul class="mt-3 divide-y divide-steel border-y border-steel text-sm">
              @for (o of orders(); track o.id) {
                <li class="flex items-center justify-between gap-2 py-2.5">
                  <span>{{ o.description }} · {{ date(o.createdAt) }}</span>
                  <span class="flex items-center gap-2">{{ money(o.amount) }} <bs-status [value]="o.status" /></span>
                </li>
              } @empty {
                <li class="py-3 text-bone/70">Sin pagos.</li>
              }
            </ul>
          </section>
        </div>
      }
    } @else if (error()) {
      <p class="mt-6 border-l-4 border-blood bg-blood/10 p-4">{{ error() }}</p>
    }

    <bs-modal title="Nueva contraseña" [open]="modal() === 'password'" (closed)="modal.set(null)">
      <form class="grid gap-4" (ngSubmit)="setPassword()" novalidate>
        <label><span class="field-label">Contraseña</span><input class="field" name="pw" type="text" autocomplete="off" [(ngModel)]="password" /><bs-field-error [error]="pwForm.error('password')" /></label>
        <p class="text-xs text-ash">Cierra todas las sesiones de esta persona.</p>
        <bs-form-message [message]="pwForm.message()" />
        <button type="submit" class="tape" [disabled]="pwForm.busy()">Cambiar contraseña</button>
      </form>
    </bs-modal>

    <bs-modal title="Asignar plan" [open]="modal() === 'assign'" (closed)="modal.set(null)">
      <form class="grid gap-4" (ngSubmit)="assign()" novalidate>
        <label>
          <span class="field-label">Plan</span>
          <select class="field" name="plan" [(ngModel)]="assignDraft.planId">
            @for (p of catalog.sellablePlans(); track p.id) { <option [ngValue]="p.id">{{ p.name }} · {{ money(p.price) }}</option> }
          </select>
        </label>
        <label><span class="field-label">Vence el (opcional)</span><input class="field" type="date" name="ends" [(ngModel)]="assignDraft.endsAt" /></label>
        <p class="text-xs text-ash">Úsalo para pagos en efectivo o cortesías. No genera cobro. Reemplaza el plan activo, si hay uno.</p>
        <bs-form-message [message]="mForm.message()" />
        <button type="submit" class="tape" [disabled]="mForm.busy()">Asignar</button>
      </form>
    </bs-modal>

    <bs-modal title="Ajustar plan" [open]="modal() === 'adjust'" (closed)="modal.set(null)">
      <form class="grid gap-4" (ngSubmit)="adjust()" novalidate>
        @if (adjusting()?.creditsTotal !== null) {
          <label><span class="field-label">Clases disponibles</span><input class="field" type="number" min="0" name="credits" [(ngModel)]="adjustDraft.creditsLeft" /><bs-field-error [error]="mForm.error('creditsLeft')" /></label>
        }
        <label><span class="field-label">Vence el</span><input class="field" type="date" name="ends" [(ngModel)]="adjustDraft.endsAt" /><bs-field-error [error]="mForm.error('endsAt')" /></label>
        <bs-form-message [message]="mForm.message()" />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <button type="button" class="text-sm text-blood underline" (click)="cancelMembership()">Cancelar plan</button>
          <button type="submit" class="tape" [disabled]="mForm.busy()">Guardar</button>
        </div>
      </form>
    </bs-modal>
  `,
})
export default class AdminUserDetail implements OnInit {
  private readonly admin = inject(AdminApi);
  protected readonly catalog = inject(CatalogStore);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  protected readonly money = money;
  protected readonly longDate = longDate;
  protected readonly user = signal<User | null>(null);
  protected readonly memberships = signal<Membership[]>([]);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly modal = signal<'password' | 'assign' | 'adjust' | null>(null);
  protected readonly adjusting = signal<Membership | null>(null);

  protected readonly form = new FormState();
  protected readonly pwForm = new FormState();
  protected readonly mForm = new FormState();
  protected draft = { fullName: '', email: '', phone: '', role: 'student' as Role, active: true };
  protected password = '';
  protected assignDraft = { planId: 0, endsAt: '' };
  protected adjustDraft = { creditsLeft: 0, endsAt: '' };

  async ngOnInit() {
    const id = Number(this.id());
    try {
      const u = await this.admin.user(id);
      this.setUser(u);
      if (u.role === 'student') void this.loadStudent(id);
    } catch (e) {
      this.error.set(toApiError(e).message);
    }
  }

  private setUser(u: User) {
    this.user.set(u);
    this.draft = { fullName: u.fullName, email: u.email, phone: u.phone, role: u.role, active: u.active };
  }

  private async loadStudent(id: number) {
    const [m, b, o] = await Promise.all([
      this.admin.memberships(id),
      this.admin.bookings({ user: id, from: toIso(addDays(new Date(), -180)), to: toIso(addDays(new Date(), 30)), limit: 20 }),
      this.admin.orders({ user: id, limit: 20 }),
    ]);
    this.memberships.set(m);
    this.bookings.set([...b.items].reverse());
    this.orders.set(o.items);
  }

  protected date = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Santiago' });
  protected isActive = (m: Membership) => m.status === 'active' && new Date(m.endsAt).getTime() > Date.now();

  protected async save() {
    const u = await this.form.run(() => this.admin.updateUser(this.user()!.id, this.draft));
    if (u) {
      this.setUser(u);
      this.toast.ok('Usuario actualizado');
    }
  }

  protected async setPassword() {
    const ok = await this.pwForm.run(async () => {
      await this.admin.setPassword(this.user()!.id, this.password);
      return true;
    });
    if (ok) {
      this.modal.set(null);
      this.password = '';
      this.toast.ok('Contraseña cambiada', 'Compártela con la persona por un canal seguro.');
    }
  }

  protected async remove() {
    const u = this.user()!;
    if (!confirm(`¿Eliminar a ${u.fullName}? Sus reservas y pagos quedan en el historial sin cuenta asociada. Si solo quieres bloquear el acceso, desactívala.`)) return;
    try {
      await this.admin.deleteUser(u.id);
      this.toast.ok('Usuario eliminado');
      await this.router.navigate(['/admin/usuarios']);
    } catch (e) {
      this.toast.error('No se pudo eliminar', toApiError(e).message);
    }
  }

  protected openAssign() {
    this.mForm.reset();
    this.assignDraft = { planId: this.catalog.sellablePlans()[0]?.id ?? 0, endsAt: '' };
    this.modal.set('assign');
  }

  protected async assign() {
    const m = await this.mForm.run(() =>
      this.admin.assignPlan(this.user()!.id, { planId: this.assignDraft.planId, endsAt: this.assignDraft.endsAt || undefined }),
    );
    if (m) {
      this.modal.set(null);
      this.toast.ok('Plan asignado', `${m.planName} activo.`);
      void this.loadStudent(this.user()!.id);
    }
  }

  protected openAdjust(m: Membership) {
    this.mForm.reset();
    this.adjusting.set(m);
    this.adjustDraft = { creditsLeft: m.creditsLeft ?? 0, endsAt: toIso(new Date(m.endsAt)) };
    this.modal.set('adjust');
  }

  protected async adjust() {
    const m = this.adjusting()!;
    const r = await this.mForm.run(() =>
      this.admin.adjustMembership(m.id, { creditsLeft: m.creditsTotal !== null ? this.adjustDraft.creditsLeft : undefined, endsAt: this.adjustDraft.endsAt }),
    );
    if (r) {
      this.modal.set(null);
      this.toast.ok('Plan ajustado');
      void this.loadStudent(this.user()!.id);
    }
  }

  protected async cancelMembership() {
    const m = this.adjusting()!;
    if (!confirm(`¿Cancelar el plan ${m.planName}? No genera reembolso; para devolver el dinero usa Pagos.`)) return;
    const r = await this.mForm.run(() => this.admin.adjustMembership(m.id, { status: 'cancelled' }));
    if (r) {
      this.modal.set(null);
      this.toast.ok('Plan cancelado');
      void this.loadStudent(this.user()!.id);
    }
  }
}
