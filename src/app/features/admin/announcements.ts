import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { AdminApi, Announcement } from './admin-api';

const AUDIENCE = { all: 'Todos', students: 'Alumnos e invitados', coaches: 'Coaches y admins' } as const;

@Component({
  selector: 'bs-admin-announcements',
  imports: [FormsModule, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="type-display text-[clamp(2.5rem,8vw,4.5rem)]">Avisos push</h1>
    <p class="mt-2 max-w-[60ch] text-sm text-bone/70">Llega como notificación a cada dispositivo con los avisos activados, aunque la app esté cerrada. Úsalo para novedades importantes: cada aviso innecesario hace que la gente los desactive.</p>

    <div class="mt-8 grid gap-10 lg:grid-cols-[1fr_1fr]">
      <form class="grid content-start gap-4" (ngSubmit)="send()" novalidate>
        <label><span class="field-label">Título</span><input class="field" name="title" maxlength="60" [(ngModel)]="draft.title" placeholder="Nueva clase de Box Kids" /><bs-field-error [error]="form.error('title')" /></label>
        <label>
          <span class="field-label">Mensaje</span>
          <textarea class="field min-h-24" name="body" maxlength="200" [(ngModel)]="draft.body" placeholder="Desde el lunes, sábados 10:00. Primera clase gratis."></textarea>
          <span class="mt-1 block text-right text-xs text-ash">{{ draft.body.length }}/200</span>
          <bs-field-error [error]="form.error('body')" />
        </label>
        <label>
          <span class="field-label">Al tocarla abre</span>
          <select class="field" name="url" [(ngModel)]="draft.url">
            <option value="/">Inicio</option><option value="/reservar">Reservar</option><option value="/horario">Horario</option><option value="/planes">Planes</option>
          </select>
        </label>
        <label>
          <span class="field-label">Enviar a</span>
          <select class="field" name="aud" [(ngModel)]="draft.audience">
            <option value="all">Todos</option><option value="students">Alumnos e invitados</option><option value="coaches">Coaches y admins</option>
          </select>
          <bs-field-error [error]="form.error('audience')" />
        </label>
        <bs-form-message [message]="form.message()" />
        <button type="submit" class="tape" [disabled]="form.busy()">Enviar aviso</button>
      </form>

      <div>
        <p class="mb-2 text-sm text-ash">Vista previa</p>
        <div class="flex gap-3 bg-bone p-4 text-ink shadow-[6px_6px_0_0_#000]">
          <img src="icons/icon-96x96.png" alt="" width="40" height="40" class="size-10" />
          <div class="min-w-0">
            <p class="font-semibold">{{ draft.title || 'Título del aviso' }}</p>
            <p class="text-sm text-ink/75">{{ draft.body || 'El mensaje aparece aquí.' }}</p>
          </div>
        </div>

        <h2 class="mt-10 mb-2 font-punch text-2xl font-extrabold italic">Enviados</h2>
        <ul class="divide-y divide-steel border-y border-steel text-sm">
          @for (a of history(); track a.id) {
            <li class="py-3">
              <p class="font-semibold">{{ a.title }}</p>
              <p class="text-bone/70">{{ a.body }}</p>
              <p class="mt-1 text-xs text-ash">{{ when(a.createdAt) }} · {{ audience[a.audience] }} · {{ a.sentCount }} dispositivos · {{ a.createdBy }}</p>
            </li>
          } @empty {
            <li class="py-3 text-bone/70">Todavía no envías avisos.</li>
          }
        </ul>
      </div>
    </div>
  `,
})
export default class AdminAnnouncements implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly audience = AUDIENCE;
  protected readonly history = signal<Announcement[]>([]);
  protected readonly form = new FormState();
  protected draft = { title: '', body: '', url: '/', audience: 'all' };

  ngOnInit() {
    void this.load();
  }

  private async load() {
    this.history.set(await this.admin.announcements());
  }

  protected when = (iso: string) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

  protected async send() {
    const r = await this.form.run(() => this.admin.announce(this.draft));
    if (r) {
      this.toast.ok('Aviso enviado', `Llegará a ${r.sentCount} ${r.sentCount === 1 ? 'dispositivo' : 'dispositivos'}.`);
      this.draft = { title: '', body: '', url: '/', audience: 'all' };
      void this.load();
    }
  }
}
