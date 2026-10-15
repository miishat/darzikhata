// PROTOTYPE (throwaway): audit #2. On the phone Work list, "সেলাই শেষ" moves a garment on at once with no undo, the
// card leaves the tab, and the next card's button slides up under the thumb, so a second tap moves the wrong garment.
// Current plus five ways to make that safe, switchable via ?variant= on /app/work.
import type { Order, OrderItem } from '@darzikhata/domain';
import { Check, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useVariant } from '../../ui/PrototypeSwitcher';

export const DONE_VARIANT_KEYS = ['0', 'V1', 'V2', 'V3', 'V4', 'V5'] as const;

export function usePick() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

export function useDoneVariants(): Record<string, string> {
  const pick = usePick();
  return {
    '0': pick('এখনকার: চাপলেই সরে যায়, ফেরানো যায় না', 'Current: moves at once, no undo'),
    V1: pick('V1: নিচে "ফিরিয়ে নিন" বার', 'V1: undo bar at the bottom'),
    V2: pick('V2: কার্ড জায়গায় থাকে, "ফিরিয়ে নিন" সহ', 'V2: card stays in place with Undo'),
    V3: pick('V3: নিশ্চিত করতে দুবার চাপুন', 'V3: tap twice to confirm'),
    V4: pick('V4: ৪ সেকেন্ড পরে সরে, তার আগে বাতিল করা যায়', 'V4: moves after 4 seconds, cancel before'),
    V5: pick('V5: চেপে ধরে শেষ করুন', 'V5: press and hold to finish'),
  };
}

export function useDoneVariant(): string {
  return useVariant(DONE_VARIANT_KEYS);
}

const UNDO_REASON = 'ভুল করে চাপা হয়েছিল, ফিরিয়ে নেওয়া হলো';

/** Moving a garment on, and back again (a rework move needs a reason, so undo gives one). */
export function useMove() {
  const store = useStore();
  return {
    move: (order: Order, item: OrderItem, to: string) =>
      store.dispatch({ type: 'item.stageChanged', orderId: order.id, itemId: item.id, to, reason: '' }),
    undo: (orderId: string, itemId: string, back: string) =>
      store.dispatch({ type: 'item.stageChanged', orderId, itemId, to: back, reason: UNDO_REASON }),
  };
}

export interface DoneRecord {
  orderId: string;
  itemId: string;
  from: string;
  title: string;
  doneLabel: string;
  /** Where the card stood in the list when it was finished (V2 keeps a stub there). */
  index: number;
  /** The card's height, so the stub fills the same space. */
  height: number;
}

export function useWords() {
  const pick = usePick();
  return {
    undo: pick('ফিরিয়ে নিন', 'Undo'),
    tapAgain: pick('নিশ্চিত করতে আবার চাপুন', 'Tap Again to Confirm'),
    moving: pick('সরানো হচ্ছে…', 'Moving on…'),
    cancel: pick('বাতিল', 'Cancel'),
    hold: (label: string) => pick(`চেপে ধরুন: ${label}`, `Hold: ${label}`),
    keepHolding: pick('ধরে রাখুন…', 'Keep Holding…'),
  };
}

const BIG = 'relative flex min-h-[50px] w-full select-none items-center justify-center gap-2 overflow-hidden rounded-[14px] px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const PRIMARY = `${BIG} bg-brand text-on-brand hover:bg-brand-hover`;

/** The move-on button per variant. `onDone` is told once the garment has actually moved. */
export function DoneButton({ order, item, to, label, variant, onDone }: { order: Order; item: OrderItem; to: string; label: string; variant: string; onDone(from: string): void }) {
  const { move } = useMove();
  const words = useWords();
  const go = async () => {
    const from = item.stageKey;
    const outcome = await move(order, item, to);
    if (outcome.kind !== 'conflict' && outcome.kind !== 'rejected') onDone(from);
  };

  if (variant === 'V3') return <TwoTap label={label} again={words.tapAgain} onConfirm={() => void go()} />;
  if (variant === 'V4') return <Delayed label={label} moving={words.moving} cancel={words.cancel} onConfirm={() => void go()} />;
  if (variant === 'V5') return <Hold label={words.hold(label)} holding={words.keepHolding} onConfirm={() => void go()} />;
  return (
    <button type="button" className={PRIMARY} onClick={() => void go()}>
      {label}
    </button>
  );
}

function TwoTap({ label, again, onConfirm }: { label: string; again: string; onConfirm(): void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={armed ? `${BIG} bg-ok text-white` : PRIMARY}
      onClick={() => {
        if (armed) onConfirm();
        else setArmed(true);
      }}
    >
      {armed ? (
        <>
          <Check aria-hidden="true" size={20} />
          {again}
        </>
      ) : (
        label
      )}
    </button>
  );
}

const DELAY_MS = 4000;

function Delayed({ label, moving, cancel, onConfirm }: { label: string; moving: string; cancel: string; onConfirm(): void }) {
  const [pending, setPending] = useState(false);
  const confirm = useRef(onConfirm);
  confirm.current = onConfirm;
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => {
      setPending(false);
      confirm.current();
    }, DELAY_MS);
    return () => clearTimeout(id);
  }, [pending]);
  if (!pending)
    return (
      <button type="button" className={PRIMARY} onClick={() => setPending(true)}>
        {label}
      </button>
    );
  return (
    <div className={`${BIG} justify-between bg-brand-soft pe-1 text-brand-strong`}>
      <span aria-hidden="true" className="absolute inset-y-0 start-0 bg-brand/20" style={{ width: '100%', animation: `proto-shrink ${DELAY_MS}ms linear forwards` }} />
      <span className="relative truncate">{moving}</span>
      <button type="button" className="relative inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-panel px-3 text-sm font-bold text-ink shadow-sm" onClick={() => setPending(false)}>
        <RotateCcw aria-hidden="true" size={16} />
        {cancel}
      </button>
      <style>{'@keyframes proto-shrink { from { width: 100%; } to { width: 0%; } }'}</style>
    </div>
  );
}

const HOLD_MS = 700;

function Hold({ label, holding, onConfirm }: { label: string; holding: string; onConfirm(): void }) {
  const [down, setDown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setDown(false);
  };
  const start = () => {
    if (timer.current) return;
    setDown(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setDown(false);
      onConfirm();
    }, HOLD_MS);
  };
  return (
    <button type="button" className={`${PRIMARY} [touch-action:manipulation]`} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}>
      <span aria-hidden="true" className="absolute inset-y-0 start-0 bg-white/25" style={{ width: down ? '100%' : '0%', transition: down ? `width ${HOLD_MS}ms linear` : 'none' }} />
      <span className="relative">{down ? holding : label}</span>
    </button>
  );
}

/** V2: what is left where a finished card stood, so nothing below it moves up. */
export function DoneStub({ record, onUndo }: { record: DoneRecord; onUndo(): void }) {
  const words = useWords();
  return (
    <li>
      <div style={{ minHeight: record.height }} className="flex items-center gap-3 rounded-2xl border border-dashed border-ok/50 bg-ok-soft p-3.5">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ok text-white">
          <Check size={22} />
        </span>
        <p className="min-w-0 flex-1 font-semibold text-ok">
          {record.title}: {record.doneLabel}
        </p>
        <button type="button" onClick={onUndo} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink">
          <RotateCcw aria-hidden="true" size={16} />
          {words.undo}
        </button>
      </div>
    </li>
  );
}

/** V1: a bar above the tab bar with the last move and Undo, gone after six seconds. */
export function UndoBar({ record, onUndo, onGone }: { record: DoneRecord; onUndo(): void; onGone(): void }) {
  const words = useWords();
  const gone = useRef(onGone);
  gone.current = onGone;
  useEffect(() => {
    const id = setTimeout(() => gone.current(), 6000);
    return () => clearTimeout(id);
  }, [record]);
  return (
    <div role="status" className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-2xl bg-ink px-4 py-2.5 text-panel shadow-xl">
      <Check aria-hidden="true" size={20} className="shrink-0" />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">
        {record.title}: {record.doneLabel}
      </p>
      <button type="button" onClick={onUndo} className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-bold text-brand-soft underline">
        {words.undo}
      </button>
    </div>
  );
}
