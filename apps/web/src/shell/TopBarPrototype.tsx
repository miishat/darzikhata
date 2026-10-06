// PROTOTYPE (throwaway): desktop top bar layouts, switched with ?variant=. Lives on prototype/topbar-desktop only.
import { can, type Role } from '@darzikhata/domain';
import { CheckCheck, Monitor, Moon, Plus, Scissors, Sun, TriangleAlert, UserPlus } from 'lucide-react';
import { useMemo, type RefObject } from 'react';
import { Link, useLocation } from 'react-router';
import { dashboardModel } from '../features/dashboard/dashboard';
import { useScopedState } from '../features/branches/BranchScopeProvider';
import { useToday } from '../features/common/hooks';
import { useI18n } from '../i18n/I18nProvider';
import { buttonClasses } from '../ui/Button';
import { GlobalSearch } from './GlobalSearch';
import { NAV_ITEMS } from './nav';
import { SyncButton } from './SyncStatus';
import { useTheme, type ThemePreference } from './theme';

export const TOPBAR_VARIANTS = {
  A: 'Current',
  B: 'Page title + tools',
  C: 'Search fills the bar + theme',
  D: 'Today chips + search',
  E: 'Navy bar',
} as const;

interface BarProps {
  role: Role;
  searchInput: RefObject<HTMLInputElement | null>;
}

function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

const HEADER = 'no-print flex h-14 items-center gap-3 border-b px-6';

/** বাংলা | EN as two halves of one control. */
function LanguageSwitch({ dark }: { dark?: boolean }) {
  const { language, setLanguage } = useI18n();
  const half = (on: boolean) =>
    `min-h-8 rounded-md px-2.5 text-sm font-semibold ${
      on ? (dark ? 'bg-white text-navy' : 'bg-panel text-ink shadow-sm') : dark ? 'text-on-navy-muted hover:text-on-navy' : 'text-muted hover:text-ink'
    }`;
  return (
    <div role="group" aria-label="Language" className={`flex shrink-0 items-center gap-0.5 rounded-lg p-1 ${dark ? 'bg-white/10' : 'bg-surface ring-1 ring-inset ring-line'}`}>
      <button type="button" lang="bn" aria-pressed={language === 'bn'} onClick={() => setLanguage('bn')} className={half(language === 'bn')}>
        বাংলা
      </button>
      <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} className={half(language === 'en')}>
        English
      </button>
    </div>
  );
}

const THEME_ORDER: ThemePreference[] = ['auto', 'light', 'dark'];
const THEME_ICON = { auto: Monitor, light: Sun, dark: Moon };

/** One button that steps through device, light and dark. */
function ThemeButton({ dark }: { dark?: boolean }) {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const Icon = THEME_ICON[theme];
  const label = `${t('more.theme')}: ${t(`more.theme.${theme}`)}`;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]!)}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${dark ? 'text-on-navy hover:bg-white/10' : 'border border-line text-muted hover:bg-surface hover:text-ink'}`}
    >
      <Icon aria-hidden="true" size={18} />
    </button>
  );
}

function NewOrder({ role, className = '' }: { role: Role; className?: string }) {
  const { t } = useI18n();
  if (!can(role, 'orders.create')) return null;
  return (
    <Link to="/app/orders/new" data-tour="new-order" className={`${buttonClasses('primary')} shrink-0 gap-2 ${className}`}>
      <Plus aria-hidden="true" size={18} />
      {t('nav.newOrder')}
      <kbd aria-hidden="true" className="rounded bg-on-brand/20 px-1.5 font-sans text-xs">N</kbd>
    </Link>
  );
}

/** The section the address is in, from the sidebar's own list. */
function usePageTitle() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const L = useL();
  const item = NAV_ITEMS.find((i) => pathname.startsWith(i.path));
  if (pathname.startsWith('/app/orders/new')) return { icon: Plus, title: t('nav.newOrder') };
  if (item) return { icon: item.icon, title: t(item.label) };
  if (pathname.startsWith('/app/review')) return { icon: CheckCheck, title: L('যাচাই', 'Review') };
  return { icon: null, title: L('আরও', 'More') };
}

// ---------------------------------------------------------------- B

/** Where you are on the left; search, language, theme and New Order on the right. */
export function BarB({ role, searchInput }: BarProps) {
  const { icon: Icon, title } = usePageTitle();
  return (
    <header className={`${HEADER} border-line bg-panel`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
            <Icon aria-hidden="true" size={17} />
          </span>
        )}
        <span className="truncate font-display text-lg font-bold">{title}</span>
      </div>
      <div className="flex-1" />
      <GlobalSearch role={role} inputRef={searchInput} look="icon" />
      <LanguageSwitch />
      <ThemeButton />
      <NewOrder role={role} />
    </header>
  );
}

// ---------------------------------------------------------------- C

/** A wide search on the left that says what it finds; language, theme and quick create buttons on the right. */
export function BarC({ role, searchInput }: BarProps) {
  const { t } = useI18n();
  const L = useL();
  return (
    <header className={`${HEADER} border-line bg-panel`}>
      <GlobalSearch role={role} inputRef={searchInput} look="wide" placeholder={L('অর্ডার নম্বর, কাস্টমারের নাম বা ফোন খুঁজুন', 'Search order number, customer name or phone')} />
      <LanguageSwitch />
      <ThemeButton />
      {can(role, 'customers.edit') && (
        <Link to="/app/customers/new" className={`${buttonClasses('secondary')} shrink-0`}>
          <UserPlus aria-hidden="true" size={18} />
          {t('customers.new')}
        </Link>
      )}
      <NewOrder role={role} />
    </header>
  );
}

// ---------------------------------------------------------------- D

/** Today's counts as chips that open Orders, then search; language and New Order on the right. */
export function BarD({ role, searchInput }: BarProps) {
  const { t, number, date } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const model = useMemo(() => dashboardModel(Object.values(state.orders), today), [state, today]);
  const chip = 'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold';
  return (
    <header className={`${HEADER} border-line bg-panel`}>
      <span className="shrink-0 text-sm font-semibold text-muted">{date(today, { year: false })}</span>
      <nav aria-label={t('dashboard.title')} className="flex items-center gap-1.5">
        <Link to="/app/orders?status=overdue" className={`${chip} ${model.overdueGarments > 0 ? 'bg-warn-soft text-warn-ink ring-1 ring-inset ring-warn-line' : 'bg-surface text-muted'}`}>
          <TriangleAlert aria-hidden="true" size={15} />
          {t('dashboard.tile.late')} {number(model.overdueGarments)}
        </Link>
        <Link to="/app/orders?status=trial&sort=delivery" className={`${chip} bg-surface hover:bg-brand-soft`}>
          <Scissors aria-hidden="true" size={15} />
          {t('dashboard.tile.trial')} {number(model.trialsToday.length)}
        </Link>
        <Link to="/app/orders?status=ready" className={`${chip} bg-surface hover:bg-brand-soft`}>
          <CheckCheck aria-hidden="true" size={15} />
          {t('dashboard.tile.ready')} {number(model.readyGarments)}
        </Link>
      </nav>
      <div className="flex flex-1 justify-end">
        <GlobalSearch role={role} inputRef={searchInput} look="icon" />
      </div>
      <LanguageSwitch />
      <NewOrder role={role} />
    </header>
  );
}

// ---------------------------------------------------------------- E

/** The bar in the brand's navy, like today's panel, with a dark search box and the sync pill. */
export function BarE({ role, searchInput }: BarProps) {
  return (
    <header className={`${HEADER} border-navy-line bg-navy text-on-navy`}>
      <GlobalSearch role={role} inputRef={searchInput} look="dark" />
      <div className="flex-1" />
      <SyncButton />
      <LanguageSwitch dark />
      <ThemeButton dark />
      <NewOrder role={role} className="bg-white !text-navy hover:bg-white/90 [&_kbd]:bg-navy/10" />
    </header>
  );
}
