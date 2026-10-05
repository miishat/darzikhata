// PROTOTYPE (throwaway). Shortlisted phone order bottom bars, switchable with ?bar=B|G|F.
import { moneySummary, type Order } from '@darzikhata/domain';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';

const KEYS = ['B', 'G', 'F'] as const;
const NAMES: Record<string, string> = {
  B: 'Card one row, fully togglable',
  G: 'Docked, regular New order, fully togglable',
  F: 'G with a light payment button',
};
const POS = 'fixed inset-x-0 bottom-[calc(3.875rem+1px+1.375rem+max(0.875rem,env(safe-area-inset-bottom)))] z-20';
const TAB_TOP = 'bottom-[calc(3.875rem+1px+max(0.875rem,env(safe-area-inset-bottom)))]';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

interface Props {
  order: Order;
  canPrint: boolean;
  onTake(): void;
}

export function PrototypePaymentBar(props: Props) {
  const [params] = useSearchParams();
  const v = params.get('bar') ?? 'B';
  return (
    <>
      {v === 'B' && <CardBar {...props} oneRow />}
      {v === 'G' && <Docked {...props} toggle compact />}
      {v === 'F' && <Docked {...props} toggle compact light />}
      <Switcher current={v} />
    </>
  );
}

function usePaid(order: Order) {
  const s = moneySummary(order);
  return { ...s, pct: s.total > 0 ? Math.min(100, Math.round((s.paid / s.total) * 100)) : 0 };
}

function PrintCircle({ order, className = '' }: { order: Order; className?: string }) {
  const { t } = useI18n();
  return (
    <Link to={`/print/receipt/${order.id}`} aria-label={t('order.printReceipt')} className={`flex shrink-0 items-center justify-center ${FOCUS} ${className}`}>
      <Printer aria-hidden="true" size={22} />
    </Link>
  );
}

const PRINT_TINT = 'bg-brand-soft text-brand-strong';

function Chevron({ open, onClick, className }: { open: boolean; onClick(): void; className: string }) {
  return (
    <button type="button" aria-label={open ? 'collapse' : 'expand'} aria-expanded={open} onClick={onClick} className={`flex items-center justify-center text-muted ${FOCUS} ${className}`}>
      {open ? <ChevronDown aria-hidden="true" size={18} /> : <ChevronUp aria-hidden="true" size={18} />}
    </button>
  );
}

/** A and B: floating card. A stacks (progress, buttons); B is one row with a thin progress line. Both fold to a slim pill. */
function CardBar({ order, canPrint, onTake, oneRow = false }: Props & { oneRow?: boolean }) {
  const { t, money } = useI18n();
  const s = usePaid(order);
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div className={`${POS} flex justify-end px-3`}>
        <button type="button" aria-label="expand" aria-expanded={false} onClick={() => setOpen(true)} className={`flex h-11 items-center gap-2 rounded-full bg-panel pr-3 pl-4 shadow-xl ring-1 ring-line ${FOCUS}`}>
          <span className="font-display font-bold">{money(s.balance)}</span>
          <ChevronUp aria-hidden="true" size={18} className="text-muted" />
        </button>
      </div>
    );
  }

  if (oneRow) {
    return (
      <div className={`${POS} px-3`}>
        <div className="overflow-hidden rounded-3xl bg-panel shadow-xl ring-1 ring-line">
          <div aria-hidden="true" className="h-1 bg-surface">
            <div className="h-full bg-ok" style={{ width: `${s.pct}%` }} />
          </div>
          <div className="flex items-center gap-2.5 p-3">
            <div className="flex min-w-0 flex-1 flex-col pl-1">
              <span className="text-xs text-muted">
                {t('money.balance')} · {t('money.paid')} {money(s.paid)}
              </span>
              <span className="font-display text-2xl font-bold leading-tight">{money(s.balance)}</span>
            </div>
            {canPrint && <PrintCircle order={order} className={`size-12 rounded-2xl ${PRINT_TINT}`} />}
            <button type="button" onClick={onTake} className={`flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-base font-bold text-on-brand ${FOCUS}`}>
              {t('payments.take')}
            </button>
            <Chevron open onClick={() => setOpen(false)} className="size-9 rounded-full bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${POS} px-3`}>
      <div className="relative flex flex-col gap-2.5 rounded-3xl bg-panel p-3.5 shadow-xl ring-1 ring-line">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span className="text-sm text-muted">
              {t('money.paid')} {money(s.paid)}
            </span>
            <span className="font-display text-lg font-bold">
              {t('money.balance')} {money(s.balance)}
            </span>
          </div>
          <Chevron open onClick={() => setOpen(false)} className="-my-1 size-8 shrink-0 rounded-full bg-surface" />
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-ok" style={{ width: `${s.pct}%` }} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onTake} className={`flex h-12 flex-1 items-center justify-center rounded-2xl bg-brand text-base font-bold text-on-brand ${FOCUS}`}>
            {t('payments.take')}
          </button>
          {canPrint && <PrintCircle order={order} className={`h-12 w-14 rounded-2xl ${PRINT_TINT}`} />}
        </div>
      </div>
    </div>
  );
}

/** D, F, G: attached to the nav bar. compact: New order becomes a regular tab while the bar shows. toggle: collapsible. */
function Docked({ order, canPrint, onTake, toggle = false, compact = false, light = false }: Props & { toggle?: boolean; compact?: boolean; light?: boolean }) {
  const { t, money } = useI18n();
  const s = usePaid(order);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!compact || !open) return;
    document.documentElement.dataset.compactFab = '1';
    return () => {
      delete document.documentElement.dataset.compactFab;
    };
  }, [compact, open]);
  const expanded = open;
  if (!open) {
    return (
      <div className={`fixed right-3 ${TAB_TOP} z-[9]`}>
        <button type="button" aria-label="expand" aria-expanded={false} onClick={() => setOpen(true)} className={`flex h-9 items-center gap-2 rounded-t-2xl border border-b-0 border-line bg-panel pr-3 pl-4 shadow-[0_-6px_16px_-10px_rgba(14,22,48,0.35)] ${FOCUS}`}>
          <span className="font-display font-bold">{money(s.balance)}</span>
          <ChevronUp aria-hidden="true" size={18} className="text-muted" />
        </button>
      </div>
    );
  }
  return (
    <div
      className={`fixed inset-x-0 ${TAB_TOP} z-[9] rounded-t-3xl border-t border-line bg-panel shadow-[0_-10px_24px_-14px_rgba(14,22,48,0.35)]`}
    >
      <div className={`flex items-center gap-3 px-4 ${expanded ? 'pt-2.5' : 'pt-2.5'} ${compact ? 'pb-2.5' : 'pb-2'}`}>
        <div className="flex min-w-0 flex-1 flex-col">
          {expanded && (
            <span className="text-xs text-muted">
              {t('money.balance')} · {t('money.paid')} {money(s.paid)}
            </span>
          )}
          <span className={`font-display font-bold leading-tight ${expanded ? 'text-2xl' : 'text-lg'}`}>
            {!expanded && <span className="mr-1.5 text-xs font-medium text-muted">{t('money.balance')}</span>}
            {money(s.balance)}
          </span>
        </div>
        {expanded && canPrint && <PrintCircle order={order} className={`size-12 rounded-2xl ${PRINT_TINT}`} />}
        <button
          type="button"
          onClick={onTake}
          className={`flex items-center justify-center rounded-2xl px-5 text-base font-bold ${light ? PRINT_TINT : 'bg-brand text-on-brand'} ${expanded ? 'h-12' : 'h-10'} ${FOCUS}`}
        >
          {t('payments.take')}
        </button>
        {toggle && <Chevron open onClick={() => setOpen(false)} className="size-9 rounded-full bg-surface" />}
      </div>
    </div>
  );
}

function Switcher({ current }: { current: string }) {
  const [, setParams] = useSearchParams();
  const go = (delta: number) => {
    const next = KEYS[(KEYS.indexOf(current as (typeof KEYS)[number]) + delta + KEYS.length) % KEYS.length]!;
    setParams((p) => {
      const q = new URLSearchParams(p);
      q.set('bar', next);
      return q;
    }, { replace: true });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-1.5 py-1 text-xs font-semibold text-white shadow-lg">
      <button type="button" aria-label="previous" onClick={() => go(-1)} className="flex size-8 items-center justify-center"><ChevronLeft size={16} /></button>
      <span className="whitespace-nowrap px-1">{current} ({NAMES[current]})</span>
      <button type="button" aria-label="next" onClick={() => go(1)} className="flex size-8 items-center justify-center"><ChevronRight size={16} /></button>
    </div>
  );
}
