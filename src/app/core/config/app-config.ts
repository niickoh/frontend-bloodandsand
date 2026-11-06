import { inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Runtime feature switches, read from /config/config.json when the app starts.
 * Edit that file on the server (it is copied as-is to the build output) and reload the page:
 * no rebuild needed. Any key missing from the file keeps its default below.
 */
export interface AppConfig {
  version: string;
  /** Backend base URL without /api (e.g. https://api.example.com). Empty = same domain as the front. */
  api: { url: string };
  mantenimiento: { activo: boolean; mensaje: string };
  tema: { modoClaro: boolean; porDefecto: 'sistema' | 'oscuro' | 'claro' };
  barraOferta: { activo: boolean; texto: string };
  cuentas: { registro: boolean; reservaSinCuenta: boolean };
  reservas: { activo: boolean; cancelar: boolean; agregarCalendario: boolean };
  horario: boolean;
  planes: { activo: boolean; comprar: boolean };
  pagos: { simulado: boolean; webpay: boolean; mercadopago: boolean };
  notificaciones: boolean;
  instalarApp: boolean;
  inicio: {
    garantias: boolean;
    proximasClases: boolean;
    disciplinas: boolean;
    comoFunciona: boolean;
    planes: boolean;
    ubicacion: boolean;
    preguntas: boolean;
    galeria: boolean;
    bannerFinal: boolean;
  };
  coach: boolean;
  admin: {
    resumen: boolean;
    clases: boolean;
    reservas: boolean;
    horario: boolean;
    usuarios: boolean;
    pagos: boolean;
    catalogo: boolean;
    avisos: boolean;
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  version: 'default',
  api: { url: '' },
  mantenimiento: { activo: false, mensaje: 'Estamos haciendo mejoras en la página. Vuelve en unos minutos.' },
  tema: { modoClaro: true, porDefecto: 'sistema' },
  barraOferta: { activo: true, texto: 'Tu primera clase es gratis. Reserva en 30 segundos, sin crear cuenta.' },
  cuentas: { registro: true, reservaSinCuenta: true },
  reservas: { activo: true, cancelar: true, agregarCalendario: true },
  horario: true,
  planes: { activo: true, comprar: true },
  pagos: { simulado: true, webpay: true, mercadopago: true },
  notificaciones: true,
  instalarApp: true,
  inicio: {
    garantias: true,
    proximasClases: true,
    disciplinas: true,
    comoFunciona: true,
    planes: true,
    ubicacion: true,
    preguntas: true,
    galeria: true,
    bannerFinal: true,
  },
  coach: true,
  admin: { resumen: true, clases: true, reservas: true, horario: true, usuarios: true, pagos: true, catalogo: true, avisos: true },
};

const URL = 'config/config.json';
const CACHE_KEY = 'bs:config';

type Plain = Record<string, unknown>;
const isObj = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Defaults deep-merged with the file; values of the wrong type are ignored. */
function merge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return base;
  const out: Plain = { ...base };
  for (const [k, def] of Object.entries(base)) {
    const v = over[k];
    if (v === undefined) continue;
    if (isObj(def)) out[k] = merge(def, v);
    else if (typeof v === typeof def) out[k] = v;
  }
  return out as T;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private cfg: AppConfig = DEFAULT_CONFIG;

  /** The active configuration. Loaded before the first screen renders, so it never changes afterwards. */
  get value(): AppConfig {
    return this.cfg;
  }

  /** Always fetched fresh (no browser or service-worker cache). Offline, the last copy that loaded is used. */
  async load() {
    let raw: unknown;
    try {
      const res = await fetch(`${URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      raw = await res.json();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
      } catch {
        /* storage blocked */
      }
    } catch (e) {
      console.warn('[config] no se pudo leer config.json, se usa la última copia o los valores por defecto', e);
      try {
        raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
      } catch {
        raw = null;
      }
    }
    this.cfg = merge(DEFAULT_CONFIG, raw);
    // Tolerates "https://x.com", "https://x.com/" and "https://x.com/api".
    this.apiBase = this.cfg.api.url.trim().replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
  }

  private apiBase = '/api';

  /** Full URL of an API endpoint: apiUrl('/auth/me') → https://api.example.com/api/auth/me */
  apiUrl(path: string) {
    return this.apiBase + path;
  }

  /** True when the request goes to our API (the auth interceptor only touches those). */
  isApiUrl(url: string) {
    return url.startsWith(this.apiBase + '/');
  }
}

/** Blocks a route when its switch is off and sends the visitor to `fallback`. */
export const featureGuard =
  (on: (c: AppConfig) => boolean, fallback = '/'): CanActivateFn =>
  () =>
    on(inject(ConfigService).value) || inject(Router).createUrlTree([fallback]);
