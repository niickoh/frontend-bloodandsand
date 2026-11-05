import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import { CatalogStore } from '../../core/services/catalog.store';
import { ToastService } from '../../core/services/toast.service';
import { Discipline, Plan } from '../../core/models';
import { money } from '../../core/utils/date';
import { FormState } from '../../shared/form-state';
import { FieldError, FormMessage } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';
import { Modal } from '../../shared/ui/modal';
import { Status } from '../../shared/ui/status';
import { AdminApi } from './admin-api';

type DisciplineDraft = Omit<Discipline, 'id'> & { id?: number };
type PlanDraft = Omit<Plan, 'id' | 'perks'> & { id?: number; perksText: string; unlimited: boolean };

@Component({
  selector: 'bs-admin-catalog',
  imports: [FormsModule, Icon, Modal, Status, FieldError, FormMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="type-display text-[clamp(2.5rem,8vw,4.5rem)]">Disciplinas y planes</h1>

    <section class="mt-8">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-punch text-2xl font-extrabold italic">Disciplinas</h2>
        <button type="button" class="tape !px-3 !py-1 !text-base" (click)="editDiscipline()"><bs-icon name="plus" [size]="18" /> Nueva</button>
      </div>
      <ul class="mt-3 divide-y divide-steel border-y border-steel">
        @for (d of disciplines(); track d.id) {
          <li>
            <button type="button" class="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-2 py-3 text-left hover:bg-iron sm:grid-cols-[1fr_8rem_6rem_6rem]" (click)="editDiscipline(d)">
              <span><span class="font-semibold">{{ d.name }}</span> <span class="text-sm text-ash">· {{ d.tagline }}</span></span>
              <span class="text-sm">{{ d.durationMin }} min</span>
              <span class="hidden text-sm sm:block">{{ money(d.price) }}</span>
              <span class="hidden sm:block"><bs-status [value]="d.active ? 'active' : 'inactive'" /></span>
            </button>
          </li>
        }
      </ul>
    </section>

    <section class="mt-12">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-punch text-2xl font-extrabold italic">Planes</h2>
        <button type="button" class="tape !px-3 !py-1 !text-base" (click)="editPlan()"><bs-icon name="plus" [size]="18" /> Nuevo</button>
      </div>
      <ul class="mt-3 divide-y divide-steel border-y border-steel">
        @for (p of plans(); track p.id) {
          <li>
            <button type="button" class="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-2 py-3 text-left hover:bg-iron sm:grid-cols-[1fr_9rem_7rem_6rem]" (click)="editPlan(p)">
              <span><span class="font-semibold">{{ p.name }}</span> @if (p.featured) { <span class="text-xs text-lime">· destacado</span> } @if (!p.sellable) { <span class="text-xs text-ash">· solo informativo</span> }</span>
              <span class="text-sm">{{ p.credits === null ? 'Ilimitado' : p.credits + ' clases' }} · {{ p.periodDays }} d</span>
              <span class="hidden text-sm sm:block">{{ money(p.price) }}</span>
              <span class="hidden sm:block"><bs-status [value]="p.active ? 'active' : 'inactive'" /></span>
            </button>
          </li>
        }
      </ul>
    </section>

    <bs-modal [title]="dDraft.id ? 'Editar disciplina' : 'Nueva disciplina'" [open]="modal() === 'discipline'" (closed)="modal.set(null)">
      <form class="grid grid-cols-2 gap-4" (ngSubmit)="saveDiscipline()" novalidate>
        <label><span class="field-label">Nombre</span><input class="field" name="name" [(ngModel)]="dDraft.name" /><bs-field-error [error]="form.error('name')" /></label>
        <label><span class="field-label">Identificador</span><input class="field" name="slug" [(ngModel)]="dDraft.slug" placeholder="box-kids" /><bs-field-error [error]="form.error('slug')" /></label>
        <label class="col-span-2"><span class="field-label">Lema</span><input class="field" name="tagline" [(ngModel)]="dDraft.tagline" maxlength="40" /></label>
        <label class="col-span-2"><span class="field-label">Resumen</span><input class="field" name="short" [(ngModel)]="dDraft.short" maxlength="80" /></label>
        <label class="col-span-2"><span class="field-label">Descripción</span><textarea class="field min-h-20" name="desc" [(ngModel)]="dDraft.description"></textarea></label>
        <label><span class="field-label">Duración (min)</span><input class="field" type="number" name="dur" [(ngModel)]="dDraft.durationMin" /><bs-field-error [error]="form.error('durationMin')" /></label>
        <label><span class="field-label">Precio clase suelta</span><input class="field" type="number" name="price" [(ngModel)]="dDraft.price" /><bs-field-error [error]="form.error('price')" /></label>
        <label>
          <span class="field-label">Foto</span>
          <select class="field" name="image" [(ngModel)]="dDraft.image">
            <option value="box">Box</option><option value="fuerza">Fuerza</option><option value="funcional">Funcional</option><option value="hero">Retrato</option>
          </select>
        </label>
        <label><span class="field-label">Orden</span><input class="field" type="number" name="sort" [(ngModel)]="dDraft.sort" /></label>
        <label class="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="credit" [(ngModel)]="dDraft.usesCredit" class="size-4 accent-lime" /> Se puede reservar con clases del plan</label>
        <label class="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="active" [(ngModel)]="dDraft.active" class="size-4 accent-lime" /> Visible y reservable</label>
        <div class="col-span-2"><bs-form-message [message]="form.message()" /></div>
        <div class="col-span-2 flex items-center justify-between gap-3">
          @if (dDraft.id) { <button type="button" class="text-sm text-blood underline" (click)="deleteDiscipline()">Eliminar</button> } @else { <span></span> }
          <button type="submit" class="tape" [disabled]="form.busy()">Guardar</button>
        </div>
      </form>
    </bs-modal>

    <bs-modal [title]="pDraft.id ? 'Editar plan' : 'Nuevo plan'" [open]="modal() === 'plan'" (closed)="modal.set(null)">
      <form class="grid grid-cols-2 gap-4" (ngSubmit)="savePlan()" novalidate>
        <label><span class="field-label">Nombre</span><input class="field" name="name" [(ngModel)]="pDraft.name" /><bs-field-error [error]="form.error('name')" /></label>
        <label><span class="field-label">Identificador</span><input class="field" name="slug" [(ngModel)]="pDraft.slug" placeholder="plan-12" /><bs-field-error [error]="form.error('slug')" /></label>
        <label><span class="field-label">Precio</span><input class="field" type="number" name="price" [(ngModel)]="pDraft.price" /><bs-field-error [error]="form.error('price')" /></label>
        <label><span class="field-label">Duración (días)</span><input class="field" type="number" name="days" [(ngModel)]="pDraft.periodDays" /><bs-field-error [error]="form.error('periodDays')" /></label>
        <label class="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="unl" [(ngModel)]="pDraft.unlimited" class="size-4 accent-lime" /> Clases ilimitadas</label>
        @if (!pDraft.unlimited) {
          <label><span class="field-label">Clases incluidas</span><input class="field" type="number" name="credits" [(ngModel)]="pDraft.credits" /><bs-field-error [error]="form.error('credits')" /></label>
        }
        <label><span class="field-label">Reserva hasta (días antes)</span><input class="field" type="number" name="window" [(ngModel)]="pDraft.bookingWindowDays" /><bs-field-error [error]="form.error('bookingWindowDays')" /></label>
        <label class="col-span-2"><span class="field-label">Beneficios (uno por línea)</span><textarea class="field min-h-24" name="perks" [(ngModel)]="pDraft.perksText"></textarea></label>
        <label><span class="field-label">Orden</span><input class="field" type="number" name="sort" [(ngModel)]="pDraft.sort" /></label>
        <div class="grid content-end gap-2">
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="feat" [(ngModel)]="pDraft.featured" class="size-4 accent-lime" /> Destacado</label>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="sell" [(ngModel)]="pDraft.sellable" class="size-4 accent-lime" /> Se puede comprar</label>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="active" [(ngModel)]="pDraft.active" class="size-4 accent-lime" /> Visible</label>
        </div>
        <div class="col-span-2"><bs-form-message [message]="form.message()" /></div>
        <div class="col-span-2 flex items-center justify-between gap-3">
          @if (pDraft.id) { <button type="button" class="text-sm text-blood underline" (click)="deletePlan()">Eliminar</button> } @else { <span></span> }
          <button type="submit" class="tape" [disabled]="form.busy()">Guardar</button>
        </div>
      </form>
    </bs-modal>
  `,
})
export default class AdminCatalog implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly catalog = inject(CatalogStore);
  private readonly toast = inject(ToastService);
  protected readonly money = money;

  protected readonly disciplines = signal<Discipline[]>([]);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly modal = signal<'discipline' | 'plan' | null>(null);
  protected readonly form = new FormState();
  protected dDraft: DisciplineDraft = this.emptyDiscipline();
  protected pDraft: PlanDraft = this.emptyPlan();

  ngOnInit() {
    void this.load();
  }

  private async load() {
    const [d, p] = await Promise.all([this.admin.disciplines(), this.admin.plans()]);
    this.disciplines.set(d);
    this.plans.set(p);
  }

  private emptyDiscipline(): DisciplineDraft {
    return { slug: '', name: '', tagline: '', short: '', description: '', durationMin: 60, price: 8000, image: 'box', usesCredit: true, active: true, sort: 10 };
  }

  private emptyPlan(): PlanDraft {
    return { slug: '', name: '', price: 39990, periodDays: 30, credits: 8, bookingWindowDays: 14, perksText: '', featured: false, sellable: true, active: true, sort: 10, unlimited: false };
  }

  protected editDiscipline(d?: Discipline) {
    this.form.reset();
    this.dDraft = d ? { ...d } : this.emptyDiscipline();
    this.modal.set('discipline');
  }

  protected editPlan(p?: Plan) {
    this.form.reset();
    this.pDraft = p ? { ...p, perksText: p.perks.join('\n'), unlimited: p.credits === null } : this.emptyPlan();
    this.modal.set('plan');
  }

  private async done(msg: string) {
    this.modal.set(null);
    this.toast.ok(msg);
    await this.load();
    void this.catalog.load(true); // refresh the public site
  }

  protected async saveDiscipline() {
    if (await this.form.run(() => this.admin.saveDiscipline(this.dDraft))) await this.done('Disciplina guardada');
  }

  protected async savePlan() {
    const { perksText, unlimited, ...rest } = this.pDraft;
    const plan: Partial<Plan> = { ...rest, credits: unlimited ? null : rest.credits, perks: perksText.split('\n').map((s) => s.trim()).filter(Boolean) };
    if (await this.form.run(() => this.admin.savePlan(plan))) await this.done('Plan guardado');
  }

  protected async deleteDiscipline() {
    if (!confirm(`¿Eliminar ${this.dDraft.name}?`)) return;
    try {
      await this.admin.deleteDiscipline(this.dDraft.id!);
      await this.done('Disciplina eliminada');
    } catch (e) {
      this.form.message.set(toApiError(e).message);
    }
  }

  protected async deletePlan() {
    if (!confirm(`¿Eliminar ${this.pDraft.name}? Los planes ya vendidos se mantienen.`)) return;
    try {
      await this.admin.deletePlan(this.pDraft.id!);
      await this.done('Plan eliminado');
    } catch (e) {
      this.form.message.set(toApiError(e).message);
    }
  }
}
