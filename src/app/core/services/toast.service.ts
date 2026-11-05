import { Injectable, signal } from '@angular/core';

export type ToastKind = 'ok' | 'info' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(kind: ToastKind, title: string, body?: string, ms = 4500) {
    const id = ++this.seq;
    this.toasts.update((list) => [...list.slice(-2), { id, kind, title, body }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  ok(title: string, body?: string) {
    this.show('ok', title, body);
  }
  info(title: string, body?: string) {
    this.show('info', title, body);
  }
  error(title: string, body?: string) {
    this.show('error', title, body, 6500);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
