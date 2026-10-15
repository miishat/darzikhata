// PROTOTYPE (throwaway): round 2 of keeping "remove garment" from reading as "× quantity" in the phone garment sheet.
// Plan: Current plus five mixes of round 1's B (− + counter, remove on the title line) and E's press-and-hold remove,
// switchable via ?variant= on /app/orders/new. Round 1 (variants A to E) is in this branch's first commit.
import { toScript } from '@darzikhata/domain';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useVariant } from '../../../ui/PrototypeSwitcher';
import type { DraftErrors, DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { ItemHeader } from './ItemHeader';

export const REMOVE_VARIANT_KEYS = ['0', 'BE1', 'BE2', 'BE3', 'BE4', 'BE5'] as const;

export function useRemoveVariants(): Record<string, string> {
  const pick = usePick();
  return {
    '0': pick('এখনকার: সংখ্যার পাশে ×', 'Current: × next to quantity'),
    BE1: pick('BE1: − + সংখ্যা, নিচে চেপে ধরে বাদ', 'BE1: − + counter, hold-to-remove bar at the bottom'),
    BE2: pick('BE2: শিরোনামের লাইনে চেপে ধরে বাদ', 'BE2: hold-to-remove pill on the title line'),
    BE3: pick('BE3: সংখ্যার ঠিক নিচে হালকা বার', 'BE3: light hold bar right under the counter'),
    BE4: pick('BE4: শিরোনামে মুছুন আইকন, ধরলে বৃত্ত ভরে', 'BE4: bin icon on the title line with a filling ring'),
    BE5: pick('BE5: হয়েছে আর বাদ এক সারিতে', 'BE5: Done and hold-to-remove side by side'),
  };
}

export function useRemoveVariant(): string {
  return useVariant(REMOVE_VARIANT_KEYS);
}

function usePick() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

/** How the slip row shows quantity: Current keeps "× n"; the new variants say "n pcs" and only when it is more than one. */
export function QuantitySuffix({ quantity, variant }: { quantity: number; variant: string }) {
  const { language } = useI18n();
  const n = toScript(String(quantity), language);
  if (variant === '0') return <> × {n}</>;
  if (quantity <= 1) return null;
  return <span className="font-normal text-muted"> · {language === 'bn' ? `${n}টি` : `${n} pcs`}</span>;
}

/** The quantity (and, in BE3, the remove bar) at the top of the Measure tab. */
export function ItemTop({ entry, item, errors, variant }: { entry: OrderEntry; item: DraftItem; errors: DraftErrors; variant: string }) {
  if (variant === '0') return <ItemHeader entry={entry} item={item} errors={errors} />;
  if (variant === 'BE3')
    return (
      <div className="flex flex-col gap-2">
        <Stepper entry={entry} item={item} />
        <HoldToRemove entry={entry} item={item} look="light" />
      </div>
    );
  return <Stepper entry={entry} item={item} />;
}

/** BE2 and BE4: the remove control sits on the sheet's own title line, which already names the garment. */
export function SheetHeader({ entry, item, variant }: { entry: OrderEntry; item: DraftItem; variant: string }) {
  if (variant !== 'BE2' && variant !== 'BE4') return null;
  return (
    <div className="-mt-[46px] flex justify-end">
      <HoldToRemove entry={entry} item={item} look={variant === 'BE2' ? 'pill' : 'ring'} />
    </div>
  );
}

/** BE1: a full width hold bar under Done. BE5: Done and the hold button share one row. */
export function SheetFooter({ entry, item, variant, onDone }: { entry: OrderEntry; item: DraftItem; variant: string; onDone(): void }) {
  const { t } = useI18n();
  if (variant === 'BE1') return <HoldToRemove entry={entry} item={item} look="bar" />;
  if (variant === 'BE5')
    return (
      <div className="flex gap-2">
        <HoldToRemove entry={entry} item={item} look="half" />
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-11 flex-[1.3] items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover"
        >
          {t('work.done')}
        </button>
      </div>
    );
  return null;
}

function Stepper({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
  const { t, language } = useI18n();
  const pick = usePick();
  const set = (q: number) => entry.updateItem(item.key, { quantity: Math.max(1, Math.min(99, q)) });
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">{t('entry.quantity')}</span>
      <div className="flex items-center rounded-xl border border-line bg-panel">
        <button type="button" aria-label={pick('একটি কম', 'One less')} disabled={item.quantity <= 1} onClick={() => set(item.quantity - 1)} className="grid size-11 place-items-center disabled:opacity-40">
          <Minus aria-hidden="true" size={18} />
        </button>
        <span className="min-w-10 text-center font-display text-xl font-semibold">{toScript(String(item.quantity), language)}</span>
        <button type="button" aria-label={pick('একটি বেশি', 'One more')} onClick={() => set(item.quantity + 1)} className="grid size-11 place-items-center">
          <Plus aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );
}

const HOLD_MS = 900;

type Look = 'bar' | 'pill' | 'light' | 'ring' | 'half';

/** Removes the garment only after a press held for HOLD_MS; letting go early cancels. */
function HoldToRemove({ entry, item, look }: { entry: OrderEntry; item: DraftItem; look: Look }) {
  const pick = usePick();
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const frame = useRef(0);
  const stop = () => {
    start.current = null;
    cancelAnimationFrame(frame.current);
    setProgress(0);
  };
  const tick = () => {
    if (start.current === null) return;
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      stop();
      entry.removeItem(item.key);
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const press = {
    onPointerDown: () => {
      start.current = performance.now();
      frame.current = requestAnimationFrame(tick);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  };
  const holding = progress > 0;
  const long = holding ? pick('ধরে রাখুন…', 'Keep holding…') : pick('চেপে ধরে বাদ দিন', 'Press and hold to remove');
  const short = holding ? pick('ধরে রাখুন…', 'Hold…') : pick('চেপে ধরে বাদ', 'Hold to remove');
  const fill = <span aria-hidden="true" className="absolute inset-y-0 start-0 bg-danger/20" style={{ width: `${progress * 100}%` }} />;

  if (look === 'ring') {
    const r = 18;
    const c = 2 * Math.PI * r;
    return (
      <button type="button" aria-label={pick('চেপে ধরে বাদ দিন', 'Press and hold to remove')} {...press} className="relative grid size-11 select-none place-items-center rounded-full text-danger hover:bg-danger/10">
        <svg aria-hidden="true" viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="3" />
          <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} strokeLinecap="round" />
        </svg>
        <Trash2 aria-hidden="true" size={18} />
        {holding && <span className="absolute top-full mt-1 whitespace-nowrap rounded bg-ink px-2 py-0.5 text-xs text-panel">{short}</span>}
      </button>
    );
  }
  const shape: Record<Exclude<Look, 'ring'>, string> = {
    bar: 'mt-2 w-full min-h-11 rounded-lg border border-danger/50 px-4 text-sm',
    pill: 'min-h-11 rounded-full border border-danger/40 px-3 text-sm',
    light: 'w-full min-h-11 rounded-lg bg-danger/5 px-4 text-sm',
    half: 'min-h-11 flex-1 whitespace-nowrap rounded-lg border border-danger/50 px-2 text-sm',
  };
  return (
    <button type="button" {...press} className={`relative select-none overflow-hidden font-semibold text-danger ${shape[look]}`}>
      {fill}
      <span className="relative inline-flex items-center gap-2">
        <Trash2 aria-hidden="true" size={look === 'bar' ? 18 : 16} />
        {look === 'bar' || look === 'light' ? long : short}
      </span>
    </button>
  );
}
