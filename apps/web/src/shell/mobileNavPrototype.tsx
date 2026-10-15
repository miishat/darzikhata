// PROTOTYPE (throwaway): five ways to put Payments within reach on a phone and add a search that works everywhere.
// Switch with ?variant=0|1|2|3|4|5 on any phone page.
//   1 Payments becomes a fifth tab; a search icon in the header opens a full-screen search
//   2 the header becomes a search field; Payments takes the Customers tab (customers are found by search)
//   3 tabs unchanged; the header gets a search icon and a "collected today" chip that opens Payments
//   4 nothing in the shell changes; Home opens with a search field and a Payments button on top
//   5 a search bar sits above the tab bar, in thumb reach; Payments takes the Home tab, the logo goes Home
import { todayInDhaka, type Role } from '@darzikhata/domain';
import { ArrowLeft, Search, Wallet } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useScopedState } from '../features/branches/BranchScopeProvider';
import { dashboardModel } from '../features/dashboard/dashboard';
import { useI18n } from '../i18n/I18nProvider';
import { GlobalSearch } from './GlobalSearch';

export const NAV_VARIANTS = {
  '0': 'Current',
  '1': 'Payments tab, search icon in header',
  '2': 'Search field header, Payments replaces Customers',
  '3': 'Search icon and collected-today chip in header',
  '4': 'Search and Payments button on Home',
  '5': 'Search bar above tabs, Payments replaces Home',
} as const;
export const NAV_KEYS = Object.keys(NAV_VARIANTS);

type Words = { bn: string; en: string };
const W = {
  today: { bn: 'আজ জমা', en: 'Collected Today' },
} satisfies Record<string, Words>;
export function useWords() {
  const { language } = useI18n();
  return (key: keyof typeof W) => (language === 'bn' ? W[key].bn : W[key].en);
}

function useMoneyToday() {
  const state = useScopedState();
  const today = todayInDhaka(new Date());
  return useMemo(() => dashboardModel(Object.values(state.orders), today), [state, today]);
}

/** Full-screen search over orders and customers, opened from the header, Home or the bar above the tabs. */
export function SearchSheet({ role, onClose }: { role: Role; onClose(): void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();
  const opened = useRef(pathname);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    if (pathname !== opened.current) onClose();
  }, [pathname, onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={t('search.label')} className="fixed inset-0 z-30 flex flex-col bg-panel">
      <div className="flex h-16 items-center gap-2 border-b border-line px-2">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" size={22} />
        </button>
        <GlobalSearch role={role} inputRef={input} />
      </div>
    </div>
  );
}

/** A button that looks like a search field and opens the sheet. */
export function SearchField({ onOpen, className = '' }: { onOpen(): void; className?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex h-11 min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-start text-sm text-muted focus-visible:outline-2 focus-visible:outline-focus ${className}`}
    >
      <Search aria-hidden="true" size={18} className="shrink-0" />
      <span className="truncate">{t('search.placeholder')}</span>
    </button>
  );
}

export function SearchIcon({ onOpen }: { onOpen(): void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t('search.label')}
      onClick={onOpen}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Search aria-hidden="true" size={22} />
    </button>
  );
}

/** Variant 3: today's takings in the header, one tap to Payments. */
export function TodayChip() {
  const { money } = useI18n();
  const w = useWords();
  const model = useMoneyToday();
  return (
    <Link
      to="/app/payments"
      aria-label={`${w('today')} ${money(model.collectedToday)}`}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-sm font-bold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Wallet aria-hidden="true" size={16} />
      {money(model.collectedToday)}
    </Link>
  );
}

/** Variant 4: what Home opens with. Home's money cards already show today's numbers, so this is just the way in. */
export function HomeTop({ onSearch }: { onSearch(): void }) {
  const { t } = useI18n();
  const w = useWords();
  return (
    <div className="mb-4 flex gap-2">
      <SearchField onOpen={onSearch} className="flex-1" />
      <Link
        to="/app/payments"
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-soft px-3 text-sm font-bold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Wallet aria-hidden="true" size={18} />
        {t('nav.payments')}
      </Link>
    </div>
  );
}
