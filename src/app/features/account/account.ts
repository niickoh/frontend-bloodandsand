import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABEL } from '../../core/data/catalog';
import { BookingStore } from '../../core/services/booking.store';
import { ToastService } from '../../core/services/toast.service';
import { Order } from '../../core/models';
import { longDate, money } from '../../core/utils/date';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Status } from '../../shared/ui/status';

@Component({
  selector: 'bs-account',
  imports: [FormsModule, RouterLink, FieldError, FormMessage, Icon, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-4xl px-4 pt-8 pb-28 md:px-6 md:pt-12">
      @if (auth.user(); as u) {
        <h1 class="text-[clamp(3rem,13vw,6.5rem)]">
          <span class="type-display block">Mi</span>
          <span class="type-outline block">cuenta</span>
        </h1>
        <p class="mt-3 text-bone/70">{{ u.email }} · {{ roleLabel[u.role] }}</p>

        <div class="mt-8 flex flex-wrap gap-2">
          @if (auth.isAdmin()) { <a routerLink="/admin" class="tape !text-lg"><bs-icon name="chart" /> Panel de admin</a> }
          @if (auth.isStaff()) { <a routerLink="/coach" class="tape-ghost !text-lg"><bs-icon name="calendar" /> Mis clases</a> }
          @if (!auth.isStaff()) { <a routerLink="/mis-reservas" class="tape-ghost !text-lg"><bs-icon name="ticket" /> Mis reservas</a> }
          <a routerLink="/avisos" class="tape-ghost !text-lg"><bs-icon name="bell" /> Avisos</a>
        </div>

        <div class="mt-12 grid gap-10 md:grid-cols-2">
          <form class="grid content-start gap-5" (ngSubmit)="saveProfile()" novalidate>
            <h2 class="font-punch text-3xl font-extrabold italic">Tus datos</h2>
            <label>
              <span class="field-label">Nombre y apellido</span>
              <input class="field" name="fullName" autocomplete="name" [(ngModel)]="profile.fullName" />
              <bs-field-error [error]="profileForm.error('fullName')" />
            </label>
            <label>
              <span class="field-label">Teléfono</span>
              <input class="field" name="phone" type="tel" autocomplete="tel" [(ngModel)]="profile.phone" />
              <bs-field-error [error]="profileForm.error('phone')" />
            </label>
            <bs-form-message [message]="profileForm.message()" />
            <button type="submit" class="tape justify-self-start" [disabled]="profileForm.busy()">Guardar cambios</button>
          </form>

          <form class="grid content-start gap-5" (ngSubmit)="savePassword()" novalidate>
            <h2 class="font-punch text-3xl font-extrabold italic">Contraseña</h2>
            <label>
              <span class="field-label">Contraseña actual</span>
              <input class="field" name="current" type="password" autocomplete="current-password" [(ngModel)]="pwd.current" />
              <bs-field-error [error]="pwdForm.error('currentPassword')" />
            </label>
            <label>
              <span class="field-label">Nueva contraseña</span>
              <input class="field" name="next" type="password" autocomplete="new-password" [(ngModel)]="pwd.next" />
              <bs-field-error [error]="pwdForm.error('password')" />
            </label>
            <bs-form-message [message]="pwdForm.message()" />
            <button type="submit" class="tape-ghost justify-self-start" [disabled]="pwdForm.busy()">Cambiar contraseña</button>
            <p class="text-xs text-ash">Al cambiarla se cierran tus sesiones en otros dispositivos.</p>
          </form>
        </div>

        @if (!auth.isStaff()) {
          <h2 class="mt-14 font-punch text-3xl font-extrabold italic">Planes y pagos</h2>
          @if (store.membershipHistory().length) {
            <ul class="mt-4 divide-y divide-steel border-y border-steel text-sm">
              @for (m of store.membershipHistory(); track m.id) {
                <li class="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span><span class="font-semibold">{{ m.planName }}</span> · {{ date(m.startsAt) }} al {{ date(m.endsAt) }}</span>
                  <span class="flex items-center gap-3">
                    @if (m.creditsTotal !== null) { <span class="text-ash">{{ m.creditsLeft }}/{{ m.creditsTotal }} clases</span> }
                    <bs-status [value]="m.status === 'active' && m.endsAt > now ? 'active' : 'expired'" />
                  </span>
                </li>
              }
            </ul>
          }
          @if (orders().length) {
            <h3 class="mt-8 mb-2 font-semibold text-bone/80">Pagos</h3>
            <ul class="divide-y divide-steel border-y border-steel text-sm">
              @for (o of orders(); track o.id) {
                <li class="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>{{ o.description }} · {{ date(o.createdAt) }}</span>
                  <span class="flex items-center gap-3"><span class="font-semibold">{{ money(o.amount) }}</span><bs-status [value]="o.status" /></span>
                </li>
              }
            </ul>
          }
          @if (!store.membershipHistory().length && !orders().length) {
            <p class="mt-3 text-bone/70">Todavía no tienes planes ni pagos. <a routerLink="/planes" class="text-lime underline underline-offset-4">Ver planes</a></p>
          }
        }

        <button type="button" class="mt-14 inline-flex items-center gap-2 text-bone/70 hover:text-blood" (click)="logout()">
          <bs-icon name="logout" /> Cerrar sesión
        </button>
      }
    </section>
  `,
})
export default class Account implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(BookingStore);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly roleLabel = ROLE_LABEL;
  protected readonly money = money;
  protected readonly now = new Date().toISOString();
  protected readonly orders = signal<Order[]>([]);
  protected readonly profileForm = new FormState();
  protected readonly pwdForm = new FormState();
  protected profile = { fullName: this.auth.user()?.fullName ?? '', phone: this.auth.user()?.phone ?? '' };
  protected pwd = { current: '', next: '' };

  ngOnInit() {
    if (!this.auth.isStaff()) {
      void this.api.get<Order[]>('/me/orders').then((o) => this.orders.set(o));
    }
  }

  protected date = (iso: string) => longDate(iso.slice(0, 10)).toLowerCase();

  protected async saveProfile() {
    if (await this.profileForm.run(() => this.auth.updateProfile(this.profile.fullName, this.profile.phone))) {
      this.toast.ok('Datos guardados');
    }
  }

  protected async savePassword() {
    if (!this.pwdForm.check({ currentPassword: !this.pwd.current && 'Escribe tu contraseña actual.', password: this.pwd.next.length < 8 && 'Usa al menos 8 caracteres.' })) return;
    const ok = await this.pwdForm.run(async () => {
      await this.auth.changePassword(this.pwd.current, this.pwd.next);
      return true;
    });
    if (ok) {
      this.pwd = { current: '', next: '' };
      this.toast.ok('Contraseña cambiada', 'Cerramos tus sesiones en otros dispositivos.');
    }
  }

  protected async logout() {
    await this.auth.logout();
    this.toast.info('Sesión cerrada');
    await this.router.navigate(['/']);
  }
}
