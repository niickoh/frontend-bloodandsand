import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Header } from './layout/header';
import { BottomNav } from './layout/bottom-nav';
import { Footer } from './layout/footer';
import { ToastOutlet } from './shared/ui/toast-outlet';
import { PwaService } from './core/services/pwa.service';
import { ConfigService } from './core/config/app-config';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Header, BottomNav, Footer, ToastOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-lime focus:px-3 focus:py-2 focus:text-ink">Saltar al contenido</a>
    <bs-header />
    @if (pwa.updateReady()) {
      <div class="flex items-center justify-center gap-3 bg-blood-fill px-4 py-2 text-sm text-sand">
        Hay una versión nueva de la app.
        <button type="button" class="font-semibold underline underline-offset-2" (click)="pwa.reload()">Actualizar</button>
      </div>
    }
    <main id="main" class="min-h-[70dvh]">
      @if (maintenance()) {
        <section class="mx-auto max-w-2xl px-4 py-24 text-center md:py-32">
          <h1 class="type-display text-[clamp(2.5rem,9vw,4.5rem)]">Volvemos pronto</h1>
          <p class="mx-auto mt-4 max-w-[46ch] text-lg text-bone/75">{{ cfg.mantenimiento.mensaje }}</p>
          <a routerLink="/ingresar" class="mt-8 inline-block text-sm text-bone/55 underline underline-offset-4">Acceso del equipo</a>
        </section>
      }
      <div [class.hidden]="maintenance()"><router-outlet /></div>
    </main>
    <bs-footer />
    <bs-bottom-nav />
    <bs-toast-outlet />
  `,
})
export class App {
  protected readonly pwa = inject(PwaService);
  protected readonly cfg = inject(ConfigService).value;
  protected readonly auth = inject(AuthService);
  private readonly onLogin = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/ingresar')),
    ),
    { initialValue: location.pathname.startsWith('/ingresar') },
  );
  /** config.json "mantenimiento": everyone sees the notice except admins (who can still sign in). */
  protected readonly maintenance = computed(() => this.cfg.mantenimiento.activo && !this.auth.isAdmin() && !this.onLogin());
}
