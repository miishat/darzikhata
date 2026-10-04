import { can, type Role } from '@darzikhata/domain';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Loading } from '../app/guards';
import { useI18n } from '../i18n/I18nProvider';
import { visibleNav } from './nav';
import { SwitchUserButton, useShopHeader } from './ShellParts';
import { SyncButton } from './SyncStatus';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-col items-center justify-center px-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? 'text-brand' : 'text-muted'
  }`;

/** Header, bottom tabs and a floating New Order button for phones. */
export function MobileShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const { shopName } = useShopHeader();
  const tabs = visibleNav(role).filter((item) => item.mobileTab);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-panel px-4">
        <p className="min-w-0 flex-1 truncate font-semibold">{shopName}</p>
        <SyncButton />
        <SwitchUserButton compact />
      </header>
      <main className="flex-1 px-4 pt-4 pb-36">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      {can(role, 'orders.create') && (
        <Link
          to="/app/orders/new"
          data-tour="new-order"
          className="fixed bottom-20 left-1/2 z-10 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-on-brand shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          + {t('nav.newOrder')}
        </Link>
      )}
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
      >
        {tabs.map((item) => (
          <NavLink key={item.key} to={item.path} className={tabClass} data-tour={`nav-${item.key}`}>
            {t(item.shortLabel)}
          </NavLink>
        ))}
        <NavLink to="/app/more" className={tabClass}>
          {t('nav.more')}
        </NavLink>
      </nav>
    </div>
  );
}
