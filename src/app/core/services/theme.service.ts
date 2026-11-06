import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';
const KEY = 'bs:theme';
const META = { dark: '#0e0d0c', light: '#faf8f5' } as const;

/**
 * Light / dark mode. The first visit follows the system setting; a manual choice is remembered.
 * index.html applies the saved theme before Angular boots, so there is no flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>((document.documentElement.dataset['theme'] as Theme) ?? 'dark');

  /** Applies config.json: forces dark when light mode is off; sets the default when the user never chose. */
  applyConfig(c: { modoClaro: boolean; porDefecto: 'sistema' | 'oscuro' | 'claro' }) {
    if (!c.modoClaro) {
      if (this.theme() !== 'dark') this.apply('dark');
      return;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      /* storage blocked */
    }
    if (!saved && c.porDefecto !== 'sistema') this.apply(c.porDefecto === 'claro' ? 'light' : 'dark');
  }

  toggle() {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(t: Theme) {
    this.apply(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* private mode: the choice lasts for this visit */
    }
  }

  private apply(t: Theme) {
    this.theme.set(t);
    document.documentElement.dataset['theme'] = t;
    document.documentElement.style.colorScheme = t;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[t]);
  }
}
