import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PlanList } from '../../shared/plan-list';

@Component({
  selector: 'bs-plans',
  imports: [PlanList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-7xl px-4 pt-8 pb-28 md:px-6 md:pt-12">
      <h1 class="page-title">
        <span class="type-display block">Planes</span>
        <span class="type-outline block">y precios</span>
      </h1>
      <p class="mt-4 mb-14 max-w-[52ch] text-bone/75">
        Sin matrícula ni contrato. Tu primera clase y la evaluación son gratis. Para contratar un plan necesitas una cuenta; la clase suelta la pagas sin registrarte.
      </p>
      <bs-plan-list />

      <div class="mt-20 grid gap-8 border-t border-steel pt-10 md:grid-cols-3">
        @for (q of faq; track q.q) {
          <div>
            <h2 class="font-punch text-2xl font-extrabold italic">{{ q.q }}</h2>
            <p class="mt-2 text-bone/70">{{ q.a }}</p>
          </div>
        }
      </div>
    </section>
  `,
})
export default class Plans {
  protected readonly faq = [
    { q: '¿Puedo cancelar una clase?', a: 'Sí, desde Mis reservas hasta 3 horas antes. Si usaste una clase del plan, se te devuelve.' },
    { q: '¿Qué pasa si no uso todas mis clases?', a: 'Las clases del plan vencen al terminar el periodo. Te avisamos antes para que las aproveches.' },
    { q: '¿Cómo pago?', a: 'Con Webpay (débito o crédito) o Mercado Pago. Recibes la confirmación al instante.' },
  ];
}
