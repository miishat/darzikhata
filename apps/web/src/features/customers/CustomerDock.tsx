import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { DOCK_FLAG } from '../../ui/PaymentDock';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const LIGHT = 'bg-brand-soft text-brand-strong';
/** The nav bar's height: tab row plus its 1px border plus the larger of 0.875rem and the safe area. */
const NAV_TOP = 'bottom-[calc(3.875rem+1px+max(0.875rem,env(safe-area-inset-bottom)))]';

export interface CustomerDockProps {
  /** Where "new measurement" goes; null when the person cannot take measurements. */
  measureHref: string | null;
  /** Where the order button goes; null when the person cannot create orders. */
  orderHref: string | null;
  orderLabel: string;
  /** What the customer owes in poisha, or null when the person cannot see money. */
  owed: number | null;
}

/**
 * Phone action bar for a customer, attached to the top of the tab bar like the payment dock: what they owe, new
 * measurement and order again. The chevron hides the whole bar, leaving a small "new measurement" tab on the nav bar's edge.
 */
export function CustomerDock({ measureHref, orderHref, orderLabel, owed }: CustomerDockProps) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset[DOCK_FLAG] = '1';
    return () => {
      delete document.documentElement.dataset[DOCK_FLAG];
    };
  }, [open]);

  if (!open) {
    return (
      <div className={`fixed right-3 ${NAV_TOP} z-[9]`}>
        <button
          type="button"
          aria-label={t('customer.dockShow')}
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={`flex h-9 items-center gap-2 rounded-t-2xl border border-b-0 border-line bg-panel pr-3 pl-4 text-sm font-bold shadow-[0_-6px_16px_-10px_rgba(14,22,48,0.35)] ${FOCUS}`}
        >
          {measureHref ? t('customer.newMeasure') : orderLabel}
          <ChevronUp aria-hidden="true" size={18} className="text-muted" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-x-0 ${NAV_TOP} z-[9] rounded-t-3xl border-t border-line bg-panel shadow-[0_-10px_24px_-14px_rgba(14,22,48,0.35)]`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        {owed !== null && (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted">{t('customer.stat.owed')}</span>
            <span className={`font-display text-lg leading-tight font-bold ${owed > 0 ? 'text-accent' : ''}`}>{money(owed)}</span>
          </div>
        )}
        {measureHref && (
          <Link to={measureHref} className={`flex h-12 items-center justify-center rounded-2xl px-4 text-base font-bold ${LIGHT} ${owed === null ? 'flex-1' : ''} ${FOCUS}`}>
            {t('customer.newMeasure')}
          </Link>
        )}
        {orderHref && (
          <Link
            to={orderHref}
            data-tour="order-again"
            className={`flex h-12 items-center justify-center rounded-2xl px-4 text-base font-bold ${LIGHT} ${owed === null ? 'flex-1' : ''} ${FOCUS}`}
          >
            {orderLabel}
          </Link>
        )}
        <button
          type="button"
          aria-label={t('customer.dockHide')}
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
