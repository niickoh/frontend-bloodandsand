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
      class="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto border-t-4 border-lime bg-iron p-0 text-bone backdrop:bg-ink/75 md:m-auto md:max-w-xl md:border md:border-steel md:border-t-lime"
      [attr.aria-labelledby]="'dlg-' + uid"
      (close)="closed.emit()"
      (click)="backdrop($event)"
    >
      <div class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-steel bg-iron px-5 py-4">
        <h2 [id]="'dlg-' + uid" class="font-punch text-2xl font-extrabold italic">{{ title() }}</h2>
        <button type="button" class="p-1 text-bone/60 hover:text-bone" (click)="dlg.close()" aria-label="Cerrar"><bs-icon name="x" /></button>
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
