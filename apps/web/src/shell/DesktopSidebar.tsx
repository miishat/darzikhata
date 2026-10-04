import type { Role } from '@darzikhata/domain';
import { ChevronsUpDown, Ellipsis, Scissors } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useCurrentStaff, useStore } from '../data/StoreContext';
import { BranchSwitcher, useBranchScope, useScopedState } from '../features/branches/BranchScopeProvider';
import { useToday } from '../features/common/hooks';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar } from '../ui/Avatar';
import { AccountMenu } from './AccountMenu';
import { visibleNav, type NavItem } from './nav';
import { navCounts } from './navCounts';
import { useShopHeader } from './ShellParts';
import { SyncButton } from './SyncStatus';

const SHOP_KEYS = new Set(['payments', 'settings']);

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-10 items-center gap-3 rounded-lg px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? 'bg-brand-soft font-semibold text-brand-strong' : 'font-medium text-ink hover:bg-surface'
  }`;

function BranchButton() {
  const { t, label } = useI18n();
  const { shopName, branchName } = useShopHeader();
  const { allowed, choice } = useBranchScope();
  const [open, setOpen] = useState(false);
  const picked = allowed.find((b) => b.id === choice);
  const scopeName = choice === 'all' ? (allowed.length > 1 ? t('branch.all') : branchName) : picked ? label(picked.name) : branchName;
  const text = (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{shopName}</span>
      <span className="block truncate text-xs text-muted">{scopeName}</span>
    </span>
  );
  const frame = 'flex min-h-12 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-start';
  // With one branch there is nothing to switch, so no menu.
  if (allowed.length < 2) return <div className={frame}>{text}</div>;
  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${frame} hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand`}
      >
        {text}
        <ChevronsUpDown aria-hidden="true" size={16} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div role="group" aria-label={t('nav.branchMenu')} className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-line bg-panel p-3 shadow-lg">
          <BranchSwitcher />
        </div>
      )}
    </div>
  );
}

function PersonButton() {
  const { t, label } = useI18n();
  const current = useCurrentStaff();
  const store = useStore();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  if (!current) return null;
  const who = t('shell.signedInAs', { name: current.staff.name, role: label(current.role.name) });
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        data-tour="switch-user"
        title={who}
        aria-label={`${who} · ${t('shell.switchUser')}`}
        onClick={async () => {
          await store.signOut();
          navigate('/sign-in');
        }}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-start hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Avatar id={current.staff.id} name={current.staff.name} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{current.staff.name}</span>
          <span className="block truncate text-xs text-muted">{label(current.role.name)}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={t('shell.account')}
        aria-haspopup="dialog"
        onClick={() => setAccountOpen(true)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Ellipsis aria-hidden="true" size={20} />
      </button>
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}

/** The 240 px sidebar: brand, shop and branch, navigation with counts, sync status and the signed-in person. */
export function DesktopSidebar({ role }: { role: Role }) {
  const { t, number } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const counts = useMemo(() => navCounts(state, today), [state, today]);
  const idBase = useId();
  const items = visibleNav(role);
  const main = items.filter((i) => !SHOP_KEYS.has(i.key));
  const shop = items.filter((i) => SHOP_KEYS.has(i.key));

  const link = (item: NavItem) => {
    const badge =
      item.key === 'orders' && counts.openOrders > 0
        ? { text: number(counts.openOrders), late: false }
        : item.key === 'work' && counts.lateGarments > 0
          ? { text: t('nav.late', { count: number(counts.lateGarments) }), late: true }
          : null;
    const badgeId = `${idBase}-${item.key}`;
    return (
      <NavLink
        key={item.key}
        to={item.path}
        className={linkClass}
        data-tour={`nav-${item.key}`}
        aria-label={t(item.label)}
        aria-describedby={badge ? badgeId : undefined}
      >
        <item.icon aria-hidden="true" size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 leading-snug">{t(item.label)}</span>
        {badge && (
          <span
            id={badgeId}
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.late ? 'bg-warn-soft text-warn-ink' : 'bg-surface text-muted'}`}
          >
            {badge.text}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="no-print sticky top-0 flex h-dvh w-60 shrink-0 flex-col gap-3 border-r border-line bg-panel px-3 py-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy text-on-navy">
          <Scissors aria-hidden="true" size={20} />
        </span>
        <span className="font-display text-lg font-bold">{t('app.name')}</span>
        <span className="rounded bg-accent/15 px-1.5 text-xs font-semibold text-accent">{t('app.demo')}</span>
      </div>
      <BranchButton />
      <nav aria-label={t('nav.main')} className="-m-1 flex flex-1 flex-col gap-1 overflow-y-auto p-1">
        {main.map(link)}
        {shop.length > 0 && (
          <>
            <p className="mt-3 px-3 text-xs font-semibold text-muted">{t('nav.section.shop')}</p>
            {shop.map(link)}
          </>
        )}
      </nav>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <SyncButton block />
        <PersonButton />
      </div>
    </aside>
  );
}
