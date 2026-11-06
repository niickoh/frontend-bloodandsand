import { Routes } from '@angular/router';
import { adminSectionGuard as on } from '../../core/config/guards';

export default [
  {
    path: '',
    loadComponent: () => import('./admin-layout'),
    children: [
      { path: '', title: 'Resumen · Admin', canActivate: [on('resumen')], loadComponent: () => import('./dashboard') },
      { path: 'clases', title: 'Clases · Admin', canActivate: [on('clases')], loadComponent: () => import('./sessions') },
      { path: 'clases/:id', title: 'Clase · Admin', canActivate: [on('clases')], loadComponent: () => import('../staff/roster') },
      { path: 'reservas', title: 'Reservas · Admin', canActivate: [on('reservas')], loadComponent: () => import('./bookings') },
      { path: 'horario', title: 'Horario semanal · Admin', canActivate: [on('horario')], loadComponent: () => import('./timetable') },
      { path: 'usuarios', title: 'Usuarios · Admin', canActivate: [on('usuarios')], loadComponent: () => import('./users') },
      { path: 'usuarios/:id', title: 'Usuario · Admin', canActivate: [on('usuarios')], loadComponent: () => import('./user-detail') },
      { path: 'pagos', title: 'Pagos · Admin', canActivate: [on('pagos')], loadComponent: () => import('./orders') },
      { path: 'catalogo', title: 'Disciplinas y planes · Admin', canActivate: [on('catalogo')], loadComponent: () => import('./catalog') },
      { path: 'avisos', title: 'Avisos push · Admin', canActivate: [on('avisos')], loadComponent: () => import('./announcements') },
    ],
  },
] satisfies Routes;
