import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { BookingStore } from '../core/services/booking.store';
import { Icon } from '../shared/ui/icon';

/** Standard store header: logo, primary nav, account, and the main action always in reach. */
@Component({
  selector: 'bs-header',
  imports: [RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sticky top-0 z-40 block border-b border-steel/70 bg-ink/85 backdrop-blur-lg pt-[env(safe-area-inset-top)]' },
  template: `
    <!-- Offer bar: the gym's main promise, shown to visitors only -->
    @if (!auth.loggedIn() && auth.ready()) {
      <a routerLink="/reservar" [queryParams]="{ d: 'evaluacion' }" class="block bg-lime px-4 py-1.5 text-center text-sm font-semibold text-ink hover:bg-[#d8ff5c]">
        Tu primera clase es gratis. Reserva en 30 segundos, sin crear cuenta.
      </a>
    }
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
      <a routerLink="/" class="shrink-0" aria-label="Blood & Sand, inicio">
        <img src="img/logo.webp" alt="" width="510" height="115" class="h-6 w-auto md:h-7" />
      </a>

      <nav class="hidden items-center gap-1 lg:flex" aria-label="Principal">
        @for (l of links(); track l.to) {
          <a
            [routerLink]="l.to"
            routerLinkActive="!text-bone !bg-iron-2"
            [routerLinkActiveOptions]="{ exact: l.to === '/' }"
            class="rounded-full px-3.5 py-2 text-sm font-semibold text-bone/70 transition-colors hover:text-bone"
            >{{ l.label }}</a
          >
        }
      </nav>

      <div class="flex items-center gap-2">
        @if (auth.user(); as u) {
          @if (store.membership(); as m) {
            <a routerLink="/mis-reservas" class="hidden items-center gap-1.5 rounded-full border border-steel px-3 py-1.5 text-sm xl:flex">
              <span class="size-2 rounded-full bg-lime"></span>
              {{ m.planName }} · {{ m.creditsLeft === null ? 'ilimitado' : m.creditsLeft + ' clases' }}
            </a>
          }
          <a routerLink="/cuenta" class="hidden items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-semibold text-bone/85 hover:bg-iron md:flex" [attr.aria-label]="'Mi cuenta, ' + u.fullName">
            <span class="grid size-8 place-items-center rounded-full bg-iron-2 text-xs font-bold text-lime">{{ initials() }}</span>
            <span class="hidden lg:inline">{{ auth.firstName() }}</span>
          </a>
        } @else if (auth.ready()) {
          <a routerLink="/ingresar" class="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-bone/80 hover:bg-iron hover:text-bone md:flex">
            <bs-icon name="user" [size]="18" /> Ingresar
          </a>
        }
        @if (!auth.isStaff()) {
          <a routerLink="/reservar" class="tape tape-sm">Reservar clase</a>
        }
      </div>
    </div>
  `,
})
export class Header {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(BookingStore);

  protected readonly initials = computed(() =>
    (this.auth.user()?.fullName ?? '')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  );

  protected readonly links = computed(() => {
    const base = [
      { to: '/', label: 'Inicio' },
      { to: '/horario', label: 'Horario' },
      { to: '/planes', label: 'Planes y precios' },
    ];
    switch (this.auth.role()) {
      case 'admin':
        return [...base, { to: '/admin', label: 'Panel' }, { to: '/coach', label: 'Clases' }];
      case 'coach':
        return [...base, { to: '/coach', label: 'Mis clases' }];
      case 'student':
        return [...base, { to: '/mis-reservas', label: 'Mis reservas' }];
      default:
        return base;
    }
  });
}
