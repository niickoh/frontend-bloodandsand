import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { ROLE_LABEL } from '../../core/data/catalog';
import { ToastService } from '../../core/services/toast.service';
import { Role, User } from '../../core/models';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Modal } from '../../shared/ui/modal';
import { Status } from '../../shared/ui/status';
import { AdminApi } from './admin-api';

const PAGE = 50;

@Component({
  selector: 'bs-admin-users',
  imports: [FormsModule, RouterLink, Icon, Modal, Status, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="page-title type-display">Usuarios</h1>
      <button type="button" class="tape" (click)="openCreate()"><bs-icon name="plus" /> Nuevo usuario</button>
    </div>

    <div class="mt-6 flex flex-wrap gap-3">
      <label class="relative min-w-60 flex-1">
        <span class="sr-only">Buscar</span>
        <bs-icon name="search" [size]="18" class="absolute top-3.5 left-3 text-ash" />
        <input class="field !pl-10" placeholder="Nombre, correo o teléfono" [ngModel]="q()" (ngModelChange)="search($event)" />
      </label>
      <div role="radiogroup" aria-label="Perfil" class="flex rounded-full border border-steel p-1">
        @for (r of roles; track r.id) {
          <button type="button" role="radio" [attr.aria-checked]="role() === r.id" (click)="role.set(r.id); page.set(0)"
            class="min-h-9 rounded-full px-3 text-sm font-semibold" [class]="role() === r.id ? 'bg-lime text-ink' : 'text-bone/70'">{{ r.label }}</button>
        }
      </div>
    </div>

    <p class="mt-4 text-sm text-ash">{{ total() }} {{ total() === 1 ? 'usuario' : 'usuarios' }}</p>
    <ul class="mt-2 divide-y divide-steel border-y border-steel">
      @for (u of items(); track u.id) {
        <li>
          <a [routerLink]="['/admin/usuarios', u.id]" class="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-3 hover:bg-iron sm:grid-cols-[1fr_8rem_6rem]">
            <span class="min-w-0">
              <span class="block truncate font-semibold" [class.text-ash]="!u.active">{{ u.fullName }}</span>
              <span class="block truncate text-sm text-ash">{{ u.email }}{{ u.phone ? ' · ' + u.phone : '' }}</span>
            </span>
            <span class="text-sm">{{ roleLabel[u.role] }}</span>
            <span class="hidden sm:block"><bs-status [value]="u.active ? 'active' : 'inactive'" /></span>
          </a>
        </li>
      } @empty {
        <li class="py-6 text-bone/70">{{ loading() ? 'Cargando…' : 'Sin resultados.' }}</li>
      }
    </ul>
    @if (total() > PAGE) {
      <div class="mt-4 flex items-center gap-3">
        <button type="button" class="tape-ghost tape-sm" [disabled]="page() === 0" (click)="page.update((p) => p - 1)">Anterior</button>
        <span class="text-sm text-ash">Página {{ page() + 1 }} de {{ pages() }}</span>
        <button type="button" class="tape-ghost tape-sm" [disabled]="page() + 1 >= pages()" (click)="page.update((p) => p + 1)">Siguiente</button>
      </div>
    }

    <bs-modal title="Nuevo usuario" [open]="open()" (closed)="open.set(false)">
      <form class="grid gap-4" (ngSubmit)="create()" novalidate>
        <label>
          <span class="field-label">Perfil</span>
          <select class="field" name="role" [(ngModel)]="draft.role">
            <option value="student">Alumno</option>
            <option value="coach">Coach</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label><span class="field-label">Nombre y apellido</span><input class="field" name="name" [(ngModel)]="draft.fullName" /><bs-field-error [error]="form.error('fullName')" /></label>
        <label><span class="field-label">Correo</span><input class="field" name="email" type="email" [(ngModel)]="draft.email" /><bs-field-error [error]="form.error('email')" /></label>
        <label><span class="field-label">Teléfono</span><input class="field" name="phone" type="tel" [(ngModel)]="draft.phone" /><bs-field-error [error]="form.error('phone')" /></label>
        <label>
          <span class="field-label">Contraseña inicial</span>
          <input class="field" name="password" type="text" autocomplete="off" [(ngModel)]="draft.password" />
          <span class="mt-1 block text-xs text-ash">Compártela con la persona; podrá cambiarla en Mi cuenta.</span>
          <bs-field-error [error]="form.error('password')" />
        </label>
        <bs-form-message [message]="form.message()" />
        <button type="submit" class="tape" [disabled]="form.busy()">Crear usuario</button>
      </form>
    </bs-modal>
  `,
})
export default class AdminUsers {
  private readonly admin = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly roleLabel = ROLE_LABEL;
  protected readonly PAGE = PAGE;
  protected readonly roles: { id: Role | ''; label: string }[] = [
    { id: '', label: 'Todos' },
    { id: 'student', label: 'Alumnos' },
    { id: 'coach', label: 'Coaches' },
    { id: 'admin', label: 'Admins' },
  ];

  protected readonly q = signal('');
  private readonly debounced = signal('');
  protected readonly role = signal<Role | ''>('');
  protected readonly page = signal(0);
  protected readonly items = signal<User[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly pages = computed(() => Math.ceil(this.total() / PAGE));
  protected readonly open = signal(false);
  protected readonly form = new FormState();
  protected draft = { email: '', password: '', fullName: '', phone: '', role: 'student' as Role };
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly query = computed(() => ({ q: this.debounced(), role: this.role(), offset: this.page() * PAGE }));

  constructor() {
    effect(() => void this.load(this.query()));
  }

  protected search(v: string) {
    this.q.set(v);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.debounced.set(v.trim());
      this.page.set(0);
    }, 300);
  }

  private async load(q: { q: string; role: Role | ''; offset: number }) {
    this.loading.set(true);
    try {
      const r = await this.admin.users({ ...q, limit: PAGE });
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (e) {
      this.toast.error('No se pudieron cargar los usuarios', toApiError(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected openCreate() {
    this.form.reset();
    this.draft = { email: '', password: '', fullName: '', phone: '', role: this.role() || 'student' };
    this.open.set(true);
  }

  protected async create() {
    const u = await this.form.run(() => this.admin.createUser(this.draft));
    if (u) {
      this.open.set(false);
      this.toast.ok('Usuario creado', `${u.fullName} ya puede ingresar.`);
      await this.router.navigate(['/admin/usuarios', u.id]);
    }
  }
}
