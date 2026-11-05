import { HttpErrorResponse } from '@angular/common/http';

/** Error body produced by the Go API (httpx.WriteError). */
export interface ApiErrorBody {
  error: string;
  message: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Partial<ApiErrorBody> | null;
    if (body && typeof body === 'object' && body.message) {
      return new ApiError(err.status, body.error ?? 'error', body.message, body.fields ?? {});
    }
    if (err.status === 0) return new ApiError(0, 'offline', 'Sin conexión. Revisa tu internet e intenta de nuevo.');
    return new ApiError(err.status, 'http_' + err.status, 'Algo falló de nuestro lado. Intenta de nuevo en unos minutos.');
  }
  return new ApiError(0, 'unknown', 'Algo salió mal. Intenta de nuevo.');
}
