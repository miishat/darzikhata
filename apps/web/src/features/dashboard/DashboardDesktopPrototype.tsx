// PROTOTYPE (throwaway): desktop Home layouts, switched with ?variant=. Lives on prototype/dashboard-desktop only.
import { balanceDue, itemSummaryGroup, labelIn, stageByKey, toScript, type ItemRef, type Order } from '@darzikhata/domain';
import {
  Banknote,
  CheckCheck,
  ChevronRight,
  Hammer,
  ClipboardList,
  Printer,
  Scissors,
  ShoppingBag,
  TriangleAlert,
  UserPlus,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useCurrentStaff } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { buttonClasses } from '../../ui/Button';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { dashboardModel, dayPart, firstTrialTime, METHODS } from './dashboard';

export const DASHBOARD_VARIANTS = {
  A: 'Current (page scrolls)',
  B: 'Four full-height columns',
  C: 'Tiles pick one big list',
  D: 'One agenda + money side panel',
  E: 'Navy rail + 2x2 lists',
} as const;

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const PAGE = 'flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4';

function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

type ListKey = 'late' | 'trial' | 'delivery' | 'ready';
interface Row {
  key: string;
  to: string;
  id: string;
  name: string;
  detail: string;
  right: ReactNode;
  owed: number;
}
interface HomeList {
  key: ListKey;
  title: string;
  short: string;
  icon: LucideIcon;
  seeAll: string;
  count: number;
  sub: string | null;
  late?: boolean;
  rows: Row[];
}

/** Everything the variants show, shaped once. */
function useHome() {
  const { t, language, money, number } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const can = useCan();
  const showMoney = can('money.view');
  const model = useMemo(() => dashboardModel(Object.values(state.orders), today), [state, today]);
  const customerName = (order: Order) => state.customers[order.customerId]?.name ?? '';
  const current = useCurrentStaff();
  const name = current?.staff.name;
  const greeting = `${t(`dashboard.greeting.${dayPart(new Date())}`)}${name ? `, ${name}` : ''}`;

  const stagePill = (ref: ItemRef) => {
    const stage = stageByKey(ref.item.stages, ref.item.stageKey);
    return <StagePill label={labelIn(stage.label, language)} tone={stageTone(stage, itemSummaryGroup(ref.item), ref.item.stages.indexOf(stage))} />;
  };
  const owedText = (order: Order) =>
    showMoney && balanceDue(order) > 0 ? <span className="shrink-0 text-sm font-semibold">{t('customer.balance', { amount: money(balanceDue(order)) })}</span> : null;
  const garment = (ref: ItemRef, right: ReactNode): Row => ({
    key: `${ref.order.id}:${ref.item.id}`,
    to: `/app/orders/${ref.order.id}`,
    id: ref.order.customerId,
    name: customerName(ref.order),
    detail: `${itemTitle(ref.order, ref.item, language)} · ${ref.order.number}`,
    right,
    owed: showMoney ? Math.max(0, balanceDue(ref.order)) : 0,
  });

  const readyFirst = model.ready
    .map((order) => ({ order, readyCount: order.items.filter((i) => itemSummaryGroup(i) === 'ready').length }))
    .sort((a, b) => b.readyCount - a.readyCount);

  const lists: Record<ListKey, HomeList> = {
    late: {
      key: 'late',
      title: t('dashboard.overdue'),
      short: t('dashboard.tile.late'),
      icon: TriangleAlert,
      seeAll: '/app/orders?status=overdue',
      count: model.overdueGarments,
      late: true,
      sub: model.oldestLateDays === null ? null : t(model.oldestLateDays === 1 ? 'dashboard.sub.lateAgeOne' : 'dashboard.sub.lateAge', { n: number(model.oldestLateDays) }),
      rows: model.overdue.map((ref) => garment(ref, ref.item.deliveryDate ? <DueLabel date={ref.item.deliveryDate} /> : stagePill(ref))),
    },
    trial: {
      key: 'trial',
      title: t('dashboard.trialsToday'),
      short: t('dashboard.tile.trial'),
      icon: Scissors,
      seeAll: '/app/orders?status=trial&sort=delivery',
      count: model.trialsToday.length,
      sub: model.firstTrialTime ? t('dashboard.sub.trialAt', { time: toScript(model.firstTrialTime, language) }) : null,
      rows: model.trialsToday.map((ref) => {
        const time = firstTrialTime([ref]);
        return garment(ref, time ? <span className="shrink-0 text-sm font-semibold">{toScript(time, language)}</span> : stagePill(ref));
      }),
    },
    delivery: {
      key: 'delivery',
      title: t('dashboard.deliveriesToday'),
      short: t('dashboard.tile.delivery'),
      icon: ShoppingBag,
      seeAll: '/app/orders?status=open&sort=delivery',
      count: model.deliveriesToday.length,
      sub: showMoney && model.deliveriesOwing > 0 ? t('dashboard.sub.deliveryOwing', { n: number(model.deliveriesOwing) }) : null,
      rows: model.deliveriesToday.map((ref) => garment(ref, owedText(ref.order) ?? stagePill(ref))),
    },
    ready: {
      key: 'ready',
      title: t('dashboard.ready'),
      short: t('dashboard.tile.ready'),
      icon: CheckCheck,
      seeAll: '/app/orders?status=ready',
      count: model.readyGarments,
      sub: showMoney && model.readyOwed > 0 ? t('dashboard.sub.readyOwed', { amount: money(model.readyOwed) }) : null,
      rows: readyFirst.map(({ order, readyCount }) => ({
        key: order.id,
        to: `/app/orders/${order.id}`,
        id: order.customerId,
        name: customerName(order),
        detail: `${t('progress.ready', { n: number(readyCount) })} · ${order.number}`,
        right: owedText(order),
        owed: showMoney ? Math.max(0, balanceDue(order)) : 0,
      })),
    },
  };
  return { model, today, showMoney, greeting, lists, order: ['trial', 'delivery', 'late', 'ready'] as ListKey[] };
}

type Home = ReturnType<typeof useHome>;

function RowItem({ row, dense }: { row: Row; dense?: boolean }) {
  return (
    <li>
      <Link
        to={row.to}
        className={`flex items-center gap-3 px-4 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${dense ? 'min-h-12 py-1' : 'min-h-14 py-2'}`}
      >
        <Avatar id={row.id} name={row.name} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{row.name}</span>
          <span className="truncate text-sm text-muted">{row.detail}</span>
        </span>
        {row.right}
      </Link>
    </li>
  );
}

function CountBadge({ n, late }: { n: number; late?: boolean }) {
  const { number } = useI18n();
  return (
    <span
      className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 text-sm font-semibold ${
        late && n > 0 ? 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink' : 'bg-surface text-muted'
      }`}
    >
      {number(n)}
    </span>
  );
}

function Empty() {
  const { t } = useI18n();
  return <p className="px-4 py-6 text-center text-muted">{t('dashboard.none')}</p>;
}

/** A list in its own full-height card: header, then every row in an inner scroll. */
function ListCard({ list, className = '' }: { list: HomeList; className?: string }) {
  const { t } = useI18n();
  const Icon = list.icon;
  return (
    <section aria-label={list.title} data-tour={list.key === 'ready' ? 'ready-list' : undefined} className={`${CARD} ${className}`}>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${list.late ? 'bg-warn-soft text-warn-ink' : 'bg-brand-soft text-brand-strong'}`}>
          <Icon aria-hidden="true" size={17} />
        </span>
        <h2 className="truncate font-display text-base font-semibold">{list.title}</h2>
        <CountBadge n={list.count} late={list.late} />
        <Link to={list.seeAll} className="ms-auto shrink-0 whitespace-nowrap text-sm font-semibold text-brand-strong">
          {t('dashboard.seeAll')}
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {list.rows.length === 0 ? <Empty /> : <ul className="divide-y divide-line">{list.rows.map((r) => <RowItem key={r.key} row={r} dense />)}</ul>}
      </div>
    </section>
  );
}

function Greeting({ home, action = true }: { home: Home; action?: boolean }) {
  const { t, date } = useI18n();
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-sm text-muted">{date(home.today)}</span>
        <p className="font-display text-2xl font-bold">{home.greeting}</p>
      </div>
      {action && <PrintLink />}
    </div>
  );
}

function PrintLink({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link to="/print/work?today=1" className={`${buttonClasses('secondary')} ${className}`}>
      <Printer aria-hidden="true" size={16} />
      {t('dashboard.printWork')}
    </Link>
  );
}

/** The money summary used by B, C and D. */
function MoneyBlock({ home, stacked }: { home: Home; stacked?: boolean }) {
  const { t, money, number } = useI18n();
  const { model } = home;
  const total = METHODS.reduce((s, m) => s + Math.max(0, model.collectedByMethod[m]), 0);
  const colors: Record<string, string> = { cash: 'bg-ok', bkash: 'bg-brand', nagad: 'bg-warn', bank: 'bg-muted' };
  return (
    <div className={`flex flex-col gap-3 ${stacked ? '' : ''}`}>
      <div className={`grid gap-3 ${stacked ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <Link to="/app/payments" className="flex flex-col gap-0.5 rounded-xl border border-line p-3 hover:bg-surface">
          <span className="text-sm text-muted">{t('dashboard.collectedToday')}</span>
          <span className="font-display text-2xl font-bold">{money(model.collectedToday)}</span>
          <span className="text-sm text-muted">{t('dashboard.paymentsCount', { n: number(model.collectedCount) })}</span>
        </Link>
        <Link to="/app/payments" className="flex flex-col gap-0.5 rounded-xl border border-line p-3 hover:bg-surface">
          <span className="text-sm text-muted">{t('payments.dueTotal')}</span>
          <span className="font-display text-2xl font-bold text-warn">{money(model.dueTotal)}</span>
          <span className="text-sm text-muted">{t('dashboard.dueOrders', { n: number(model.dueOrders) })}</span>
        </Link>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        {total > 0 && METHODS.map((m) => <span key={m} className={colors[m]} style={{ width: `${(Math.max(0, model.collectedByMethod[m]) / total) * 100}%` }} />)}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {METHODS.map((m) => (
          <div key={m} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-muted">
              <span className={`size-2 rounded-full ${colors[m]}`} aria-hidden="true" />
              {t(`method.${m}`)}
            </dt>
            <dd className="font-semibold">{money(model.collectedByMethod[m])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A compact stat tile in the app's card language. */
function StatTile({ list, active, onClick, to }: { list: HomeList; active?: boolean; onClick?: () => void; to?: string }) {
  const { number } = useI18n();
  const Icon = list.icon;
  const tone = list.late && list.count > 0;
  const cls = `group flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
    active ? 'border-brand bg-brand text-on-brand' : tone ? 'border-warn-line bg-warn-soft text-warn-ink hover:border-warn' : 'border-line bg-panel hover:border-brand hover:bg-brand-soft/30'
  }`;
  const body = (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${active ? 'bg-white/20' : tone ? 'bg-warn/15' : 'bg-brand-soft text-brand-strong'}`}>
        <Icon aria-hidden="true" size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-sm ${active ? 'text-on-brand/85' : tone ? 'font-semibold' : 'text-muted'}`}>{list.short}</span>
        <span className={`min-h-5 truncate text-sm ${active ? 'text-on-brand/85' : tone ? '' : 'text-muted'}`}>{list.sub ?? ' '}</span>
      </span>
      <span className="font-display text-3xl font-bold leading-none">{number(list.count)}</span>
    </>
  );
  if (onClick)
    return (
      <button type="button" aria-pressed={active} onClick={onClick} className={cls}>
        {body}
      </button>
    );
  return (
    <Link to={to ?? list.seeAll} className={cls}>
      {body}
    </Link>
  );
}

// ---------------------------------------------------------------- B

/** Greeting and today's tiles plus money in one strip, then all four lists as full-height columns. */
export function VariantB() {
  const home = useHome();
  const { t, money } = useI18n();
  const L = useL();
  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-4">
      <h1 className="sr-only">{t('nav.dashboard')}</h1>
      <Greeting home={home} />
      <div className="grid grid-cols-4 gap-3">
        {home.order.map((k) => (
          <StatTile key={k} list={home.lists[k]} />
        ))}
      </div>
      {home.showMoney && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm">
          <Banknote aria-hidden="true" size={18} className="text-muted" />
          <span>
            <span className="text-muted">{t('dashboard.collectedToday')}: </span>
            <span className="font-display text-base font-bold">{money(home.model.collectedToday)}</span>
          </span>
          {METHODS.map((m) => (
            <span key={m} className="text-muted">
              {t(`method.${m}`)} <span className="font-semibold text-ink">{money(home.model.collectedByMethod[m])}</span>
            </span>
          ))}
          <Link to="/app/payments" className="ms-auto">
            <span className="text-muted">{t('payments.dueTotal')}: </span>
            <span className="font-display text-base font-bold text-warn">{money(home.model.dueTotal)}</span>
            <span className="text-muted"> · {L('পেমেন্ট দেখুন', 'Open Payments')}</span>
          </Link>
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">
        {home.order.map((k) => (
          <ListCard key={k} list={home.lists[k]} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- C

/** Four tiles on top choose which list fills the big card below; money sits beside it. */
export function VariantC() {
  const home = useHome();
  const { t } = useI18n();
  const L = useL();
  const [pick, setPick] = useState<ListKey>(home.lists.late.count > 0 ? 'late' : 'trial');
  const list = home.lists[pick];
  const owed = list.rows.reduce((s, r) => s + r.owed, 0);
  const { money, number } = useI18n();
  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-4">
      <h1 className="sr-only">{t('nav.dashboard')}</h1>
      <Greeting home={home} />
      <div role="group" aria-label={t('dashboard.title')} className="grid grid-cols-4 gap-3">
        {(['late', 'trial', 'delivery', 'ready'] as ListKey[]).map((k) => (
          <StatTile key={k} list={home.lists[k]} active={pick === k} onClick={() => setPick(k)} />
        ))}
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <section aria-label={list.title} className={`${CARD} flex-1`}>
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <h2 className="font-display text-lg font-bold">{list.title}</h2>
            <CountBadge n={list.count} late={list.late} />
            {home.showMoney && owed > 0 && <span className="text-sm text-muted">{L(`মোট বাকি ${money(owed)}`, `${money(owed)} owed in all`)}</span>}
            <Link to={list.seeAll} className={`${buttonClasses('secondary')} ms-auto`}>
              {L('অর্ডারে খুলুন', 'Open in Orders')}
              <ChevronRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {list.rows.length === 0 ? (
              <Empty />
            ) : (
              <ul className="grid grid-cols-1 xl:grid-cols-2 [&>li]:border-b [&>li]:border-line xl:[&>li:nth-child(odd)]:border-e">{list.rows.map((r) => <RowItem key={r.key} row={r} />)}</ul>
            )}
          </div>
          <p className="border-t border-line px-5 py-2 text-sm text-muted">{L(`${number(list.rows.length)}টি সারি`, `${number(list.rows.length)} rows`)}</p>
        </section>
        {home.showMoney && (
          <aside aria-label={t('dashboard.money')} className={`${CARD} w-80 shrink-0`}>
            <div className="border-b border-line px-4 py-3.5">
              <h2 className="font-display text-lg font-bold">{t('dashboard.money')}</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <MoneyBlock home={home} stacked />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- D

/** One card holds the day as an agenda, grouped with sticky headings; a side panel carries money, the shop's pulse and shortcuts. */
export function VariantD() {
  const home = useHome();
  const { t, number } = useI18n();
  const L = useL();
  const groups: ListKey[] = ['late', 'trial', 'delivery', 'ready'];
  return (
    <div className={PAGE}>
      <h1 className="sr-only">{t('nav.dashboard')}</h1>
      <section aria-label={t('dashboard.todo')} className={`${CARD} flex-1`}>
        <div className="flex items-center gap-4 border-b border-line px-5 py-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted">{useI18n().date(home.today)}</span>
            <p className="font-display text-2xl font-bold">{home.greeting}</p>
          </div>
          <nav aria-label={L('তালিকায় যান', 'Jump to')} className="ms-auto flex gap-1.5">
            {groups.map((k) => (
              <a
                key={k}
                href={`#home-${k}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`home-${k}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
                  home.lists[k].late && home.lists[k].count > 0 ? 'border-warn-line bg-warn-soft text-warn-ink' : 'border-line hover:bg-surface'
                }`}
              >
                {home.lists[k].short}
                <span className="text-muted">{number(home.lists[k].count)}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto">
          {groups.map((k) => {
            const list = home.lists[k];
            const Icon = list.icon;
            return (
              <section key={k} id={`home-${k}`} aria-label={list.title} data-tour={k === 'ready' ? 'ready-list' : undefined}>
                <div className={`sticky top-0 z-10 flex items-center gap-2 border-y border-line px-5 py-2 ${list.late ? 'bg-warn-soft text-warn-ink' : 'bg-surface'}`}>
                  <Icon aria-hidden="true" size={16} />
                  <h2 className="text-sm font-bold">{list.title}</h2>
                  <span className="text-sm">{number(list.count)}</span>
                  {list.sub && <span className="text-sm opacity-80">· {list.sub}</span>}
                  <Link to={list.seeAll} className="ms-auto text-sm font-semibold text-brand-strong">
                    {t('dashboard.seeAll')}
                  </Link>
                </div>
                {list.rows.length === 0 ? (
                  <p className="px-5 py-3 text-muted">{t('dashboard.none')}</p>
                ) : (
                  <ul className="grid grid-cols-1 divide-y divide-line 2xl:grid-cols-2">{list.rows.map((r) => <RowItem key={r.key} row={r} dense />)}</ul>
                )}
              </section>
            );
          })}
        </div>
      </section>
      <aside className="flex w-80 shrink-0 flex-col gap-4">
        <section aria-label={L('এখনই করুন', 'Quick Actions')} className={`${CARD} p-4`}>
          <h2 className="mb-3 font-display text-base font-bold">{L('এখনই করুন', 'Quick Actions')}</h2>
          <div className="flex flex-col gap-2">
            <Link to="/app/orders/new" className={buttonClasses('primary')}>
              <Plus aria-hidden="true" size={18} />
              {t('nav.newOrder')}
            </Link>
            <Link to="/app/customers/new" className={buttonClasses('secondary')}>
              <UserPlus aria-hidden="true" size={18} />
              {t('customers.new')}
            </Link>
            <PrintLink />
          </div>
        </section>
        <section aria-label={L('দোকানের অবস্থা', 'Shop at a Glance')} className={`${CARD} p-4`}>
          <h2 className="mb-3 font-display text-base font-bold">{L('দোকানের অবস্থা', 'Shop at a Glance')}</h2>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              [ClipboardList, t('dashboard.openOrders'), home.model.openOrders],
              [Hammer, t('dashboard.inProgress'), home.model.inProgress],
              [CheckCheck, t('dashboard.readyGarments'), home.model.readyGarments],
            ].map(([Icon, label, n]) => {
              const I = Icon as LucideIcon;
              return (
                <div key={label as string} className="flex flex-col items-center gap-1 rounded-xl bg-surface p-2.5">
                  <I aria-hidden="true" size={18} className="text-brand-strong" />
                  <dd className="font-display text-xl font-bold">{number(n as number)}</dd>
                  <dt className="text-xs text-muted">{label as string}</dt>
                </div>
              );
            })}
          </dl>
        </section>
        {home.showMoney && (
          <section aria-label={t('dashboard.money')} className={`${CARD} min-h-0 flex-1 p-4`}>
            <h2 className="mb-3 font-display text-base font-bold">{t('dashboard.money')}</h2>
            <div className="min-h-0 overflow-auto">
              <MoneyBlock home={home} stacked />
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- E

/** Today's navy panel becomes a left rail (greeting, tiles, money); the four lists fill a 2x2 grid that never scrolls the page. */
export function VariantE() {
  const home = useHome();
  const { t, money, number, date } = useI18n();
  return (
    <div className={PAGE}>
      <h1 className="sr-only">{t('nav.dashboard')}</h1>
      <aside aria-label={t('dashboard.title')} className="flex w-72 shrink-0 flex-col gap-3 overflow-auto rounded-2xl bg-navy p-4 text-on-navy ring-1 ring-inset ring-navy-line">
        <div className="flex flex-col">
          <span className="text-sm text-on-navy-muted">{date(home.today)}</span>
          <p className="font-display text-xl font-bold">{home.greeting}</p>
        </div>
        {home.order.map((k) => {
          const list = home.lists[k];
          const Icon = list.icon;
          const late = list.late && list.count > 0;
          return (
            <Link
              key={k}
              to={list.seeAll}
              className={`flex items-center gap-3 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-focus ${
                late ? 'bg-warn-soft text-warn-ink ring-1 ring-inset ring-warn-line' : 'bg-navy-raised hover:brightness-110'
              }`}
            >
              <Icon aria-hidden="true" size={20} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`text-sm ${late ? 'font-semibold' : 'text-on-navy-muted'}`}>{list.short}</span>
                {list.sub && <span className={`truncate text-xs ${late ? '' : 'text-on-navy-muted'}`}>{list.sub}</span>}
              </span>
              <span className="font-display text-2xl font-bold">{number(list.count)}</span>
            </Link>
          );
        })}
        {home.showMoney && (
          <Link to="/app/payments" className="mt-auto flex flex-col gap-2 rounded-xl bg-navy-raised p-3">
            <span className="text-sm text-on-navy-muted">{t('dashboard.collectedToday')}</span>
            <span className="font-display text-2xl font-bold">{money(home.model.collectedToday)}</span>
            <dl className="grid grid-cols-2 gap-x-3 text-sm">
              {METHODS.map((m) => (
                <div key={m} className="flex justify-between">
                  <dt className="text-on-navy-muted">{t(`method.${m}`)}</dt>
                  <dd className="font-semibold">{money(home.model.collectedByMethod[m])}</dd>
                </div>
              ))}
            </dl>
            <span className="border-t border-navy-line pt-2 text-sm text-on-navy-muted">
              {t('payments.dueTotal')} <span className="font-semibold text-warn-soft">{money(home.model.dueTotal)}</span>
            </span>
          </Link>
        )}
        <PrintLink className="shrink-0" />
      </aside>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
        {home.order.map((k) => (
          <ListCard key={k} list={home.lists[k]} />
        ))}
      </div>
    </div>
  );
}
