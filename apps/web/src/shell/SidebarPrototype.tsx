// PROTOTYPE (throwaway): desktop sidebar layouts, switched with ?variant=. Lives on prototype/sidebar-desktop only.
import type { Role } from '@darzikhata/domain';
import { ChevronsUpDown, Ellipsis, Store } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot } from '../data/StoreContext';
import { BranchSwitcher, useBranchScope, useScopedState } from '../features/branches/BranchScopeProvider';
import { useToday } from '../features/common/hooks';
import { useSyncStatus } from '../features/sync/useSync';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar } from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';
import { AccountMenu } from './AccountMenu';
import { BranchButton, PersonButton } from './DesktopSidebar';
import { visibleNav, type NavItem } from './nav';
import { navCounts } from './navCounts';
import { useShopHeader } from './ShellParts';
import { SyncButton, SyncDialog } from './SyncStatus';

export const SIDEBAR_VARIANTS = {
  A: 'Current',
  B: 'Navy sidebar',
  C: 'Big items with counts in words',
  D: 'Narrow icon rail',
  E: 'Shop card + accent bar',
} as const;

const SHOP_KEYS = new Set(['payments', 'settings']);

function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

/** The nav items split into daily work and shop, with the two counts. */
function useNav(role: Role) {
  const state = useScopedState();
  const today = useToday();
  const counts = useMemo(() => navCounts(state, today), [state, today]);
  const items = visibleNav(role);
  return {
    counts,
    main: items.filter((i) => !SHOP_KEYS.has(i.key)),
    shop: items.filter((i) => SHOP_KEYS.has(i.key)),
  };
}

function useScopeName() {
  const { t, label } = useI18n();
  const { shopName, branchName } = useShopHeader();
  const { allowed, choice } = useBranchScope();
  const picked = allowed.find((b) => b.id === choice);
  const scopeName = choice === 'all' ? (allowed.length > 1 ? t('branch.all') : branchName) : picked ? label(picked.name) : branchName;
  return { shopName, scopeName, canSwitch: allowed.length > 1 };
}

const SYNC_DOT: Record<string, string> = { online: 'bg-ok', offline: 'bg-warn', syncing: 'bg-muted', 'needs-attention': 'bg-warn' };

/** A popover that closes on Escape or when focus leaves it. */
function Pop({ button, children, className }: { button: (open: boolean, toggle: () => void) => ReactNode; children: ReactNode; className: string }) {
  const [open, setOpen] = useState(false);
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
      {button(open, () => setOpen((v) => !v))}
      {open && <div className={className}>{children}</div>}
    </div>
  );
}

/* ---------------- B: navy ---------------- */

export function SidebarB({ role }: { role: Role }) {
  const { t, number } = useI18n();
  const { counts, main, shop } = useNav(role);
  const { shopName, scopeName, canSwitch } = useScopeName();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const status = useSyncStatus();
  const { sync } = useSnapshot();
  const { label } = useI18n();

  const link = (item: NavItem) => {
    const badge = item.key === 'orders' && counts.openOrders > 0 ? number(counts.openOrders) : null;
    const late = item.key === 'work' && counts.lateGarments > 0 ? t('nav.late', { count: number(counts.lateGarments) }) : null;
    return (
      <NavLink
        key={item.key}
        to={item.path}
        className={({ isActive }) =>
          `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm focus-visible:outline-2 focus-visible:outline-focus ${
            isActive ? 'bg-brand font-semibold text-on-brand shadow-sm' : 'font-medium text-on-navy-muted hover:bg-navy-raised hover:text-on-navy'
          }`
        }
      >
        <item.icon aria-hidden="true" size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 leading-snug">{t(item.label)}</span>
        {badge && <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-on-navy">{badge}</span>}
        {late && <span className="shrink-0 rounded-full bg-warn px-2 py-0.5 text-xs font-bold text-ink">{late}</span>}
      </NavLink>
    );
  };

  const shopBox = (
    <span className="min-w-0 flex-1 text-start">
      <span className="block truncate text-sm font-semibold text-on-navy">{shopName}</span>
      <span className="block truncate text-xs text-on-navy-muted">{scopeName}</span>
    </span>
  );

  return (
    <aside className="no-print sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-4 bg-navy px-3 py-4 text-on-navy">
      <div className="flex items-center gap-2.5 px-1">
        <BrandMark size={36} className="shrink-0" />
        <span className="font-display text-lg font-bold">{t('app.name')}</span>
        <span className="rounded bg-white/15 px-1.5 text-xs font-semibold">{t('app.demo')}</span>
      </div>
      {canSwitch ? (
        <Pop
          className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-line bg-panel-raised p-3 text-ink shadow-lg"
          button={(open, toggle) => (
            <button type="button" aria-expanded={open} onClick={toggle} className="flex min-h-12 w-full items-center gap-2 rounded-lg bg-navy-raised px-3 hover:bg-white/15">
              {shopBox}
              <ChevronsUpDown aria-hidden="true" size={16} className="shrink-0 text-on-navy-muted" />
            </button>
          )}
        >
          <BranchSwitcher />
        </Pop>
      ) : (
        <div className="flex min-h-12 items-center rounded-lg bg-navy-raised px-3">{shopBox}</div>
      )}
      <nav aria-label={t('nav.main')} className="-m-1 flex flex-1 flex-col gap-1 overflow-y-auto p-1">
        {main.map(link)}
        {shop.length > 0 && (
          <>
            <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-on-navy-muted">{t('nav.section.shop')}</p>
            {shop.map(link)}
          </>
        )}
      </nav>
      {current && (
        <div className="flex items-center gap-2 rounded-xl bg-navy-raised p-2">
          <button type="button" onClick={() => navigate('/sign-in')} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-start hover:bg-white/10">
            <span className="relative">
              <Avatar id={current.staff.id} name={current.staff.name} />
              <span aria-hidden="true" className={`absolute -bottom-0.5 -end-0.5 size-3 rounded-full ring-2 ring-navy-raised ${SYNC_DOT[status]}`} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{current.staff.name}</span>
              <span className="block truncate text-xs text-on-navy-muted">{label(current.role.name)}</span>
            </span>
          </button>
          <button type="button" aria-label={t('shell.account')} onClick={() => setAccountOpen(true)} className="inline-flex size-9 items-center justify-center rounded-lg text-on-navy-muted hover:bg-white/10">
            <Ellipsis aria-hidden="true" size={20} />
          </button>
        </div>
      )}
      <button type="button" onClick={() => setSyncOpen(true)} className="-mt-2 flex items-center gap-2 px-2 text-xs text-on-navy-muted hover:text-on-navy">
        <span aria-hidden="true" className={`size-2 rounded-full ${SYNC_DOT[status]}`} />
        {t(`sync.${status === 'needs-attention' ? 'needsAttention' : status}` as 'sync.online')}
        {sync.pending > 0 && ` · ${t('sync.waiting', { count: number(sync.pending) })}`}
      </button>
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />
      <SyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} />
    </aside>
  );
}

/* ---------------- C: big items, counts in words ---------------- */

export function SidebarC({ role }: { role: Role }) {
  const { t, number } = useI18n();
  const l = useL();
  const { counts, main, shop } = useNav(role);

  const sub: Partial<Record<string, { text: string; warn?: boolean }>> = {
    dashboard: { text: l('আজকের কাজ এক নজরে', "Today's work at a glance") },
    orders: { text: counts.openOrders > 0 ? l(`${number(counts.openOrders)}টি খোলা অর্ডার`, `${counts.openOrders} open orders`) : l('কোনো খোলা অর্ডার নেই', 'No open orders') },
    customers: { text: l('মাপ ও যোগাযোগ', 'Measurements and contacts') },
    work: counts.lateGarments > 0
      ? { text: l(`${number(counts.lateGarments)}টি পোশাক দেরিতে`, `${counts.lateGarments} garments late`), warn: true }
      : { text: l('কে কী সেলাই করছে', 'Who is sewing what') },
    payments: { text: l('জমা, বাকি ও খরচ', 'Received, due and spent') },
    settings: { text: l('দোকান, কর্মী ও দাম', 'Shop, staff and prices') },
  };

  const link = (item: NavItem) => {
    const s = sub[item.key];
    return (
      <NavLink
        key={item.key}
        to={item.path}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl p-2 focus-visible:outline-2 focus-visible:outline-focus ${
            isActive ? 'bg-brand-soft ring-1 ring-inset ring-brand/30' : 'hover:bg-surface'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                isActive ? 'bg-brand text-on-brand' : s?.warn ? 'bg-warn-soft text-warn-ink' : 'bg-surface text-muted group-hover:bg-panel'
              }`}
            >
              <item.icon aria-hidden="true" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[0.95rem] font-semibold ${isActive ? 'text-brand-strong' : 'text-ink'}`}>{t(item.label)}</span>
              {s && <span className={`block truncate text-xs ${s.warn ? 'font-semibold text-warn-ink' : 'text-muted'}`}>{s.text}</span>}
            </span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="no-print sticky top-0 flex h-dvh w-72 shrink-0 flex-col gap-3 border-r border-line bg-panel px-3 py-4">
      <div className="flex items-center gap-2.5 px-1">
        <BrandMark size={36} className="shrink-0" />
        <span className="font-display text-lg font-bold">{t('app.name')}</span>
        <span className="rounded bg-accent/15 px-1.5 text-xs font-semibold text-accent">{t('app.demo')}</span>
      </div>
      <BranchButton />
      <nav aria-label={t('nav.main')} className="-m-1 flex flex-1 flex-col gap-1 overflow-y-auto p-1">
        <p className="px-2 pb-1 pt-2 text-xs font-semibold text-muted">{l('প্রতিদিনের কাজ', 'Daily Work')}</p>
        {main.map(link)}
        {shop.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-4 text-xs font-semibold text-muted">{t('nav.section.shop')}</p>
            {shop.map(link)}
          </>
        )}
      </nav>
      <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-1.5">
        <PersonButton />
        <SyncButton block />
      </div>
    </aside>
  );
}

/* ---------------- D: narrow icon rail ---------------- */

export function SidebarD({ role }: { role: Role }) {
  const { t, number, label } = useI18n();
  const { counts, main, shop } = useNav(role);
  const { shopName, scopeName, canSwitch } = useScopeName();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  const status = useSyncStatus();
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const idBase = useId();

  const link = (item: NavItem) => {
    const badge =
      item.key === 'orders' && counts.openOrders > 0
        ? { text: number(counts.openOrders), late: false }
        : item.key === 'work' && counts.lateGarments > 0
          ? { text: number(counts.lateGarments), late: true }
          : null;
    return (
      <NavLink
        key={item.key}
        to={item.path}
        title={t(item.label)}
        aria-describedby={badge ? `${idBase}-${item.key}` : undefined}
        className={({ isActive }) =>
          `group flex flex-col items-center gap-1 rounded-xl py-2 text-[0.7rem] leading-tight focus-visible:outline-2 focus-visible:outline-focus ${
            isActive ? 'font-bold text-brand-strong' : 'font-medium text-muted hover:text-ink'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`relative grid h-9 w-12 place-items-center rounded-full ${isActive ? 'bg-brand-soft' : 'group-hover:bg-surface'}`}>
              <item.icon aria-hidden="true" size={21} />
              {badge && (
                <span
                  id={`${idBase}-${item.key}`}
                  className={`absolute -end-1.5 -top-1 min-w-5 rounded-full px-1 text-center text-[0.65rem] font-bold leading-5 ring-2 ring-panel ${
                    badge.late ? 'bg-warn text-ink' : 'bg-brand text-on-brand'
                  }`}
                >
                  {badge.text}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-1">{t(item.shortLabel)}</span>
          </>
        )}
      </NavLink>
    );
  };

  const shopIcon = (
    <span className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-muted">
      <Store aria-hidden="true" size={20} />
    </span>
  );

  return (
    <aside className="no-print sticky top-0 flex h-dvh w-24 shrink-0 flex-col items-stretch gap-3 border-r border-line bg-panel px-2 py-4">
      <div className="flex justify-center">
        <BrandMark size={40} />
      </div>
      <div className="flex justify-center" title={`${shopName} · ${scopeName}`}>
        {canSwitch ? (
          <Pop
            className="absolute start-full top-0 z-30 ms-2 w-64 rounded-lg border border-line bg-panel-raised p-3 shadow-lg"
            button={(open, toggle) => (
              <button type="button" aria-expanded={open} aria-label={`${shopName} · ${scopeName}`} onClick={toggle} className="rounded-xl focus-visible:outline-2 focus-visible:outline-focus">
                {shopIcon}
              </button>
            )}
          >
            <p className="mb-2 text-sm font-semibold">{shopName}</p>
            <BranchSwitcher />
          </Pop>
        ) : (
          shopIcon
        )}
      </div>
      <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {main.map(link)}
        {shop.length > 0 && <hr className="mx-3 my-2 border-line" />}
        {shop.map(link)}
      </nav>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setSyncOpen(true)}
          title={t(`sync.${status === 'needs-attention' ? 'needsAttention' : status}` as 'sync.online')}
          className="grid size-10 place-items-center rounded-full hover:bg-surface"
        >
          <span className={`size-3 rounded-full ${SYNC_DOT[status]}`} />
        </button>
        {current && (
          <button
            type="button"
            title={`${current.staff.name} (${label(current.role.name)})`}
            onClick={() => navigate('/sign-in')}
            className="rounded-full focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Avatar id={current.staff.id} name={current.staff.name} />
          </button>
        )}
        <button type="button" aria-label={t('shell.account')} onClick={() => setAccountOpen(true)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface">
          <Ellipsis aria-hidden="true" size={20} />
        </button>
      </div>
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />
      <SyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} />
    </aside>
  );
}

/* ---------------- E: shop card on top, accent bar ---------------- */

export function SidebarE({ role }: { role: Role }) {
  const { t, number, label } = useI18n();
  const { counts, main, shop } = useNav(role);
  const { shopName, scopeName, canSwitch } = useScopeName();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);

  const link = (item: NavItem) => {
    const badge =
      item.key === 'orders' && counts.openOrders > 0
        ? { text: number(counts.openOrders), late: false }
        : item.key === 'work' && counts.lateGarments > 0
          ? { text: t('nav.late', { count: number(counts.lateGarments) }), late: true }
          : null;
    return (
      <NavLink
        key={item.key}
        to={item.path}
        className={({ isActive }) =>
          `relative flex min-h-12 items-center gap-3 rounded-e-xl ps-5 pe-3 text-base focus-visible:outline-2 focus-visible:outline-focus ${
            isActive
              ? 'bg-brand-soft font-bold text-brand-strong before:absolute before:inset-y-1.5 before:start-0 before:w-1.5 before:rounded-full before:bg-brand'
              : 'font-medium text-ink hover:bg-surface'
          }`
        }
      >
        <item.icon aria-hidden="true" size={21} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
        {badge && (
          <span className={`shrink-0 text-sm font-bold ${badge.late ? 'rounded-full bg-warn-soft px-2 text-warn-ink ring-1 ring-inset ring-warn-line' : 'text-muted'}`}>
            {badge.text}
          </span>
        )}
      </NavLink>
    );
  };

  const card = (
    <span className="flex w-full flex-col gap-3 text-start">
      <span className="flex items-center gap-2.5">
        <BrandMark size={32} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-bold leading-tight">{shopName}</span>
          <span className="block truncate text-xs text-on-navy-muted">
            {scopeName} · {t('app.name')} {t('app.demo')}
          </span>
        </span>
        {canSwitch && <ChevronsUpDown aria-hidden="true" size={16} className="shrink-0 text-on-navy-muted" />}
      </span>
    </span>
  );

  return (
    <aside className="no-print sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-4 border-r border-line bg-panel py-4 pe-3">
      <div className="ms-3">
        {canSwitch ? (
          <Pop
            className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-line bg-panel-raised p-3 shadow-lg"
            button={(open, toggle) => (
              <button type="button" aria-expanded={open} onClick={toggle} className="w-full rounded-2xl bg-navy p-3 text-on-navy shadow-md hover:bg-navy-raised focus-visible:outline-2 focus-visible:outline-focus">
                {card}
              </button>
            )}
          >
            <BranchSwitcher />
          </Pop>
        ) : (
          <div className="rounded-2xl bg-navy p-3 text-on-navy shadow-md">{card}</div>
        )}
      </div>
      <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {main.map(link)}
        {shop.length > 0 && (
          <>
            <p className="mt-4 mb-1 ps-5 text-xs font-semibold text-muted">{t('nav.section.shop')}</p>
            {shop.map(link)}
          </>
        )}
      </nav>
      <div className="ms-3 flex flex-col gap-2">
        <SyncButton block />
        {current && (
          <div className="flex items-center gap-2">
            <Avatar id={current.staff.id} name={current.staff.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{current.staff.name}</span>
              <span className="block truncate text-xs text-muted">{label(current.role.name)}</span>
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/sign-in')} className="min-h-10 flex-1 rounded-lg border border-line text-sm font-semibold hover:bg-surface">
            {t('shell.switchUser')}
          </button>
          <button type="button" aria-label={t('shell.account')} title={t('shell.account')} onClick={() => setAccountOpen(true)} className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-surface">
            <Ellipsis aria-hidden="true" size={20} />
          </button>
        </div>
      </div>
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />
    </aside>
  );
}
