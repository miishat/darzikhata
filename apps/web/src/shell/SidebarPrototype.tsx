// PROTOTYPE (throwaway): desktop sidebar layouts, switched with ?variant=. Lives on prototype/sidebar-desktop only.
import type { Role } from '@darzikhata/domain';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Ellipsis, Store } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useCurrentStaff } from '../data/StoreContext';
import { BranchSwitcher, useBranchScope, useScopedState } from '../features/branches/BranchScopeProvider';
import { useToday } from '../features/common/hooks';
import { useSyncStatus } from '../features/sync/useSync';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar } from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';
import { AccountMenu } from './AccountMenu';
import { PersonButton } from './DesktopSidebar';
import { visibleNav, type NavItem } from './nav';
import { navCounts } from './navCounts';
import { useShopHeader } from './ShellParts';
import { SyncButton, SyncDialog } from './SyncStatus';

export const SIDEBAR_VARIANTS = {
  A: 'Current',
  B: 'Rail icons only · shop name under the logo',
  C: 'Rail names easier to read · shop name in place of the app name',
  D: 'One list, no Accounts & Shop · shop in a tinted card',
  E: 'Readable rail + one list · shop beside you at the bottom',
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
  railNames: 'none' | 'small' | 'readable';
  /** Whether Payments and Settings sit under their own Accounts & Shop title. */
  sections: boolean;
  shop: 'plain' | 'header' | 'card' | 'footer';
}

const LOOKS: Record<'B' | 'C' | 'D' | 'E', Look> = {
  B: { railNames: 'none', sections: true, shop: 'plain' },
  C: { railNames: 'readable', sections: true, shop: 'header' },
  D: { railNames: 'small', sections: false, shop: 'card' },
  E: { railNames: 'readable', sections: false, shop: 'footer' },
};

function useScopeName() {
  const { t, label } = useI18n();
  const { shopName, branchName } = useShopHeader();
  const { allowed, choice } = useBranchScope();
  const picked = allowed.find((b) => b.id === choice);
  const scopeName = choice === 'all' ? (allowed.length > 1 ? t('branch.all') : branchName) : picked ? label(picked.name) : branchName;
  return { shopName, scopeName, canSwitch: allowed.length > 1 };
}

/** The shop name in one of the looks; it opens the branch menu when there is more than one branch. */
function ShopBlock({ look }: { look: Look['shop'] }) {
  const { t } = useI18n();
  const { shopName, scopeName, canSwitch } = useScopeName();
  const [open, setOpen] = useState(false);
  const chevron = canSwitch && <ChevronsUpDown aria-hidden="true" size={16} className="shrink-0 text-muted" />;
  const body: ReactNode =
    look === 'plain' ? (
      <span className="flex w-full items-center gap-2 px-1">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-xl font-bold leading-tight">{shopName}</span>
          <span className="block truncate text-sm text-muted">{scopeName}</span>
        </span>
        {chevron}
      </span>
    ) : look === 'header' ? (
      <span className="flex w-full items-center gap-2.5 px-1">
        <BrandMark size={40} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-bold leading-tight">{shopName}</span>
          <span className="block truncate text-xs text-muted">
            {scopeName} · {t('app.name')} <span className="font-semibold text-accent">{t('app.demo')}</span>
          </span>
        </span>
        {chevron}
      </span>
    ) : look === 'card' ? (
      <span className="flex w-full items-center gap-3 rounded-xl bg-brand-soft p-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-panel text-brand-strong shadow-sm">
          <Store aria-hidden="true" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-brand-strong">{shopName}</span>
          <span className="block truncate text-xs text-brand-strong/80">{scopeName}</span>
        </span>
        {chevron}
      </span>
    ) : (
      <span className="flex w-full items-center gap-2 px-2">
        <Store aria-hidden="true" size={16} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {shopName} <span className="font-normal text-muted">· {scopeName}</span>
        </span>
        {chevron}
      </span>
    );
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
      {canSwitch ? (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="w-full rounded-xl py-1 text-start hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus">
          {body}
        </button>
      ) : (
        <div className="py-1">{body}</div>
      )}
      {open && (
        <div className={`absolute inset-x-0 z-20 rounded-lg border border-line bg-panel-raised p-3 shadow-lg ${look === 'footer' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <BranchSwitcher />
        </div>
      )}
    </div>
  );
}

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
  const edgeToggle = (
    <button
      type="button"
      aria-label={toggleLabel}
      title={toggleLabel}
      aria-pressed={narrow}
      onClick={() => setNarrow(!narrow)}
      className={`absolute -end-3.5 top-1/2 -translate-y-1/2 z-10 grid size-7 place-items-center rounded-full border border-line bg-panel text-muted shadow-sm hover:text-ink focus-visible:outline-2 focus-visible:outline-focus`}
    >
      {narrow ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronLeft aria-hidden="true" size={16} />}
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
          `flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.95rem] focus-visible:outline-2 focus-visible:outline-focus ${
            isActive ? 'bg-brand-soft font-semibold text-brand-strong' : 'font-medium text-ink hover:bg-surface'
          }`
        }
      >
        <item.icon aria-hidden="true" size={22} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
        {badge && (
          <span id={badgeId} className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.late ? LATE : 'bg-surface text-muted'}`}>
            {badge.wide}
          </span>
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
          `group flex flex-col items-center gap-1 rounded-xl py-1 leading-tight focus-visible:outline-2 focus-visible:outline-focus ${
            look.railNames === 'readable' ? 'text-[0.8rem]' : 'text-[0.7rem]'
          } ${
            isActive
              ? 'font-bold text-brand-strong'
              : look.railNames === 'readable'
                ? 'font-semibold text-ink'
                : 'font-medium text-muted hover:text-ink'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`relative grid size-11 place-items-center rounded-xl ${
                isActive ? 'bg-brand-soft text-brand-strong' : 'group-hover:bg-surface group-hover:text-ink'
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
            {look.railNames === 'small' && <span className="max-w-full truncate px-1">{t(item.shortLabel)}</span>}
            {look.railNames === 'readable' && <span className="line-clamp-2 max-w-full px-0.5 text-center">{t(item.shortLabel)}</span>}
          </>
        )}
      </NavLink>
    );
  };

  if (narrow) {
    return (
      <aside className={`no-print sticky top-0 flex h-dvh shrink-0 flex-col gap-3 border-r border-line bg-panel px-2 py-4 ${look.railNames === 'readable' ? 'w-28' : look.railNames === 'small' ? 'w-24' : 'w-20'}`}>
        {edgeToggle}
        <div className="flex justify-center">
          <BrandMark size={36} />
        </div>
        <nav aria-label={t('nav.main')} className={`-m-1 flex flex-1 flex-col overflow-y-auto p-1 pt-2 ${look.railNames === 'none' ? 'gap-2.5' : 'gap-2'}`}>
          {main.map(railLink)}
          {look.sections && shop.length > 0 && <hr className="mx-3 my-1 border-line" />}
          {shop.map(railLink)}
        </nav>
        <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
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
      {edgeToggle}
      {look.shop !== 'header' && (
        <div className="flex items-center gap-2.5 px-1">
          <BrandMark size={look.shop === 'plain' ? 28 : 36} className="shrink-0" />
          <span className={`font-display font-bold ${look.shop === 'plain' ? 'text-sm text-muted' : 'text-lg'}`}>{t('app.name')}</span>
          <span className="rounded bg-accent/15 px-1.5 text-xs font-semibold text-accent">{t('app.demo')}</span>
        </div>
      )}
      {look.shop !== 'footer' && <ShopBlock look={look.shop} />}
      <nav aria-label={t('nav.main')} className="-m-1 flex flex-1 flex-col gap-1 overflow-y-auto p-1">
        {main.map(wideLink)}
        {look.sections && shop.length > 0 && <p className="mt-3 px-3 text-xs font-semibold text-muted">{t('nav.section.shop')}</p>}
        {shop.map(wideLink)}
      </nav>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <SyncButton block />
        {look.shop === 'footer' && <ShopBlock look="footer" />}
        <PersonButton />
      </div>
    </aside>
  );
}
