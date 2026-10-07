import { useEffect, useState } from 'react';
import { ChevronRight, ClipboardCheck, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useSnapshot, useStore } from '../data/StoreContext';
import { useShell } from './ShellPreference';
import { otherDeviceEdit, otherDeviceTarget } from '../features/sync/otherDevice';
import { useSyncStatus, useVisibleReview } from '../features/sync/useSync';
import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Switch } from '../ui/Switch';

const STATUS_KEY: Record<string, MessageKey> = {
  online: 'sync.online',
  offline: 'sync.offline',
  syncing: 'sync.syncing',
  'needs-attention': 'sync.needsAttention',
};
const TONE: Record<string, string> = {
  online: 'bg-ok-soft text-ok',
  offline: 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink',
  syncing: 'bg-surface text-muted',
  'needs-attention': 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink',
};
const DOT: Record<string, string> = {
  online: 'bg-ok',
  offline: 'bg-warn',
  syncing: 'bg-muted',
  'needs-attention': 'bg-warn',
};

/**
 * The sync status: a pill, a full-width block (sidebar) or a coloured dot (the folded sidebar rail).
 * It opens the sync dialog: online switch, waiting changes, review and the demo's other device.
 */
export function SyncButton({ block = false, dot = false }: { block?: boolean; dot?: boolean }) {
  const { t, number, dateTime } = useI18n();
  const { sync } = useSnapshot();
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);
  const label = t(STATUS_KEY[status]!) + (sync.pending > 0 ? ` · ${t('sync.waiting', { count: number(sync.pending) })}` : '');
  return (
    <>
      <button
        type="button"
        data-tour="sync-status"
        onClick={() => setOpen(true)}
        aria-label={block || dot ? label : undefined}
        title={dot ? label : undefined}
        className={
          dot
            ? `grid size-11 shrink-0 place-items-center rounded-full ${TONE[status]} focus-visible:outline-2 focus-visible:outline-focus`
            : block
            ? `flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-start text-xs font-semibold ${TONE[status]} focus-visible:outline-2 focus-visible:outline-focus`
            : `inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold ${TONE[status]} focus-visible:outline-2 focus-visible:outline-focus`
        }
      >
        <span aria-hidden="true" className={`shrink-0 rounded-full ${dot ? 'size-3' : 'size-2'} ${DOT[status]}`} />
        {dot ? null : block ? (
          <span className="min-w-0">
            <span className="block truncate">{label}</span>
            <span className="block truncate font-normal">{sync.lastSyncAt ? t('sync.last', { time: dateTime(sync.lastSyncAt) }) : t('sync.never')}</span>
          </span>
        ) : (
          label
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {label}
      </span>
      <SyncDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const ROW = 'flex min-h-14 w-full items-center gap-3 px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50';
const TILE = 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong';

interface SyncDialogProps {
  open: boolean;
  onClose(): void;
}

/** The sync popup: a centred card on a desktop, a settings-style sheet on a phone. */
function SyncDialog(props: SyncDialogProps) {
  const { kind } = useShell();
  return kind === 'desktop' ? <DesktopSyncDialog {...props} /> : <PhoneSyncDialog {...props} />;
}

/** The demo's other device: what it can change on this screen, sending that change, and what happened, forgotten on closing. */
function useOtherDevice(open: boolean) {
  const { t } = useI18n();
  const store = useStore();
  const { sync, state } = useSnapshot();
  const { pathname } = useLocation();
  const [outcome, setOutcome] = useState<MessageKey | null>(null);
  const target = otherDeviceTarget(pathname, state);

  useEffect(() => {
    if (!open) setOutcome(null);
  }, [open]);

  const push = async () => {
    if (!target) return;
    const note = t(target.kind === 'customer' ? 'sync.otherCustomerNote' : 'sync.otherItemNote');
    const edit = otherDeviceEdit(target, state, note);
    if (!edit) return;
    const wasOnline = sync.online;
    const result = await store.pushFromOtherDevice(edit);
    setOutcome(result.ok ? (wasOnline ? 'sync.otherDone' : 'sync.otherQueued') : 'sync.otherNotOnServer');
  };

  return { target, outcome, push };
}

/**
 * The desktop sync popup: the status with the online switch, Sync Now with what is waiting, a highlighted link
 * when changes need review, and the demo's other device. It grows out of the sync button; its title is announced but not shown.
 */
function DesktopSyncDialog({ open, onClose }: SyncDialogProps) {
  const { t, number, dateTime } = useI18n();
  const store = useStore();
  const { sync } = useSnapshot();
  const review = useVisibleReview();
  const status = useSyncStatus();
  const other = useOtherDevice(open);

  return (
    <Dialog open={open} title={t('sync.title')} onClose={onClose} hideTitle animated>
      <div className="space-y-3 text-ink">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${DOT[status]}`} />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold leading-tight">{t(STATUS_KEY[status]!)}</span>
            <span className="block text-sm text-muted">{sync.lastSyncAt ? t('sync.last', { time: dateTime(sync.lastSyncAt) }) : t('sync.never')}</span>
          </span>
          <Switch on={sync.online} onChange={(on) => void store.setOnline(on)} label={t(sync.online ? 'sync.goOffline' : 'sync.goOnline')} />
        </div>
        <Button className="w-full" disabled={!sync.online || sync.syncing} onClick={() => void store.syncNow()}>
          <RefreshCw size={16} aria-hidden="true" className={sync.syncing ? 'animate-spin' : ''} />
          {t('sync.now')}
        </Button>
        <p className="text-center text-sm text-muted">{sync.pending > 0 ? t('sync.pending', { count: number(sync.pending) }) : t('sync.allSent')}</p>
        {review.length > 0 && (
          <Link
            to="/app/review"
            data-tour="review-link"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl bg-warn-soft p-3 text-warn-ink ring-1 ring-inset ring-warn-line focus-visible:outline-2 focus-visible:outline-focus"
          >
            <ClipboardCheck size={20} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-sm font-semibold">{t('sync.reviewCount', { count: number(review.length) })}</span>
            <span className="text-sm font-bold underline">{t('sync.openReview')}</span>
          </Link>
        )}
        <hr className="border-line" />
        <div>
          <Button variant="secondary" className="w-full" disabled={!other.target} onClick={() => void other.push()}>
            <Smartphone size={16} aria-hidden="true" />
            {t('sync.other')}
          </Button>
          <p className="mt-1.5 text-center text-xs text-muted">{t(other.target ? 'sync.otherHint' : 'sync.otherNone')}</p>
        </div>
        <p role="status" className="text-center text-sm">
          {other.outcome ? t(other.outcome) : null}
        </p>
      </div>
    </Dialog>
  );
}

/** The phone's sync sheet: online switch, sync now, changes to review, and the demo's other device, as settings-style rows. */
function PhoneSyncDialog({ open, onClose }: SyncDialogProps) {
  const { t, number, dateTime } = useI18n();
  const store = useStore();
  const { sync } = useSnapshot();
  const review = useVisibleReview();
  const status = useSyncStatus();
  const { target, outcome, push: pushOther } = useOtherDevice(open);

  return (
    <Dialog
      open={open}
      title={t('sync.title')}
      onClose={onClose}
      hideTitleOnPhone
      actionsDesktopOnly
      actions={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="space-y-3 text-ink">
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
          <div className={ROW}>
            <span className={TILE}>{sync.online ? <Wifi size={20} aria-hidden="true" /> : <WifiOff size={20} aria-hidden="true" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t(STATUS_KEY[status]!)}</span>
              <span className="block text-sm text-muted">{sync.lastSyncAt ? t('sync.last', { time: dateTime(sync.lastSyncAt) }) : t('sync.never')}</span>
            </span>
            <Switch on={sync.online} onChange={(on) => void store.setOnline(on)} label={t(sync.online ? 'sync.goOffline' : 'sync.goOnline')} />
          </div>
          <button type="button" disabled={!sync.online || sync.syncing} onClick={() => void store.syncNow()} className={ROW}>
            <span className={TILE}>
              <RefreshCw size={20} aria-hidden="true" className={sync.syncing ? 'animate-spin' : ''} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('sync.now')}</span>
              <span className="block text-sm text-muted">{sync.pending > 0 ? t('sync.pending', { count: number(sync.pending) }) : t('sync.allSent')}</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="text-muted" />
          </button>
          {review.length > 0 && (
            <Link to="/app/review" data-tour="review-link" onClick={onClose} className={ROW}>
              <span className={`${TILE} bg-warn-soft text-warn-ink`}>
                <ClipboardCheck size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t('sync.openReview')}</span>
                <span className="block text-sm text-muted">{t('sync.reviewCount', { count: number(review.length) })}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="text-muted" />
            </Link>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl bg-surface">
          <button type="button" disabled={!target} onClick={() => void pushOther()} className={ROW}>
            <span className={TILE}>
              <Smartphone size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('sync.other')}</span>
              <span className="block text-sm text-muted">{t(target ? 'sync.otherHint' : 'sync.otherNone')}</span>
            </span>
          </button>
        </div>
        <p role="status" className="px-1 text-sm">
          {outcome ? t(outcome) : null}
        </p>
      </div>
    </Dialog>
  );
}
