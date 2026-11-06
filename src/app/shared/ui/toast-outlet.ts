import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from './icon';

@Component({
  selector: 'bs-toast-outlet',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:items-end md:px-6',
    'aria-live': 'polite',
  },
  template: `
    @for (t of toasts.toasts(); track t.id) {
      <div
        class="toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-l-4 bg-bone px-4 py-3 text-ink shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]"
        [class.border-lime]="t.kind === 'ok'"
        [class.border-ink]="t.kind === 'info'"
        [class.border-blood]="t.kind === 'error'"
        role="status"
      >
        <span class="mt-0.5 grid size-6 place-items-center rounded-full" [class]="t.kind === 'error' ? 'bg-blood-fill text-bone' : 'bg-ink text-lime'">
          <bs-icon [name]="t.kind === 'error' ? 'x' : t.kind === 'info' ? 'clock' : 'check'" [size]="14" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="leading-tight font-bold">{{ t.title }}</p>
          @if (t.body) {
            <p class="text-sm leading-snug text-ink/75">{{ t.body }}</p>
          }
        </div>
        <button type="button" class="-mr-1 p-1 text-ink/60 hover:text-ink" (click)="toasts.dismiss(t.id)" aria-label="Cerrar aviso">
          <bs-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `,
  styles: `
    .toast {
      animation: drop 260ms var(--ease-snap) both;
    }
    @keyframes drop {
      from {
        transform: translateY(-12px);
        opacity: 0;
      }
    }
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
