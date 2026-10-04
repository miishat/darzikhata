import { can, type Role } from '@darzikhata/domain';
import { Plus } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Loading } from '../app/guards';
import { useCurrentStaff } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';
import { initialsOf } from '../ui/Avatar';
import { AccountMenu } from './AccountMenu';
import { visibleNav } from './nav';
import { useShopHeader } from './ShellParts';
import { SyncButton } from './SyncStatus';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 px-1 text-xs focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? 'font-bold text-brand-strong' : 'font-medium text-muted'
  }`;

const pillClass = (isActive: boolean) =>
  `flex h-[30px] w-14 items-center justify-center rounded-full ${isActive ? 'bg-brand-soft text-brand-strong' : ''}`;

/** Header, a bottom tab bar with a raised New Order button in the centre, and the account sheet for phones. */
export function MobileShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const { shopName } = useShopHeader();
  const current = useCurrentStaff();
  const [accountOpen, setAccountOpen] = useState(false);
  const tabs = visibleNav(role).filter((item) => item.mobileTab);
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
        <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{shopName}</p>
        <SyncButton />
        {current && (
          <button
            type="button"
            data-tour="switch-user"
            aria-label={t('shell.account')}
            onClick={() => setAccountOpen(true)}
            className="inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-navy font-display font-semibold text-on-navy">
              {initialsOf(current.staff.name.trim().split(/\s+/)[0] ?? '')}
            </span>
          </button>
        )}
      </header>
      <main className="flex-1 px-4 pt-4 pb-[calc(5.25rem+1rem+env(safe-area-inset-bottom))]">
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
            className="-mt-[22px] flex min-w-11 flex-col items-center gap-1 text-xs font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="flex size-[58px] items-center justify-center rounded-[20px] border-4 border-panel bg-brand text-on-brand shadow-lg">
              <Plus aria-hidden="true" size={26} strokeWidth={2.4} />
            </span>
            {t('nav.newOrder')}
          </Link>
        )}
        {right.map(tab)}
      </nav>
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
