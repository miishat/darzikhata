import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useSnapshot, useStore } from '../data/StoreContext';
import { otherDeviceEdit, otherDeviceTarget } from '../features/sync/otherDevice';
import { useSyncStatus, useVisibleReview } from '../features/sync/useSync';
import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';
import { Button, buttonClasses } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

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

/** The header's sync status. It opens the sync dialog: online switch, waiting changes, review and the demo's other device. */
export function SyncButton({ block = false }: { block?: boolean }) {
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
        aria-label={block ? label : undefined}
        className={
          block
            ? `flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-start text-xs font-semibold ${TONE[status]} focus-visible:outline-2 focus-visible:outline-focus`
            : `inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold ${TONE[status]} focus-visible:outline-2 focus-visible:outline-focus`
        }
      >
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT[status]}`} />
        {block ? (
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

function SyncDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t, number, dateTime } = useI18n();
  const store = useStore();
  const { sync, state } = useSnapshot();
  const review = useVisibleReview();
  const { pathname } = useLocation();
  const [outcome, setOutcome] = useState<MessageKey | null>(null);
  const target = otherDeviceTarget(pathname, state);

  useEffect(() => {
    if (!open) setOutcome(null);
  }, [open]);

  const pushOther = async () => {
    if (!target) return;
    const note = t(target.kind === 'customer' ? 'sync.otherCustomerNote' : 'sync.otherItemNote');
    const edit = otherDeviceEdit(target, state, note);
    if (!edit) return;
    const wasOnline = sync.online;
    const result = await store.pushFromOtherDevice(edit);
    setOutcome(result.ok ? (wasOnline ? 'sync.otherDone' : 'sync.otherQueued') : 'sync.otherNotOnServer');
  };

  return (
    <Dialog
      open={open}
      title={t('sync.title')}
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="space-y-3 text-ink">
        <p>{sync.pending > 0 ? t('sync.pending', { count: number(sync.pending) }) : t('sync.allSent')}</p>
        <p className="text-muted">{sync.lastSyncAt ? t('sync.last', { time: dateTime(sync.lastSyncAt) }) : t('sync.never')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void store.setOnline(!sync.online)}>
            {t(sync.online ? 'sync.goOffline' : 'sync.goOnline')}
          </Button>
          <Button variant="secondary" disabled={!sync.online || sync.syncing} onClick={() => void store.syncNow()}>
            {t('sync.now')}
          </Button>
        </div>
        {review.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{t('sync.reviewCount', { count: number(review.length) })}</p>
            <Link to="/app/review" data-tour="review-link" onClick={onClose} className={buttonClasses('primary')}>
              {t('sync.openReview')}
            </Link>
          </div>
        )}
        <section className="space-y-2 border-t border-line pt-3">
          <h3 className="font-semibold">{t('more.demo')}</h3>
          <p className="text-sm text-muted">{t('sync.demoNote')}</p>
          <Button variant="secondary" disabled={!target} onClick={() => void pushOther()}>
            {t('sync.other')}
          </Button>
          <p className="text-sm text-muted">{t(target ? 'sync.otherHint' : 'sync.otherNone')}</p>
          <p role="status" className="text-sm">
            {outcome ? t(outcome) : null}
          </p>
        </section>
      </div>
    </Dialog>
  );
}
