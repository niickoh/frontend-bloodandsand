import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models';
import { AuthService } from './auth.service';

/** Requires a session; otherwise sends to /ingresar and comes back afterwards. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  return auth.loggedIn() ? true : router.createUrlTree(['/ingresar'], { queryParams: { next: state.url } });
};

/** Requires one of the roles. Logged-in users without it go to their own home. */
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.whenReady();
    if (!auth.loggedIn()) return router.createUrlTree(['/ingresar'], { queryParams: { next: state.url } });
    return roles.includes(auth.role()!) ? true : router.createUrlTree([auth.homeFor(auth.role())]);
  };

/** Keeps logged-in users away from the login page. */
export const guestGuard: CanActivateFn = async () => {
  // inject() must run before any await (injection context is synchronous)
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  return auth.loggedIn() ? router.createUrlTree([auth.homeFor(auth.role())]) : true;
};
