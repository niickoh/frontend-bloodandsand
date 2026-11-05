import { ChangeDetectionStrategy, Component, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { Icon } from './icon';

/** Native <dialog>: focus trap, Esc to close and backdrop for free. Bottom sheet on phones. */
@Component({
  selector: 'bs-modal',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dlg
      class="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-b-0 border-steel bg-iron p-0 text-bone backdrop:bg-ink/75 backdrop:backdrop-blur-sm md:m-auto md:max-w-xl md:rounded-3xl md:border-b"
      [attr.aria-labelledby]="'dlg-' + uid"
      (close)="closed.emit()"
      (click)="backdrop($event)"
    >
      <div class="sticky top-0 z-10 border-b border-steel bg-iron px-5 pt-2.5 pb-4">
        <span class="mx-auto mb-3 block h-1 w-10 rounded-full bg-steel md:hidden" aria-hidden="true"></span>
        <div class="flex items-center justify-between gap-4">
        <h2 [id]="'dlg-' + uid" class="text-xl font-bold">{{ title() }}</h2>
        <button type="button" class="grid size-10 place-items-center rounded-full bg-iron-2 text-bone/70 hover:text-bone" (click)="dlg.close()" aria-label="Cerrar"><bs-icon name="x" /></button>
        </div>
      </div>
      <div class="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <ng-content />
      </div>
    </dialog>
  `,
  styles: `
    .sheet[open] {
      animation: rise 220ms var(--ease-snap) both;
    }
    @keyframes rise {
      from {
        transform: translateY(24px);
        opacity: 0;
      }
    }
  `,
})
export class Modal {
  private static seq = 0;
  protected readonly uid = ++Modal.seq;
  readonly title = input.required<string>();
  readonly open = input(false);
  readonly closed = output<void>();
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.open() && !el.open) el.showModal();
      if (!this.open() && el.open) el.close();
    });
  }

  protected backdrop(e: MouseEvent) {
    if (e.target === this.dlg().nativeElement) this.dlg().nativeElement.close();
  }
}
