import { can, type Role } from '@darzikhata/domain';
import { Plus, UserPlus } from 'lucide-react';
import { Suspense, useRef } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { Loading } from '../app/guards';
import { useI18n } from '../i18n/I18nProvider';
import { buttonClasses } from '../ui/Button';
import { DesktopSidebar } from './DesktopSidebar';
import { PrototypeSwitcher, useVariant } from '../ui/PrototypeSwitcher';
import { SIDEBAR_VARIANTS, SidebarB, SidebarC, SidebarD, SidebarE } from './SidebarPrototype';
import { GlobalSearch } from './GlobalSearch';
import { LanguageSwitch, ThemeButton } from './ShellParts';
import { useShortcuts } from './useShortcuts';

/** Sidebar and top bar for laptops and large screens. */
export function DesktopShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const searchInput = useRef<HTMLInputElement>(null);
  const variant = useVariant(Object.keys(SIDEBAR_VARIANTS));

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
      {variant === 'A' && <DesktopSidebar role={role} />}
      {variant === 'B' && <SidebarB role={role} />}
      {variant === 'C' && <SidebarC role={role} />}
      {variant === 'D' && <SidebarD role={role} />}
      {variant === 'E' && <SidebarE role={role} />}
      <PrototypeSwitcher variants={SIDEBAR_VARIANTS} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 items-center gap-3 border-b border-line bg-panel px-6">
          <GlobalSearch role={role} inputRef={searchInput} />
          <LanguageSwitch />
          <ThemeButton />
          {can(role, 'customers.edit') && (
            <Link to="/app/customers/new" className={`${buttonClasses('secondary')} shrink-0`}>
              <UserPlus aria-hidden="true" size={18} />
              {t('customers.new')}
            </Link>
          )}
          {can(role, 'orders.create') && (
            <Link to="/app/orders/new" data-tour="new-order" className={`${buttonClasses('primary')} shrink-0 gap-2`}>
              <Plus aria-hidden="true" size={18} />
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
