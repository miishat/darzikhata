import { can, type Role } from '@darzikhata/domain';
import { Suspense, useRef } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { Loading } from '../app/guards';
import { useI18n } from '../i18n/I18nProvider';
import { buttonClasses } from '../ui/Button';
import { DesktopSidebar } from './DesktopSidebar';
import { GlobalSearch } from './GlobalSearch';
import { LanguageToggle } from './ShellParts';
import { useShortcuts } from './useShortcuts';
import { PrototypeSwitcher, useVariant } from '../ui/PrototypeSwitcher';
import { BarB, BarC, BarD, BarE, TOPBAR_VARIANTS } from './TopBarPrototype';

/** Sidebar and top bar for laptops and large screens. */
export function DesktopShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const searchInput = useRef<HTMLInputElement>(null);
  const variant = useVariant(Object.keys(TOPBAR_VARIANTS));

  useShortcuts({
    onSearch: () => {
      if (!searchInput.current) return false;
      searchInput.current.focus();
      return true;
    },
    onNewOrder: () => {
      if (!can(role, 'orders.create')) return false;
      navigate('/app/orders/new');
      return true;
    },
  });

  return (
    <div className="flex min-h-dvh">
      <DesktopSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        {variant === 'B' && <BarB role={role} searchInput={searchInput} />}
        {variant === 'C' && <BarC role={role} searchInput={searchInput} />}
        {variant === 'D' && <BarD role={role} searchInput={searchInput} />}
        {variant === 'E' && <BarE role={role} searchInput={searchInput} />}
        {variant === 'A' && (
        <header className="no-print flex h-14 items-center gap-3 border-b border-line bg-panel px-6">
          <GlobalSearch role={role} inputRef={searchInput} />
          <div className="flex-1" />
          <LanguageToggle compact />
          {can(role, 'orders.create') && (
            <Link to="/app/orders/new" data-tour="new-order" className={`${buttonClasses('primary')} gap-2`}>
              {t('nav.newOrder')}
              <kbd aria-hidden="true" className="rounded bg-on-brand/20 px-1.5 font-sans text-xs">N</kbd>
            </Link>
          )}
        </header>
        )}
        <PrototypeSwitcher variants={TOPBAR_VARIANTS} />
        <main className="min-w-0 flex-1 overflow-x-clip p-6">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
