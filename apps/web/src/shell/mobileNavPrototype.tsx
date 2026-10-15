// PROTOTYPE (throwaway), round 2: variations of "search and Payments on Home" (4) and "search bar above the tabs,
// Payments replaces Home" (5). Switch with ?variant=0|1|2|3|4|5 on any phone page.
//   1 Home's search and Payments row stays pinned under the header while Home scrolls; tabs unchanged
//   2 tabs unchanged; a search field and a Payments button sit above the tabs on the main list pages
//   3 Payments takes the Home tab, the logo goes Home; the search bar above the tabs shows on list pages only
//   4 like 3, but the search bar shrinks to a round button while you scroll down and grows back when you scroll up
//   5 tabs unchanged; Home has the search and Payments row, other list pages get a round search button above the tabs
import type { Role } from '@darzikhata/domain';
import { ArrowLeft, Search, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { GlobalSearch } from './GlobalSearch';

export const NAV_VARIANTS = {
  '0': 'Current',
  '1': 'Pinned search and Payments row on Home',
  '2': 'Search and Payments above the tabs',
  '3': 'Payments tab, search above tabs on list pages',
  '4': 'Payments tab, search bar shrinks while scrolling',
  '5': 'Home row plus a round search button elsewhere',
} as const;
export const NAV_KEYS = Object.keys(NAV_VARIANTS);

/** The pages a search bar above the tabs shows on; detail pages and forms keep the room for their own bars. */
const LIST_PAGES = ['/app/dashboard', '/app/orders', '/app/customers', '/app/work', '/app/payments'];
export const isListPage = (pathname: string) => LIST_PAGES.includes(pathname);

/** True while the page is moving down, false once it moves up or reaches the top. */
export function useScrollingDown(): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setDown(y > last && y > 40);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return down;
}

/** Full-screen search over orders and customers. */
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

export function PaymentsButton() {
  const { t } = useI18n();
  return (
    <Link
      to="/app/payments"
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-soft px-3 text-sm font-bold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Wallet aria-hidden="true" size={18} />
      {t('nav.payments')}
    </Link>
  );
}

/** Search and Payments side by side. `pinned` keeps it under the header while the page scrolls. */
export function HomeTop({ onSearch, pinned = false }: { onSearch(): void; pinned?: boolean }) {
  return (
    <div className={`mb-4 flex gap-2 ${pinned ? 'sticky top-14 z-[8] -mx-4 -mt-4 border-b border-line bg-surface px-4 pt-3 pb-3' : ''}`}>
      <SearchField onOpen={onSearch} className={`flex-1 ${pinned ? 'bg-panel' : ''}`} />
      <PaymentsButton />
    </div>
  );
}

/** Where things sit above the tab bar. */
export const ABOVE_TABS = 'bottom-[calc(4.6rem+max(0.875rem,env(safe-area-inset-bottom)))]';

/** A search bar above the tabs; `compact` turns it into a round button at the end. */
export function BottomSearch({ onOpen, compact = false, withPayments = false }: { onOpen(): void; compact?: boolean; withPayments?: boolean }) {
  const { t } = useI18n();
  if (compact) {
    return (
      <div className={`fixed end-4 ${ABOVE_TABS} z-[9] pb-2`}>
        <button
          type="button"
          aria-label={t('search.label')}
          onClick={onOpen}
          className="flex size-12 items-center justify-center rounded-full border border-line bg-panel text-ink shadow-lg focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Search aria-hidden="true" size={22} />
        </button>
      </div>
    );
  }
  return (
    <div className={`fixed inset-x-0 ${ABOVE_TABS} z-[9] flex gap-2 bg-gradient-to-t from-panel to-transparent px-4 pt-3 pb-2`}>
      <SearchField onOpen={onOpen} className="flex-1 bg-panel shadow-md" />
      {withPayments && <PaymentsButton />}
    </div>
  );
}
