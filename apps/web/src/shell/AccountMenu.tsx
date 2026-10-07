import type { Language } from '@darzikhata/domain';
import { ChevronRight, LogOut, RotateCcw, Settings, Store, Wallet, type LucideIcon } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { BranchSwitcher, useBranchScope } from '../features/branches/BranchScopeProvider';
import { usePresenterSetting } from '../features/presenter/PresenterSetting';
import { useCurrentStaff, useSnapshot, useStore } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Switch } from '../ui/Switch';
import { useKeypadOn } from './keypad';
import { visibleNav, type NavKey } from './nav';
import { useShell, type ShellPreference } from './ShellPreference';
import { useTheme, type ThemePreference } from './theme';

const TILE = 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong';
const ROW = 'flex min-h-14 w-full items-center gap-3 px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-focus';
const GROUP = 'divide-y divide-line overflow-hidden rounded-2xl bg-surface';
const NAV_ICON: Partial<Record<NavKey, LucideIcon>> = { payments: Wallet, settings: Settings };

interface MenuProps {
  open: boolean;
  onClose(): void;
}

/** The account menu: a centred popup with everything in view on a desktop, a sheet with expanding rows on a phone. */
export function AccountMenu(props: MenuProps) {
  const { kind } = useShell();
  return kind === 'desktop' ? <DesktopAccountMenu {...props} /> : <PhoneAccountMenu {...props} />;
}

/** The choices for language, theme and layout. */
function usePreferenceOptions() {
  const { t } = useI18n();
  const languages: Array<{ value: Language; label: string }> = [
    { value: 'bn', label: t('more.language.bangla') },
    { value: 'en', label: t('more.language.english') },
  ];
  const themes: Array<{ value: ThemePreference; label: string }> = [
    { value: 'auto', label: t('more.theme.auto') },
    { value: 'light', label: t('more.theme.light') },
    { value: 'dark', label: t('more.theme.dark') },
  ];
  const layouts: Array<{ value: ShellPreference; label: string }> = [
    { value: 'auto', label: t('more.layout.auto') },
    { value: 'mobile', label: t('more.layout.mobile') },
    { value: 'desktop', label: t('more.layout.desktop') },
  ];
  return { languages, themes, layouts };
}

/** Resetting the demo or choosing another shop, each after a confirm. `ask` opens it; `dialog` renders it. */
function useDemoConfirm() {
  const { t } = useI18n();
  const { session } = useSnapshot();
  const store = useStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<'reset' | 'change' | null>(null);
  // The confirm keeps its wording while it shrinks away.
  const shown = useRef<'reset' | 'change'>('reset');
  if (confirming) shown.current = confirming;

  const confirm = async () => {
    if (confirming === 'reset' && session) {
      await store.startDemo(session.shopKey);
      navigate('/app');
    } else {
      await store.clear();
      navigate('/welcome');
    }
    setConfirming(null);
  };

  const dialog = (
    <Dialog
      open={confirming !== null}
      title={t(shown.current === 'reset' ? 'more.reset' : 'more.changeShop')}
      onClose={() => setConfirming(null)}
      animated
      actions={
        <>
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirm}>
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      {t(shown.current === 'reset' ? 'more.resetConfirm' : 'more.changeShopConfirm')}
    </Dialog>
  );
  return { ask: setConfirming, dialog };
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{children}</p>;
}

/**
 * The desktop account popup: who is signed in with Switch User, language, theme and layout always in view,
 * then the demo controls. It grows out of the button that opened it; its title is announced but not shown.
 */
function DesktopAccountMenu({ open, onClose }: MenuProps) {
  const { t, label, language, setLanguage } = useI18n();
  const { preference, setPreference } = useShell();
  const current = useCurrentStaff();
  const presenter = usePresenterSetting();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { languages, themes, layouts } = usePreferenceOptions();
  const demo = useDemoConfirm();

  return (
    <Dialog open={open} title={t('shell.account')} onClose={onClose} hideTitle animated>
      <div className="space-y-4 text-ink">
        {current && (
          <div className="flex items-center gap-3">
            <Avatar id={current.staff.id} name={current.staff.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{current.staff.name}</p>
              <p className="text-sm text-muted">{label(current.role.name)}</p>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => {
                onClose();
                navigate('/sign-in');
              }}
            >
              <LogOut size={16} aria-hidden="true" />
              {t('shell.switchUser')}
            </Button>
          </div>
        )}
        <hr className="border-line" />
        <div>
          <Label>{t('more.language')}</Label>
          <SegmentedControl legend={t('more.language')} value={language} options={languages} onChange={setLanguage} />
        </div>
        <div>
          <Label>{t('more.theme')}</Label>
          <SegmentedControl legend={t('more.theme')} value={theme} options={themes} onChange={setTheme} />
        </div>
        <div>
          <Label>{t('more.layout')}</Label>
          <SegmentedControl legend={t('more.layout')} value={preference} options={layouts} onChange={setPreference} />
        </div>
        <hr className="border-line" />
        <div>
          <Label>{t('more.demo')}</Label>
          <div className="flex items-center gap-3 py-1">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t('presenter.toggle')}</span>
              <span className="block text-xs text-muted">{t('presenter.toggleHint')}</span>
            </span>
            <Switch on={presenter.enabled} onChange={presenter.setEnabled} label={t('presenter.toggle')} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="text-xs" onClick={() => demo.ask('reset')}>
              <RotateCcw size={14} aria-hidden="true" />
              {t('more.reset')}
            </Button>
            <Button variant="secondary" className="text-xs" onClick={() => demo.ask('change')}>
              <Store size={14} aria-hidden="true" />
              {t('more.changeShop')}
            </Button>
          </div>
        </div>
      </div>
      {demo.dialog}
    </Dialog>
  );
}

/** The phone's account sheet: who is signed in, sections off the tab bar, preferences that expand in place, and the demo controls. */
function PhoneAccountMenu({ open, onClose }: MenuProps) {
  const { t, label, language, setLanguage } = useI18n();
  const { preference, setPreference } = useShell();
  const { allowed } = useBranchScope();
  const current = useCurrentStaff();
  const presenter = usePresenterSetting();
  const { theme, setTheme } = useTheme();
  const { keypadOn, setKeypadOn } = useKeypadOn();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { languages, themes, layouts } = usePreferenceOptions();
  const demo = useDemoConfirm();

  const extra = current ? visibleNav(current.role).filter((item) => !item.mobileTab) : [];

  const preferenceRow = <T extends string>(key: string, legend: string, value: T, options: Array<{ value: T; label: string }>, onChange: (v: T) => void) => {
    const isOpen = expanded === key;
    return (
      <div>
        <button type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : key)} className={ROW}>
          <span className="min-w-0 flex-1 font-semibold">{legend}</span>
          <span className="text-sm text-muted">{options.find((o) => o.value === value)?.label}</span>
          <ChevronRight size={18} aria-hidden="true" className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen && (
          <div className="px-3 pb-3">
            <SegmentedControl legend={legend} value={value} options={options} onChange={onChange} />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} title={t('shell.account')} onClose={onClose} hideTitleOnPhone>
      <div className="space-y-3 text-ink">
        {current && (
          <div className="flex items-center gap-3">
            <Avatar id={current.staff.id} name={current.staff.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{current.staff.name}</p>
              <p className="text-sm text-muted">{label(current.role.name)}</p>
            </div>
            <Button
              variant="secondary"
              className="shrink-0 rounded-full"
              onClick={() => {
                onClose();
                navigate('/sign-in');
              }}
            >
              {t('shell.switchUser')}
            </Button>
          </div>
        )}
        {extra.length > 0 && (
          <div className={GROUP}>
            {extra.map((item) => {
              const Icon = NAV_ICON[item.key] ?? Settings;
              return (
                <Link key={item.key} to={item.path} onClick={onClose} data-tour={`nav-${item.key}`} className={ROW}>
                  <span className={TILE}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 font-semibold">{t(item.label)}</span>
                  <ChevronRight size={18} aria-hidden="true" className="text-muted" />
                </Link>
              );
            })}
          </div>
        )}
        {allowed.length > 1 && (
          <div className="rounded-2xl bg-surface p-3">
            <BranchSwitcher />
          </div>
        )}
        <div className={GROUP}>
          {preferenceRow('language', t('more.language'), language, languages, setLanguage)}
          {preferenceRow('theme', t('more.theme'), theme, themes, setTheme)}
          {preferenceRow('layout', t('more.layout'), preference, layouts, setPreference)}
          <div className={ROW}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('more.keypad')}</span>
              <span className="block text-sm text-muted">{t('more.keypadHint')}</span>
            </span>
            <Switch on={keypadOn} onChange={setKeypadOn} label={t('more.keypad')} />
          </div>
        </div>
        <div className={GROUP}>
          <div className={ROW}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('presenter.toggle')}</span>
              <span className="block text-sm text-muted">{t('presenter.toggleHint')}</span>
            </span>
            <Switch on={presenter.enabled} onChange={presenter.setEnabled} label={t('presenter.toggle')} />
          </div>
          <button type="button" onClick={() => demo.ask('reset')} className={ROW}>
            <span className={TILE}>
              <RotateCcw size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 font-semibold">{t('more.reset')}</span>
          </button>
          <button type="button" onClick={() => demo.ask('change')} className={ROW}>
            <span className={TILE}>
              <Store size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 font-semibold">{t('more.changeShop')}</span>
          </button>
        </div>
      </div>
      {demo.dialog}
    </Dialog>
  );
}
