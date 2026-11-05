import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header';
import { BottomNav } from './layout/bottom-nav';
import { Footer } from './layout/footer';
import { ToastOutlet } from './shared/ui/toast-outlet';
import { PwaService } from './core/services/pwa.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, BottomNav, Footer, ToastOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-lime focus:px-3 focus:py-2 focus:text-ink">Saltar al contenido</a>
    <bs-header />
    @if (pwa.updateReady()) {
      <div class="flex items-center justify-center gap-3 bg-pink px-4 py-2 text-sm text-bone">
        Hay una versión nueva de la app.
        <button type="button" class="font-semibold underline underline-offset-2" (click)="pwa.reload()">Actualizar</button>
      </div>
    }
    <main id="main" class="min-h-[70dvh]">
      <router-outlet />
    </main>
    <bs-footer />
    <bs-bottom-nav />
    <bs-toast-outlet />
  `,
})
export class App {
  protected readonly pwa = inject(PwaService);
}
