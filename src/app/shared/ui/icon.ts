import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName = 'home' | 'calendar' | 'bolt' | 'ticket' | 'bell' | 'check' | 'x' | 'chevron-left' | 'chevron-right' | 'download' | 'pin' | 'clock' | 'card' | 'share' | 'plus' | 'user' | 'logout' | 'users' | 'chart' | 'list' | 'edit' | 'trash' | 'search' | 'grid' | 'megaphone' | 'move' | 'tag';

/** Tiny inline icon set (stroke icons, no icon font to download). */
@Component({
  selector: 'bs-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [attr.width]="size()" [attr.height]="size()">
      @switch (name()) {
        @case ('home') { <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> }
        @case ('calendar') { <rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 10h18M8 3v4M16 3v4" /> }
        @case ('bolt') { <path d="M13 2 4 14h7l-1 8 9-12h-7z" /> }
        @case ('ticket') { <path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3zM14 4v16" /> }
        @case ('bell') { <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" /> }
        @case ('check') { <path d="m4 12 5 5L20 6" /> }
        @case ('x') { <path d="M6 6l12 12M18 6 6 18" /> }
        @case ('chevron-left') { <path d="m15 5-7 7 7 7" /> }
        @case ('chevron-right') { <path d="m9 5 7 7-7 7" /> }
        @case ('download') { <path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16" /> }
        @case ('pin') { <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /> }
        @case ('clock') { <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /> }
        @case ('card') { <rect x="2" y="5" width="20" height="14" rx="1" /><path d="M2 10h20M6 15h4" /> }
        @case ('share') { <path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" /> }
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('user') { <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /> }
        @case ('logout') { <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" /> }
        @case ('users') { <circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5" /> }
        @case ('chart') { <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> }
        @case ('list') { <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /> }
        @case ('edit') { <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /> }
        @case ('trash') { <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /> }
        @case ('search') { <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /> }
        @case ('grid') { <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /> }
        @case ('megaphone') { <path d="M3 10v4h4l9 5V5L7 10zM19 9a3 3 0 0 1 0 6M7 14l1 6h3l-1-5" /> }
        @case ('move') { <path d="M7 7h13l-4-4M17 17H4l4 4" /> }
        @case ('tag') { <path d="M3 12V3h9l9 9-9 9zM7.5 7.5h.01" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
