import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toApiError } from './api-error';

type Params = Record<string, string | number | boolean | null | undefined>;

/** Thin promise-based wrapper over HttpClient. All errors become ApiError. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  private params(p?: Params) {
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(p ?? {})) {
      if (v !== undefined && v !== null && v !== '') hp = hp.set(k, String(v));
    }
    return hp;
  }

  private async run<T>(req: Promise<T>): Promise<T> {
    try {
      return await req;
    } catch (e) {
      throw toApiError(e);
    }
  }

  get<T>(path: string, params?: Params) {
    return this.run(firstValueFrom(this.http.get<T>('/api' + path, { params: this.params(params) })));
  }
  post<T>(path: string, body: unknown = {}) {
    return this.run(firstValueFrom(this.http.post<T>('/api' + path, body)));
  }
  put<T>(path: string, body: unknown) {
    return this.run(firstValueFrom(this.http.put<T>('/api' + path, body)));
  }
  patch<T>(path: string, body: unknown) {
    return this.run(firstValueFrom(this.http.patch<T>('/api' + path, body)));
  }
  delete<T>(path: string, body?: unknown) {
    return this.run(firstValueFrom(this.http.delete<T>('/api' + path, { body })));
  }
}
