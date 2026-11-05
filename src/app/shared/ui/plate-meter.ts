import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Capacity shown as barbell plates, the motif on both sides of the wordmark.
 * Each plate is a spot; filled plates are taken. Large classes are scaled to 12 plates.
 */
@Component({
  selector: 'bs-plate-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2', role: 'img', '[attr.aria-label]': 'label()' },
  template: `
    <span class="flex items-center gap-[3px]" aria-hidden="true">
      @for (p of plates(); track $index) {
        <span
          class="block w-[5px] -skew-x-12 rounded-[1px]"
          [class]="p.taken ? 'bg-steel' : tone()"
          [style.height.px]="p.h"
        ></span>
      }
    </span>
    <span class="font-punch text-base font-bold italic" [class]="left() === 0 ? 'text-ash' : left() <= 3 ? 'text-pink' : 'text-bone'">
      {{ text() }}
    </span>
  `,
})
export class PlateMeter {
  readonly taken = input.required<number>();
  readonly capacity = input.required<number>();

  readonly left = computed(() => Math.max(0, this.capacity() - this.taken()));
  readonly tone = computed(() => (this.left() <= 3 ? 'bg-pink' : 'bg-lime'));

  readonly plates = computed(() => {
    const cap = this.capacity();
    const n = Math.min(cap, 12);
    const takenScaled = Math.round((this.taken() / cap) * n);
    // Plates shrink toward the ends like the logo's barbell.
    return Array.from({ length: n }, (_, i) => {
      const edge = Math.min(i, n - 1 - i);
      return { taken: i < takenScaled, h: 10 + Math.min(edge, 3) * 3 };
    });
  });

  readonly text = computed(() => {
    const l = this.left();
    if (this.capacity() === 1) return l ? 'Disponible' : 'Tomada';
    return l === 0 ? 'Llena' : l === 1 ? 'Queda 1 cupo' : `${l} cupos`;
  });

  readonly label = computed(() => `${this.text()} de ${this.capacity()}`);
}
