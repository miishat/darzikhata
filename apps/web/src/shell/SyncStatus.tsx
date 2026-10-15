import { useEffect, useState } from 'react';
import { ChevronRight, ClipboardCheck, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { PrototypeSwitcher } from '../ui/PrototypeSwitcher';
import { useSyncStatus, useSyncVariant, useSyncVariants, useSyncWords, useVisibleReview } from './SyncPill.prototype';
import { useSnapshot, useStore } from '../data/StoreContext';
import { useShell } from './ShellPreference';
import { otherDeviceEdit, otherDeviceTarget } from '../features/sync/otherDevice';
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
  const review = useVisibleReview();
  const variant = useSyncVariant();
  const variants = useSyncVariants();
  const words = useSyncWords();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const attention = status === 'needs-attention';
  const conn = connectionStatus(sync);
  const n = number(review.length);
  const head =
    variant === '0' || !attention
      ? t(STATUS_KEY[status]!)
      : variant === 'V2'
      ? t(STATUS_KEY[conn]!)
      : variant === 'V3'
      ? words.reviewNow(n)
      : variant === 'V4'
      ? words.reviewShort(n)
      : words.toReview(n);
  const label = head + (sync.pending > 0 ? ` · ${t('sync.waiting', { count: number(sync.pending) })}` : '');
  const toneKey = variant === 'V2' ? conn : status;
  const onClick = variant === 'V4' && attention ? () => navigate('/app/review' + window.location.search) : () => setOpen(true);
  const countDot = attention && (variant === 'V1' || variant === 'V3' || variant === 'V5');
  const chip = attention && variant === 'V4';
  const badge = attention && variant === 'V2';

  return (
    <>
      <PrototypeSwitcher variants={variants} />
      <button
        type="button"
        data-tour="sync-status"
        onClick={onClick}
        aria-label={block || dot ? label : undefined}
        title={dot ? label : undefined}
        className={
          dot && chip
            ? 'inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2.5 text-sm font-bold text-warn-ink ring-1 ring-inset ring-warn-line focus-visible:outline-2 focus-visible:outline-focus'
            : dot
            ? `relative grid size-11 shrink-0 place-items-center rounded-full ${countDot ? '' : TONE[toneKey]} focus-visible:outline-2 focus-visible:outline-focus`
            : block
            ? `flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-start text-xs font-semibold ${TONE[toneKey]} focus-visible:outline-2 focus-visible:outline-focus`
            : `inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold ${TONE[toneKey]} focus-visible:outline-2 focus-visible:outline-focus`
        }
      >
        {dot && chip ? (
          <>
            <ClipboardCheck size={16} aria-hidden="true" />
            {n}
          </>
        ) : dot && countDot ? (
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-warn text-sm font-bold text-white">
            {n}
          </span>
        ) : (
          <span aria-hidden="true" className={`shrink-0 rounded-full ${dot ? 'size-3' : 'size-2'} ${DOT[toneKey]}`} />
        )}
        {dot && badge && (
          <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-warn px-1 text-[11px] font-bold leading-5 text-white">
            {n}
          </span>
        )}
        {dot ? null : block ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{label}</span>
              <span className="block truncate font-normal">{sync.lastSyncAt ? t('sync.last', { time: dateTime(sync.lastSyncAt) }) : t('sync.never')}</span>
            </span>
            {badge && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-1 text-warn-ink ring-1 ring-inset ring-warn-line">
                <ClipboardCheck size={14} aria-hidden="true" />
                {n}
              </span>
            )}
          </>
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

/** PROTOTYPE: the connection on its own, without the review state mixed in. */
function connectionStatus(sync: { online: boolean; syncing: boolean }) {
  return sync.syncing ? 'syncing' : sync.online ? 'online' : 'offline';
}

/** PROTOTYPE: the title and subtitle of the row that holds the online switch, per variant. */
function useConnectionRow() {
  const { t, dateTime } = useI18n();
  const { sync } = useSnapshot();
  const status = useSyncStatus();
  const variant = useSyncVariant();
  const words = useSyncWords();
  const last = sync.lastSyncAt ? t('sync.last', { time: dateTime(sync.lastSyncAt) }) : t('sync.never');
  const conn = t(STATUS_KEY[connectionStatus(sync)]!);
  if (variant === '0') return { title: t(STATUS_KEY[status]!), sub: last };
  if (variant === 'V2') return { title: words.connection, sub: `${conn} · ${last}` };
  if (variant === 'V3') return { title: words.stayOnline, sub: `${sync.online ? words.nowOnline : words.nowOffline} · ${last}` };
  return { title: conn, sub: last };
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
  const variant = useSyncVariant();
  const words = useSyncWords();
  const connRow = useConnectionRow();
  const reviewFirst = variant !== '0';
  const reviewLink = review.length > 0 && (
    <Link
      to="/app/review"
      data-tour="review-link"
      onClick={onClose}
      className="flex items-center gap-3 rounded-xl bg-warn-soft p-3 text-warn-ink ring-1 ring-inset ring-warn-line focus-visible:outline-2 focus-visible:outline-focus"
    >
      <ClipboardCheck size={20} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-semibold">
        {variant === '0' ? t('sync.reviewCount', { count: number(review.length) }) : words.reviewBanner(number(review.length), review.length)}
      </span>
      <span className="text-sm font-bold underline">{t('sync.openReview')}</span>
    </Link>
  );

  return (
    <Dialog open={open} title={t('sync.title')} onClose={onClose} hideTitle animated>
      <div className="space-y-3 text-ink">
        {reviewFirst && reviewLink}
        {variant === 'V5' && review.length > 0 && <hr className="border-line" />}
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${DOT[variant === '0' ? status : connectionStatus(sync)]}`} />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold leading-tight">{connRow.title}</span>
            <span className="block text-sm text-muted">{connRow.sub}</span>
          </span>
          <Switch on={sync.online} onChange={(on) => void store.setOnline(on)} label={t(sync.online ? 'sync.goOffline' : 'sync.goOnline')} />
        </div>
        <Button className="w-full" disabled={!sync.online || sync.syncing} onClick={() => void store.syncNow()}>
          <RefreshCw size={16} aria-hidden="true" className={sync.syncing ? 'animate-spin' : ''} />
          {t('sync.now')}
        </Button>
        <p className="text-center text-sm text-muted">{sync.pending > 0 ? t('sync.pending', { count: number(sync.pending) }) : t('sync.allSent')}</p>
        {!reviewFirst && reviewLink}
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
  const { t, number } = useI18n();
  const store = useStore();
  const { sync } = useSnapshot();
  const review = useVisibleReview();
  const variant = useSyncVariant();
  const words = useSyncWords();
  const connRow = useConnectionRow();
  const { target, outcome, push: pushOther } = useOtherDevice(open);
  const n = number(review.length);
  const hasReview = review.length > 0;

  const connection = (
    <div className={ROW}>
      <span className={TILE}>{sync.online ? <Wifi size={20} aria-hidden="true" /> : <WifiOff size={20} aria-hidden="true" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{connRow.title}</span>
        <span className="block text-sm text-muted">{connRow.sub}</span>
      </span>
      <Switch on={sync.online} onChange={(on) => void store.setOnline(on)} label={t(sync.online ? 'sync.goOffline' : 'sync.goOnline')} />
    </div>
  );
  const syncNow = (
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
  );
  const currentReviewRow = hasReview && (
    <Link to="/app/review" data-tour="review-link" onClick={onClose} className={ROW}>
      <span className={`${TILE} bg-warn-soft text-warn-ink`}>
        <ClipboardCheck size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t('sync.openReview')}</span>
        <span className="block text-sm text-muted">{t('sync.reviewCount', { count: n })}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="text-muted" />
    </Link>
  );
  const namedReviewRow = hasReview && (
    <Link to="/app/review" data-tour="review-link" onClick={onClose} className={`${ROW} bg-warn-soft`}>
      <span className={`${TILE} bg-warn text-white`}>
        <ClipboardCheck size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-warn-ink">{words.reviewBanner(n, review.length)}</span>
        <span className="block text-sm text-muted">{words.reviewWhy}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="text-muted" />
    </Link>
  );
  const banner = hasReview && (
    <div className="rounded-2xl bg-warn-soft p-4 text-warn-ink ring-1 ring-inset ring-warn-line">
      <div className="flex items-start gap-3">
        <ClipboardCheck size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{words.reviewBanner(n, review.length)}</p>
          <p className="text-sm">{words.reviewWhy}</p>
        </div>
      </div>
      <Link
        to="/app/review"
        data-tour="review-link"
        onClick={onClose}
        className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-warn px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-focus"
      >
        {t('sync.openReview')}
      </Link>
    </div>
  );
  const heading = (text: string) => <h3 className="px-1 pt-1 text-sm font-semibold text-muted">{text}</h3>;

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
        {variant === 'V2' && banner}
        {variant === 'V5' ? (
          <>
            {hasReview && (
              <>
                {heading(words.sectionReview)}
                <div className="overflow-hidden rounded-2xl bg-surface">{namedReviewRow}</div>
              </>
            )}
            {heading(words.sectionConnection)}
            <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
              {connection}
              {syncNow}
            </div>
          </>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
            {(variant === 'V1' || variant === 'V3' || variant === 'V4') && namedReviewRow}
            {connection}
            {syncNow}
            {variant === '0' && currentReviewRow}
          </div>
        )}
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
