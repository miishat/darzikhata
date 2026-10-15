// PROTOTYPE (throwaway): five ways to keep "remove garment" from reading as "× quantity" in the phone garment sheet.
// Plan: Current plus five variants of the phone new order slip, switchable via ?variant= on /app/orders/new.
import { toScript } from '@darzikhata/domain';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../../ui/Button';
import { useVariant } from '../../../ui/PrototypeSwitcher';
import type { DraftErrors, DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { ItemHeader } from './ItemHeader';
import { useItemTitle } from './shared';

export const REMOVE_VARIANT_KEYS = ['0', 'A', 'B', 'C', 'D', 'E'] as const;

export function useRemoveVariants(): Record<string, string> {
  const pick = usePick();
  return {
    '0': pick('এখনকার: সংখ্যার পাশে ×', 'Current: × next to quantity'),
    A: pick('A: নিচে লেখা-সহ বাদ বোতাম', 'A: labelled remove button at the bottom'),
    B: pick('B: − + সংখ্যা, ওপরে মুছুন', 'B: − + stepper, trash in the header'),
    C: pick('C: তালিকা থেকে বাদ', 'C: remove from the slip list'),
    D: pick('D: সংখ্যার নিচে লিংক, নিশ্চিত করুন', 'D: link under quantity, confirm inline'),
    E: pick('E: সংখ্যার চিপ, চেপে ধরে বাদ', 'E: quantity chips, hold to remove'),
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

/** The quantity and remove controls at the top of the Measure tab. */
export function ItemTop({ entry, item, errors, variant }: { entry: OrderEntry; item: DraftItem; errors: DraftErrors; variant: string }) {
  if (variant === '0') return <ItemHeader entry={entry} item={item} errors={errors} />;
  if (variant === 'B') return <Stepper entry={entry} item={item} />;
  if (variant === 'E') return <QuantityChips entry={entry} item={item} />;
  if (variant === 'D')
    return (
      <div className="flex flex-col gap-2">
        <ItemHeader entry={entry} item={item} errors={errors} showRemove={false} />
        <ConfirmLink entry={entry} item={item} />
      </div>
    );
  return <ItemHeader entry={entry} item={item} errors={errors} showRemove={false} />;
}

/** B: a header above the tabs with the garment name and a labelled trash button. */
export function SheetHeader({ entry, item, variant }: { entry: OrderEntry; item: DraftItem; variant: string }) {
  const pick = usePick();
  if (variant !== 'B') return null;
  // Sits on the sheet's own title line, which already names the garment.
  return (
    <div className="-mt-[46px] flex justify-end">
      <button
        type="button"
        onClick={() => entry.removeItem(item.key)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger/10"
      >
        <Trash2 aria-hidden="true" size={18} />
        {pick('বাদ দিন', 'Remove')}
      </button>
    </div>
  );
}

/** A: below Done, a full width outlined danger button that names the garment. E: the same spot holds a press-and-hold button. */
export function SheetFooter({ entry, item, variant }: { entry: OrderEntry; item: DraftItem; variant: string }) {
  const { t } = useI18n();
  const title = useItemTitle(entry);
  if (variant === 'A')
    return (
      <button
        type="button"
        onClick={() => entry.removeItem(item.key)}
        className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-danger/50 px-4 text-sm font-semibold text-danger hover:bg-danger/10"
      >
        <Trash2 aria-hidden="true" size={18} />
        {t('entry.removeItem', { item: title(item) })}
      </button>
    );
  if (variant === 'E') return <HoldToRemove entry={entry} item={item} />;
  return null;
}

/** C: a trash button at the end of each slip row; the first tap turns the row into a confirm. */
export function RowRemove({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
  const pick = usePick();
  const title = useItemTitle(entry);
  const [asking, setAsking] = useState(false);
  if (asking)
    return (
      <div className="flex w-full items-center gap-2 bg-danger/10 px-4 py-2">
        <span className="min-w-0 flex-1 text-sm font-semibold text-danger">{pick(`${title(item)} বাদ দেবেন?`, `Remove ${title(item)}?`)}</span>
        <Button variant="ghost" onClick={() => setAsking(false)}>
          {pick('না', 'No')}
        </Button>
        <Button variant="danger" onClick={() => entry.removeItem(item.key)}>
          {pick('হ্যাঁ, বাদ দিন', 'Yes, remove')}
        </Button>
      </div>
    );
  return (
    <button
      type="button"
      aria-label={pick(`${title(item)} বাদ দিন`, `Remove ${title(item)}`)}
      onClick={() => setAsking(true)}
      className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
    >
      <Trash2 aria-hidden="true" size={18} />
    </button>
  );
}

function Stepper({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
  const { t, language } = useI18n();
  const set = (q: number) => entry.updateItem(item.key, { quantity: Math.max(1, Math.min(99, q)) });
  const pick = usePick();
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

function QuantityChips({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
  const { t, language } = useI18n();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{t('entry.quantity')}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = item.quantity === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() => entry.updateItem(item.key, { quantity: n })}
              className={`grid min-h-11 flex-1 place-items-center rounded-xl border font-display text-lg font-semibold ${on ? 'border-brand bg-brand text-on-brand' : 'border-line bg-panel'}`}
            >
              {toScript(String(n), language)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ConfirmLink({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
  const pick = usePick();
  const [asking, setAsking] = useState(false);
  if (asking)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2">
        <span className="min-w-0 flex-1 text-sm font-semibold text-danger">{pick('এই পোশাকটি বাদ দেবেন?', 'Remove this garment?')}</span>
        <Button variant="ghost" onClick={() => setAsking(false)}>
          {pick('থাক', 'Keep')}
        </Button>
        <Button variant="danger" onClick={() => entry.removeItem(item.key)}>
          {pick('বাদ দিন', 'Remove')}
        </Button>
      </div>
    );
  return (
    <button type="button" onClick={() => setAsking(true)} className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-danger underline-offset-4 hover:underline">
      <Trash2 aria-hidden="true" size={16} />
      {pick('এই পোশাকটি অর্ডার থেকে বাদ দিন', 'Remove this garment from the order')}
    </button>
  );
}

const HOLD_MS = 900;

function HoldToRemove({ entry, item }: { entry: OrderEntry; item: DraftItem }) {
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
  return (
    <button
      type="button"
      onPointerDown={() => {
        start.current = performance.now();
        frame.current = requestAnimationFrame(tick);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative mt-2 min-h-11 select-none overflow-hidden rounded-lg border border-danger/50 px-4 text-sm font-semibold text-danger"
    >
      <span aria-hidden="true" className="absolute inset-y-0 start-0 bg-danger/20" style={{ width: `${progress * 100}%` }} />
      <span className="relative inline-flex items-center gap-2">
        <Trash2 aria-hidden="true" size={18} />
        {progress > 0 ? pick('ধরে রাখুন…', 'Keep holding…') : pick('চেপে ধরে বাদ দিন', 'Press and hold to remove')}
      </span>
    </button>
  );
}
