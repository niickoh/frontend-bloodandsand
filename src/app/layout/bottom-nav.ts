import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { BookingStore } from '../core/services/booking.store';
import { Icon, IconName } from '../shared/ui/icon';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
  primary?: boolean;
  badge?: boolean;
}

/** App-style tab bar on phones; tabs change with the profile. */
@Component({
  selector: 'bs-bottom-nav',
  imports: [RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'fixed inset-x-0 bottom-0 z-40 block border-t border-steel bg-ink/95 backdrop-blur-md md:hidden' },
  template: `
    <nav aria-label="Navegación de la app" class="grid pb-[env(safe-area-inset-bottom)]" [style.grid-template-columns]="'repeat(' + tabs().length + ', 1fr)'">
      @for (t of tabs(); track t.to) {
        <a
          [routerLink]="t.to"
          routerLinkActive
          #rla="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: t.to === '/' || t.to === '/admin' }"
          class="relative flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold"
          [class]="rla.isActive ? 'text-lime' : 'text-bone/60'"
          [attr.aria-current]="rla.isActive ? 'page' : null"
        >
          @if (t.primary) {
            <span class="-mt-5 grid size-12 place-items-center bg-lime text-ink [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]">
              <bs-icon [name]="t.icon" [size]="22" />
            </span>
          } @else {
            <span class="relative">
              <bs-icon [name]="t.icon" [size]="22" />
              @if (t.badge && count() > 0) {
                <span class="absolute -top-1.5 -right-2.5 grid min-w-4 place-items-center bg-pink px-1 text-[0.65rem] leading-4 text-bone">{{ count() }}</span>
              }
            </span>
          }
          {{ t.label }}
        </a>
      }
    </nav>
  `,
})
export class BottomNav {
  private readonly store = inject(BookingStore);
  private readonly auth = inject(AuthService);
  protected readonly count = computed(() => this.store.upcoming().length);

  protected readonly tabs = computed<Tab[]>(() => {
    switch (this.auth.role()) {
      case 'admin':
        return [
          { to: '/admin', label: 'Panel', icon: 'chart' },
          { to: '/admin/clases', label: 'Clases', icon: 'calendar' },
          { to: '/admin/reservas', label: 'Reservas', icon: 'ticket' },
          { to: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
          { to: '/cuenta', label: 'Cuenta', icon: 'user' },
        ];
      case 'coach':
        return [
          { to: '/coach', label: 'Mis clases', icon: 'calendar' },
          { to: '/horario', label: 'Horario', icon: 'list' },
          { to: '/avisos', label: 'Avisos', icon: 'bell' },
          { to: '/cuenta', label: 'Cuenta', icon: 'user' },
        ];
      default:
        return [
          { to: '/', label: 'Inicio', icon: 'home' },
          { to: '/horario', label: 'Horario', icon: 'calendar' },
          { to: '/reservar', label: 'Reservar', icon: 'plus', primary: true },
          { to: '/mis-reservas', label: 'Reservas', icon: 'ticket', badge: true },
          { to: this.auth.loggedIn() ? '/cuenta' : '/ingresar', label: this.auth.loggedIn() ? 'Cuenta' : 'Ingresar', icon: 'user' },
        ];
    }
  });
}
