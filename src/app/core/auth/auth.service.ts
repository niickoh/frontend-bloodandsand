import { HttpBackend, HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from '../api/api.service';
import { Role, User } from '../models';

/**
 * Session state. The tokens live in httpOnly cookies set by the API; the app only keeps the user.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  // Raw client without interceptors, so refresh can't recurse into itself.
  private readonly raw = new HttpClient(inject(HttpBackend));

  readonly user = signal<User | null>(null);
  /** False until the first /me check finishes; guards wait for it. */
  readonly ready = signal(false);

  readonly loggedIn = computed(() => this.user() !== null);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isCoach = computed(() => this.role() === 'coach');
  readonly isStaff = computed(() => this.isAdmin() || this.isCoach());
  readonly firstName = computed(() => this.user()?.fullName.split(' ')[0] ?? '');

  private refreshing: Promise<boolean> | null = null;
  private initPromise: Promise<void> | null = null;

  init(): Promise<void> {
    this.initPromise ??= this.api
      .get<User>('/auth/me')
      .then((u) => this.user.set(u))
      .catch(() => this.user.set(null))
      .finally(() => this.ready.set(true));
    return this.initPromise;
  }

  whenReady() {
    return this.init();
  }

  async login(email: string, password: string) {
    const u = await this.api.post<User>('/auth/login', { email, password });
    this.user.set(u);
    return u;
  }

  async register(input: { email: string; password: string; fullName: string; phone: string }) {
    const u = await this.api.post<User>('/auth/register', input);
    this.user.set(u);
    return u;
  }

  async logout() {
    try {
      await this.api.post('/auth/logout');
    } finally {
      this.user.set(null);
    }
  }

  /** Rotates the refresh cookie. Parallel callers share one request. */
  refresh(): Promise<boolean> {
    this.refreshing ??= firstValueFrom(
      this.raw.post<User>('/api/auth/refresh', {}, { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
    )
      .then((u) => {
        this.user.set(u);
        return true;
      })
      .catch(() => {
        this.user.set(null);
        return false;
      })
      .finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  async updateProfile(fullName: string, phone: string) {
    const u = await this.api.patch<User>('/auth/me', { fullName, phone });
    this.user.set(u);
    return u;
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.api.post<void>('/auth/password', { currentPassword, newPassword });
  }

  /** Where each profile lands after logging in. */
  homeFor(role: Role | null) {
    return role === 'admin' ? '/admin' : role === 'coach' ? '/coach' : '/mis-reservas';
  }
}
