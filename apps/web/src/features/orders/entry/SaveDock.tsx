import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { DOCK_FLAG } from '../../../ui/PaymentDock';
import type { DraftTotals } from '../draft';

/** Add to a page's bottom padding when it shows a SaveDock. */
export const SAVE_DOCK_SPACE = 'pb-36';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
/** The nav bar's height: tab row plus its 1px border plus the larger of 0.875rem and the safe area. */
const NAV_TOP = 'bottom-[calc(3.875rem+1px+max(0.875rem,env(safe-area-inset-bottom)))]';

/**
 * Phone save bar attached to the top of the tab bar, like the order payment bar: the total, what is left to pay and
 * "save order". The chevron folds it into a small total tab on the nav bar's edge.
 */
export function SaveDock({ totals, saving, onSave }: { totals: DraftTotals; saving: boolean; onSave(): void }) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(true);

  // While it is open the shell shrinks its raised New order button to a regular tab so the dock sits flush.
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
          aria-label={t('entry.dockShow')}
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={`flex h-9 items-center gap-2 rounded-t-2xl border border-b-0 border-line bg-panel pr-3 pl-4 shadow-[0_-6px_16px_-10px_rgba(14,22,48,0.35)] ${FOCUS}`}
        >
          <span className="font-display font-bold">{money(totals.total)}</span>
          <ChevronUp aria-hidden="true" size={18} className="text-muted" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-x-0 ${NAV_TOP} z-[9] rounded-t-3xl border-t border-line bg-panel shadow-[0_-10px_24px_-14px_rgba(14,22,48,0.35)]`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs text-muted">
            {t('money.total')} · {t('money.balance')} {money(totals.balance)}
          </span>
          <span className="font-display text-2xl leading-tight font-bold">{money(totals.total)}</span>
        </div>
        <button
          type="button"
          data-tour="save-order"
          disabled={saving}
          onClick={onSave}
          className={`flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-base font-bold text-on-brand disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
        >
          {saving ? t('entry.saving') : t('entry.save')}
        </button>
        <button
          type="button"
          aria-label={t('entry.dockHide')}
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
