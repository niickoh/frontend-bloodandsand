import { effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { Api } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { ToastService } from './toast.service';

type Permission = NotificationPermission | 'unsupported';

/**
 * Web Push: asks permission, subscribes this device in the API (linked to the account, or to the
 * guest's email) so the server can send reminders and changes even with the app closed.
 * Works on Android, desktop and iOS 16.4+ once the app is added to the home screen.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toast = inject(ToastService);
  private readonly swPush = inject(SwPush);
  private readonly router = inject(Router);
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);

  readonly supported = typeof window !== 'undefined' && 'Notification' in window;
  readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  readonly isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  readonly needsInstall = this.isIos && !this.isStandalone;
  /** The service worker only runs in production builds. */
  readonly pushReady = this.swPush.isEnabled;

  readonly permission = signal<Permission>(this.supported ? Notification.permission : 'unsupported');
  readonly subscribed = signal(false);
  private publicKey: string | null = null;

  constructor() {
    if (this.swPush.isEnabled) {
      this.swPush.notificationClicks.subscribe(({ notification }) => {
        const url = (notification.data as { url?: string } | undefined)?.url;
        if (url) void this.router.navigateByUrl(url);
      });
      this.swPush.subscription.subscribe((s) => this.subscribed.set(!!s));
    }
    // Re-link the device to the account whenever someone logs in.
    effect(() => {
      if (this.auth.user() && this.permission() === 'granted') void this.subscribe();
    });
  }

  async request(guestEmail = ''): Promise<Permission> {
    if (!this.supported) {
      this.toast.error('Este navegador no admite notificaciones', this.needsInstall ? 'En iPhone, primero añade la app a tu pantalla de inicio.' : undefined);
      return 'unsupported';
    }
    const result = await Notification.requestPermission();
    this.permission.set(result);
    if (result === 'granted') {
      await this.subscribe(guestEmail);
      this.toast.ok('Notificaciones activadas', 'Te avisaremos de tus reservas, recordatorios y cambios de horario.');
    } else if (result === 'denied') {
      this.toast.error('Notificaciones bloqueadas', 'Puedes activarlas desde los ajustes del sitio en tu navegador.');
    }
    return result;
  }

  /** Registers this device in the API. Guests pass the email they booked with. */
  async subscribe(guestEmail = '') {
    if (!this.swPush.isEnabled || this.permission() !== 'granted') return;
    try {
      this.publicKey ??= (await this.api.get<{ enabled: boolean; publicKey: string }>('/push/public-key')).publicKey || null;
      if (!this.publicKey) return;
      const sub = await this.swPush.requestSubscription({ serverPublicKey: this.publicKey });
      const json = sub.toJSON();
      await this.api.post('/push/subscriptions', { endpoint: json.endpoint, keys: json.keys, email: guestEmail });
      this.subscribed.set(true);
    } catch {
      /* push service unavailable (e.g. private window); in-app toasts still work */
    }
  }

  async unsubscribe() {
    try {
      const current = await navigator.serviceWorker?.getRegistration().then((r) => r?.pushManager.getSubscription());
      if (current) {
        await this.api.delete('/push/subscriptions', { endpoint: current.endpoint });
        await current.unsubscribe();
      }
    } finally {
      this.subscribed.set(false);
    }
  }

  /** Local notification from the page itself (used for instant confirmations). */
  async notify(title: string, body: string, url = '/') {
    this.toast.ok(title, body);
    if (this.permission() !== 'granted') return;
    const options: NotificationOptions & { data: unknown } = {
      body,
      icon: 'icons/icon-192x192.png',
      badge: 'icons/icon-96x96.png',
      tag: title,
      data: { url, onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url } } },
    };
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (reg) await reg.showNotification(title, options);
      else new Notification(title, options);
    } catch {
      /* the toast already informed the user */
    }
  }
}
