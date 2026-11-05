import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { Order, Session } from '../../core/models';
import { money, toIso } from '../../core/utils/date';
import { PlateMeter } from '../../shared/ui/plate-meter';
import { Status } from '../../shared/ui/status';
import { AdminApi, Dashboard as Data } from './admin-api';

const W = 600;
const H = 160;
const PAD_B = 18;

@Component({
  selector: 'bs-admin-dashboard',
  imports: [RouterLink, PlateMeter, Status],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="type-display text-[clamp(2.5rem,8vw,4.5rem)]">Resumen</h1>
    @if (error()) { <p class="mt-4 border-l-4 border-blood bg-blood/10 p-4">{{ error() }}</p> }

    @if (data(); as d) {
      <!-- Headline numbers -->
      <dl class="mt-6 grid grid-cols-2 gap-px bg-steel lg:grid-cols-4">
        <div class="bg-iron p-4 md:p-5">
          <dt class="text-sm text-ash">Ventas del mes</dt>
          <dd class="mt-1 font-punch text-3xl font-extrabold italic md:text-4xl">{{ money(d.revenueMonth) }}</dd>
          <dd class="text-xs text-bone/60">{{ monthDelta() }}</dd>
        </div>
        <div class="bg-iron p-4 md:p-5">
          <dt class="text-sm text-ash">Ventas de hoy</dt>
          <dd class="mt-1 font-punch text-3xl font-extrabold italic md:text-4xl">{{ money(d.revenueToday) }}</dd>
        </div>
        <div class="bg-iron p-4 md:p-5">
          <dt class="text-sm text-ash">Ocupación próximos 7 días</dt>
          <dd class="mt-1 font-punch text-3xl font-extrabold italic md:text-4xl">{{ pct(d.occupancy7d) }}</dd>
          <dd class="text-xs text-bone/60">{{ d.bookingsToday }} reservas hoy</dd>
        </div>
        <div class="bg-iron p-4 md:p-5">
          <dt class="text-sm text-ash">Planes activos</dt>
          <dd class="mt-1 font-punch text-3xl font-extrabold italic md:text-4xl">{{ d.activeMembers }}</dd>
          <dd class="text-xs text-bone/60">{{ d.newStudents30d }} alumnos nuevos en 30 días</dd>
        </div>
      </dl>
      @if (d.pendingOrders) {
        <a routerLink="/admin/pagos" [queryParams]="{ status: 'pending' }" class="mt-3 inline-block text-sm text-pink underline underline-offset-4">
          {{ d.pendingOrders }} {{ d.pendingOrders === 1 ? 'pago pendiente' : 'pagos pendientes' }}
        </a>
      }

      <div class="mt-10 grid gap-10 xl:grid-cols-[1.6fr_1fr]">
        <!-- Revenue, last 30 days (single series: no legend, title names it) -->
        <figure>
          <figcaption class="mb-3 flex items-baseline justify-between gap-4">
            <span class="font-punch text-2xl font-extrabold italic">Ventas por día, últimos 30 días</span>
            <span class="text-sm text-ash">{{ money(total30()) }}</span>
          </figcaption>
          <div class="relative" (mouseleave)="hover.set(null)">
            <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="h-auto w-full" role="img" [attr.aria-label]="'Ventas diarias de los últimos 30 días, total ' + money(total30())">
              @for (y of gridLines(); track y.v) {
                <line x1="0" [attr.x2]="W" [attr.y1]="y.y" [attr.y2]="y.y" stroke="var(--color-steel)" stroke-width="1" />
                <text x="0" [attr.y]="y.y - 4" class="fill-ash text-[10px]">{{ short(y.v) }}</text>
              }
              @for (b of bars(); track b.date) {
                <!-- hit target taller than the mark -->
                <rect [attr.x]="b.x - b.gap / 2" y="0" [attr.width]="b.w + b.gap" [attr.height]="H - PAD_B" fill="transparent"
                  (mouseenter)="hover.set(b)" (focus)="hover.set(b)" tabindex="0" [attr.aria-label]="b.label + ': ' + money(b.amount)" />
                @if (b.h > 0) {
                  <path [attr.d]="b.path" [attr.fill]="hover()?.date === b.date ? 'var(--color-lime)' : 'var(--color-lime-dim)'" pointer-events="none" />
                }
              }
              <line x1="0" [attr.x2]="W" [attr.y1]="H - PAD_B" [attr.y2]="H - PAD_B" stroke="var(--color-ash)" stroke-width="1" />
              @for (b of bars(); track b.date; let i = $index) {
                @if (i % 7 === 0 && i < bars().length - 3 || i === bars().length - 1) {
                  <text [attr.x]="b.x + b.w / 2" [attr.y]="H - 4" text-anchor="middle" class="fill-ash text-[10px]">{{ b.tick }}</text>
                }
              }
            </svg>
            @if (hover(); as h) {
              <div class="pointer-events-none absolute top-0 -translate-x-1/2 border border-steel bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap shadow-[4px_4px_0_0_#000]"
                [style.left.%]="((h.x + h.w / 2) / W) * 100">
                <span class="block text-ash">{{ h.label }}</span>
                <span class="font-semibold text-bone">{{ money(h.amount) }}</span> · {{ h.orders }} {{ h.orders === 1 ? 'pago' : 'pagos' }}
              </div>
            }
          </div>
          <details class="mt-2 text-sm">
            <summary class="cursor-pointer text-ash">Ver como tabla</summary>
            <table class="mt-2 w-full text-left">
              <thead><tr class="text-ash"><th class="py-1 font-normal">Día</th><th class="font-normal">Pagos</th><th class="text-right font-normal">Monto</th></tr></thead>
              <tbody>
                @for (r of d.revenue30d; track r.date) {
                  @if (r.orders) { <tr class="border-t border-steel"><td class="py-1">{{ r.date }}</td><td>{{ r.orders }}</td><td class="text-right">{{ money(r.amount) }}</td></tr> }
                }
              </tbody>
            </table>
          </details>
        </figure>

        <!-- Bookings by discipline, last 30 days -->
        <figure>
          <figcaption class="mb-3"><span class="block font-punch text-2xl font-extrabold italic">Reservas por disciplina</span><span class="text-sm text-ash">Últimos 30 días y próximas 2 semanas</span></figcaption>
          <ul class="space-y-3">
            @for (x of disciplines(); track x.name) {
              <li>
                <div class="mb-1 flex justify-between text-sm"><span>{{ x.name }}</span><span class="font-semibold">{{ x.bookings }}</span></div>
                <div class="h-2.5 bg-steel"><div class="h-full rounded-r-[4px] bg-lime-dim" [style.width.%]="x.pct"></div></div>
              </li>
            }
          </ul>
        </figure>
      </div>

      <!-- Today -->
      <h2 class="mt-12 mb-3 font-punch text-2xl font-extrabold italic">Clases de hoy</h2>
      @if (today().length) {
        <ul class="divide-y divide-steel border-y border-steel">
          @for (s of today(); track s.id) {
            <li>
              <a [routerLink]="['/admin/clases', s.id]" class="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-3 hover:bg-iron">
                <span class="type-display pl-2 text-2xl">{{ s.start }}</span>
                <span><span class="font-semibold">{{ s.discipline }}</span> <span class="text-sm text-ash">· {{ s.coachName ?? 'sin coach' }}</span></span>
                @if (s.status === 'cancelled') { <bs-status value="cancelled" /> } @else { <bs-plate-meter [taken]="s.taken" [capacity]="s.capacity" /> }
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="text-bone/70">No hay clases hoy.</p>
      }

      <h2 class="mt-12 mb-3 flex items-baseline justify-between font-punch text-2xl font-extrabold italic">
        Últimos pagos <a routerLink="/admin/pagos" class="font-sans text-sm font-semibold text-lime not-italic">Ver todos</a>
      </h2>
      <ul class="divide-y divide-steel border-y border-steel text-sm">
        @for (o of recent(); track o.id) {
          <li class="flex flex-wrap items-center justify-between gap-2 py-3">
            <span><span class="font-semibold">{{ o.buyerName }}</span> · {{ o.description }}</span>
            <span class="flex items-center gap-3">{{ money(o.amount) }} <bs-status [value]="o.status" /></span>
          </li>
        } @empty {
          <li class="py-3 text-bone/70">Todavía no hay pagos.</li>
        }
      </ul>
    } @else if (!error()) {
      <div class="mt-6 grid grid-cols-2 gap-px lg:grid-cols-4">@for (i of [1, 2, 3, 4]; track i) { <div class="h-28 animate-pulse bg-iron"></div> }</div>
    }
  `,
})
export default class Dashboard implements OnInit {
  private readonly admin = inject(AdminApi);
  protected readonly W = W;
  protected readonly H = H;
  protected readonly PAD_B = PAD_B;
  protected readonly money = money;

  protected readonly data = signal<Data | null>(null);
  protected readonly today = signal<Session[]>([]);
  protected readonly recent = signal<Order[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly hover = signal<ReturnType<Dashboard['bars']>[number] | null>(null);

  async ngOnInit() {
    try {
      const iso = toIso(new Date());
      const [d, s, o] = await Promise.all([this.admin.dashboard(), this.admin.sessions(iso, iso), this.admin.orders({ limit: 6 })]);
      this.data.set(d);
      this.today.set(s);
      this.recent.set(o.items);
    } catch (e) {
      this.error.set(toApiError(e).message);
    }
  }

  protected pct = (v: number) => `${Math.round(v * 100)}%`;
  protected short = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);

  protected readonly total30 = computed(() => (this.data()?.revenue30d ?? []).reduce((n, d) => n + d.amount, 0));

  protected readonly monthDelta = computed(() => {
    const d = this.data();
    if (!d || !d.revenuePrevMonth) return 'Primer mes con ventas registradas';
    const diff = (d.revenueMonth - d.revenuePrevMonth) / d.revenuePrevMonth;
    return `${diff >= 0 ? '+' : ''}${Math.round(diff * 100)}% vs. mes anterior completo`;
  });

  private readonly max = computed(() => Math.max(1, ...(this.data()?.revenue30d ?? []).map((d) => d.amount)));

  protected readonly gridLines = computed(() => {
    const max = this.max();
    const step = niceStep(max / 3);
    const out = [];
    for (let v = step; v <= max; v += step) out.push({ v, y: (H - PAD_B) * (1 - v / max) });
    return out;
  });

  protected readonly bars = computed(() => {
    const rows = this.data()?.revenue30d ?? [];
    const max = this.max();
    const slot = W / Math.max(rows.length, 1);
    const gap = 2;
    const w = slot - gap;
    const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
    return rows.map((r, i) => {
      const h = r.amount ? Math.max(2, ((H - PAD_B) * r.amount) / max) : 0;
      const x = i * slot + gap / 2;
      const y = H - PAD_B - h;
      const rad = Math.min(4, w / 2, h);
      // flat at the baseline, 4px rounded data-end on top
      const path = `M${x},${H - PAD_B} V${y + rad} Q${x},${y} ${x + rad},${y} H${x + w - rad} Q${x + w},${y} ${x + w},${y + rad} V${H - PAD_B} Z`;
      return { date: r.date, amount: r.amount, orders: r.orders, x, w, h, gap, path, label: fmt(r.date), tick: r.date.slice(8) + '/' + r.date.slice(5, 7) };
    });
  });

  protected readonly disciplines = computed(() => {
    const list = this.data()?.byDiscipline ?? [];
    const max = Math.max(1, ...list.map((x) => x.bookings));
    return list.map((x) => ({ ...x, pct: (x.bookings / max) * 100 }));
  });
}

function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
