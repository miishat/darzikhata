// PROTOTYPE (throwaway): desktop layouts for the review queue, switched with ?variant=. Never merged.
import { ArrowRight, ArrowUpRight, Check, CircleAlert, Info, ShoppingBag, WifiOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/bn';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { useValueText } from './ReviewPage';
import { reviewEntry, mergeBody, type ReviewEntry, type ReviewField, type ReviewRow } from './reviewView';
import { useVisibleReview } from './useSync';

export const REVIEW_VARIANTS = {
  A: 'Current page',
  F: 'Inbox with a before → after line per field (the description pushes the list header taller)',
  L: 'F, the description behind an info button beside the title',
  M: 'F, the description as a note at the top of the chosen change',
  N: 'F, the description as a strip above both panels',
  O: 'F, the description at the foot of the list',
  P: 'F, a one-line description under the title',
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

/** A value to keep: both sides read in full ink; the kept one gets a coloured border, a tick and a tag. */
function ValueTile({ text, on, tone, onClick, label }: { text: string; on: boolean; tone: 'current' | 'waiting'; onClick(): void; label: string }) {
  const { language } = useI18n();
  const ring = tone === 'current' ? 'border-brand bg-brand-soft/60' : 'border-warn bg-warn-soft/60';
  const tag = tone === 'current' ? 'bg-brand text-on-brand' : 'bg-warn text-white';
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${label}: ${text}`}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-start focus-visible:outline-2 focus-visible:outline-focus ${on ? ring : 'border-line bg-panel hover:border-muted'}`}
    >
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-transparent bg-ink text-panel' : 'border-line'}`}>
        {on && <Check size={12} aria-hidden="true" />}
      </span>
      <span className={`min-w-0 flex-1 text-base text-ink ${on ? 'font-semibold' : ''}`}>{text}</span>
      {on && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tag}`}>{pick(language, 'থাকবে', 'Keep')}</span>}
    </button>
  );
}

/** One block per field: its name, then the two values side by side under their column names. */
function CompareGrid({ entry, choice, onChoose }: { entry: Entry; choice: Choice; onChoose(field: ReviewField, side: Side): void }) {
  const { t } = useI18n();
  const text = useValueText();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 px-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
          <span className="size-2.5 rounded-full bg-brand" />
          {t('review.current')}
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-warn-ink">
          <span className="size-2.5 rounded-full bg-warn" />
          {t('review.waiting')}
        </span>
      </div>
      {entry.rows.map((row) => {
        const side = choice[row.field] ?? 'current';
        return (
          <div key={row.field} role="group" aria-label={fieldName(t, row.field)} className="flex flex-col gap-2 rounded-2xl bg-surface/70 p-4">
            <span className="font-display text-base font-bold">{fieldName(t, row.field)}</span>
            <div className="grid grid-cols-2 gap-3">
              <ValueTile text={text(row.current)} on={side === 'current'} tone="current" label={t('review.current')} onClick={() => onChoose(row.field, 'current')} />
              <ValueTile text={text(row.waiting)} on={side === 'waiting'} tone="waiting" label={t('review.waiting')} onClick={() => onChoose(row.field, 'waiting')} />
            </div>
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

type Intro = 'header' | 'info' | 'note' | 'banner' | 'footer' | 'short';

/** Both panel headers share this height when the description sits elsewhere, so their dividers line up. */
const HEAD = 'h-24 shrink-0';

function OfflineNote() {
  const { t } = useI18n();
  const { sync } = useSnapshot();
  if (sync.online) return null;
  return (
    <p className="flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm font-semibold text-warn-ink">
      <WifiOff size={16} aria-hidden="true" />
      {t('review.offline')}
    </p>
  );
}

function PageHeader({ count, intro = 'header' }: { count: number; intro?: Intro }) {
  const { t, language, number } = useI18n();
  const [open, setOpen] = useState(false);
  const fixed = intro !== 'header';
  return (
    <div className={`relative flex flex-col border-b border-line px-5 ${fixed ? `${HEAD} justify-center gap-1` : 'gap-3 py-5'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">{t('review.title')}</h1>
        {count > 0 && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-semibold text-warn-ink">{pick(language, `${number(count)}টি বাকি`, `${number(count)} Left`)}</span>}
        {intro === 'info' && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={pick(language, 'এটা কী?', 'What Is This?')}
            onClick={() => setOpen((o) => !o)}
            className="ms-auto flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Info size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {intro === 'header' && <p className="max-w-3xl text-sm text-muted">{t('review.intro')}</p>}
      {intro === 'header' && <OfflineNote />}
      {intro === 'info' && <p className="text-sm text-muted">{pick(language, 'অন্য কোথাও বদলে যাওয়া রেকর্ড', 'Records That Changed Elsewhere')}</p>}
      {intro === 'short' && (
        <p className="truncate text-sm text-muted" title={t('review.intro')}>
          {pick(language, 'অন্য কোথাও বদলেছে, কোনটা থাকবে বেছে নিন', 'Changed elsewhere first. Choose what to keep.')}
        </p>
      )}
      {intro === 'info' && open && (
        <p role="note" className="absolute inset-x-3 top-full z-20 mt-2 rounded-xl border border-line bg-panel p-4 text-sm shadow-lg">
          {t('review.intro')}
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
  const shape = SHAPE[variant] ?? SHAPE.F!;
  return (
    <>
      <Inbox {...props} {...shape} />
      <ReviewSwitcher />
    </>
  );
}

type LinkAt = 'button' | 'title' | 'bar' | 'card' | 'list';
const SHAPE: Record<string, { look: 'tiles' | 'arrows'; linkAt: LinkAt; intro: Intro }> = {
  F: { look: 'arrows', linkAt: 'button', intro: 'header' },
  L: { look: 'arrows', linkAt: 'button', intro: 'info' },
  M: { look: 'arrows', linkAt: 'button', intro: 'note' },
  N: { look: 'arrows', linkAt: 'button', intro: 'banner' },
  O: { look: 'arrows', linkAt: 'button', intro: 'footer' },
  P: { look: 'arrows', linkAt: 'button', intro: 'short' },
};

type Props = {
  entries: Entry[];
  busy: boolean;
  offline: boolean;
  choices: Record<string, Choice>;
  choose(id: string): (field: ReviewField, side: Side) => void;
  settle(entry: Entry, decision: Decision, choice?: Choice): Promise<void>;
};

function useViewLabel() {
  const { language } = useI18n();
  return (entry: Entry) => (entry.subject?.kind === 'customer' ? pick(language, 'প্রোফাইল দেখুন', 'View Profile') : pick(language, 'অর্ডার দেখুন', 'View Order'));
}

/** What the record is, so the person knows whose change it is before choosing. */
function RecordCard({ entry }: { entry: Entry }) {
  const { t, language, number, date, money } = useI18n();
  const { state } = useSnapshot();
  const view = useViewLabel();
  const to = subjectLink(entry);
  if (!entry.subject || !to) return null;
  let facts: Array<[string, string]> = [];
  let who: { id: string; name: string } | null = null;
  if (entry.subject.kind === 'customer') {
    const c = state.customers[entry.subject.customerId];
    const count = Object.values(state.orders).filter((o) => o.customerId === c?.id).length;
    who = c ? { id: c.id, name: c.name } : null;
    facts = [
      [t('review.field.phone'), c?.phone ?? '-'],
      [pick(language, 'অর্ডার', 'Orders'), number(count)],
    ];
  } else {
    const o = state.orders[entry.subject.orderId];
    const c = o ? state.customers[o.customerId] : undefined;
    who = c ? { id: c.id, name: c.name } : null;
    const live = o?.items.filter((i) => !i.cancelled) ?? [];
    const next = live.map((i) => i.deliveryDate).filter(Boolean).sort()[0];
    facts = [
      [pick(language, 'পোশাক', 'Garments'), number(live.length)],
      [t('review.field.deliveryDate'), next ? date(next) : '-'],
      [pick(language, 'মোট', 'Total'), money(live.reduce((sum, i) => sum + i.price, 0))],
    ];
  }
  return (
    <div className="mb-5 flex items-center gap-4 rounded-2xl border border-line p-4">
      {who && <Avatar id={who.id} name={who.name} />}
      <div className="flex min-w-0 flex-1 flex-wrap gap-x-8 gap-y-1">
        {who && (
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted">{pick(language, 'কাস্টমার', 'Customer')}</span>
            <span className="truncate font-semibold">{who.name}</span>
          </div>
        )}
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <span className="text-xs text-muted">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
      <Link to={to} className={buttonClasses('secondary')}>
        {view(entry)}
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

/** A list of changes on the left, the chosen one on the right. */
function Inbox({ entries, busy, offline, choices, choose, settle, look, linkAt, intro }: Props & { look: 'tiles' | 'arrows'; linkAt: LinkAt; intro: Intro }) {
  const { t, language } = useI18n();
  const title = useTitle();
  const by = useBy();
  const view = useViewLabel();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = entries.find((e) => e.eventId === pickedId) ?? entries[0];
  const to = picked ? subjectLink(picked) : null;
  const panels = (
    <div className={`flex gap-4 ${intro === 'banner' ? 'min-h-0 flex-1' : FULL}`}>
      <section className={`${CARD} w-[22rem] shrink-0`}>
        <PageHeader count={entries.length} intro={intro} />
        {intro !== 'header' && intro !== 'banner' && (
          <div className="px-3 pt-3 empty:hidden">
            <OfflineNote />
          </div>
        )}
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-2">
          {entries.map((entry) => {
            const on = entry === picked;
            const rowTo = subjectLink(entry);
            return (
              <li key={entry.eventId} className={`flex items-center rounded-xl ${on ? 'bg-brand-soft' : 'hover:bg-surface'}`}>
                <button
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  onClick={() => setPickedId(entry.eventId)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-start focus-visible:outline-2 focus-visible:outline-focus"
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
                {linkAt === 'list' && rowTo && (
                  <Link
                    to={rowTo}
                    aria-label={`${view(entry)}: ${title(entry)}`}
                    title={view(entry)}
                    className="me-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-panel hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        {intro === 'footer' && (
          <p className="flex gap-2 border-t border-line bg-surface/50 px-5 py-4 text-sm text-muted">
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {t('review.intro')}
          </p>
        )}
      </section>
      <section className={`${CARD} min-w-0 flex-1`}>
        {!picked ? (
          <Empty />
        ) : (
          <>
            <div className={`flex items-center gap-4 border-b border-line px-5 ${intro === 'header' ? 'py-5' : HEAD}`}>
              <SubjectMark entry={picked} size="lg" />
              <div className="min-w-0 flex-1">
                {linkAt === 'title' && to ? (
                  <h2 className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <Link to={to} className="truncate font-display text-2xl font-bold hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                      {title(picked)}
                    </Link>
                    <Link to={to} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong hover:underline">
                      {view(picked)}
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </Link>
                  </h2>
                ) : (
                  <h2 className="truncate font-display text-2xl font-bold">{title(picked)}</h2>
                )}
                <p className="text-sm text-muted">{by(picked)}</p>
              </div>
              {linkAt === 'button' && to && (
                <Link to={to} className={buttonClasses('secondary')}>
                  {picked.subject?.kind === 'customer' ? <ArrowUpRight size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}
                  {view(picked)}
                </Link>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {linkAt === 'card' && <RecordCard entry={picked} />}
              {intro === 'note' && (
                <p className="mb-4 flex gap-2 rounded-xl bg-brand-soft/60 px-4 py-3 text-sm">
                  <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" />
                  {t('review.intro')}
                </p>
              )}
              {picked.outcome === 'rejected' ? (
                <Refused entry={picked} />
              ) : look === 'tiles' ? (
                <>
                  <p className="mb-4 text-sm text-muted">{pick(language, 'প্রতিটি ঘরে যে মানটা থাকবে সেটিতে চাপুন।', 'Tap the value to keep in each field.')}</p>
                  <CompareGrid entry={picked} choice={choices[picked.eventId] ?? {}} onChoose={choose(picked.eventId)} />
                </>
              ) : (
                <ArrowRows entry={picked} choice={choices[picked.eventId] ?? {}} onChoose={choose(picked.eventId)} />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface/50 px-5 py-3">
              {linkAt === 'bar' && to && (
                <Link to={to} className="me-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-focus">
                  <ArrowUpRight size={16} aria-hidden="true" />
                  {view(picked)}
                </Link>
              )}
              <Actions entry={picked} choice={choices[picked.eventId] ?? {}} busy={busy} offline={offline} onSettle={(d) => settle(picked, d, choices[picked.eventId])} />
            </div>
          </>
        )}
      </section>
    </div>
  );
  if (intro !== 'banner') return panels;
  return (
    <div className={`flex flex-col gap-3 ${FULL}`}>
      <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-brand-soft/60 px-5 py-3 text-sm">
        <Info size={18} aria-hidden="true" className="shrink-0 text-brand-strong" />
        <span className="min-w-0 flex-1">{t('review.intro')}</span>
        <OfflineNote />
      </div>
      {panels}
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
