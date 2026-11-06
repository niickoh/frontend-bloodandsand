import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { IconName } from '../../shared/ui/icon';
import { AuthService } from '../auth/auth.service';
import { AppConfig, ConfigService } from './app-config';

/** /reservar: off → schedule or home; guest booking off → login first, then back here. */
export const bookingGuard: CanActivateFn = async (_route, state) => {
  const c = inject(ConfigService).value;
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!c.reservas.activo) return router.createUrlTree([c.horario ? '/horario' : '/']);
  if (c.cuentas.reservaSinCuenta) return true;
  await auth.whenReady();
  return auth.loggedIn() || router.createUrlTree(['/ingresar'], { queryParams: { next: state.url } });
};

export type AdminKey = keyof AppConfig['admin'];

/** Single source for the admin menu, the switch of each section and the fallback order. */
export const ADMIN_SECTIONS: readonly { key: AdminKey; to: string; label: string; icon: IconName }[] = [
  { key: 'resumen', to: '/admin', label: 'Resumen', icon: 'chart' },
  { key: 'clases', to: '/admin/clases', label: 'Clases', icon: 'calendar' },
  { key: 'reservas', to: '/admin/reservas', label: 'Reservas', icon: 'ticket' },
  { key: 'horario', to: '/admin/horario', label: 'Horario semanal', icon: 'grid' },
  { key: 'usuarios', to: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
  { key: 'pagos', to: '/admin/pagos', label: 'Pagos', icon: 'card' },
  { key: 'catalogo', to: '/admin/catalogo', label: 'Disciplinas y planes', icon: 'tag' },
  { key: 'avisos', to: '/admin/avisos', label: 'Avisos push', icon: 'megaphone' },
];

/** A disabled admin section sends to the first enabled one (or to the account page if none). */
export const adminSectionGuard =
  (key: AdminKey): CanActivateFn =>
  () => {
    const c = inject(ConfigService).value;
    if (c.admin[key]) return true;
    const first = ADMIN_SECTIONS.find((s) => c.admin[s.key]);
    return inject(Router).createUrlTree([first ? first.to : '/cuenta']);
  };
