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

/** Sidebar and top bar for laptops and large screens. */
export function DesktopShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const searchInput = useRef<HTMLInputElement>(null);

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
        <main className="min-w-0 flex-1 overflow-x-clip p-6">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
