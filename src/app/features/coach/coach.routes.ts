import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Mis clases · Blood & Sand', loadComponent: () => import('./agenda') },
  { path: 'clase/:id', title: 'Clase · Blood & Sand', loadComponent: () => import('../staff/roster') },
] satisfies Routes;
