// PROTOTYPE (throwaway): three structurally different phone garment cards, switched with ?variant=A|B|C on the order screen.
// Read-only: every button is a stub. Fold the winner into MobileItemCard.tsx, then delete this folder and PrototypeSwitcher.
import { itemSummaryGroup, type Order, type OrderItem } from '@darzikhata/domain';
import { ChevronDown, ChevronRight, Ellipsis, Scissors, Shirt, UserPlus } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useSnapshot } from '../../../data/StoreContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { DueLabel } from '../../../ui/DueLabel';
import { stageTone, type Tone } from '../../../ui/stageTone';
import { itemTitle } from '../../common/orderText';
import { nextMove } from '../stageMoves';

const VARIANTS = ['A', 'B', 'C'] as const;
const NAMES: Record<string, string> = { A: 'Action first', B: 'A + C: band with progress', C: 'Status banner' };

export function useVariant(): string | null {
  const [params] = useSearchParams();
  const v = params.get('variant');
  return import.meta.env.DEV && v && (VARIANTS as readonly string[]).includes(v) ? v : null;
}

/** Floating bar: arrows and ← → keys cycle the variant in the URL. */
export function PrototypeSwitcher() {
  const [params, setParams] = useSearchParams();
  const current = params.get('variant') ?? '';
  const step = (d: number) => {
    const i = VARIANTS.indexOf(current as (typeof VARIANTS)[number]);
    const next = VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length]!;
    setParams((p) => {
      p.set('variant', next);
      return p;
    }, { replace: true });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input,textarea,[contenteditable]')) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (!import.meta.env.DEV || !current) return null;
  return (
    <div className="fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1 text-sm font-semibold text-white shadow-xl">
      <button type="button" aria-label="Previous variant" onClick={() => step(-1)} className="size-9 rounded-full">‹</button>
      <span>{current} ({NAMES[current]})</span>
      <button type="button" aria-label="Next variant" onClick={() => step(1)} className="size-9 rounded-full">›</button>
    </div>
  );
}

const BAND: Record<Tone, string> = {
  booked: 'bg-tone-booked-bg text-tone-booked-fg',
  cutting: 'bg-tone-cutting-bg text-tone-cutting-fg',
  working: 'bg-tone-working-bg text-tone-working-fg',
  trial: 'bg-tone-trial-bg text-tone-trial-fg',
  ready: 'bg-tone-ready-bg text-tone-ready-fg',
  done: 'bg-tone-done-bg text-tone-done-fg',
  cancelled: 'bg-tone-cancelled-bg text-tone-cancelled-fg',
};

function useFacts(order: Order, item: OrderItem) {
  const { language, label, date } = useI18n();
  const { config } = useSnapshot();
  const idx = item.stages.findIndex((s) => s.key === item.stageKey);
  const stage = item.stages[idx];
  const group = itemSummaryGroup(item);
  const next = nextMove(item);
  return {
    title: itemTitle(order, item, language),
    idx,
    total: item.stages.length,
    stageName: stage ? label(stage.label) : item.stageKey,
    nextName: next ? label(next.stage.label) : null,
    tone: stageTone(stage, group, Math.max(idx, 0)),
    open: group === 'unfinished' || group === 'ready',
    worker: item.assignedTo ? config?.staff.find((s) => s.id === item.assignedTo) : undefined,
    due: item.deliveryDate ? date(item.deliveryDate) : null,
    label,
  };
}

const CARD = 'flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4';
const PRIMARY = 'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-base font-bold text-on-brand';
const ROUND = 'flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface';

/** A: one question per card, "what do I do next?". Progress is a segmented bar, the next move is the only filled button. */
function VariantA({ order, item }: { order: Order; item: OrderItem }) {
  const f = useFacts(order, item);
  const { number } = useI18n();
  return (
    <section className={CARD} aria-label={f.title}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold">{f.title}</h3>
          {f.due && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              {f.due}
              {f.open && item.deliveryDate && <DueLabel date={item.deliveryDate} />}
            </p>
          )}
        </div>
        <button type="button" aria-label="More" className={`${ROUND} -mt-1 -mr-2`}>
          <Ellipsis size={22} />
        </button>
      </div>

      <div>
        <div className="flex gap-1" role="img" aria-label={`${f.idx + 1}/${f.total}`}>
          {item.stages.map((s, i) => (
            <span key={s.key} className={`h-2 flex-1 rounded-full ${i < f.idx ? 'bg-brand' : i === f.idx ? 'bg-brand ring-2 ring-brand-soft' : 'bg-line'}`} />
          ))}
        </div>
        <p className="mt-2 flex items-baseline justify-between text-sm">
          <span className="font-bold">{f.stageName}</span>
          <span className="text-muted">ধাপ {number(f.idx + 1)}/{number(f.total)}</span>
        </p>
      </div>

      {!f.worker && (
        <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm text-muted">
          <UserPlus size={18} aria-hidden="true" />
          কারিগর ঠিক করুন
          <ChevronRight size={16} className="ml-auto" />
        </button>
      )}

      {f.nextName && (
        <button type="button" className={PRIMARY}>
          {f.nextName} শুরু করুন
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}
      <button type="button" className="flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-muted">
        নোট ও ইতিহাস <ChevronDown size={16} aria-hidden="true" />
      </button>
    </section>
  );
}

/** B: A + C. Tinted status band with the segmented progress inside it, a muted tailor row, one filled action beside the menu. */
function VariantB({ order, item }: { order: Order; item: OrderItem }) {
  const f = useFacts(order, item);
  const { number, date } = useI18n();
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-panel" aria-label={f.title}>
      <div className={`flex flex-col gap-2.5 px-4 pt-3 pb-3.5 ${BAND[f.tone]}`}>
        <div className="flex items-center gap-3">
          <Shirt size={26} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold opacity-80">এখন · ধাপ {number(f.idx + 1)}/{number(f.total)}</p>
            <p className="font-display text-xl font-bold leading-tight">{f.stageName}</p>
          </div>
          {f.open && item.deliveryDate && <DueLabel date={item.deliveryDate} />}
        </div>
        <div className="flex gap-1" role="img" aria-label={`${f.idx + 1}/${f.total}`}>
          {item.stages.map((s, i) => (
            <span key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= f.idx ? 'bg-current' : 'bg-current opacity-20'}`} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 font-display text-lg font-semibold">{f.title}</h3>
          {f.due && (
            <p className="shrink-0 text-end text-sm leading-tight">
              <span className="block text-xs text-muted">ডেলিভারি</span>
              <span className="font-semibold">{f.due}</span>
            </p>
          )}
        </div>
        {item.trialDate && (
          <p className="flex items-center gap-2 text-sm">
            <Scissors size={16} aria-hidden="true" /> ট্রায়াল {date(item.trialDate)}
          </p>
        )}
        {f.worker ? (
          <p className="text-sm text-muted">কারিগর: <span className="font-semibold text-ink">{f.worker.name}</span></p>
        ) : (
          <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm text-muted">
            <UserPlus size={18} aria-hidden="true" />
            কারিগর ঠিক করুন
            <ChevronRight size={16} className="ml-auto" />
          </button>
        )}
        <div className="flex items-center gap-2">
          {f.nextName && (
            <button type="button" className={`${PRIMARY} flex-1`}>
              {f.nextName} শুরু করুন <ChevronRight size={20} aria-hidden="true" />
            </button>
          )}
          <button type="button" aria-label="More" className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line">
            <Ellipsis size={22} />
          </button>
        </div>
        <button type="button" className="flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-muted">
          নোট ও ইতিহাস <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/** C: a tinted status band says where the garment is at a glance; below it a fact grid and a split action row. */
function VariantC({ order, item }: { order: Order; item: OrderItem }) {
  const f = useFacts(order, item);
  const { date } = useI18n();
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-panel" aria-label={f.title}>
      <div className={`flex items-center gap-3 px-4 py-3 ${BAND[f.tone]}`}>
        <Shirt size={26} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold opacity-80">এখন</p>
          <p className="font-display text-xl font-bold leading-tight">{f.stageName}</p>
        </div>
        {f.open && item.deliveryDate && <DueLabel date={item.deliveryDate} />}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-display text-lg font-semibold">{f.title}</h3>
        <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-surface p-2.5">
            <dt className="text-xs text-muted">ডেলিভারি</dt>
            <dd className="m-0 font-semibold">{f.due ?? '-'}</dd>
          </div>
          <div className="rounded-xl bg-surface p-2.5">
            <dt className="text-xs text-muted">কারিগর</dt>
            <dd className="m-0 font-semibold">
              {f.worker ? f.worker.name : <span className="text-warn-ink">ঠিক হয়নি</span>}
            </dd>
          </div>
          {item.trialDate && (
            <div className="col-span-2 flex items-center gap-2 rounded-xl bg-surface p-2.5">
              <Scissors size={16} aria-hidden="true" />
              <span>ট্রায়াল {date(item.trialDate)}</span>
            </div>
          )}
        </dl>
        <div className="flex items-center gap-2">
          {f.nextName && (
            <button type="button" className={`${PRIMARY} flex-1`}>
              {f.nextName}-এ পাঠান
            </button>
          )}
          <button type="button" aria-label="More" className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line">
            <Ellipsis size={22} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function ItemCardVariant({ variant, order, item }: { variant: string; order: Order; item: OrderItem }) {
  if (variant === 'B') return <VariantB order={order} item={item} />;
  if (variant === 'C') return <VariantC order={order} item={item} />;
  return <VariantA order={order} item={item} />;
}
