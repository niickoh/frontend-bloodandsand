import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '../../core/services/booking.store';
import { GYM, imageFor } from '../../core/data/catalog';
import { CatalogStore } from '../../core/services/catalog.store';
import { money, toIso, longDate } from '../../core/utils/date';
import { PlateMeter } from '../../shared/ui/plate-meter';
import { SectionTitle } from '../../shared/ui/section-title';
import { PlanList } from '../../shared/plan-list';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'bs-home',
  imports: [RouterLink, PlateMeter, SectionTitle, PlanList, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export default class Home {
  private readonly store = inject(BookingStore);
  private readonly catalog = inject(CatalogStore);
  protected readonly disciplines = this.catalog.disciplines;
  protected readonly imageFor = imageFor;
  protected readonly gym = GYM;
  protected readonly money = money;
  protected readonly longDate = longDate;

  protected readonly posters = [
    { src: 'img/p-nivel.webp', alt: 'Afiche: Entrena a tu nivel. Agenda tu evaluación gratis.' },
    { src: 'img/p-box.webp', alt: 'Afiche: Clases de box. Despierta tu guerrero.' },
    { src: 'img/p-fuerte.webp', alt: 'Afiche: Más fuerte que ayer.' },
    { src: 'img/p-disciplina.webp', alt: 'Afiche: Disciplina o nada. No más excusas.' },
    { src: 'img/p-version.webp', alt: 'Afiche: Empieza tu mejor versión. Primera clase gratis.' },
    { src: 'img/p-imparable.webp', alt: 'Afiche: Elige ser imparable.' },
  ];

  /** The next class with free spots, shown live in the hero. */
  protected readonly nextClass = computed(() => {
    const now = Date.now();
    return this.store.sessions().find((x) => new Date(x.startsAt).getTime() > now && x.taken < x.capacity && x.price > 0) ?? null;
  });

  protected readonly steps = [
    { title: 'Elige clase y hora', body: 'Filtra por disciplina y mira cuántos cupos quedan en cada horario.' },
    { title: 'Confirma tus datos', body: 'Nombre, correo y teléfono. La próxima vez ya quedan guardados.' },
    { title: 'Paga o usa tu plan', body: 'Primera clase gratis. Te avisamos 2 horas antes de entrar.' },
  ];

  protected readonly isToday = (iso: string) => iso === toIso(new Date());
}
