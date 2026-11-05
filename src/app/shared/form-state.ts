import { signal } from '@angular/core';
import { ApiError, toApiError } from '../core/api/api-error';

/**
 * Busy flag + server validation errors for one form.
 *   await form.run(() => api.post(...))  // returns the result, or undefined on error
 */
export class FormState {
  readonly busy = signal(false);
  readonly fields = signal<Record<string, string>>({});
  readonly message = signal<string | null>(null);

  error(field: string) {
    return this.fields()[field] ?? null;
  }

  reset() {
    this.fields.set({});
    this.message.set(null);
  }

  /** Client-side checks: pass a map of field → message (empty values are ignored). Returns true if valid. */
  check(errors: Record<string, string | false | null | undefined>) {
    const clean = Object.fromEntries(Object.entries(errors).filter(([, v]) => !!v)) as Record<string, string>;
    this.fields.set(clean);
    this.message.set(Object.keys(clean).length ? 'Revisa los datos marcados.' : null);
    return Object.keys(clean).length === 0;
  }

  async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    this.busy.set(true);
    this.reset();
    try {
      return await fn();
    } catch (e) {
      const err: ApiError = toApiError(e);
      this.fields.set(err.fields);
      this.message.set(err.message);
      return undefined;
    } finally {
      this.busy.set(false);
    }
  }
}
