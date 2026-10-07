// PROTOTYPE (throwaway): desktop layouts for the review queue, switched with ?variant=. Never merged.
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircleAlert, ShoppingBag, WifiOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/bn';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { useValueText } from './ReviewPage';
import { reviewEntry, mergeBody, type ReviewEntry, type ReviewField, type ReviewRow } from './reviewView';
import { useVisibleReview } from './useSync';

export const REVIEW_VARIANTS = {
  A: 'Current page',
  B: 'Inbox: the list on the left, the chosen change side by side on the right',
  C: 'Stacked cards: two columns of values you tap to keep',
  D: 'One sheet: every field of every change in a single table',
  E: 'One at a time: a big comparison with next and back',
  F: 'Inbox with a before → after line per field',
};

export function useReviewVariant() {
  return useVariant(Object.keys(REVIEW_VARIANTS));
}

export function ReviewSwitcher() {
  return <PrototypeSwitcher variants={REVIEW_VARIANTS} />;
}

type Side = 'current' | 'waiting';
type Choice = Partial<Record<ReviewField, Side>>;
type Decision = 'keep' | 'mine' | 'merge';
type Entry = ReviewEntry & { sample?: boolean; item?: ReturnType<typeof useVisibleReview>[number] };

const pick = (language: string, bn: string, en: string) => (language === 'bn' ? bn : en);

/** The real waiting changes, then made-up ones so every layout has a few to show. Made-up ones only vanish when settled. */
function useEntries() {
  const items = useVisibleReview();
  const { state, config } = useSnapshot();
  const { language } = useI18n();
  const real: Entry[] = items.map((item) => ({ ...reviewEntry(item, state), item }));
  const samples: Entry[] = [];
  const staff = config?.staff ?? [];
  const hour = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const customer = Object.values(state.customers).find((c) => c.phone);
  if (customer && staff[0]) {
    samples.push({
      eventId: 'sample-customer',
      outcome: 'conflict',
      reason: 'stale-edit',
      subject: { kind: 'customer', customerId: customer.id, name: customer.name },
      staffId: staff[0].id,
      at: hour(2),
      rows: [
        { field: 'phone', current: { kind: 'text', value: customer.phone }, waiting: { kind: 'text', value: '01711223344' } },
        { field: 'notes', current: { kind: 'text', value: customer.notes || null }, waiting: { kind: 'text', value: pick(language, 'কলার একটু ঢিলা', 'Collar a little loose') } },
      ],
      canApplyMine: true,
      canMerge: true,
      sample: true,
    });
  }
  const orders = Object.values(state.orders).sort((a, b) => a.number.localeCompare(b.number));
  const order = orders.find((o) => o.items.some((i) => i.deliveryDate && !i.cancelled));
  const garment = order?.items.find((i) => i.deliveryDate && !i.cancelled);
  if (order && garment && garment.deliveryDate && staff[1]) {
    const later = new Date(Date.parse(garment.deliveryDate) + 3 * 86_400_000).toISOString().slice(0, 10);
    samples.push({
      eventId: 'sample-garment',
      outcome: 'conflict',
      reason: 'stale-edit',
      subject: { kind: 'order', orderId: order.id, number: order.number, garment: garment.garmentName },
      staffId: staff[1].id,
      at: hour(5),
      rows: [
        { field: 'price', current: { kind: 'money', value: garment.price }, waiting: { kind: 'money', value: garment.price + 20000 } },
        { field: 'deliveryDate', current: { kind: 'date', value: garment.deliveryDate }, waiting: { kind: 'date', value: later } },
        { field: 'designNotes', current: { kind: 'text', value: garment.designNotes || null }, waiting: { kind: 'text', value: pick(language, 'হাতা লম্বা', 'Long sleeves') } },
      ],
      canApplyMine: true,
      canMerge: true,
      sample: true,
    });
  }
  const other = orders[2];
  const job = other?.items[0];
  const workers = staff.filter((s) => s.id !== job?.assignedTo);
  if (other && job && workers[0] && staff[0]) {
    samples.push({
      eventId: 'sample-worker',
      outcome: 'conflict',
      reason: 'stale-edit',
      subject: { kind: 'order', orderId: other.id, number: other.number, garment: job.garmentName },
      staffId: staff[0].id,
      at: hour(26),
      rows: [{ field: 'assignee', current: { kind: 'staff', value: job.assignedTo }, waiting: { kind: 'staff', value: workers[0].id } }],
      canApplyMine: true,
      canMerge: false,
      sample: true,
    });
  }
  const closed = orders[4];
  if (closed && staff[0]) {
    samples.push({
      eventId: 'sample-refused',
      outcome: 'rejected',
      reason: 'order-closed',
      subject: { kind: 'order', orderId: closed.id, number: closed.number, garment: null },
      staffId: staff[staff.length - 1]!.id,
      at: hour(30),
      rows: [],
      canApplyMine: false,
      canMerge: false,
      sample: true,
    });
  }
  return [...real, ...samples];
}

/** Settling: real items go to the server, made-up ones just leave the list. */
function useSettle() {
  const store = useStore();
  const { state } = useSnapshot();
  const [gone, setGone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const settle = async (entry: Entry, decision: Decision, choice: Choice = {}) => {
    if (busy) return;
    if (entry.sample || !entry.item) {
      setGone((g) => [...g, entry.eventId]);
      return;
    }
    setBusy(true);
    try {
      if (decision === 'keep') await store.resolveReview(entry.eventId, { kind: 'keepCurrent' });
      else if (decision === 'mine') await store.resolveReview(entry.eventId, { kind: 'applyMine' });
      else {
        const take = entry.rows.filter((r) => choice[r.field] === 'waiting').map((r) => r.field);
        const body = mergeBody(entry.item, state, take);
        await store.resolveReview(entry.eventId, body ? { kind: 'merge', body } : { kind: 'keepCurrent' });
      }
    } finally {
      setBusy(false);
    }
  };
  return { gone, busy, settle };
}

function useTitle() {
  const { t, label } = useI18n();
  return (entry: Entry) =>
    !entry.subject
      ? t('review.gone')
      : entry.subject.kind === 'customer'
        ? entry.subject.name
        : t('review.order', { number: entry.subject.number }) + (entry.subject.garment ? ` · ${label(entry.subject.garment)}` : '');
}

function useBy() {
  const { t, dateTime } = useI18n();
  const { config } = useSnapshot();
  return (entry: Entry) => t('review.by', { name: config?.staff.find((s) => s.id === entry.staffId)?.name ?? entry.staffId, time: dateTime(entry.at) });
}

function subjectLink(entry: Entry) {
  if (!entry.subject) return null;
  return entry.subject.kind === 'customer' ? `/app/customers/${entry.subject.customerId}` : `/app/orders/${entry.subject.orderId}`;
}

/** A round mark for the record: the customer's avatar, or a bag for an order. */
function SubjectMark({ entry, size = 'md' }: { entry: Entry; size?: 'sm' | 'md' | 'lg' }) {
  if (entry.subject?.kind === 'customer') return <Avatar id={entry.subject.customerId} name={entry.subject.name} size={size} />;
  const box = size === 'lg' ? 'size-14' : size === 'sm' ? 'size-8' : 'size-10';
  const refused = entry.outcome === 'rejected';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full ${box} ${refused ? 'bg-danger/10 text-danger' : 'bg-brand-soft text-brand-strong'}`}>
      {refused ? <CircleAlert size={size === 'lg' ? 24 : 18} aria-hidden="true" /> : <ShoppingBag size={size === 'lg' ? 24 : 18} aria-hidden="true" />}
    </span>
  );
}

function KindChip({ entry }: { entry: Entry }) {
  const { language } = useI18n();
  const refused = entry.outcome === 'rejected';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${refused ? 'bg-danger/10 text-danger' : 'bg-warn-soft text-warn-ink'}`}>
      {refused ? pick(language, 'সার্ভার নেয়নি', 'Refused') : pick(language, `${entry.rows.length}টি ঘরে অমিল`, `${entry.rows.length} ${entry.rows.length === 1 ? 'Field Differs' : 'Fields Differ'}`)}
    </span>
  );
}

const fieldName = (t: ReturnType<typeof useI18n>['t'], field: ReviewField) => t(`review.field.${field}` as MessageKey);

/** A value you can tap to keep. */
function ValueTile({ text, on, tone, onClick, label }: { text: string; on: boolean; tone: 'current' | 'waiting'; onClick(): void; label: string }) {
  const ring = tone === 'current' ? 'border-brand bg-brand-soft' : 'border-warn bg-warn-soft';
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${label}: ${text}`}
      onClick={onClick}
      className={`flex min-h-12 w-full items-start gap-2 rounded-xl border-2 px-3 py-2 text-start text-sm focus-visible:outline-2 focus-visible:outline-focus ${on ? ring : 'border-line bg-panel hover:bg-surface'}`}
    >
      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-transparent bg-ink text-panel' : 'border-line'}`}>
        {on && <Check size={11} aria-hidden="true" />}
      </span>
      <span className={on ? 'font-semibold' : 'text-muted'}>{text}</span>
    </button>
  );
}

/** The two columns of tiles, one row per field. */
function CompareGrid({ entry, choice, onChoose, big }: { entry: Entry; choice: Choice; onChoose(field: ReviewField, side: Side): void; big?: boolean }) {
  const { t } = useI18n();
  const text = useValueText();
  return (
    <div className={`grid grid-cols-[minmax(7rem,auto)_1fr_1fr] items-stretch ${big ? 'gap-x-4 gap-y-3' : 'gap-x-3 gap-y-2'}`}>
      <span />
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-strong">
        <span className="size-2 rounded-full bg-brand" />
        {t('review.current')}
      </span>
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warn-ink">
        <span className="size-2 rounded-full bg-warn" />
        {t('review.waiting')}
      </span>
      {entry.rows.map((row) => {
        const side = choice[row.field] ?? 'current';
        return (
          <div key={row.field} role="group" aria-label={fieldName(t, row.field)} className="contents">
            <span className={`self-center font-semibold ${big ? '' : 'text-sm'}`}>{fieldName(t, row.field)}</span>
            <ValueTile text={text(row.current)} on={side === 'current'} tone="current" label={t('review.current')} onClick={() => onChoose(row.field, 'current')} />
            <ValueTile text={text(row.waiting)} on={side === 'waiting'} tone="waiting" label={t('review.waiting')} onClick={() => onChoose(row.field, 'waiting')} />
          </div>
        );
      })}
    </div>
  );
}

/** The buttons under a change. With tiles, a mixed choice saves as a merge. */
function Actions({ entry, choice, busy, offline, onSettle, size }: { entry: Entry; choice: Choice; busy: boolean; offline: boolean; onSettle(d: Decision): void; size?: 'lg' }) {
  const { t, language } = useI18n();
  const off = busy || offline;
  if (entry.outcome === 'rejected')
    return (
      <Button variant="secondary" size={size} disabled={off} onClick={() => onSettle('keep')}>
        {t('review.dismiss')}
      </Button>
    );
  const sides = entry.rows.map((r) => choice[r.field] ?? 'current');
  const mixed = sides.includes('current') && sides.includes('waiting');
  return (
    <>
      <Button variant="secondary" size={size} disabled={off} onClick={() => onSettle('keep')}>
        {t('review.keepCurrent')}
      </Button>
      {entry.canApplyMine && (
        <Button variant="secondary" size={size} disabled={off} onClick={() => onSettle('mine')}>
          {t('review.applyMine')}
        </Button>
      )}
      {entry.canMerge && (
        <Button size={size} disabled={off || !mixed} onClick={() => onSettle('merge')}>
          {pick(language, 'বাছাই করা মান সেভ করুন', 'Save My Picks')}
        </Button>
      )}
    </>
  );
}

function Refused({ entry }: { entry: Entry }) {
  const { t, language } = useI18n();
  return (
    <div className="flex items-start gap-3 rounded-xl bg-danger/10 p-4 text-sm">
      <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{t('review.refused', { reason: entry.reason })}</p>
        <p className="text-muted">{pick(language, 'এখানে বাছার কিছু নেই। দেখে সরিয়ে দিন।', 'There is nothing to choose here. Look it over, then dismiss it.')}</p>
      </div>
    </div>
  );
}

function PageHeader({ count, extra }: { count: number; extra?: ReactNode }) {
  const { t, language, number } = useI18n();
  const { sync } = useSnapshot();
  return (
    <div className="flex flex-col gap-3 border-b border-line p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">{t('review.title')}</h1>
        {count > 0 && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-semibold text-warn-ink">{pick(language, `${number(count)}টি বাকি`, `${number(count)} Left`)}</span>}
        <div className="ms-auto">{extra}</div>
      </div>
      <p className="max-w-3xl text-sm text-muted">{t('review.intro')}</p>
      {!sync.online && (
        <p className="flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm font-semibold text-warn-ink">
          <WifiOff size={16} aria-hidden="true" />
          {t('review.offline')}
        </p>
      )}
    </div>
  );
}

function Empty() {
  const { t, language } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-ok-soft text-ok">
        <Check size={30} aria-hidden="true" />
      </span>
      <p className="font-display text-lg font-bold">{t('review.empty')}</p>
      <p className="text-sm text-muted">{pick(language, 'সব পরিবর্তন সার্ভারে মিলে গেছে।', 'Every change has reached the server.')}</p>
    </div>
  );
}

const CARD = 'flex flex-col overflow-hidden rounded-2xl border border-line bg-panel';
const FULL = 'h-[calc(100dvh-6.5rem)] min-h-96';

export function ReviewPrototype() {
  const variant = useReviewVariant();
  const all = useEntries();
  const { gone, busy, settle } = useSettle();
  const { sync } = useSnapshot();
  const entries = all.filter((e) => !gone.includes(e.eventId));
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const choose = (id: string) => (field: ReviewField, side: Side) => setChoices((c) => ({ ...c, [id]: { ...c[id], [field]: side } }));
  const props = { entries, busy, offline: !sync.online, choices, choose, settle };
  return (
    <>
      {variant === 'B' && <Inbox {...props} look="tiles" />}
      {variant === 'C' && <Stacked {...props} />}
      {variant === 'D' && <Sheet {...props} />}
      {variant === 'E' && <OneAtATime {...props} />}
      {variant === 'F' && <Inbox {...props} look="arrows" />}
      <ReviewSwitcher />
    </>
  );
}

type Props = {
  entries: Entry[];
  busy: boolean;
  offline: boolean;
  choices: Record<string, Choice>;
  choose(id: string): (field: ReviewField, side: Side) => void;
  settle(entry: Entry, decision: Decision, choice?: Choice): Promise<void>;
};

/** B and F: a list of changes on the left, the chosen one on the right. */
function Inbox({ entries, busy, offline, choices, choose, settle, look }: Props & { look: 'tiles' | 'arrows' }) {
  const { language } = useI18n();
  const title = useTitle();
  const by = useBy();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = entries.find((e) => e.eventId === pickedId) ?? entries[0];
  return (
    <div className={`flex gap-4 ${FULL}`}>
      <section className={`${CARD} w-[22rem] shrink-0`}>
        <PageHeader count={entries.length} />
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-2">
          {entries.map((entry) => {
            const on = entry === picked;
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
                    <span className="truncate font-semibold">{title(entry)}</span>
                    <span className="truncate text-xs text-muted">{by(entry)}</span>
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
      <section className={`${CARD} min-w-0 flex-1`}>
        {!picked ? (
          <Empty />
        ) : (
          <>
            <div className="flex items-center gap-4 border-b border-line p-5">
              <SubjectMark entry={picked} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-2xl font-bold">{title(picked)}</h2>
                <p className="text-sm text-muted">{by(picked)}</p>
              </div>
              {subjectLink(picked) && (
                <Link to={subjectLink(picked)!} className="text-sm font-semibold text-brand-strong hover:underline">
                  {picked.subject?.kind === 'customer' ? pick(language, 'প্রোফাইল দেখুন', 'View Profile') : pick(language, 'অর্ডার দেখুন', 'View Order')}
                </Link>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {picked.outcome === 'rejected' ? (
                <Refused entry={picked} />
              ) : look === 'tiles' ? (
                <>
                  <p className="mb-4 text-sm text-muted">{pick(language, 'প্রতিটি ঘরে যে মানটা থাকবে সেটিতে চাপুন।', 'Tap the value to keep in each field.')}</p>
                  <CompareGrid entry={picked} choice={choices[picked.eventId] ?? {}} onChoose={choose(picked.eventId)} big />
                </>
              ) : (
                <ArrowRows entry={picked} choice={choices[picked.eventId] ?? {}} onChoose={choose(picked.eventId)} />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface/50 px-5 py-3">
              <Actions entry={picked} choice={choices[picked.eventId] ?? {}} busy={busy} offline={offline} onSettle={(d) => settle(picked, d, choices[picked.eventId])} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** F's detail: the current value struck through, an arrow, the waiting value, and a checkbox to take it. */
function ArrowRows({ entry, choice, onChoose }: { entry: Entry; choice: Choice; onChoose(field: ReviewField, side: Side): void }) {
  const { t, language } = useI18n();
  const text = useValueText();
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-xl border border-line p-0">
      {entry.rows.map((row: ReviewRow) => {
        const take = choice[row.field] === 'waiting';
        return (
          <li key={row.field} className="flex items-center gap-4 px-4 py-4">
            <span className="w-36 shrink-0 font-semibold">{fieldName(t, row.field)}</span>
            <span className={`min-w-0 flex-1 ${take ? 'text-muted line-through' : 'font-semibold'}`}>{text(row.current)}</span>
            <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <span className={`min-w-0 flex-1 ${take ? 'font-semibold' : 'text-muted'}`}>{text(row.waiting)}</span>
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <input type="checkbox" checked={take} onChange={(e) => onChoose(row.field, e.target.checked ? 'waiting' : 'current')} className="size-4" />
              {pick(language, 'নতুনটা নিন', 'Take New')}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/** C: every change as a full-width card with tiles to tap. */
function Stacked({ entries, busy, offline, choices, choose, settle }: Props) {
  const title = useTitle();
  const by = useBy();
  return (
    <div className={`${CARD} ${FULL}`}>
      <PageHeader count={entries.length} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface/40 p-5">
        {entries.length === 0 ? (
          <Empty />
        ) : (
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            {entries.map((entry) => (
              <section key={entry.eventId} aria-label={title(entry)} className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-center gap-3">
                  <SubjectMark entry={entry} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-lg font-bold">{title(entry)}</h2>
                    <p className="text-sm text-muted">{by(entry)}</p>
                  </div>
                  <KindChip entry={entry} />
                </div>
                {entry.outcome === 'rejected' ? (
                  <Refused entry={entry} />
                ) : (
                  <CompareGrid entry={entry} choice={choices[entry.eventId] ?? {}} onChoose={choose(entry.eventId)} />
                )}
                <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                  <Actions entry={entry} choice={choices[entry.eventId] ?? {}} busy={busy} offline={offline} onSettle={(d) => settle(entry, d, choices[entry.eventId])} />
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** D: one table, a band per record, a row per field, a radio pair per row. */
function Sheet({ entries, busy, offline, choices, choose, settle }: Props) {
  const { t, language } = useI18n();
  const title = useTitle();
  const by = useBy();
  const text = useValueText();
  const head = 'sticky top-0 z-10 border-b border-line bg-panel px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-muted';
  return (
    <div className={`${CARD} ${FULL}`}>
      <PageHeader count={entries.length} />
      {entries.length === 0 ? (
        <Empty />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={`${head} w-48`}>{t('review.field')}</th>
                <th scope="col" className={head}>{t('review.current')}</th>
                <th scope="col" className={head}>{t('review.waiting')}</th>
              </tr>
            </thead>
            {entries.map((entry) => {
              const choice = choices[entry.eventId] ?? {};
              return (
                <tbody key={entry.eventId}>
                  <tr className="bg-surface">
                    <th scope="colgroup" colSpan={3} className="border-y border-line px-4 py-2.5 text-start font-normal">
                      <div className="flex flex-wrap items-center gap-3">
                        <SubjectMark entry={entry} size="sm" />
                        <span className="font-semibold">{title(entry)}</span>
                        <span className="text-muted">{by(entry)}</span>
                        <KindChip entry={entry} />
                        <span className="ms-auto flex gap-2">
                          <Actions entry={entry} choice={choice} busy={busy} offline={offline} onSettle={(d) => settle(entry, d, choice)} />
                        </span>
                      </div>
                    </th>
                  </tr>
                  {entry.outcome === 'rejected' ? (
                    <tr className="border-b border-line">
                      <td colSpan={3} className="px-4 py-3 text-danger">
                        {t('review.refused', { reason: entry.reason })}
                      </td>
                    </tr>
                  ) : (
                    entry.rows.map((row) => {
                      const side = choice[row.field] ?? 'current';
                      const cell = (s: Side) => (
                        <label className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 ${side === s ? (s === 'current' ? 'bg-brand-soft font-semibold' : 'bg-warn-soft font-semibold') : 'text-muted'}`}>
                          <input type="radio" name={`${entry.eventId}-${row.field}`} checked={side === s} onChange={() => choose(entry.eventId)(row.field, s)} className="mt-1" />
                          {text(s === 'current' ? row.current : row.waiting)}
                        </label>
                      );
                      return (
                        <tr key={row.field} className="border-b border-line">
                          <th scope="row" className="px-4 py-2 text-start font-semibold">
                            {fieldName(t, row.field)}
                          </th>
                          <td className="px-2 py-1.5">{cell('current')}</td>
                          <td className="px-2 py-1.5">{cell('waiting')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              );
            })}
          </table>
          <p className="p-4 text-xs text-muted">{pick(language, 'একটি ঘরে নতুনটা বাছলে "বাছাই করা মান সেভ করুন" চালু হয়।', 'Picking a new value in any field turns on Save My Picks.')}</p>
        </div>
      )}
    </div>
  );
}

/** E: one change fills the page, with back and next and a dot per change. */
function OneAtATime({ entries, busy, offline, choices, choose, settle }: Props) {
  const { language, number } = useI18n();
  const title = useTitle();
  const by = useBy();
  const [at, setAt] = useState(0);
  const i = Math.min(at, Math.max(entries.length - 1, 0));
  const entry = entries[i];
  return (
    <div className={`${CARD} ${FULL}`}>
      <PageHeader
        count={entries.length}
        extra={
          entries.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={i === 0} onClick={() => setAt(i - 1)} aria-label={pick(language, 'আগেরটা', 'Previous')}>
                <ChevronLeft size={16} aria-hidden="true" />
              </Button>
              <span className="text-sm font-semibold">
                {number(i + 1)} / {number(entries.length)}
              </span>
              <Button variant="secondary" disabled={i >= entries.length - 1} onClick={() => setAt(i + 1)} aria-label={pick(language, 'পরেরটা', 'Next')}>
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </div>
          )
        }
      />
      {!entry ? (
        <Empty />
      ) : (
        <>
          <div className="flex justify-center gap-1.5 pt-4">
            {entries.map((e, n) => (
              <button
                key={e.eventId}
                type="button"
                aria-label={title(e)}
                aria-current={n === i ? 'step' : undefined}
                onClick={() => setAt(n)}
                className={`h-2 rounded-full ${n === i ? 'w-8 bg-brand' : 'w-2 bg-line hover:bg-muted'}`}
              />
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
              <div className="flex flex-col items-center gap-2 text-center">
                <SubjectMark entry={entry} size="lg" />
                <h2 className="font-display text-2xl font-bold">{title(entry)}</h2>
                <p className="text-sm text-muted">{by(entry)}</p>
                <KindChip entry={entry} />
              </div>
              {entry.outcome === 'rejected' ? (
                <Refused entry={entry} />
              ) : (
                <CompareGrid entry={entry} choice={choices[entry.eventId] ?? {}} onChoose={choose(entry.eventId)} big />
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line bg-surface/50 px-5 py-4">
            <Actions entry={entry} choice={choices[entry.eventId] ?? {}} busy={busy} offline={offline} size="lg" onSettle={(d) => settle(entry, d, choices[entry.eventId])} />
          </div>
        </>
      )}
    </div>
  );
}

