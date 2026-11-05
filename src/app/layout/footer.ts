import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GYM } from '../core/data/catalog';
import { Icon } from '../shared/ui/icon';

@Component({
  selector: 'bs-footer',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block border-t border-steel bg-ink pb-24 md:pb-0' },
  template: `
    <div class="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 md:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div>
        <img src="img/logo.webp" alt="Blood & Sand" width="510" height="115" loading="lazy" class="h-8 w-auto" />
        <p class="mt-4 max-w-[34ch] text-sm text-bone/70">Box, fuerza y funcional en grupos chicos, con un coach en sala durante toda la clase.</p>
        <a [href]="gym.instagram" target="_blank" rel="noopener" class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-bone hover:text-lime">Instagram</a>
      </div>
      <div class="text-sm">
        <p class="mb-3 font-semibold">Entrena</p>
        <ul class="space-y-2 text-bone/70">
          <li><a routerLink="/reservar" class="hover:text-lime">Reservar clase</a></li>
          <li><a routerLink="/horario" class="hover:text-lime">Horario semanal</a></li>
          <li><a routerLink="/planes" class="hover:text-lime">Planes y precios</a></li>
          <li><a routerLink="/reservar" [queryParams]="{ d: 'evaluacion' }" class="hover:text-lime">Evaluación gratis</a></li>
        </ul>
      </div>
      <div class="text-sm">
        <p class="mb-3 font-semibold">Tu cuenta</p>
        <ul class="space-y-2 text-bone/70">
          <li><a routerLink="/mis-reservas" class="hover:text-lime">Mis reservas</a></li>
          <li><a routerLink="/cuenta" class="hover:text-lime">Mis datos y pagos</a></li>
          <li><a routerLink="/avisos" class="hover:text-lime">Notificaciones y app</a></li>
        </ul>
      </div>
      <div class="text-sm">
        <p class="mb-3 font-semibold">Visítanos</p>
        <ul class="space-y-2 text-bone/70">
          <li class="flex gap-2"><bs-icon name="pin" [size]="16" class="mt-1" /> {{ gym.address }}</li>
          <li><a class="hover:text-lime" [href]="'tel:' + gym.phone.replaceAll(' ', '')">{{ gym.phone }}</a></li>
          <li><a class="hover:text-lime" [href]="'mailto:' + gym.email">{{ gym.email }}</a></li>
          @for (h of gym.hours; track h.days) {
            <li>{{ h.days }}: {{ h.time }}</li>
          }
        </ul>
      </div>
    </div>
    <div class="border-t border-steel">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-ash md:px-6">
        <p>© {{ year }} Blood & Sand</p>
        <p class="flex items-center gap-2">Pagos seguros con Webpay y Mercado Pago</p>
      </div>
    </div>
  `,
})
export class Footer {
  protected readonly gym = GYM;
  protected readonly year = new Date().getFullYear();
}
