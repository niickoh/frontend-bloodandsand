import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GYM } from '../core/data/catalog';

@Component({
  selector: 'bs-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-t border-steel bg-ink pb-24 md:pb-0' },
  template: `
    <div class="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
      <div>
        <img src="img/logo.webp" alt="Blood & Sand" width="510" height="115" loading="lazy" class="h-9 w-auto" />
        <img src="img/tagline.webp" alt="Entrena sin límites" width="440" height="25" loading="lazy" class="mt-4 h-4 w-auto opacity-90" />
      </div>
      <div class="text-sm text-bone/70">
        <p class="mb-2 font-semibold text-bone">Visítanos</p>
        <p>{{ gym.address }}</p>
        <p><a class="hover:text-lime" [href]="'mailto:' + gym.email">{{ gym.email }}</a></p>
        <p><a class="hover:text-lime" [href]="'tel:' + gym.phone.replaceAll(' ', '')">{{ gym.phone }}</a></p>
      </div>
      <nav class="flex flex-col gap-1.5 text-sm text-bone/70" aria-label="Pie de página">
        <a routerLink="/horario" class="hover:text-lime">Horario de clases</a>
        <a routerLink="/planes" class="hover:text-lime">Planes y precios</a>
        <a routerLink="/reservar" [queryParams]="{ d: 'evaluacion' }" class="hover:text-lime">Evaluación gratis</a>
        <a [href]="gym.instagram" target="_blank" rel="noopener" class="hover:text-lime">Instagram</a>
      </nav>
    </div>
    <p class="mx-auto max-w-7xl px-4 pb-8 text-xs text-ash md:px-6">© {{ year }} Blood & Sand. Reservas y pagos en modo demostración.</p>
  `,
})
export class Footer {
  protected readonly gym = GYM;
  protected readonly year = new Date().getFullYear();
}
