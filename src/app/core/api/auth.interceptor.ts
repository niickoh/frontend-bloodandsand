import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '../config/app-config';

const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

/**
 * Calls to the API (config.json → api.url) carry the session cookies (withCredentials).
 * - Adds X-Requested-With (the API's CSRF guard for body-less writes).
 * - On a 401, refreshes the session once (shared between parallel requests) and retries.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(ConfigService);
  if (!config.isApiUrl(req.url)) return next(req);
  const auth = inject(AuthService);
  const withHeader = (r: HttpRequest<unknown>) => r.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' }, withCredentials: true });

  return next(withHeader(req)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || NO_REFRESH.some((p) => req.url.startsWith(config.apiUrl(p)))) {
        return throwError(() => err);
      }
      return from(auth.refresh()).pipe(
        switchMap((ok) => (ok ? next(withHeader(req)) : throwError(() => err))),
      );
    }),
  );
};
