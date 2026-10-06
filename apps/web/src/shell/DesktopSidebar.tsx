import type { Role } from '@darzikhata/domain';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Ellipsis } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useCurrentStaff } from '../data/StoreContext';
import { BranchSwitcher, useBranchScope, useScopedState } from '../features/branches/BranchScopeProvider';
import { useToday } from '../features/common/hooks';
import { useI18n } from '../i18n/I18nProvider';
import { readSetting, writeSetting } from '../lib/safeStorage';
import { Avatar } from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';
import { AccountMenu } from './AccountMenu';
import { visibleNav, type NavItem } from './nav';
import { navCounts } from './navCounts';
import { useShopHeader } from './ShellParts';
import { SyncButton } from './SyncStatus';

const SHOP_KEYS = new Set(['payments', 'settings']);
const RAIL_KEY = 'dk.sidebar.rail';
const LATE = 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink';

/** Whether the sidebar is folded to the narrow rail; remembered on this device. */
function useRail(): [boolean, (next: boolean) => void] {
  const [rail, setRailState] = useState(() => readSetting(RAIL_KEY) === '1');
  const setRail = (next: boolean) => {
    writeSetting(RAIL_KEY, next ? '1' : '0');
    setRailState(next);
  };
  return [rail, setRail];
}

/** The shop header, level with the top bar: logo, shop name, then the branch and app name. Opens the branch menu when there is more than one branch. */
function ShopHeader() {
  const { t, label } = useI18n();
  const { shopName, branchName } = useShopHeader();
  const { allowed, choice } = useBranchScope();
  const [open, setOpen] = useState(false);
  const picked = allowed.find((b) => b.id === choice);
  const scopeName = choice === 'all' ? (allowed.length > 1 ? t('branch.all') : branchName) : picked ? label(picked.name) : branchName;
  const body = (
    <>
      <BrandMark size={36} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg font-bold leading-tight">{shopName}</span>
        <span className="block truncate text-xs text-muted">
          <span>{scopeName}</span> · {t('app.name')} <span className="font-semibold text-accent">{t('app.demo')}</span>
        </span>
      </span>
    </>
  );
  const frame = 'flex w-full items-center gap-2.5 rounded-xl p-1 text-start';
  // With one branch there is nothing to switch, so no menu.
  if (allowed.length < 2) return <div className={frame}>{body}</div>;
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
        className={`${frame} hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus`}
      >
        {body}
        <ChevronsUpDown aria-hidden="true" size={16} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div role="group" aria-label={t('nav.branchMenu')} className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-line bg-panel-raised p-3 shadow-lg">
          <BranchSwitcher />
        </div>
      )}
    </div>
  );
}

/** The signed-in person, which opens sign-in to switch user, and the account menu. On the rail, just the avatar. */
function PersonButton({ rail }: { rail: boolean }) {
  const { t, label } = useI18n();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  if (!current) return null;
  const who = t('shell.signedInAs', { name: current.staff.name, role: label(current.role.name) });
  return (
    <div className={rail ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1'}>
      <button
        type="button"
        data-tour="switch-user"
        title={who}
        aria-label={`${who} · ${t('shell.switchUser')}`}
        onClick={() => navigate('/sign-in')}
        className={`hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus ${
          rail ? 'rounded-full p-1' : 'flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-start'
        }`}
      >
        <Avatar id={current.staff.id} name={current.staff.name} />
        {!rail && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{current.staff.name}</span>
            <span className="block truncate text-xs text-muted">{label(current.role.name)}</span>
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={t('shell.account')}
        title={rail ? t('shell.account') : undefined}
        aria-haspopup="dialog"
        onClick={() => setAccountOpen(true)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Ellipsis aria-hidden="true" size={20} />
      </button>
      <AccountMenu open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}

/**
 * The desktop sidebar: the shop header level with the top bar, navigation with counts, sync status and the
 * signed-in person. A tab on its edge folds it to a narrow rail of icons with short names, remembered on this device.
 */
export function DesktopSidebar({ role }: { role: Role }) {
  const { t, number } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const counts = useMemo(() => navCounts(state, today), [state, today]);
  const idBase = useId();
  const [rail, setRail] = useRail();
  const items = visibleNav(role);
  const main = items.filter((i) => !SHOP_KEYS.has(i.key));
  const shop = items.filter((i) => SHOP_KEYS.has(i.key));

  const link = (item: NavItem) => {
    const late = item.key === 'work' && counts.lateGarments > 0;
    const count = item.key === 'orders' && counts.openOrders > 0 ? counts.openOrders : late ? counts.lateGarments : 0;
    const badgeId = `${idBase}-${item.key}`;
    const lateText = t('nav.late', { count: number(counts.lateGarments) });

    if (rail) {
      return (
        <NavLink
          key={item.key}
          to={item.path}
          title={t(item.label)}
          data-tour={`nav-${item.key}`}
          aria-label={t(item.label)}
          aria-describedby={count ? badgeId : undefined}
          className={({ isActive }) =>
            `group flex flex-col items-center gap-1 rounded-xl py-1 text-[0.8rem] leading-tight focus-visible:outline-2 focus-visible:outline-focus ${
              isActive ? 'font-bold text-brand-strong' : 'font-semibold text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`relative grid size-11 place-items-center rounded-xl ${isActive ? 'bg-brand-soft' : 'group-hover:bg-surface'}`}>
                <item.icon aria-hidden="true" size={20} />
                {count > 0 && (
                  <span
                    className={`absolute -end-2 -top-1.5 min-w-5 rounded-full px-1 text-center text-[0.65rem] font-bold leading-5 shadow-sm ${
                      late ? LATE : 'bg-panel text-muted ring-1 ring-inset ring-line'
                    }`}
                  >
                    {/* Only the number fits; screen readers get the full wording. */}
                    <span aria-hidden="true">{number(count)}</span>
                    <span id={badgeId} className="sr-only">
                      {late ? lateText : number(count)}
                    </span>
                  </span>
                )}
              </span>
              <span className="line-clamp-2 max-w-full px-0.5 text-center">{t(item.shortLabel)}</span>
            </>
          )}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.key}
        to={item.path}
        data-tour={`nav-${item.key}`}
        aria-label={t(item.label)}
        aria-describedby={count ? badgeId : undefined}
        className={({ isActive }) =>
          `flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.95rem] focus-visible:outline-2 focus-visible:outline-focus ${
            isActive ? 'bg-brand-soft font-semibold text-brand-strong' : 'font-medium text-ink hover:bg-surface'
          }`
        }
      >
        <item.icon aria-hidden="true" size={22} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
        {count > 0 && (
          <span id={badgeId} className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${late ? LATE : 'bg-surface text-muted'}`}>
            {late ? lateText : number(count)}
          </span>
        )}
      </NavLink>
    );
  };

  const toggleLabel = t(rail ? 'nav.expand' : 'nav.collapse');
  const Chevron = rail ? ChevronRight : ChevronLeft;

  return (
    <aside className={`no-print sticky top-0 flex h-dvh shrink-0 flex-col gap-3 border-r border-line bg-panel pb-4 ${rail ? 'w-28 px-2' : 'w-64 px-3'}`}>
      <button
        type="button"
        aria-label={toggleLabel}
        title={toggleLabel}
        aria-expanded={!rail}
        onClick={() => setRail(!rail)}
        className="absolute -end-3.5 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel text-muted shadow-sm hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Chevron aria-hidden="true" size={16} />
      </button>
      {rail ? (
        <div className="flex h-14 shrink-0 items-center justify-center">
          <BrandMark size={36} />
        </div>
      ) : (
        // The line under the shop header continues the top bar's bottom edge.
        <div className="mx-1 flex h-14 shrink-0 items-center border-b border-line">
          <div className="min-w-0 flex-1">
            <ShopHeader />
          </div>
        </div>
      )}
      <nav aria-label={t('nav.main')} className={`-m-1 flex flex-1 flex-col overflow-y-auto p-1 ${rail ? 'gap-2 pt-2' : 'mt-2 gap-1'}`}>
        {main.map(link)}
        {shop.length > 0 && main.length > 0 && <hr className={`mx-3 border-line ${rail ? 'my-1' : 'my-2'}`} />}
        {shop.map(link)}
      </nav>
      <div className={`flex flex-col gap-2 border-t border-line pt-3 ${rail ? 'items-center' : ''}`}>
        <SyncButton block={!rail} dot={rail} />
        <PersonButton rail={rail} />
      </div>
    </aside>
  );
}
