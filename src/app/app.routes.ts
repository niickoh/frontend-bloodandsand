import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/guards';
import { featureGuard } from './core/config/app-config';
import { bookingGuard } from './core/config/guards';

/**
 * Every page is a lazy standalone component. Staff areas are lazy route groups and are not
 * preloaded (data.preload = false), so students never download admin code.
 * featureGuard turns a page off from public/config/config.json.
 */
export const routes: Routes = [
  { path: '', title: 'Blood & Sand · Entrena sin límites', loadComponent: () => import('./features/home/home') },
  {
    path: 'horario',
    title: 'Horario de clases · Blood & Sand',
    canActivate: [featureGuard((c) => c.horario)],
    loadComponent: () => import('./features/schedule/schedule'),
  },
  { path: 'reservar', title: 'Reservar clase · Blood & Sand', canActivate: [bookingGuard], loadComponent: () => import('./features/booking/booking') },
  {
    path: 'planes',
    title: 'Planes y precios · Blood & Sand',
    canActivate: [featureGuard((c) => c.planes.activo)],
    loadComponent: () => import('./features/plans/plans'),
  },
  {
    path: 'planes/:slug/pago',
    title: 'Pagar plan · Blood & Sand',
    canActivate: [featureGuard((c) => c.planes.activo && c.planes.comprar, '/planes'), authGuard],
    loadComponent: () => import('./features/plans/checkout'),
  },
  { path: 'pago/resultado', title: 'Resultado del pago · Blood & Sand', loadComponent: () => import('./features/payment-result/payment-result') },
  { path: 'ingresar', title: 'Ingresar · Blood & Sand', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login') },
  {
    path: 'mis-reservas',
    title: 'Mis reservas · Blood & Sand',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-bookings/my-bookings'),
  },
  { path: 'cuenta', title: 'Mi cuenta · Blood & Sand', canActivate: [authGuard], loadComponent: () => import('./features/account/account') },
  {
    path: 'avisos',
    title: 'Avisos y app · Blood & Sand',
    canActivate: [featureGuard((c) => c.notificaciones || c.instalarApp)],
    loadComponent: () => import('./features/alerts/alerts'),
  },
  {
    path: 'coach',
    canActivate: [featureGuard((c) => c.coach), roleGuard('coach', 'admin')],
    data: { preload: false },
    loadChildren: () => import('./features/coach/coach.routes'),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    data: { preload: false },
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  { path: '**', redirectTo: '' },
];
