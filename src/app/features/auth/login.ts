import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FormState } from '../../shared/form-state';
import { ConfigService } from '../../core/config/app-config';
import { FieldError, FormMessage } from '../../shared/ui/field-error';

@Component({
  selector: 'bs-login',
  imports: [FormsModule, RouterLink, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-28 md:grid-cols-[1fr_1fr] md:px-6 md:pt-14">
      <div class="relative hidden overflow-hidden rounded-[1.5rem] md:block">
        <img src="img/hero-800.webp" alt="" width="670" height="830" class="h-full w-full object-cover opacity-60" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent"></div>
        <p class="absolute bottom-6 left-6 text-[clamp(3rem,6vw,5.5rem)]">
          <span class="type-outline block">Disciplina</span>
          <span class="type-display block">o nada</span>
        </p>
      </div>

      <div class="md:py-6">
        <h1 class="page-title">
          <span class="type-display block">{{ mode() === 'login' ? 'Ingresa' : 'Crea tu' }}</span>
          <span class="type-outline block">{{ mode() === 'login' ? 'a tu cuenta' : 'cuenta' }}</span>
        </h1>
        @if (reason()) {
          <p class="mt-4 rounded-[var(--radius-field)] border-l-4 border-lime bg-iron p-3 text-sm">{{ reason() }}</p>
        }

        @if (cfg.cuentas.registro) {
        <div role="tablist" class="mt-8 grid grid-cols-2 rounded-full border border-steel p-1" aria-label="Ingresar o crear cuenta">
          <button type="button" role="tab" [attr.aria-selected]="mode() === 'login'" (click)="switchTo('login')"
            class="min-h-10 rounded-full text-sm font-semibold" [class]="mode() === 'login' ? 'bg-lime text-ink' : 'text-bone/70'">Ingresar</button>
          <button type="button" role="tab" [attr.aria-selected]="mode() === 'register'" (click)="switchTo('register')"
            class="min-h-10 rounded-full text-sm font-semibold" [class]="mode() === 'register' ? 'bg-lime text-ink' : 'text-bone/70'">Crear cuenta</button>
        </div>
        }

        <form class="mt-6 grid gap-5" (ngSubmit)="submit()" novalidate>
          @if (mode() === 'register') {
            <label>
              <span class="field-label">Nombre y apellido</span>
              <input class="field" name="fullName" autocomplete="name" [(ngModel)]="draft.fullName" />
              <bs-field-error [error]="form.error('fullName')" />
            </label>
            <label>
              <span class="field-label">Teléfono</span>
              <input class="field" name="phone" type="tel" autocomplete="tel" placeholder="+56 9 1234 5678" [(ngModel)]="draft.phone" />
              <bs-field-error [error]="form.error('phone')" />
            </label>
          }
          <label>
            <span class="field-label">Correo</span>
            <input class="field" name="email" type="email" autocomplete="email" [(ngModel)]="draft.email" />
            <bs-field-error [error]="form.error('email')" />
          </label>
          <label>
            <span class="field-label">Contraseña</span>
            <input class="field" name="password" type="password" [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'" [(ngModel)]="draft.password" />
            @if (mode() === 'register') { <span class="mt-1 block text-xs text-ash">Mínimo 8 caracteres.</span> }
            <bs-field-error [error]="form.error('password')" />
          </label>
          <bs-form-message [message]="form.message()" />
          <button type="submit" class="tape tape-lg" [disabled]="form.busy()">
            @if (form.busy()) { Un momento… } @else { {{ mode() === 'login' ? 'Ingresar' : 'Crear cuenta' }} }
          </button>
        </form>

        @if (mode() === 'register') {
          <p class="mt-6 text-sm text-bone/65">Si ya reservaste antes como invitado con este correo, tus reservas aparecerán en tu cuenta.</p>
        } @else if (cfg.reservas.activo && cfg.cuentas.reservaSinCuenta) {
          <p class="mt-6 text-sm text-bone/65">
            ¿Solo quieres una clase? <a routerLink="/reservar" class="text-lime underline underline-offset-4">Resérvala sin cuenta</a>.
          </p>
        }
      </div>
    </section>
  `,
})
export default class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly next = input<string>();
  readonly modo = input<string>();

  protected readonly cfg = inject(ConfigService).value;
  protected readonly mode = linkedSignal<'login' | 'register'>(() => (this.modo() === 'registro' && this.cfg.cuentas.registro ? 'register' : 'login'));
  protected readonly form = new FormState();
  protected draft = { email: '', password: '', fullName: '', phone: '' };

  protected readonly reason = computed(() => {
    const n = this.next() ?? '';
    if (n.startsWith('/planes')) return 'Para comprar un plan necesitas una cuenta: así tus clases quedan guardadas y puedes reservar con ellas.';
    if (n.startsWith('/mis-reservas')) return 'Ingresa para ver y cancelar tus reservas.';
    return null;
  });

  protected switchTo(m: 'login' | 'register') {
    this.mode.set(m);
    this.form.reset();
  }

  protected async submit() {
    const d = this.draft;
    const ok =
      this.mode() === 'login'
        ? this.form.check({ email: !d.email.trim() && 'Escribe tu correo.', password: !d.password && 'Escribe tu contraseña.' })
        : this.form.check({
            fullName: d.fullName.trim().split(/\s+/).length < 2 && 'Escribe nombre y apellido.',
            email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()) && 'Escribe un correo válido.',
            password: d.password.length < 8 && 'Usa al menos 8 caracteres.',
          });
    if (!ok) return;

    const user = await this.form.run(() =>
      this.mode() === 'login' ? this.auth.login(d.email.trim(), d.password) : this.auth.register({ ...d, email: d.email.trim() }),
    );
    if (!user) return;
    if (this.mode() === 'register') this.toast.ok('Cuenta creada', `Bienvenido, ${user.fullName.split(' ')[0]}.`);
    const next = this.next();
    await this.router.navigateByUrl(next && next.startsWith('/') && !next.startsWith('//') ? next : this.auth.homeFor(user.role));
  }
}
