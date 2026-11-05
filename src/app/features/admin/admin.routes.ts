import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./admin-layout'),
    children: [
      { path: '', title: 'Resumen · Admin', loadComponent: () => import('./dashboard') },
      { path: 'clases', title: 'Clases · Admin', loadComponent: () => import('./sessions') },
      { path: 'clases/:id', title: 'Clase · Admin', loadComponent: () => import('../staff/roster') },
      { path: 'reservas', title: 'Reservas · Admin', loadComponent: () => import('./bookings') },
      { path: 'horario', title: 'Horario semanal · Admin', loadComponent: () => import('./timetable') },
      { path: 'usuarios', title: 'Usuarios · Admin', loadComponent: () => import('./users') },
      { path: 'usuarios/:id', title: 'Usuario · Admin', loadComponent: () => import('./user-detail') },
      { path: 'pagos', title: 'Pagos · Admin', loadComponent: () => import('./orders') },
      { path: 'catalogo', title: 'Disciplinas y planes · Admin', loadComponent: () => import('./catalog') },
      { path: 'avisos', title: 'Avisos push · Admin', loadComponent: () => import('./announcements') },
    ],
  },
] satisfies Routes;
