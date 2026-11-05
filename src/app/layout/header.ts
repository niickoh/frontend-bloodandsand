import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { BookingStore } from '../core/services/booking.store';
import { Icon } from '../shared/ui/icon';

@Component({
  selector: 'bs-header',
  imports: [RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sticky top-0 z-40 block border-b border-steel/70 bg-ink/90 backdrop-blur-md pt-[env(safe-area-inset-top)]' },
  template: `
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
      <a routerLink="/" class="shrink-0" aria-label="Blood & Sand, inicio">
        <img src="img/logo.webp" alt="" width="510" height="115" class="h-7 w-auto md:h-8" />
      </a>

      <nav class="hidden items-center gap-6 lg:flex" aria-label="Principal">
        @for (l of links(); track l.to) {
          <a
            [routerLink]="l.to"
            routerLinkActive="!text-lime"
            [routerLinkActiveOptions]="{ exact: l.to === '/' }"
            class="font-punch text-lg font-bold text-bone/80 italic uppercase transition-colors hover:text-bone"
            >{{ l.label }}</a
          >
        }
      </nav>

      <div class="flex items-center gap-2 md:gap-3">
        @if (auth.user(); as u) {
          @if (store.membership(); as m) {
            <span class="hidden text-sm text-bone/70 xl:block">
              {{ m.planName }} · <span class="text-lime">{{ m.creditsLeft === null ? 'ilimitado' : m.creditsLeft + ' clases' }}</span>
            </span>
          }
          <a routerLink="/cuenta" class="hidden items-center gap-2 px-2 py-1 text-sm text-bone/80 hover:text-bone md:flex" [attr.aria-label]="'Mi cuenta, ' + u.fullName">
            <span class="grid size-8 place-items-center bg-steel font-punch font-extrabold text-lime italic">{{ initials() }}</span>
            <span class="hidden lg:inline">{{ auth.firstName() }}</span>
          </a>
        } @else if (auth.ready()) {
          <a routerLink="/ingresar" class="hidden items-center gap-1.5 px-2 text-sm font-semibold text-bone/80 hover:text-bone md:flex">
            <bs-icon name="user" [size]="18" /> Ingresar
          </a>
        }
        @if (!auth.isStaff()) {
          <a routerLink="/reservar" class="tape !px-4 !py-1.5 !text-lg">Reservar</a>
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
      { to: '/planes', label: 'Planes' },
    ];
    switch (this.auth.role()) {
      case 'admin':
        return [...base, { to: '/admin', label: 'Panel' }, { to: '/coach', label: 'Clases' }];
      case 'coach':
        return [...base, { to: '/coach', label: 'Mis clases' }];
      case 'student':
        return [...base, { to: '/mis-reservas', label: 'Mis reservas' }, { to: '/avisos', label: 'Avisos' }];
      default:
        return [...base, { to: '/avisos', label: 'Avisos' }];
    }
  });
}
