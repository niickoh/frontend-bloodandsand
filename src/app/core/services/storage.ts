import { effect, signal, WritableSignal } from '@angular/core';

/**
 * A signal persisted in localStorage. Stands in for the backend while the app is a simulation.
 * Must be called in an injection context (it registers an effect).
 */
export function persistedSignal<T>(key: string, initial: T): WritableSignal<T> {
  const storageKey = `bs:${key}`;
  let start = initial;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) start = JSON.parse(raw) as T;
  } catch {
    /* private mode or blocked storage: keep in memory */
  }
  const s = signal<T>(start);
  effect(() => {
    const value = s();
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  });
  return s;
}
