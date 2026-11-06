import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BookingStore } from '../../core/services/booking.store';
import { CatalogStore } from '../../core/services/catalog.store';
import { GYM, accentFor, imageFor } from '../../core/data/catalog';
import { money, toIso, longDate } from '../../core/utils/date';
import { PlateMeter } from '../../shared/ui/plate-meter';
import { SectionTitle } from '../../shared/ui/section-title';
import { PlanList } from '../../shared/plan-list';
import { Icon, IconName } from '../../shared/ui/icon';
import { ConfigService } from '../../core/config/app-config';

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
  protected readonly auth = inject(AuthService);
  protected readonly cfg = inject(ConfigService).value;
  protected readonly on = this.cfg.inicio;
  protected readonly disciplines = this.catalog.disciplines;
  protected readonly imageFor = imageFor;
  protected readonly accent = accentFor;
  protected readonly gym = GYM;
  protected readonly money = money;
  protected readonly sessionsLoaded = this.store.sessionsLoaded;

  protected readonly guarantees: { icon: IconName; text: string }[] = [
    { icon: 'bolt', text: 'Primera clase gratis' },
    { icon: 'tag', text: 'Sin matrícula ni permanencia' },
    { icon: 'users', text: 'Máximo 12 a 16 por clase' },
    { icon: 'clock', text: 'Cancela hasta 3 h antes' },
  ];

  protected readonly posters = [
    { src: 'img/p-nivel.webp', alt: 'Afiche: Entrena a tu nivel. Agenda tu evaluación gratis.' },
    { src: 'img/p-box.webp', alt: 'Afiche: Clases de box. Despierta tu guerrero.' },
    { src: 'img/p-fuerte.webp', alt: 'Afiche: Más fuerte que ayer.' },
    { src: 'img/p-disciplina.webp', alt: 'Afiche: Disciplina o nada. No más excusas.' },
    { src: 'img/p-version.webp', alt: 'Afiche: Empieza tu mejor versión. Primera clase gratis.' },
    { src: 'img/p-imparable.webp', alt: 'Afiche: Elige ser imparable.' },
  ];

  /** Next classes with seats: the store's "buy now" row. */
  protected readonly upcoming = computed(() => {
    const now = Date.now();
    return this.store.sessions().filter((x) => new Date(x.startsAt).getTime() > now && x.taken < x.capacity).slice(0, 10);
  });

  protected readonly steps = [
    { title: 'Elige clase y hora', body: 'Filtra por disciplina y mira cuántos cupos quedan en cada horario.' },
    { title: 'Deja tus datos', body: 'Nombre, correo y teléfono. Sin crear cuenta para tu primera clase.' },
    { title: 'Llega y entrena', body: 'Te avisamos 2 horas antes. Si no puedes, cancelas desde la app.' },
  ];

  protected readonly faq = [
    { q: '¿Necesito experiencia previa?', a: 'No. En la evaluación gratis medimos tu nivel y el coach adapta cargas y ejercicios en cada clase.' },
    { q: '¿Qué llevo a mi primera clase?', a: 'Ropa cómoda, zapatillas, agua y toalla. Para box te prestamos guantes y vendas.' },
    { q: '¿Puedo cancelar una reserva?', a: 'Sí, desde Mis reservas. Si cancelas con más de 3 horas de anticipación y usaste tu plan, la clase te vuelve.' },
    { q: '¿Hay matrícula o permanencia?', a: 'No. Pagas la clase suelta o un plan de 30 días, y decides cada mes si renuevas.' },
    { q: '¿Cómo pago?', a: 'Con Webpay (débito o crédito) o Mercado Pago, directamente al reservar o al contratar tu plan.' },
  ];

  protected readonly isToday = (iso: string) => iso === toIso(new Date());
  protected readonly dayLabel = (iso: string) => {
    if (this.isToday(iso)) return 'Hoy';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return iso === toIso(tomorrow) ? 'Mañana' : longDate(iso).split(',')[0];
  };
}
