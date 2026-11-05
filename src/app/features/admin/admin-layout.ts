import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon, IconName } from '../../shared/ui/icon';

/** Admin shell: sidebar on desktop, scrollable tabs on phones. */
@Component({
  selector: 'bs-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto grid max-w-7xl md:grid-cols-[13rem_1fr]">
      <nav aria-label="Panel de admin" class="scrollbar-none sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-steel bg-ink px-4 py-2 md:top-16 md:h-[calc(100dvh-4rem)] md:flex-col md:border-r md:border-b-0 md:px-3 md:py-6">
        <p class="hidden px-3 pb-3 font-punch text-sm font-bold text-ash italic md:block">Panel de admin</p>
        @for (l of links; track l.to) {
          <a
            [routerLink]="l.to"
            routerLinkActive="!bg-lime !text-ink"
            [routerLinkActiveOptions]="{ exact: l.to === '/admin' }"
            class="flex shrink-0 items-center gap-2.5 px-3 py-2 text-sm font-semibold text-bone/75 hover:bg-iron hover:text-bone"
          >
            <bs-icon [name]="l.icon" [size]="18" /> {{ l.label }}
          </a>
        }
      </nav>
      <div class="min-w-0 px-4 pt-6 pb-28 md:px-8 md:pt-8">
        <router-outlet />
      </div>
    </div>
  `,
})
export default class AdminLayout {
  protected readonly links: { to: string; label: string; icon: IconName }[] = [
    { to: '/admin', label: 'Resumen', icon: 'chart' },
    { to: '/admin/clases', label: 'Clases', icon: 'calendar' },
    { to: '/admin/reservas', label: 'Reservas', icon: 'ticket' },
    { to: '/admin/horario', label: 'Horario semanal', icon: 'grid' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
    { to: '/admin/pagos', label: 'Pagos', icon: 'card' },
    { to: '/admin/catalogo', label: 'Disciplinas y planes', icon: 'tag' },
    { to: '/admin/avisos', label: 'Avisos push', icon: 'megaphone' },
  ];
}
