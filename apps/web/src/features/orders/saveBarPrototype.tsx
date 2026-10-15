// PROTOTYPE (throwaway): five ways to make the phone new order save bar grey out until the order can be saved, and
// to hide the tab bar while the save bar is showing. Switch with ?variant=0|1|2|3|4|5 on /app/orders/new at phone width.
//   0 current: save always looks ready, tab bar stays under the save bar
//   1 dim save, tab bar hidden; folding the bar with the chevron brings the tab bar back
//   2 the button names the next step (pick a customer, add a garment) and only becomes "Save Order" when ready
//   3 checklist: customer and garment ticks replace the total line; save stays grey until both are ticked
//   4 one full-width button with the total inside it, and a hint line above it while it is grey
//   5 the tab bar stays while the order is empty; the save bar replaces it once there is a customer and a price
// "Ready" means a customer is picked and the total is above ৳0. A grey button still responds: it opens the missing part.
import type { Language } from '@darzikhata/domain';
import { Check, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { DOCK_FLAG } from '../../ui/PaymentDock';
import type { DraftTotals } from './draft';

export const SAVE_BAR_VARIANTS = {
  '0': 'Current',
  '1': 'Dim save, tab bar hidden',
  '2': 'Button names the next step',
  '3': 'Checklist instead of total',
  '4': 'Full-width button with hint',
  '5': 'Tab bar until ready, then save bar',
} as const;
export const SAVE_BAR_KEYS = Object.keys(SAVE_BAR_VARIANTS);

const WORDS = {
  garment: { bn: 'পোশাক', en: 'Garment' },
  needCustomer: { bn: 'আগে কাস্টমার বেছে নিন', en: 'Pick a customer first' },
  needGarment: { bn: 'আগে পোশাক যোগ করুন', en: 'Add a garment first' },
  needPrice: { bn: 'পোশাকের দাম লিখুন', en: 'Enter the garment price' },
} as const;
const word = (language: Language, key: keyof typeof WORDS) => WORDS[key][language === 'bn' ? 'bn' : 'en'];

/** Hides the shell's tab bar while mounted (the shell reads data-hide-tabs on <html>). */
function useHideTabs(hide: boolean) {
  useEffect(() => {
    if (!hide) return;
    document.documentElement.dataset.hideTabs = '1';
    return () => {
      delete document.documentElement.dataset.hideTabs;
    };
  }, [hide]);
}

/** While the save bar sits on the tab bar the shell shrinks its raised New order button (same as the current SaveDock). */
function useDockFlag(on: boolean) {
  useEffect(() => {
    if (!on) return;
    document.documentElement.dataset[DOCK_FLAG] = '1';
    return () => {
      delete document.documentElement.dataset[DOCK_FLAG];
    };
  }, [on]);
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const NAV_TOP = 'bottom-[calc(3.875rem+1px+max(0.875rem,env(safe-area-inset-bottom)))]';
const AT_BOTTOM = 'bottom-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]';
const SHELF = 'fixed inset-x-0 z-[9] rounded-t-3xl border-t border-line bg-panel shadow-[0_-10px_24px_-14px_rgba(14,22,48,0.35)]';
const SOLID = `flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-base font-bold text-on-brand ${FOCUS}`;
const GREY = 'opacity-45 saturate-50';

interface Props {
  variant: string;
  totals: DraftTotals;
  saving: boolean;
  hasCustomer: boolean;
  hasGarment: boolean;
  onSave(): void;
  onPickCustomer(): void;
  onAddGarment(): void;
}

export function PrototypeSaveBar(props: Props) {
  const { variant, totals, saving, hasCustomer, hasGarment, onSave, onPickCustomer, onAddGarment } = props;
  const { t, money, language } = useI18n();
  const [open, setOpen] = useState(true);
  const ready = hasCustomer && totals.total > 0;
  // A grey button still does something: it opens whatever is missing.
  const press = () => {
    if (ready) return onSave();
    if (!hasCustomer) return onPickCustomer();
    return onAddGarment();
  };
  const missing = !hasCustomer ? word(language, 'needCustomer') : !hasGarment ? word(language, 'needGarment') : word(language, 'needPrice');

  const hideTabs = variant === '5' ? ready : variant === '1' ? open : true;
  useHideTabs(hideTabs);
  useDockFlag(variant === '5' && !ready);

  const totalLine = (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-xs text-muted">
        {t('money.total')} · {t('money.balance')} {money(totals.balance)}
      </span>
      <span className="font-display text-2xl leading-tight font-bold">{money(totals.total)}</span>
    </div>
  );
  const saveButton = (
    <button
      type="button"
      data-tour="save-order"
      disabled={saving}
      aria-disabled={!ready || undefined}
      onClick={press}
      className={`${SOLID} ${ready ? '' : GREY}`}
    >
      {saving ? t('entry.saving') : t('entry.save')}
    </button>
  );

  if (variant === '1') {
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
      <div className={`${SHELF} ${AT_BOTTOM}`}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          {totalLine}
          {saveButton}
          <button
            type="button"
            aria-label={t('entry.dockHide')}
            aria-expanded
            onClick={() => setOpen(false)}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-muted ${FOCUS}`}
          >
            <ChevronDown aria-hidden="true" size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (variant === '2') {
    const next = !hasCustomer ? t('entry.pickCustomer') : t('entry.addGarment');
    return (
      <div className={`${SHELF} ${AT_BOTTOM}`}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          {totalLine}
          {ready ? (
            saveButton
          ) : (
            <button
              type="button"
              onClick={press}
              className={`flex h-12 items-center justify-center rounded-2xl border-2 border-brand px-4 text-base font-bold text-brand-strong ${FOCUS}`}
            >
              {next}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === '3') {
    const tick = (done: boolean, text: string, onClick: () => void) => (
      <button
        type="button"
        onClick={onClick}
        className={`flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2.5 text-sm font-semibold ${done ? 'bg-ok-soft text-ok' : 'bg-surface text-muted'} ${FOCUS}`}
      >
        {done ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : <Circle aria-hidden="true" size={16} />}
        {text}
      </button>
    );
    return (
      <div className={`${SHELF} ${AT_BOTTOM}`}>
        <div className="flex items-center gap-2 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 gap-1">
            {tick(hasCustomer, t('entry.step.customer'), onPickCustomer)}
            {tick(totals.total > 0, word(language, 'garment'), onAddGarment)}
          </div>
          {saveButton}
        </div>
      </div>
    );
  }

  if (variant === '4') {
    return (
      <div className={`${SHELF} ${AT_BOTTOM}`}>
        <div className="flex flex-col gap-1.5 px-4 pt-2.5 pb-1">
          {!ready && <p className="text-center text-sm font-medium text-muted">{missing}</p>}
          <button
            type="button"
            data-tour="save-order"
            disabled={saving}
            aria-disabled={!ready || undefined}
            onClick={press}
            className={`${SOLID} w-full gap-2 ${ready ? '' : GREY}`}
          >
            {saving ? t('entry.saving') : t('entry.save')}
            <span aria-hidden="true">·</span>
            <span className="font-display">{money(totals.total)}</span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === '5') {
    // Not ready: nothing to save yet, so the tab bar stays and only a small hint shows above it.
    if (!ready) {
      return (
        <div className={`fixed inset-x-0 ${NAV_TOP} z-[9] flex justify-center pb-6`}>
          <button type="button" onClick={press} className={`rounded-full bg-navy px-4 py-2 text-sm font-semibold text-on-navy shadow-lg ${FOCUS}`}>
            {missing}
          </button>
        </div>
      );
    }
    return (
      <div className={`${SHELF} ${AT_BOTTOM}`}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          {totalLine}
          {saveButton}
        </div>
      </div>
    );
  }

  return null;
}
