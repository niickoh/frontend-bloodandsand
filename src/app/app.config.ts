import {
  ApplicationConfig,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withPreloading } from '@angular/router';
import { SelectivePreload } from './core/preload';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { CatalogStore } from './core/services/catalog.store';
import { ConfigService } from './core/config/app-config';
import { ThemeService } from './core/services/theme.service';

registerLocaleData(localeEsCl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: LOCALE_ID, useValue: 'es-CL' },
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withPreloading(SelectivePreload),
    ),
    // public/config/config.json is read first: it has the API URL and the switches every screen depends on.
    // The session check and catalog then start in parallel and don't block the first paint.
    provideAppInitializer(async () => {
      const config = inject(ConfigService);
      const theme = inject(ThemeService);
      const auth = inject(AuthService);
      const catalog = inject(CatalogStore);
      await config.load();
      theme.applyConfig(config.value.tema);
      void auth.init();
      void catalog.load();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
