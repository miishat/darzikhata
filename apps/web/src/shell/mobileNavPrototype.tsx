// PROTOTYPE (throwaway), round 3: search only. Five ways to search orders and customers from anywhere on a phone;
// Payments is left as it is. Switch with ?variant=0|1|2|3|4|5 on any phone page.
//   1 a search icon in the header, next to the account button
//   2 the header itself is a search field; the shop name gives way
//   3 Home opens with a big search field on top; other pages unchanged
//   4 a round search button floats above the tabs on the main pages
//   5 a Search tab takes the Customers tab's place; the search screen links to all customers
import type { Role } from '@darzikhata/domain';
import { ArrowLeft, ChevronRight, Search, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { GlobalSearch } from './GlobalSearch';

export const NAV_VARIANTS = {
  '0': 'Current',
  '1': 'Search icon in the header',
  '2': 'Header is a search field',
  '3': 'Big search field on Home',
  '4': 'Round search button above the tabs',
  '5': 'Search tab instead of Customers',
} as const;
export const NAV_KEYS = Object.keys(NAV_VARIANTS);

type Words = { bn: string; en: string };
const W = {
  searchTab: { bn: 'খুঁজুন', en: 'Search' },
  allCustomers: { bn: 'সব কাস্টমার', en: 'All Customers' },
} satisfies Record<string, Words>;
export function useWords() {
  const { language } = useI18n();
  return (key: keyof typeof W) => (language === 'bn' ? W[key].bn : W[key].en);
}

/** The pages a floating search button shows on; detail pages and forms keep that corner for their own bars. */
const MAIN_PAGES = ['/app/dashboard', '/app/orders', '/app/customers', '/app/work', '/app/payments'];
export const isMainPage = (pathname: string) => MAIN_PAGES.includes(pathname);

/** Full-screen search over orders and customers. */
export function SearchSheet({ role, onClose, customersLink = false }: { role: Role; onClose(): void; customersLink?: boolean }) {
  const { t } = useI18n();
  const w = useWords();
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
      {customersLink && (
        <Link
          to="/app/customers"
          className="mx-4 mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Users aria-hidden="true" size={20} className="text-brand-strong" />
          <span className="flex-1">{w('allCustomers')}</span>
          <ChevronRight aria-hidden="true" size={18} className="text-muted rtl:rotate-180" />
        </Link>
      )}
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
      className={`flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-start text-sm text-muted focus-visible:outline-2 focus-visible:outline-focus ${className}`}
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

/** Variant 4: a round button in the corner above the tabs. */
export function FloatingSearch({ onOpen }: { onOpen(): void }) {
  const { t } = useI18n();
  return (
    <div className="fixed end-4 bottom-[calc(4.6rem+max(0.875rem,env(safe-area-inset-bottom)))] z-[9] pb-3">
      <button
        type="button"
        aria-label={t('search.label')}
        onClick={onOpen}
        className="flex size-14 items-center justify-center rounded-full border border-line bg-panel text-ink shadow-lg focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Search aria-hidden="true" size={24} />
      </button>
    </div>
  );
}

/** Variant 5: a tab that opens search instead of a page. */
export function SearchTab({ onOpen }: { onOpen(): void }) {
  const w = useWords();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 px-1 text-xs font-medium text-muted focus-visible:outline-2 focus-visible:outline-focus"
    >
      <span className="flex h-[30px] w-14 items-center justify-center rounded-full">
        <Search aria-hidden="true" size={22} />
      </span>
      {w('searchTab')}
    </button>
  );
}
