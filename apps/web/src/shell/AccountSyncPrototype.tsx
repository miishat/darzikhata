// PROTOTYPE (throwaway): desktop account and sync popup variants behind ?variant=. A is the current dialogs.
import type { Language } from '@darzikhata/domain';
import { ClipboardCheck, LogOut, Monitor, Moon, RefreshCw, RotateCcw, Smartphone, Store, Sun, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../data/StoreContext';
import { usePresenterSetting } from '../features/presenter/PresenterSetting';
import { otherDeviceEdit, otherDeviceTarget } from '../features/sync/otherDevice';
import { useSyncStatus, useVisibleReview } from '../features/sync/useSync';
import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dialog, useModalFocus } from '../ui/Dialog';
import { Drawer, type DrawerHandle } from '../ui/Drawer';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Switch } from '../ui/Switch';
import { useShell, type ShellPreference } from './ShellPreference';
import { DOT, STATUS_KEY } from './SyncStatus';
import { useTheme, type ThemePreference } from './theme';

export const PROTO_VARIANTS = {
  A: 'Centred, B layout, with motion',
  B: 'Pop out beside the sidebar',
  C: 'Side panel with tabs',
  D: 'Control centre grid',
};
export const PROTO_KEYS = Object.keys(PROTO_VARIANTS);
export type ProtoKind = 'account' | 'sync';

function useAccount() {
  const { t, label, language, setLanguage } = useI18n();
  const { preference, setPreference } = useShell();
  const { session } = useSnapshot();
  const current = useCurrentStaff();
  const store = useStore();
  const presenter = usePresenterSetting();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<'reset' | 'change' | null>(null);
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
  const confirmDialog = (
    <Dialog
      open={confirming !== null}
      title={t(confirming === 'reset' ? 'more.reset' : 'more.changeShop')}
      onClose={() => setConfirming(null)}
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
      {t(confirming === 'reset' ? 'more.resetConfirm' : 'more.changeShopConfirm')}
    </Dialog>
  );
  return {
    t,
    current,
    roleName: current ? label(current.role.name) : '',
    languages,
    themes,
    layouts,
    language,
    setLanguage,
    theme,
    setTheme,
    preference,
    setPreference,
    presenter,
    confirming,
    setConfirming,
    confirmDialog,
    switchUser: () => navigate('/sign-in'),
  };
}

function useSyncPanel() {
  const { t, number, dateTime } = useI18n();
  const store = useStore();
  const { sync, state } = useSnapshot();
  const review = useVisibleReview();
  const status = useSyncStatus();
  const { pathname } = useLocation();
  const [outcome, setOutcome] = useState<MessageKey | null>(null);
  const target = otherDeviceTarget(pathname, state);
  const pushOther = async () => {
    if (!target) return;
    const note = t(target.kind === 'customer' ? 'sync.otherCustomerNote' : 'sync.otherItemNote');
    const edit = otherDeviceEdit(target, state, note);
    if (!edit) return;
    const wasOnline = sync.online;
    const result = await store.pushFromOtherDevice(edit);
    setOutcome(result.ok ? (wasOnline ? 'sync.otherDone' : 'sync.otherQueued') : 'sync.otherNotOnServer');
  };
  return {
    t,
    number,
    sync,
    status,
    review,
    target,
    outcome,
    pushOther,
    statusText: t(STATUS_KEY[status]!),
    lastText: sync.lastSyncAt ? t('sync.last', { time: dateTime(sync.lastSyncAt) }) : t('sync.never'),
    lastTime: sync.lastSyncAt ? dateTime(sync.lastSyncAt) : t('sync.never'),
    setOnline: (on: boolean) => void store.setOnline(on),
    syncNow: () => void store.syncNow(),
  };
}

const OK_TILE = 'bg-ok-soft text-ok';
const WARN_TILE = 'bg-warn-soft text-warn-ink';
const tileTone = (status: string) => (status === 'online' ? OK_TILE : status === 'syncing' ? 'bg-surface text-muted' : WARN_TILE);

export function PrototypeAccountSync({ variant, kind, anchor, onClose }: { variant: string; kind: ProtoKind; anchor: HTMLElement | null; onClose(): void }) {
  if (variant === 'B') return <PopoverVariant kind={kind} anchor={anchor} onClose={onClose} />;
  if (variant === 'C') return <PanelVariant kind={kind} onClose={onClose} />;
  if (variant === 'D') return <GridVariant kind={kind} onClose={onClose} />;
  return null;
}

/* ---------------- A: the centred dialog with its motion, holding B's layout ---------------- */

export function PrototypeDialogA({ kind, onClose }: { kind: ProtoKind | null; onClose(): void }) {
  const { t } = useI18n();
  // Keeps its content while it shrinks away.
  const shown = useRef<ProtoKind>('account');
  if (kind) shown.current = kind;
  return (
    <Dialog open={kind !== null} animated title={t(shown.current === 'account' ? 'shell.account' : 'sync.title')} onClose={onClose}>
      {shown.current === 'account' ? <PopoverAccount onClose={onClose} /> : <PopoverSync onClose={onClose} />}
    </Dialog>
  );
}

/* ---------------- B: a popover next to the sidebar, everything visible at once ---------------- */

function PopoverVariant({ kind, anchor, onClose }: { kind: ProtoKind; anchor: HTMLElement | null; onClose(): void }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number }>({ left: 272, bottom: 16 });
  useLayoutEffect(() => {
    if (!anchor) return;
    const sidebar = anchor.closest('aside') ?? anchor;
    const r = anchor.getBoundingClientRect();
    setPos({ left: sidebar.getBoundingClientRect().right + 12, bottom: Math.max(16, window.innerHeight - r.bottom) });
  }, [anchor]);
  useEffect(() => {
    box.current?.focus();
    // A modal opened from the popover (the demo confirm) keeps it open.
    const inModal = (el: EventTarget | null) => el instanceof Element && !!el.closest('[aria-modal="true"]');
    const onDown = (e: MouseEvent) => {
      if (box.current?.contains(e.target as Node) || anchor?.contains(e.target as Node) || inModal(e.target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inModal(document.activeElement)) {
        onClose();
        anchor?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose]);
  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-label={t(kind === 'account' ? 'shell.account' : 'sync.title')}
      tabIndex={-1}
      style={{ left: pos.left, bottom: pos.bottom }}
      className="dialog-panel fixed z-40 max-h-[calc(100dvh-2rem)] w-[360px] overflow-y-auto rounded-2xl bg-panel-raised p-4 text-ink shadow-2xl outline-1 -outline-offset-1 outline-raised-line focus:outline-none"
    >
      {kind === 'account' ? <PopoverAccount onClose={onClose} /> : <PopoverSync onClose={onClose} />}
    </div>,
    document.body,
  );
}

function SmallLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{children}</p>;
}

function PopoverAccount({ onClose }: { onClose(): void }) {
  const a = useAccount();
  const { t } = a;
  return (
    <div className="space-y-4 text-ink">
      {a.current && (
        <div className="flex items-center gap-3">
          <Avatar id={a.current.staff.id} name={a.current.staff.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{a.current.staff.name}</p>
            <p className="text-sm text-muted">{a.roleName}</p>
          </div>
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={() => {
              onClose();
              a.switchUser();
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            {t('shell.switchUser')}
          </Button>
        </div>
      )}
      <hr className="border-line" />
      <div>
        <SmallLabel>{t('more.language')}</SmallLabel>
        <SegmentedControl legend={t('more.language')} value={a.language} options={a.languages} onChange={a.setLanguage} />
      </div>
      <div>
        <SmallLabel>{t('more.theme')}</SmallLabel>
        <SegmentedControl legend={t('more.theme')} value={a.theme} options={a.themes} onChange={a.setTheme} />
      </div>
      <div>
        <SmallLabel>{t('more.layout')}</SmallLabel>
        <SegmentedControl legend={t('more.layout')} value={a.preference} options={a.layouts} onChange={a.setPreference} />
      </div>
      <hr className="border-line" />
      <div>
        <SmallLabel>{t('more.demo')}</SmallLabel>
        <div className="flex items-center gap-3 py-1">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{t('presenter.toggle')}</span>
            <span className="block text-xs text-muted">{t('presenter.toggleHint')}</span>
          </span>
          <Switch on={a.presenter.enabled} onChange={a.presenter.setEnabled} label={t('presenter.toggle')} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" className="text-xs" onClick={() => a.setConfirming('reset')}>
            <RotateCcw size={14} aria-hidden="true" />
            {t('more.reset')}
          </Button>
          <Button variant="secondary" className="text-xs" onClick={() => a.setConfirming('change')}>
            <Store size={14} aria-hidden="true" />
            {t('more.changeShop')}
          </Button>
        </div>
      </div>
      {a.confirmDialog}
    </div>
  );
}

function PopoverSync({ onClose }: { onClose(): void }) {
  const s = useSyncPanel();
  const { t, number } = s;
  return (
    <div className="space-y-3 text-ink">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${DOT[s.status]}`} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold leading-tight">{s.statusText}</span>
          <span className="block text-sm text-muted">{s.lastText}</span>
        </span>
        <Switch on={s.sync.online} onChange={s.setOnline} label={t(s.sync.online ? 'sync.goOffline' : 'sync.goOnline')} />
      </div>
      <Button className="w-full" disabled={!s.sync.online || s.sync.syncing} onClick={s.syncNow}>
        <RefreshCw size={16} aria-hidden="true" className={s.sync.syncing ? 'animate-spin' : ''} />
        {t('sync.now')}
      </Button>
      <p className="text-center text-sm text-muted">{s.sync.pending > 0 ? t('sync.pending', { count: number(s.sync.pending) }) : t('sync.allSent')}</p>
      {s.review.length > 0 && (
        <Link
          to="/app/review"
          data-tour="review-link"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl bg-warn-soft p-3 text-warn-ink ring-1 ring-inset ring-warn-line focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ClipboardCheck size={20} aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm font-semibold">{t('sync.reviewCount', { count: number(s.review.length) })}</span>
          <span className="text-sm font-bold underline">{t('sync.openReview')}</span>
        </Link>
      )}
      <hr className="border-line" />
      <div>
        <Button variant="secondary" className="w-full" disabled={!s.target} onClick={() => void s.pushOther()}>
          <Smartphone size={16} aria-hidden="true" />
          {t('sync.other')}
        </Button>
        <p className="mt-1.5 text-center text-xs text-muted">{t(s.target ? 'sync.otherHint' : 'sync.otherNone')}</p>
      </div>
      <p role="status" className="text-center text-sm text-ink">
        {s.outcome ? t(s.outcome) : null}
      </p>
    </div>
  );
}

/* ---------------- C: one side panel with Account and Sync tabs ---------------- */

function PanelVariant({ kind, onClose }: { kind: ProtoKind; onClose(): void }) {
  const { t } = useI18n();
  const drawer = useRef<DrawerHandle>(null);
  const [tab, setTab] = useState<ProtoKind>(kind);
  const slideOut = () => (drawer.current ? drawer.current.close(onClose) : onClose());
  const tabs: Array<{ key: ProtoKind; label: string }> = [
    { key: 'account', label: t('shell.account') },
    { key: 'sync', label: t('sync.title') },
  ];
  return (
    <Drawer ref={drawer} title={t(tab === 'account' ? 'shell.account' : 'sync.title')} onClose={slideOut}>
      <div role="tablist" aria-label={t('shell.account')} className="-mt-1 mb-5 flex gap-1 border-b border-line">
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-focus ${
              tab === x.key ? 'border-brand text-brand-strong' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === 'account' ? <PanelAccount onClose={slideOut} /> : <PanelSync onClose={slideOut} />}</div>
    </Drawer>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 font-display text-base font-bold">{children}</h3>;
}

function PanelAccount({ onClose }: { onClose(): void }) {
  const a = useAccount();
  const { t } = a;
  const pref = (title: string, control: ReactNode) => (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="w-40 shrink-0 font-semibold">{title}</span>
      <div className="min-w-0 flex-1">{control}</div>
    </div>
  );
  return (
    <div className="space-y-6 text-ink">
      {a.current && (
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
          <Avatar id={a.current.staff.id} name={a.current.staff.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{a.current.staff.name}</p>
            <p className="text-sm text-muted">{a.roleName}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              a.switchUser();
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            {t('shell.switchUser')}
          </Button>
        </div>
      )}
      <section>
        <SectionTitle>{t('more.preferences')}</SectionTitle>
        <div className="divide-y divide-line rounded-2xl border border-line">
          {pref(t('more.language'), <SegmentedControl legend={t('more.language')} value={a.language} options={a.languages} onChange={a.setLanguage} />)}
          {pref(t('more.theme'), <SegmentedControl legend={t('more.theme')} value={a.theme} options={a.themes} onChange={a.setTheme} />)}
          {pref(t('more.layout'), <SegmentedControl legend={t('more.layout')} value={a.preference} options={a.layouts} onChange={a.setPreference} />)}
        </div>
      </section>
      <section>
        <SectionTitle>{t('more.demo')}</SectionTitle>
        <div className="divide-y divide-line rounded-2xl border border-line">
          <div className="flex items-center gap-4 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('presenter.toggle')}</span>
              <span className="block text-sm text-muted">{t('presenter.toggleHint')}</span>
            </span>
            <Switch on={a.presenter.enabled} onChange={a.presenter.setEnabled} label={t('presenter.toggle')} />
          </div>
          <div className="flex items-center gap-4 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('more.reset')}</span>
              <span className="block text-sm text-muted">{t('more.resetConfirm')}</span>
            </span>
            <Button variant="secondary" onClick={() => a.setConfirming('reset')}>
              <RotateCcw size={16} aria-hidden="true" />
              {t('more.reset')}
            </Button>
          </div>
          <div className="flex items-center gap-4 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('more.changeShop')}</span>
              <span className="block text-sm text-muted">{t('more.changeShopConfirm')}</span>
            </span>
            <Button variant="secondary" onClick={() => a.setConfirming('change')}>
              <Store size={16} aria-hidden="true" />
              {t('more.changeShop')}
            </Button>
          </div>
        </div>
      </section>
      {a.confirmDialog}
    </div>
  );
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`rounded-2xl p-4 ${tone || 'bg-surface'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function PanelSync({ onClose }: { onClose(): void }) {
  const s = useSyncPanel();
  const { t, number } = s;
  return (
    <div className="space-y-6 text-ink">
      <div className="flex items-center gap-4 rounded-2xl border border-line p-4">
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${tileTone(s.status)}`}>
          {s.sync.online ? <Wifi size={28} aria-hidden="true" /> : <WifiOff size={28} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-bold">{s.statusText}</span>
          <span className="block text-sm text-muted">{t('sync.demoNote')}</span>
        </span>
        <Switch on={s.sync.online} onChange={s.setOnline} label={t(s.sync.online ? 'sync.goOffline' : 'sync.goOnline')} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('sync.stat.waiting')} value={number(s.sync.pending)} tone={s.sync.pending > 0 ? WARN_TILE : ''} />
        <Stat label={t('sync.stat.review')} value={number(s.review.length)} tone={s.review.length > 0 ? WARN_TILE : ''} />
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{t('sync.stat.last')}</p>
          <p className="mt-1 text-sm font-semibold">{s.lastTime}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button disabled={!s.sync.online || s.sync.syncing} onClick={s.syncNow}>
          <RefreshCw size={16} aria-hidden="true" className={s.sync.syncing ? 'animate-spin' : ''} />
          {t('sync.now')}
        </Button>
        {s.review.length > 0 && (
          <Link to="/app/review" data-tour="review-link" onClick={onClose} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus">
            <ClipboardCheck size={16} aria-hidden="true" />
            {t('sync.openReview')}
          </Link>
        )}
      </div>
      <section>
        <SectionTitle>{t('more.demo')}</SectionTitle>
        <div className="flex items-center gap-4 rounded-2xl border border-line px-4 py-3">
          <Smartphone size={22} aria-hidden="true" className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('sync.other')}</span>
            <span className="block text-sm text-muted">{t(s.target ? 'sync.otherHint' : 'sync.otherNone')}</span>
          </span>
          <Button variant="secondary" disabled={!s.target} onClick={() => void s.pushOther()}>
            {t('sync.other')}
          </Button>
        </div>
        <p role="status" className="mt-2 text-sm">
          {s.outcome ? t(s.outcome) : null}
        </p>
      </section>
    </div>
  );
}

/* ---------------- D: a wide control centre with picture tiles ---------------- */

function GridVariant({ kind, onClose }: { kind: ProtoKind; onClose(): void }) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(true, panel, onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('shell.account')}
        tabIndex={-1}
        className="dialog-panel max-h-[calc(100dvh-3rem)] w-[960px] max-w-full overflow-y-auto rounded-2xl bg-panel p-6 text-ink shadow-2xl outline-none"
      >
        <GridBody kind={kind} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}

const CARD = 'rounded-2xl border border-line bg-panel-raised p-5';

function Tile({ selected, onClick, children, label }: { selected: boolean; onClick(): void; children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-focus ${
        selected ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line hover:bg-surface'
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function GridBody({ kind, onClose }: { kind: ProtoKind; onClose(): void }) {
  const a = useAccount();
  const s = useSyncPanel();
  const { t } = a;
  const { number } = s;
  const themeIcon = { auto: Monitor, light: Sun, dark: Moon } as const;
  const layoutIcon = { auto: Monitor, mobile: Smartphone, desktop: Monitor } as const;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {a.current && <Avatar id={a.current.staff.id} name={a.current.staff.name} size="lg" />}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl font-bold">{a.current?.staff.name}</h2>
          <p className="text-sm text-muted">{a.roleName}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            onClose();
            a.switchUser();
          }}
        >
          <LogOut size={16} aria-hidden="true" />
          {t('shell.switchUser')}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-5">
        <section aria-label={t('sync.title')} className={`${CARD} row-span-2 ${kind === 'sync' ? 'ring-2 ring-brand' : ''}`}>
          <div className="flex items-center gap-3">
            <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tileTone(s.status)}`}>
              {s.sync.online ? <Wifi size={24} aria-hidden="true" /> : <WifiOff size={24} aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{t('sync.title')}</span>
              <span className="block font-display text-xl font-bold">{s.statusText}</span>
            </span>
            <Switch on={s.sync.online} onChange={s.setOnline} label={t(s.sync.online ? 'sync.goOffline' : 'sync.goOnline')} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-surface p-3">
              <dt className="text-xs text-muted">{t('sync.stat.waiting')}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{number(s.sync.pending)}</dd>
            </div>
            <div className={`rounded-xl p-3 ${s.review.length ? WARN_TILE : 'bg-surface'}`}>
              <dt className="text-xs opacity-80">{t('sync.stat.review')}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{number(s.review.length)}</dd>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <dt className="text-xs text-muted">{t('sync.stat.last')}</dt>
              <dd className="mt-1 text-sm font-semibold">{s.lastTime}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!s.sync.online || s.sync.syncing} onClick={s.syncNow}>
              <RefreshCw size={16} aria-hidden="true" className={s.sync.syncing ? 'animate-spin' : ''} />
              {t('sync.now')}
            </Button>
            {s.review.length > 0 && (
              <Link to="/app/review" data-tour="review-link" onClick={onClose} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus">
                <ClipboardCheck size={16} aria-hidden="true" />
                {t('sync.openReview')}
              </Link>
            )}
            <Button variant="ghost" disabled={!s.target} onClick={() => void s.pushOther()} title={t(s.target ? 'sync.otherHint' : 'sync.otherNone')}>
              <Smartphone size={16} aria-hidden="true" />
              {t('sync.other')}
            </Button>
          </div>
          <p role="status" className="mt-2 text-sm">
            {s.outcome ? t(s.outcome) : t(s.target ? 'sync.otherHint' : 'sync.otherNone')}
          </p>
        </section>

        <section aria-label={t('more.language')} className={CARD}>
          <h3 className="mb-3 font-display font-bold">{t('more.language')}</h3>
          <div role="radiogroup" aria-label={t('more.language')} className="flex gap-3">
            {a.languages.map((o) => (
              <Tile key={o.value} selected={a.language === o.value} onClick={() => a.setLanguage(o.value)} label={o.label}>
                <span aria-hidden="true" className="font-display text-3xl font-bold">
                  {o.value === 'bn' ? 'অ' : 'A'}
                </span>
              </Tile>
            ))}
          </div>
        </section>

        <section aria-label={t('more.theme')} className={CARD}>
          <h3 className="mb-3 font-display font-bold">{t('more.theme')}</h3>
          <div role="radiogroup" aria-label={t('more.theme')} className="flex gap-3">
            {a.themes.map((o) => {
              const Icon = themeIcon[o.value];
              return (
                <Tile key={o.value} selected={a.theme === o.value} onClick={() => a.setTheme(o.value)} label={o.label}>
                  <span
                    aria-hidden="true"
                    className={`grid h-12 w-16 place-items-center rounded-lg ring-1 ring-line ${
                      o.value === 'dark' ? 'bg-neutral-900 text-neutral-100' : o.value === 'light' ? 'bg-white text-neutral-800' : 'bg-gradient-to-r from-white to-neutral-900 text-brand'
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                </Tile>
              );
            })}
          </div>
        </section>

        <section aria-label={t('more.layout')} className={CARD}>
          <h3 className="mb-3 font-display font-bold">{t('more.layout')}</h3>
          <div role="radiogroup" aria-label={t('more.layout')} className="flex gap-3">
            {a.layouts.map((o) => {
              const Icon = layoutIcon[o.value];
              return (
                <Tile key={o.value} selected={a.preference === o.value} onClick={() => a.setPreference(o.value)} label={o.label}>
                  <Icon size={28} aria-hidden="true" />
                </Tile>
              );
            })}
          </div>
        </section>

        <section aria-label={t('more.demo')} className={CARD}>
          <h3 className="mb-3 font-display font-bold">{t('more.demo')}</h3>
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t('presenter.toggle')}</span>
              <span className="block text-xs text-muted">{t('presenter.toggleHint')}</span>
            </span>
            <Switch on={a.presenter.enabled} onChange={a.presenter.setEnabled} label={t('presenter.toggle')} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => a.setConfirming('reset')}>
              <RotateCcw size={16} aria-hidden="true" />
              {t('more.reset')}
            </Button>
            <Button variant="secondary" onClick={() => a.setConfirming('change')}>
              <Store size={16} aria-hidden="true" />
              {t('more.changeShop')}
            </Button>
          </div>
        </section>
      </div>
      {a.confirmDialog}
    </div>
  );
}
