import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { PwaService } from '../../core/services/pwa.service';
import { ToastService } from '../../core/services/toast.service';
import { persistedSignal } from '../../core/services/storage';
import { Icon } from '../../shared/ui/icon';

type PrefKey = 'reminders' | 'changes' | 'promos';

@Component({
  selector: 'bs-alerts',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl px-4 pt-8 pb-28 md:px-6 md:pt-12">
      <h1 class="text-[clamp(3rem,13vw,6.5rem)]">
        <span class="type-display block">Avisos</span>
        <span class="type-outline block">y app</span>
      </h1>

      <!-- Notifications status -->
      <div class="mt-10 border border-steel bg-iron p-5 md:p-6">
        <div class="flex items-start gap-4">
          <span class="grid size-11 shrink-0 place-items-center" [class]="granted() ? 'bg-lime text-ink' : 'bg-steel text-bone'"><bs-icon name="bell" /></span>
          <div class="flex-1">
            <h2 class="font-punch text-2xl font-extrabold italic">{{ statusTitle() }}</h2>
            <p class="mt-1 text-bone/75">{{ statusBody() }}</p>
          </div>
        </div>
        <div class="mt-5 flex flex-wrap gap-3">
          @if (n.permission() === 'default') {
            <button type="button" class="tape" (click)="n.request()">Activar notificaciones</button>
          }
          @if (granted()) {
            <button type="button" class="tape" (click)="test()">Enviar notificación de prueba</button>
          }
        </div>
      </div>

      <!-- Install -->
      @if (!n.isStandalone) {
        <div class="mt-6 border border-steel p-5 md:p-6">
          <h2 class="font-punch text-2xl font-extrabold italic">Instala la app</h2>
          @if (n.isIos) {
            <p class="mt-1 text-bone/75">En iPhone y iPad las notificaciones solo funcionan con la app instalada (iOS 16.4 o superior).</p>
            <ol class="mt-4 space-y-3">
              <li class="flex gap-3"><span class="type-display w-6 text-2xl text-lime">1</span> Abre esta página en Safari y toca Compartir <bs-icon name="share" [size]="18" class="mt-0.5" /></li>
              <li class="flex gap-3"><span class="type-display w-6 text-2xl text-lime">2</span> Elige «Agregar a inicio» y confirma.</li>
              <li class="flex gap-3"><span class="type-display w-6 text-2xl text-lime">3</span> Abre Blood&amp;Sand desde el ícono y vuelve aquí para activar los avisos.</li>
            </ol>
          } @else if (pwa.canInstall()) {
            <p class="mt-1 text-bone/75">Ábrela desde tu pantalla de inicio o escritorio, funciona sin conexión y recibe avisos aunque esté cerrada.</p>
            <button type="button" class="tape mt-4" (click)="install()">Instalar Blood&amp;Sand</button>
          } @else {
            <p class="mt-1 text-bone/75">Desde el menú de tu navegador elige «Instalar app» o «Agregar a pantalla de inicio».</p>
          }
        </div>
      }

      <!-- Preferences -->
      <h2 class="mt-12 font-punch text-3xl font-extrabold italic">Qué quieres recibir</h2>
      <ul class="mt-4 divide-y divide-steel border-y border-steel">
        @for (p of prefList; track p.key) {
          <li>
            <label class="flex cursor-pointer items-center justify-between gap-4 py-4">
              <span>
                <span class="block font-semibold">{{ p.label }}</span>
                <span class="block text-sm text-ash">{{ p.hint }}</span>
              </span>
              <input type="checkbox" class="peer sr-only" [checked]="prefs()[p.key]" (change)="toggle(p.key)" />
              <span class="relative h-7 w-12 shrink-0 bg-steel transition-colors peer-checked:bg-lime peer-focus-visible:outline-3 peer-focus-visible:outline-lime after:absolute after:top-1 after:left-1 after:size-5 after:bg-bone after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-ink" aria-hidden="true"></span>
            </label>
          </li>
        }
      </ul>
    </section>
  `,
})
export default class Alerts {
  protected readonly n = inject(NotificationService);
  protected readonly pwa = inject(PwaService);
  private readonly toast = inject(ToastService);

  protected readonly prefs = persistedSignal<Record<PrefKey, boolean>>('prefs', { reminders: true, changes: true, promos: false });
  protected readonly prefList: { key: PrefKey; label: string; hint: string }[] = [
    { key: 'reminders', label: 'Recordatorio de clase', hint: '2 horas antes de cada reserva.' },
    { key: 'changes', label: 'Cambios de horario', hint: 'Si tu clase se mueve o se suspende.' },
    { key: 'promos', label: 'Novedades y promociones', hint: 'Clases nuevas, eventos y descuentos.' },
  ];

  protected readonly granted = computed(() => this.n.permission() === 'granted');
  protected readonly statusTitle = computed(() => {
    switch (this.n.permission()) {
      case 'granted': return 'Notificaciones activadas';
      case 'denied': return 'Notificaciones bloqueadas';
      case 'unsupported': return 'Notificaciones no disponibles';
      default: return 'Notificaciones desactivadas';
    }
  });
  protected readonly statusBody = computed(() => {
    switch (this.n.permission()) {
      case 'granted': return this.n.pushReady ? 'Te avisaremos 2 horas antes de cada clase y si el gimnasio cambia o cancela tu reserva, aunque tengas la app cerrada.' : 'Activadas. Los avisos con la app cerrada funcionan en la versión instalada (build de producción).';
      case 'denied': return 'Las bloqueaste en este navegador. Actívalas en los ajustes del sitio (ícono del candado junto a la dirección).';
      case 'unsupported': return this.n.needsInstall ? 'Instala la app en tu pantalla de inicio para recibirlas.' : 'Tu navegador no las admite. Prueba con Chrome, Edge, Firefox o Safari actualizados.';
      default: return 'Actívalas para recibir el recordatorio antes de cada clase.';
    }
  });

  protected toggle(key: PrefKey) {
    this.prefs.update((p) => ({ ...p, [key]: !p[key] }));
    this.toast.ok('Preferencia guardada');
  }

  protected test() {
    this.n.notify('Así se ven tus avisos', 'Así te avisaremos antes de cada clase.', '/reservar');
  }

  protected async install() {
    if (await this.pwa.install()) this.toast.ok('App instalada', 'Encuéntrala en tu pantalla de inicio.');
  }
}
