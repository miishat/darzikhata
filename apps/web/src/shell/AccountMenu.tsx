import type { Language } from '@darzikhata/domain';
import { ChevronRight, RotateCcw, Settings, Store, Wallet, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
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

/** The phone's account sheet: who is signed in, sections off the tab bar, preferences that expand in place, and the demo controls. */
export function AccountMenu({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t, label, language, setLanguage } = useI18n();
  const { preference, setPreference, kind } = useShell();
  const { allowed } = useBranchScope();
  const { session } = useSnapshot();
  const current = useCurrentStaff();
  const store = useStore();
  const presenter = usePresenterSetting();
  const { theme, setTheme } = useTheme();
  const { keypadOn, setKeypadOn } = useKeypadOn();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<'reset' | 'change' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // The confirm keeps its wording while it fades away.
  const shownConfirm = useRef<'reset' | 'change'>('reset');
  if (confirming) shownConfirm.current = confirming;

  const extra = current ? visibleNav(current.role).filter((item) => !item.mobileTab) : [];
  const languages: Array<{ value: Language; label: string }> = [
    { value: 'bn', label: 'বাংলা' },
    { value: 'en', label: 'English' },
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

  const preferenceRow = <T extends string>(key: string, legend: string, value: T, options: Array<{ value: T; label: string }>, onChange: (v: T) => void) => {
    const isOpen = expanded === key;
    return (
      <div>
        <button type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : key)} className={ROW}>
          <span className="min-w-0 flex-1 font-semibold">{legend}</span>
          <span className="text-sm text-muted">{options.find((o) => o.value === value)?.label}</span>
          <ChevronRight size={18} aria-hidden="true" className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {kind === 'mobile' ? (
          isOpen && (
            <div className="px-3 pb-3">
              <SegmentedControl legend={legend} value={value} options={options} onChange={onChange} />
            </div>
          )
        ) : (
          // PROTOTYPE: on a desktop it opens smoothly to its height; closed, it stays out of reach.
          <div
          inert={!isOpen}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-3 pb-3">
              <SegmentedControl legend={legend} value={value} options={options} onChange={onChange} />
            </div>
          </div>
        </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} title={t('shell.account')} onClose={onClose} hideTitleOnPhone animated>
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
        {kind === 'mobile' && allowed.length > 1 && (
          <div className="rounded-2xl bg-surface p-3">
            <BranchSwitcher />
          </div>
        )}
        <div className={GROUP}>
          {preferenceRow('language', t('more.language'), language, languages, setLanguage)}
          {preferenceRow('theme', t('more.theme'), theme, themes, setTheme)}
          {preferenceRow('layout', t('more.layout'), preference, layouts, setPreference)}
          {kind === 'mobile' && (
            <div className={ROW}>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t('more.keypad')}</span>
                <span className="block text-sm text-muted">{t('more.keypadHint')}</span>
              </span>
              <Switch on={keypadOn} onChange={setKeypadOn} label={t('more.keypad')} />
            </div>
          )}
        </div>
        <div className={GROUP}>
          <div className={ROW}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('presenter.toggle')}</span>
              <span className="block text-sm text-muted">{t('presenter.toggleHint')}</span>
            </span>
            <Switch on={presenter.enabled} onChange={presenter.setEnabled} label={t('presenter.toggle')} />
          </div>
          <button type="button" onClick={() => setConfirming('reset')} className={ROW}>
            <span className={TILE}>
              <RotateCcw size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 font-semibold">{t('more.reset')}</span>
          </button>
          <button type="button" onClick={() => setConfirming('change')} className={ROW}>
            <span className={TILE}>
              <Store size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 font-semibold">{t('more.changeShop')}</span>
          </button>
        </div>
      </div>
      <Dialog
        open={confirming !== null}
        title={t(shownConfirm.current === 'reset' ? 'more.reset' : 'more.changeShop')}
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
        {t(shownConfirm.current === 'reset' ? 'more.resetConfirm' : 'more.changeShopConfirm')}
      </Dialog>
    </Dialog>
  );
}
