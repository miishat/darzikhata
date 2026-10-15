import type { Order } from '@darzikhata/domain';
import { moneySummary } from '@darzikhata/domain';
import { ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';

/** Add to a page's bottom padding when it shows a PaymentDock. */
export const PAYMENT_DOCK_SPACE = 'pb-36';

/** Set on <html> while the open dock is showing, so the shell can shrink its raised New order button to a regular tab. */
export const DOCK_FLAG = 'dockOpen';

/** Set on <html> while a bar takes the tab bar's place (the new order save bar), so the shell hides its tab bar. */
export const HIDE_TABS_FLAG = 'hideTabs';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
/** How long the page must be still before the hidden balance tab comes back. */
const SCROLL_SETTLE_MS = 600;
/** The nav bar's height: tab row plus its 1px border plus the larger of 0.875rem and the safe area. */
const NAV_TOP = 'bottom-[calc(3.875rem+1px+max(0.875rem,env(safe-area-inset-bottom)))]';

/**
 * Phone payment bar attached to the top of the tab bar: what is left to pay, receipt print and "take payment".
 * It starts hidden; the chevron hides the whole bar, leaving a small tab with the balance on the nav bar's edge.
 * That tab fades out while the page scrolls, so it never sits on what is being read.
 */
export function PaymentDock({ order, canPrint, onTake }: { order: Order; canPrint: boolean; onTake(): void }) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);
  const { paid, balance } = moneySummary(order);
  // The small balance tab floats over the page, so it steps aside while the page scrolls and comes back once it
  // settles. It stays put while it has keyboard focus.
  const tab = useRef<HTMLButtonElement>(null);
  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    if (open) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (document.activeElement === tab.current) return;
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), SCROLL_SETTLE_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      setScrolling(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset[DOCK_FLAG] = '1';
    return () => {
      delete document.documentElement.dataset[DOCK_FLAG];
    };
  }, [open]);

  if (!open) {
    return (
      <div
        inert={scrolling}
        className={`fixed right-3 ${NAV_TOP} z-[9] transition-opacity duration-200 motion-reduce:transition-none ${scrolling ? 'opacity-0' : 'opacity-100'}`}
      >
        <button
          ref={tab}
          type="button"
          aria-label={t('payments.dockShow')}
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={`flex h-9 items-center gap-2 rounded-t-2xl border border-b-0 border-line bg-panel pr-3 pl-4 shadow-[0_-6px_16px_-10px_rgba(14,22,48,0.35)] ${FOCUS}`}
        >
          <span className="font-display font-bold">{money(balance)}</span>
          <ChevronUp aria-hidden="true" size={18} className="text-muted" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-x-0 ${NAV_TOP} z-[9] rounded-t-3xl border-t border-line bg-panel shadow-[0_-10px_24px_-14px_rgba(14,22,48,0.35)]`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted">
            {t('money.balance')} · {t('money.paid')} {money(paid)}
          </span>
          <span className="font-display text-2xl leading-tight font-bold">{money(balance)}</span>
        </div>
        {canPrint && (
          <Link
            to={`/print/receipt/${order.id}`}
            aria-label={t('order.printReceipt')}
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong ${FOCUS}`}
          >
            <Printer aria-hidden="true" size={22} />
          </Link>
        )}
        <button
          type="button"
          onClick={onTake}
          className={`flex h-12 items-center justify-center rounded-2xl bg-brand-soft px-5 text-base font-bold text-brand-strong ${FOCUS}`}
        >
          {t('payments.take')}
        </button>
        <button
          type="button"
          aria-label={t('payments.dockHide')}
          aria-expanded
          onClick={() => setOpen(false)}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted ${FOCUS}`}
        >
          <ChevronDown aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );
}
