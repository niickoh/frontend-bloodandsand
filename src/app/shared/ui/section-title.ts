import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Poster-style heading: solid line + outlined line, both from the campaign pieces. */
@Component({
  selector: 'bs-section-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="text-[clamp(2.75rem,11vw,6.5rem)]">
      <span class="type-display block text-bone">{{ solid() }}</span>
      @if (outline()) {
        <span class="type-outline block">{{ outline() }}</span>
      }
    </h2>
    @if (lead()) {
      <p class="mt-4 max-w-[52ch] text-bone/75">{{ lead() }}</p>
    }
  `,
})
export class SectionTitle {
  readonly solid = input.required<string>();
  readonly outline = input<string>();
  readonly lead = input<string>();
}
