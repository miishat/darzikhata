// PROTOTYPE (throwaway): desktop sidebar layouts, switched with ?variant=. Lives on prototype/sidebar-desktop only.
import type { Role } from '@darzikhata/domain';
import { ChevronLeft, ChevronRight, Ellipsis, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useCurrentStaff } from '../data/StoreContext';
import { useScopedState } from '../features/branches/BranchScopeProvider';
import { useToday } from '../features/common/hooks';
import { useSyncStatus } from '../features/sync/useSync';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar } from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';
import { AccountMenu } from './AccountMenu';
import { BranchButton, PersonButton } from './DesktopSidebar';
import { visibleNav, type NavItem } from './nav';
import { navCounts } from './navCounts';
import { SyncButton, SyncDialog } from './SyncStatus';

export const SIDEBAR_VARIANTS = {
  A: 'Current',
  B: 'Big items, toggle by the logo, rail with names',
  C: 'Big items, toggle at the bottom, rail icons only',
  D: 'Big items, toggle tab on the edge, rail with names',
  E: 'Big items, solid current page, toggle by the logo',
} as const;

const SHOP_KEYS = new Set(['payments', 'settings']);
const SYNC_DOT: Record<string, string> = { online: 'bg-ok', offline: 'bg-warn', syncing: 'bg-muted', 'needs-attention': 'bg-warn' };
/** The late style used everywhere else (Home, Orders, Work). */
const LATE = 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink';

function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

interface Look {
  toggle: 'top' | 'bottom' | 'edge';
  railNames: boolean;
  solid: boolean;
}

const LOOKS: Record<'B' | 'C' | 'D' | 'E', Look> = {
  B: { toggle: 'top', railNames: true, solid: false },
  C: { toggle: 'bottom', railNames: false, solid: false },
  D: { toggle: 'edge', railNames: true, solid: false },
  E: { toggle: 'top', railNames: true, solid: true },
};

// Kept outside the component so switching variants keeps the rail open or closed.
let narrowMemory = false;

export function SidebarProto({ role, variant }: { role: Role; variant: 'B' | 'C' | 'D' | 'E' }) {
  const look = LOOKS[variant];
  const { t, number, label } = useI18n();
  const l = useL();
  const state = useScopedState();
  const today = useToday();
  const counts = useMemo(() => navCounts(state, today), [state, today]);
  const idBase = useId();
  const items = visibleNav(role);
  const main = items.filter((i) => !SHOP_KEYS.has(i.key));
  const shop = items.filter((i) => SHOP_KEYS.has(i.key));
  const [narrow, setNarrowState] = useState(narrowMemory);
  const setNarrow = (v: boolean) => {
    narrowMemory = v;
    setNarrowState(v);
  };
  const current = useCurrentStaff();
  const navigate = useNavigate();
  const status = useSyncStatus();
  const [accountOpen, setAccountOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const badgeOf = (item: NavItem) =>
    item.key === 'orders' && counts.openOrders > 0
      ? { wide: number(counts.openOrders), short: number(counts.openOrders), late: false }
      : item.key === 'work' && counts.lateGarments > 0
        ? { wide: t('nav.late', { count: number(counts.lateGarments) }), short: number(counts.lateGarments), late: true }
        : null;

  const toggleLabel = narrow ? l('মেনু বড় করুন', 'Expand menu') : l('মেনু ছোট করুন', 'Collapse menu');
  const ToggleIcon = narrow ? PanelLeftOpen : PanelLeftClose;
  const iconToggle = (
    <button
      type="button"
      aria-label={toggleLabel}
      title={toggleLabel}
      aria-pressed={narrow}
      onClick={() => setNarrow(!narrow)}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      <ToggleIcon aria-hidden="true" size={19} />
    </button>
  );
  const edgeToggle = (
    <button
      type="button"
      aria-label={toggleLabel}
      title={toggleLabel}
      aria-pressed={narrow}
      onClick={() => setNarrow(!narrow)}
      className="absolute -end-3.5 top-20 z-10 grid size-7 place-items-center rounded-full border border-line bg-panel text-muted shadow-sm hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      {narrow ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronLeft aria-hidden="true" size={16} />}
    </button>
  );
  const bottomToggle = (
    <button
      type="button"
      aria-pressed={narrow}
      title={toggleLabel}
      aria-label={narrow ? toggleLabel : undefined}
      onClick={() => setNarrow(!narrow)}
      className={`flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus ${narrow ? 'w-full justify-center' : 'px-3'}`}
    >
      <ToggleIcon aria-hidden="true" size={19} />
      {!narrow && toggleLabel}
    </button>
  );

  /* ---- wide: A with C's big items ---- */
  const wideLink = (item: NavItem) => {
    const badge = badgeOf(item);
    const badgeId = `${idBase}-${item.key}`;
    return (
      <NavLink
        key={item.key}
        to={item.path}
        data-tour={`nav-${item.key}`}
        aria-label={t(item.label)}
        aria-describedby={badge ? badgeId : undefined}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl p-1.5 pe-2.5 focus-visible:outline-2 focus-visible:outline-focus ${
            isActive ? (look.solid ? 'bg-brand text-on-brand shadow-sm' : 'bg-brand-soft ring-1 ring-inset ring-brand/30') : 'hover:bg-surface'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                isActive ? (look.solid ? 'bg-white/20 text-on-brand' : 'bg-brand text-on-brand') : 'bg-surface text-muted group-hover:bg-panel'
              }`}
            >
              <item.icon aria-hidden="true" size={20} />
            </span>
            <span className={`min-w-0 flex-1 truncate text-[0.95rem] font-semibold ${isActive ? (look.solid ? '' : 'text-brand-strong') : 'text-ink'}`}>
              {t(item.label)}
            </span>
            {badge && (
              <span
                id={badgeId}
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.late ? LATE : isActive && look.solid ? 'bg-white/20' : 'bg-surface text-muted'}`}
              >
                {badge.wide}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  /* ---- narrow rail ---- */
  const railLink = (item: NavItem) => {
    const badge = badgeOf(item);
    const badgeId = `${idBase}-${item.key}`;
    return (
      <NavLink
        key={item.key}
        to={item.path}
        title={t(item.label)}
        aria-label={t(item.label)}
        aria-describedby={badge ? badgeId : undefined}
        className={({ isActive }) =>
          `group flex flex-col items-center gap-1 rounded-xl py-1 text-[0.7rem] leading-tight focus-visible:outline-2 focus-visible:outline-focus ${
            isActive ? 'font-bold text-brand-strong' : 'font-medium text-muted hover:text-ink'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`relative grid size-11 place-items-center rounded-xl ${
                isActive
                  ? look.solid
                    ? 'bg-brand text-on-brand shadow-sm'
                    : 'bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/30'
                  : 'bg-surface group-hover:text-ink'
              }`}
            >
              <item.icon aria-hidden="true" size={20} />
              {badge && (
                <span
                  id={badgeId}
                  className={`absolute -end-2 -top-1.5 min-w-5 rounded-full px-1 text-center text-[0.65rem] font-bold leading-5 shadow-sm ${
                    badge.late ? LATE : 'bg-panel text-muted ring-1 ring-inset ring-line'
                  }`}
                >
                  {badge.short}
                </span>
              )}
            </span>
            {look.railNames && <span className="max-w-full truncate px-1">{t(item.shortLabel)}</span>}
          </>
        )}
      </NavLink>
    );
  };

  if (narrow) {
    return (
      <aside className={`no-print sticky top-0 flex h-dvh shrink-0 flex-col gap-3 border-r border-line bg-panel px-2 py-4 ${look.railNames ? 'w-24' : 'w-20'}`}>
        {look.toggle === 'edge' && edgeToggle}
        <div className="flex flex-col items-center gap-2">
          <BrandMark size={36} />
          {look.toggle === 'top' && iconToggle}
        </div>
        <nav aria-label={t('nav.main')} className={`-m-1 flex flex-1 flex-col overflow-y-auto p-1 pt-2 ${look.railNames ? 'gap-2' : 'gap-2.5'}`}>
          {main.map(railLink)}
          {shop.length > 0 && <hr className="mx-3 my-1 border-line" />}
          {shop.map(railLink)}
        </nav>
        <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
          {look.toggle === 'bottom' && bottomToggle}
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

  return (
    <aside className="no-print sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-3 border-r border-line bg-panel px-3 py-4">
      {look.toggle === 'edge' && edgeToggle}
      <div className="flex items-center gap-2.5 px-1">
        <BrandMark size={36} className="shrink-0" />
        <span className="font-display text-lg font-bold">{t('app.name')}</span>
        <span className="rounded bg-accent/15 px-1.5 text-xs font-semibold text-accent">{t('app.demo')}</span>
        {look.toggle === 'top' && <span className="ms-auto">{iconToggle}</span>}
      </div>
      <BranchButton />
      <nav aria-label={t('nav.main')} className="-m-1 flex flex-1 flex-col gap-1 overflow-y-auto p-1">
        {main.map(wideLink)}
        {shop.length > 0 && (
          <>
            <p className="mt-3 px-3 text-xs font-semibold text-muted">{t('nav.section.shop')}</p>
            {shop.map(wideLink)}
          </>
        )}
      </nav>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        {look.toggle === 'bottom' && bottomToggle}
        <SyncButton block />
        <PersonButton />
      </div>
    </aside>
  );
}
