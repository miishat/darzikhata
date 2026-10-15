import { can, type Role } from '@darzikhata/domain';
import { Plus, UserRound } from 'lucide-react';
import { Suspense, useCallback, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Loading } from '../app/guards';
import { useCurrentStaff } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';
import { BrandMark } from '../ui/BrandMark';
import { AccountMenu } from './AccountMenu';
import { visibleNav } from './nav';
import { useShopHeader } from './ShellParts';
import { SyncButton } from './SyncStatus';
import { PrototypeSwitcher, useVariant } from '../ui/PrototypeSwitcher';
import { HomeTop, NAV_KEYS, NAV_VARIANTS, SearchField, SearchIcon, SearchSheet, TodayChip } from './mobileNavPrototype';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 px-1 text-xs focus-visible:outline-2 focus-visible:outline-focus ${
    isActive ? 'font-bold text-brand-strong' : 'font-medium text-muted'
  }`;

const pillClass = (isActive: boolean) =>
  `flex h-[30px] w-14 items-center justify-center rounded-full ${isActive ? 'bg-brand-soft text-brand-strong' : ''}`;

/**
 * Header, a bottom tab bar with a raised New Order button in the centre, and the account sheet for phones.
 * While a PaymentDock is open (it sets data-dock-open on <html>) New Order shrinks to a regular tab so the dock can sit flush on the bar.
 */
export function MobileShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const { shopName } = useShopHeader();
  const current = useCurrentStaff();
  const [accountOpen, setAccountOpen] = useState(false);
  // PROTOTYPE: which tabs each variant shows.
  const variant = useVariant(NAV_KEYS);
  const { pathname } = useLocation();
  const [searching, setSearching] = useState(false);
  const openSearch = useCallback(() => setSearching(true), []);
  const closeSearch = useCallback(() => setSearching(false), []);
  const TAB_KEYS: Record<string, string[]> = {
    '1': ['dashboard', 'orders', 'customers', 'work', 'payments'],
    '2': ['dashboard', 'orders', 'work', 'payments'],
    '5': ['orders', 'customers', 'work', 'payments'],
  };
  const tabs = visibleNav(role).filter((item) => (TAB_KEYS[variant] ? TAB_KEYS[variant].includes(item.key) : item.mobileTab));
  const canCreate = can(role, 'orders.create');
  const split = Math.ceil(tabs.length / 2);
  const left = canCreate ? tabs.slice(0, split) : tabs;
  const right = canCreate ? tabs.slice(split) : [];
  const columns = tabs.length + (canCreate ? 1 : 0);

  const tab = (item: (typeof tabs)[number]) => (
    <NavLink key={item.key} to={item.path} className={tabClass} data-tour={`nav-${item.key}`}>
      {({ isActive }) => (
        <>
          <span className={pillClass(isActive)}>
            <item.icon aria-hidden="true" size={22} />
          </span>
          {t(item.shortLabel)}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-panel px-4">
        {variant === '5' ? (
          <Link to="/app/dashboard" aria-label={t('nav.dashboard')} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-focus">
            <BrandMark size={28} />
          </Link>
        ) : (
          <BrandMark size={28} className="shrink-0" />
        )}
        {variant === '2' ? (
          <SearchField onOpen={openSearch} className="flex-1" />
        ) : (
          // PROTOTYPE 3: the header is full, so the shop name gives way to the chip.
          <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{variant === '3' ? null : shopName}</p>
        )}
        {(variant === '1' || variant === '3') && <SearchIcon onOpen={openSearch} />}
        {variant === '3' && <TodayChip />}
        {variant !== '2' && <SyncButton />}
        {current && (
          <button
            type="button"
            data-tour="switch-user"
            aria-label={t('shell.account')}
            aria-haspopup="dialog"
            onClick={() => setAccountOpen(true)}
            className="inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-navy font-display font-semibold text-on-navy">
              <UserRound size={20} />
            </span>
          </button>
        )}
      </header>
      <main
        className={`flex-1 px-4 pt-4 ${variant === '5' ? 'pb-[calc(9rem+1rem+env(safe-area-inset-bottom))]' : 'pb-[calc(5.25rem+1rem+env(safe-area-inset-bottom))]'}`}
      >
        {variant === '4' && pathname === '/app/dashboard' && <HomeTop onSearch={openSearch} />}
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-10 grid items-start border-t border-line bg-panel px-1 pt-1.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {left.map(tab)}
        {canCreate && (
          <Link
            to="/app/orders/new"
            data-tour="new-order"
            className="-mt-[22px] [html[data-dock-open]_&]:mt-0 [html[data-dock-open]_&]:min-h-14 [html[data-dock-open]_&]:justify-center [html[data-dock-open]_&]:px-1 [html[data-dock-open]_&]:font-medium flex min-w-11 flex-col items-center gap-1 text-xs font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span className="flex size-[58px] items-center justify-center rounded-[20px] border-4 border-panel bg-brand text-on-brand shadow-lg [html[data-dock-open]_&]:h-[30px] [html[data-dock-open]_&]:w-14 [html[data-dock-open]_&]:rounded-full [html[data-dock-open]_&]:border-0 [html[data-dock-open]_&]:shadow-none">
              <Plus aria-hidden="true" size={26} strokeWidth={2.4} />
            </span>
            {t('nav.newOrder')}
          </Link>
        )}
        {right.map(tab)}
      </nav>
      {variant === '5' && (
        // PROTOTYPE 5: search in thumb reach, just above the tabs.
        <div className="fixed inset-x-0 bottom-[calc(4.6rem+max(0.875rem,env(safe-area-inset-bottom)))] z-[9] bg-gradient-to-t from-panel to-transparent px-4 pt-3 pb-2">
          <SearchField onOpen={openSearch} className="w-full bg-panel shadow-md" />
        </div>
      )}
      {searching && <SearchSheet role={role} onClose={closeSearch} />}
      <PrototypeSwitcher variants={NAV_VARIANTS} />
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
