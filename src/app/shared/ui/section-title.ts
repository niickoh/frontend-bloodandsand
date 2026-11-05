import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Section heading: one solid display line plus an optional lead. */
@Component({
  selector: 'bs-section-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="type-display text-[clamp(2rem,6.5vw,3.5rem)] text-bone">{{ solid() }}@if (outline()) { {{ ' ' + outline() }} }</h2>
    @if (lead()) {
      <p class="mt-3 max-w-[56ch] text-bone/70 md:text-lg">{{ lead() }}</p>
    }
  `,
})
export class SectionTitle {
  readonly solid = input.required<string>();
  readonly outline = input<string>();
  readonly lead = input<string>();
}
