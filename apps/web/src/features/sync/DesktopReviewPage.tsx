import type { ReviewItem } from '@darzikhata/domain';
import { ArrowRight, ArrowUpRight, Check, CircleAlert, Info, ShoppingBag, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/bn';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { mergeBody, reviewEntry, type ReviewEntry, type ReviewField } from './reviewView';
import { useValueText } from './useValueText';
import { useVisibleReview } from './useSync';

const CARD = 'flex flex-col overflow-hidden rounded-2xl border border-line bg-panel';
/** Both panel headers share this height, so their dividers line up. */
const HEAD = 'flex h-24 shrink-0 items-center border-b border-line px-5';

/** How a change is named: the customer, or the order and its garment. */
function useSubjectText() {
  const { t, label } = useI18n();
  return (entry: ReviewEntry) => {
    const { subject } = entry;
    if (!subject) return { short: t('review.gone'), full: t('review.gone') };
    if (subject.kind === 'customer') return { short: subject.name, full: t('review.customer', { name: subject.name }) };
    const order = t('review.order', { number: subject.number }) + (subject.garment ? ` · ${label(subject.garment)}` : '');
    return { short: order, full: order };
  };
}

function useByline() {
  const { t, dateTime } = useI18n();
  const { config } = useSnapshot();
  return (entry: ReviewEntry) => t('review.by', { name: config?.staff.find((s) => s.id === entry.staffId)?.name ?? entry.staffId, time: dateTime(entry.at) });
}

/** The customer's avatar, or a bag for an order, or a warning when the server refused the change. */
function SubjectMark({ entry, large }: { entry: ReviewEntry; large?: boolean }) {
  if (entry.subject?.kind === 'customer') return <Avatar id={entry.subject.customerId} name={entry.subject.name} size={large ? 'lg' : 'md'} />;
  const refused = entry.outcome === 'rejected';
  const Icon = refused ? CircleAlert : ShoppingBag;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${large ? 'size-14' : 'size-10'} ${refused ? 'bg-danger/10 text-danger' : 'bg-brand-soft text-brand-strong'}`}
    >
      <Icon size={large ? 24 : 18} />
    </span>
  );
}

function KindChip({ entry }: { entry: ReviewEntry }) {
  const { t, number } = useI18n();
  if (entry.outcome === 'rejected') return <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">{t('review.refusedChip')}</span>;
  if (entry.rows.length === 0) return null;
  const count = number(entry.rows.length);
  return (
    <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn-ink">
      {entry.rows.length === 1 ? t('review.fieldDiffers', { count }) : t('review.fieldsDiffer', { count })}
    </span>
  );
}

/**
 * The desktop review queue: the waiting changes listed on the left, the chosen one on the right with each
 * field as "what is there now → what the change wanted". Ticking Take New on some fields saves just those.
 */
export function DesktopReviewPage() {
  const { t, number } = useI18n();
  const { sync, state } = useSnapshot();
  const items = useVisibleReview();
  const subject = useSubjectText();
  const byline = useByline();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ ok: boolean; n: number } | null>(null);
  const message = useRef<HTMLParagraphElement>(null);

  // The settled change leaves the list, so keep the keyboard user's place on the result.
  useEffect(() => {
    if (outcome) message.current?.focus();
  }, [outcome]);

  const entries = items.map((item) => ({ item, entry: reviewEntry(item, state) }));
  const picked = entries.find((e) => e.entry.eventId === pickedId) ?? entries[0];

  return (
    // The window less the shell header (3.5rem) and the page padding (2 × 1.5rem).
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4">
      <section aria-labelledby="review-title" className={`${CARD} w-[22rem] shrink-0`}>
        <div className={`${HEAD} gap-3`}>
          <h1 id="review-title" className="font-display text-xl font-bold">
            {t('review.title')}
          </h1>
          {entries.length > 0 && (
            <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-semibold text-warn-ink">{t('review.left', { count: number(entries.length) })}</span>
          )}
        </div>
        {(!sync.online || outcome) && (
          <div className="flex flex-col gap-2 px-3 pt-3">
            {!sync.online && (
              <p className="flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm font-semibold text-warn-ink">
                <WifiOff size={16} aria-hidden="true" />
                {t('review.offline')}
              </p>
            )}
            {outcome?.ok && (
              <p ref={message} tabIndex={-1} role="status" className="flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2 text-sm font-semibold text-ok outline-none">
                <Check size={16} aria-hidden="true" />
                {t('review.settled')}
              </p>
            )}
            {outcome && !outcome.ok && (
              <p ref={message} tabIndex={-1} role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger outline-none">
                {t('review.gone')}
              </p>
            )}
          </div>
        )}
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-2">
          {entries.map(({ entry }) => {
            const on = entry.eventId === picked?.entry.eventId;
            return (
              <li key={entry.eventId}>
                <button
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  onClick={() => setPickedId(entry.eventId)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start focus-visible:outline-2 focus-visible:outline-focus ${on ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                >
                  <SubjectMark entry={entry} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-semibold">{subject(entry).short}</span>
                    <span className="truncate text-xs text-muted">{byline(entry)}</span>
                    <span>
                      <KindChip entry={entry} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className={`${CARD} min-w-0 flex-1`}>
        {picked ? (
          <ReviewDetail
            key={picked.entry.eventId}
            item={picked.item}
            entry={picked.entry}
            offline={!sync.online}
            onDone={(ok) => setOutcome((o) => ({ ok, n: (o?.n ?? 0) + 1 }))}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-ok-soft text-ok">
              <Check size={30} aria-hidden="true" />
            </span>
            <p className="font-display text-lg font-bold">{t('review.empty')}</p>
            <p className="text-sm text-muted">{t('review.allSynced')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewDetail({ item, entry, offline, onDone }: { item: ReviewItem; entry: ReviewEntry; offline: boolean; onDone(ok: boolean): void }) {
  const { t } = useI18n();
  const store = useStore();
  const { state } = useSnapshot();
  const text = useValueText();
  const subject = useSubjectText();
  const byline = useByline();
  const [take, setTake] = useState<ReviewField[]>([]);
  const [busy, setBusy] = useState(false);
  const off = offline || busy;
  const headingId = `review-${entry.eventId}`;
  const to = !entry.subject ? null : entry.subject.kind === 'customer' ? `/app/customers/${entry.subject.customerId}` : `/app/orders/${entry.subject.orderId}`;

  async function settle(decision: Parameters<typeof store.resolveReview>[1]) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await store.resolveReview(entry.eventId, decision);
      onDone(result.ok);
    } finally {
      setBusy(false);
    }
  }

  function savePicks() {
    const body = mergeBody(item, state, take);
    return settle(body ? { kind: 'merge', body } : { kind: 'keepCurrent' });
  }

  return (
    <section aria-label={subject(entry).full} data-tour="review-item" className="flex min-h-0 flex-1 flex-col">
      <div className={`${HEAD} gap-4`}>
        <SubjectMark entry={entry} large />
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="truncate font-display text-2xl font-bold">
            {subject(entry).short}
          </h2>
          <p className="truncate text-sm text-muted">{byline(entry)}</p>
        </div>
        {to && entry.subject && (
          <Link to={to} className={buttonClasses('secondary')}>
            {entry.subject.kind === 'customer' ? <ArrowUpRight size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
            {t(entry.subject.kind === 'customer' ? 'order.viewProfile' : 'review.viewOrder')}
          </Link>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-5">
        <p className="mb-4 flex gap-2 rounded-xl bg-brand-soft/60 px-4 py-3 text-sm">
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" />
          {t('review.intro')}
        </p>
        {entry.outcome === 'rejected' ? (
          <div className="flex items-start gap-3 rounded-xl bg-danger/10 p-4 text-sm">
            <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{t('review.refused', { reason: entry.reason })}</p>
              <p className="text-muted">{t('review.nothingToChoose')}</p>
            </div>
          </div>
        ) : entry.rows.length === 0 ? (
          <p>{t('review.sameNow')}</p>
        ) : (
          <table aria-labelledby={headingId} className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-line">
            <thead className="sr-only">
              <tr>
                <th scope="col">{t('review.field')}</th>
                <th scope="col">{t('review.current')}</th>
                <td />
                <th scope="col">{t('review.waiting')}</th>
                {entry.canMerge && <th scope="col">{t('review.takeNew')}</th>}
              </tr>
            </thead>
            <tbody>
              {entry.rows.map((row, i) => {
                const taken = take.includes(row.field);
                const name = t(`review.field.${row.field}` as MessageKey);
                const cell = `px-4 py-4 ${i > 0 ? 'border-t border-line' : ''}`;
                return (
                  <tr key={row.field}>
                    <th scope="row" className={`${cell} w-40 text-start font-semibold`}>
                      {name}
                    </th>
                    <td className={`${cell} ${taken ? 'text-muted line-through' : 'font-semibold'}`}>{text(row.current)}</td>
                    <td className={`${cell} w-8 px-0 text-muted`}>
                      <ArrowRight size={18} aria-hidden="true" />
                    </td>
                    <td className={`${cell} ${taken ? 'font-semibold' : 'text-muted'}`}>{text(row.waiting)}</td>
                    {entry.canMerge && (
                      <td className={`${cell} w-0 whitespace-nowrap`}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            aria-label={`${t('review.takeNew')}: ${name}`}
                            checked={taken}
                            disabled={off}
                            onChange={(e) => setTake((c) => (e.target.checked ? [...c, row.field] : c.filter((f) => f !== row.field)))}
                            className="size-4"
                          />
                          <span aria-hidden="true">{t('review.takeNew')}</span>
                        </label>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface/50 px-5 py-3">
        {entry.outcome === 'rejected' ? (
          <Button variant="secondary" disabled={off} onClick={() => settle({ kind: 'keepCurrent' })}>
            {t('review.dismiss')}
          </Button>
        ) : (
          <>
            <Button variant="secondary" disabled={off} onClick={() => settle({ kind: 'keepCurrent' })}>
              {t('review.keepCurrent')}
            </Button>
            {entry.canApplyMine && (
              <Button variant="secondary" disabled={off} onClick={() => settle({ kind: 'applyMine' })}>
                {t('review.applyMine')}
              </Button>
            )}
            {entry.canMerge && (
              <Button disabled={off || take.length === 0} onClick={savePicks}>
                {t('review.savePicks')}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
