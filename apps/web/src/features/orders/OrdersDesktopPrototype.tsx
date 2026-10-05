// PROTOTYPE (throwaway): desktop layouts for /app/orders, switched with ?variant=. A is the current page.
// B: one full-height card (view tiles, filters, table scrolling inside) and a wider order panel beside it.
// C: a board of columns by where each order stands (late, in work, trial, ready, delivered but owing); the order slides in as a drawer.
// D: a delivery agenda: days down the left with their load, orders grouped under each day, the order panel on the right.
import { balanceDue, itemSummaryGroup, type Order } from '@darzikhata/domain';
import { CalendarDays, ClipboardList, PackageCheck, Plus, Scissors, Shirt, TriangleAlert, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { Button, buttonClasses } from '../../ui/Button';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { OrderDetail } from './OrderDetail';
import { OrderFilters } from './OrderFilters';
import { useWorkerNames } from './OrderTable';
import { DEFAULT_LIST_QUERY, PAGE_SIZE, queryOrders, statusCounts, type OrderListQuery, type OrderRow } from './orderList';
import { ORDER_VIEWS, countViews, viewOfQuery, viewQuery, type OrderView } from './orderViews';

export const ORDER_VARIANTS = { A: 'Current', B: 'Card + wide panel', C: 'Stage board', D: 'Delivery agenda' };

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';
const PAGE = 'flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4';

/** Language-aware text for strings the app has no key for yet (prototype only). */
function useL() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

/** Open and close orders without losing the list's address (and the variant). */
function useOrderNav() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const clean = () => {
    const p = new URLSearchParams(search);
    p.delete('full');
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  return {
    open: (id: string) => navigate({ pathname: `/app/orders/${id}`, search: clean() }, { replace: true }),
    close: () => navigate({ pathname: '/app/orders', search: clean() }, { replace: true }),
  };
}

function useAllRows(text: string): OrderRow[] {
  const state = useScopedState();
  const today = useToday();
  return useMemo(() => queryOrders(state, { ...DEFAULT_LIST_QUERY, text, sort: 'delivery' }, today, 100000).rows, [state, text, today]);
}

/** Live garments grouped by current stage. */
function StageList({ order, compact = false }: { order: Order; compact?: boolean }) {
  const { language, label } = useI18n();
  const live = order.items.filter((i) => !i.cancelled);
  const groups: { item: Order['items'][number]; titles: string[] }[] = [];
  for (const item of live) {
    const g = groups.find((x) => x.item.stageKey === item.stageKey);
    const title = itemTitle(order, item, language);
    if (g) g.titles.push(title);
    else groups.push({ item, titles: [title] });
  }
  return (
    <ul className="m-0 flex list-none flex-col items-start gap-1 p-0">
      {groups.map(({ item, titles }) => {
        const index = item.stages.findIndex((s) => s.key === item.stageKey);
        const stage = item.stages[index];
        return (
          <li key={item.stageKey} className="flex min-w-0 max-w-full items-baseline gap-2 text-sm">
            <StagePill label={stage ? label(stage.label) : item.stageKey} tone={stageTone(stage, itemSummaryGroup(item), Math.max(index, 0))} />
            <span className={`text-muted ${compact ? 'truncate' : ''}`}>{titles.join(', ')}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Balance({ row }: { row: OrderRow }) {
  const { t, money } = useI18n();
  if (row.balance > 0) return <span className="font-semibold text-warn">{money(row.balance)}</span>;
  return <span className="text-sm font-semibold text-ok">{row.balance < 0 ? `${t('money.creditDue')} ${money(-row.balance)}` : t('orders.card.paid')}</span>;
}

function OrderSide({ orderId, onClose, className = '' }: { orderId: string; onClose(): void; className?: string }) {
  const { t } = useI18n();
  return (
    <section aria-label={t('orders.detail')} className={`${CARD} ${className}`}>
      <OrderDetail orderId={orderId} onClose={onClose} />
    </section>
  );
}

function NewOrderLink({ iconOnly = false }: { iconOnly?: boolean }) {
  const { t } = useI18n();
  if (!useCan()('orders.create')) return null;
  return (
    <Link to="/app/orders/new" aria-label={iconOnly ? t('nav.newOrder') : undefined} className={`${buttonClasses(iconOnly ? 'secondary' : 'primary')} ${iconOnly ? 'w-10 px-0' : ''}`}>
      <Plus aria-hidden="true" size={18} />
      {!iconOnly && t('nav.newOrder')}
    </Link>
  );
}

// ---------- B: card + wide panel ----------

const VIEW_LOOK: Record<OrderView, { icon: LucideIcon; warn?: boolean }> = {
  all: { icon: ClipboardList },
  open: { icon: Scissors },
  trial: { icon: Shirt },
  ready: { icon: PackageCheck },
  late: { icon: TriangleAlert, warn: true },
  owed: { icon: Wallet, warn: true },
};

export function VariantB({ query, update, change }: { query: OrderListQuery; update(q: OrderListQuery): void; change(f: Partial<OrderListQuery>): void }) {
  const { t, number, money, date } = useI18n();
  const can = useCan();
  const state = useScopedState();
  const today = useToday();
  const { orderId } = useParams();
  const nav = useOrderNav();
  const workerNames = useWorkerNames();
  const showMoney = can('money.view');
  const result = useMemo(() => queryOrders(state, query, today), [state, query, today]);
  const counts = useMemo(() => statusCounts(state, today), [state, today]);
  const viewCounts = useMemo(() => countViews(state, today), [state, today]);
  const owedTotal = useMemo(
    () => Object.values(state.orders).reduce((s, o) => s + Math.max(0, balanceDue(o)), 0),
    [state],
  );
  const view = viewOfQuery(query, showMoney) ?? '';
  const views = ORDER_VIEWS.filter((v) => v !== 'owed' || showMoney);
  const narrow = Boolean(orderId);
  const from1 = (result.page - 1) * PAGE_SIZE + 1;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [query.page, query.status, query.dueOnly]);

  const head = 'sticky top-0 z-10 whitespace-nowrap border-b border-line bg-panel px-3 py-2 text-start text-sm font-semibold text-muted';
  return (
    <div className={PAGE}>
      <div className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold">{t('nav.orders')}</h1>
            <span className="flex-1" />
            <NewOrderLink />
          </div>
          <div role="group" aria-label={t('orders.tabs')} className={`grid gap-2 ${views.length === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
            {views.map((v) => {
              const look = VIEW_LOOK[v];
              const on = view === v;
              const Icon = look.icon;
              const tone = on
                ? look.warn
                  ? 'bg-warn-soft ring-2 ring-warn-line text-warn-ink'
                  : 'bg-brand-soft ring-2 ring-brand text-brand-strong'
                : 'bg-surface/60 ring-1 ring-line hover:bg-surface';
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => change(viewQuery(v))}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-start ring-inset focus-visible:outline-2 focus-visible:outline-focus ${tone}`}
                >
                  <span className={`${narrow ? 'hidden' : 'grid'} size-8 shrink-0 place-items-center rounded-lg ${look.warn ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand-strong'}`}>
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-lg font-bold leading-tight">{number(viewCounts[v])}</span>
                    <span className="truncate text-xs">{v === 'owed' && !narrow ? `${t('orders.chip.owed')} · ${money(owedTotal)}` : t(`orders.chip.${v === 'late' ? 'overdue' : v}`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <OrderFilters query={query} onChange={change} onClear={() => update(DEFAULT_LIST_QUERY)} counts={counts} />
        </div>

        <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto">
          {result.rows.length === 0 ? (
            <p className="p-4 text-muted">{t('orders.empty')}</p>
          ) : (
            <table aria-label={t('orders.list')} className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={head}>{t('orders.col.customer')}</th>
                  <th scope="col" className={head}>{t('orders.col.garmentsStage')}</th>
                  {!narrow && <th scope="col" className={head}>{t('orders.col.delivery')}</th>}
                  {!narrow && <th scope="col" className={head}>{t('orders.col.workers')}</th>}
                  {showMoney && <th scope="col" className={`${head} text-end`}>{t('orders.col.balance')}</th>}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => {
                  const { order } = row;
                  const on = order.id === orderId;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => nav.open(order.id)}
                      aria-selected={on}
                      className={`cursor-pointer border-b border-line ${on ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {row.customer && <Avatar id={row.customer.id} name={row.customer.name} />}
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-semibold">{row.customer?.name ?? order.number}</span>
                            <span className="text-sm text-muted">{order.number}</span>
                            {narrow && row.nextDelivery && <span className="w-fit"><DueLabel date={row.nextDelivery} /></span>}
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 ${narrow ? 'w-full max-w-0' : ''}`}><StageList order={order} compact={narrow} /></td>
                      {!narrow && (
                        <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                          {row.nextDelivery ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span>{date(row.nextDelivery)}</span>
                              <DueLabel date={row.nextDelivery} />
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      )}
                      {!narrow && <td className="px-3 py-2.5 text-sm">{workerNames(row.workers)}</td>}
                      {showMoney && <td className="whitespace-nowrap px-3 py-2.5 text-end"><Balance row={row} /></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
          <span className="text-sm text-muted">
            {result.total > 0 ? t('orders.range', { from: number(from1), to: number(from1 + result.rows.length - 1), total: number(result.total) }) : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" className="min-h-9!" disabled={result.page <= 1} onClick={() => change({ page: result.page - 1 })}>
              {t('orders.prev')}
            </Button>
            <Button variant="secondary" className="min-h-9!" disabled={result.page >= result.pages} onClick={() => change({ page: result.page + 1 })}>
              {t('orders.next')}
            </Button>
          </div>
        </div>
      </div>
      {orderId && <OrderSide orderId={orderId} onClose={nav.close} className="w-[min(560px,44%)] shrink-0" />}
    </div>
  );
}

// ---------- C: stage board ----------

type Lane = 'late' | 'working' | 'trial' | 'ready' | 'owing';

function laneOf(row: OrderRow): Lane | null {
  if (row.overdue) return 'late';
  if (row.progress.unfinished > 0) return row.trial ? 'trial' : 'working';
  if (row.progress.ready > 0) return 'ready';
  if (row.balance > 0) return 'owing';
  return null;
}

export function VariantC({ query, change }: { query: OrderListQuery; change(f: Partial<OrderListQuery>): void }) {
  const { t, number, money, date } = useI18n();
  const L = useL();
  const can = useCan();
  const { orderId } = useParams();
  const nav = useOrderNav();
  const workerNames = useWorkerNames();
  const showMoney = can('money.view');
  const rows = useAllRows(query.text);

  const lanes: { key: Lane; title: string; warn?: boolean }[] = [
    { key: 'late', title: t('orders.chip.overdue'), warn: true },
    { key: 'working', title: t('stageGroup.unfinished') },
    { key: 'trial', title: t('orders.chip.trial') },
    { key: 'ready', title: L('রেডি', 'Ready for Pickup') },
    ...(showMoney ? [{ key: 'owing' as Lane, title: L('দেওয়া হয়েছে, বাকি', 'Delivered, Owing'), warn: true }] : []),
  ];
  const byLane = new Map<Lane, OrderRow[]>();
  for (const row of rows) {
    const lane = laneOf(row);
    if (lane) byLane.set(lane, [...(byLane.get(lane) ?? []), row]);
  }

  useEffect(() => {
    if (!orderId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && nav.close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 flex-col gap-3">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl font-bold">{t('nav.orders')}</h1>
        <input
          type="search"
          aria-label={t('orders.search')}
          placeholder={t('orders.searchPlaceholder')}
          value={query.text}
          onChange={(e) => change({ text: e.target.value })}
          className="min-h-10 w-80 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-focus"
        />
        <span className="flex-1" />
        <NewOrderLink />
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        {lanes.map((lane) => {
          const list = byLane.get(lane.key) ?? [];
          const due = list.reduce((s, r) => s + Math.max(0, r.balance), 0);
          return (
            <section key={lane.key} aria-label={lane.title} className={`flex min-h-0 flex-col rounded-2xl ${list.length === 0 ? 'w-40 shrink-0' : 'min-w-0 flex-1'} ${lane.warn ? 'bg-warn-soft/60' : 'bg-surface'}`}>
              <header className="flex items-baseline gap-2 px-3 pb-2 pt-3">
                <h2 className={`font-semibold ${lane.warn ? 'text-warn-ink' : ''}`}>{lane.title}</h2>
                <span className="rounded-full bg-panel px-2 text-sm font-semibold">{number(list.length)}</span>
                <span className="flex-1" />
                {showMoney && due > 0 && <span className="text-xs text-muted">{money(due)}</span>}
              </header>
              <ul className="relative m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-auto p-2 pt-0">
                {list.map((row) => {
                  const on = row.order.id === orderId;
                  return (
                    <li key={row.order.id}>
                      <button
                        type="button"
                        onClick={() => nav.open(row.order.id)}
                        aria-current={on ? 'true' : undefined}
                        className={`flex w-full flex-col gap-2 rounded-xl border bg-panel p-3 text-start shadow-sm hover:border-brand focus-visible:outline-2 focus-visible:outline-focus ${on ? 'border-brand ring-2 ring-brand' : 'border-line'}`}
                      >
                        <div className="flex items-center gap-2">
                          {row.customer && <Avatar id={row.customer.id} name={row.customer.name} size="sm" />}
                          <span className="min-w-0 flex-1 truncate font-semibold">{row.customer?.name ?? row.order.number}</span>
                          <span className="text-xs text-muted">{row.order.number}</span>
                        </div>
                        <StageList order={row.order} compact />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          {row.nextDelivery ? (
                            <span className="flex items-center gap-1.5">
                              <CalendarDays aria-hidden="true" size={14} className="text-muted" />
                              {lane.key === 'late' ? <DueLabel date={row.nextDelivery} /> : <span className="text-muted">{date(row.nextDelivery)}</span>}
                            </span>
                          ) : (
                            <span />
                          )}
                          {showMoney && row.balance > 0 && <span className="font-semibold text-warn">{money(row.balance)}</span>}
                        </div>
                        {row.workers.length > 0 && <span className="truncate text-xs text-muted">{workerNames(row.workers)}</span>}
                      </button>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="p-3 text-sm text-muted">{t('orders.empty')}</li>}
              </ul>
            </section>
          );
        })}
      </div>
      {orderId && (
        <>
          <div aria-hidden="true" onClick={nav.close} className="fixed inset-0 z-40 bg-black/25" />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[560px] max-w-[90vw] flex-col p-3">
            <OrderSide orderId={orderId} onClose={nav.close} className="flex-1 shadow-2xl" />
          </div>
        </>
      )}
    </div>
  );
}

// ---------- D: delivery agenda ----------

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

const DAYS_AHEAD = 14;

export function VariantD({ query, change }: { query: OrderListQuery; change(f: Partial<OrderListQuery>): void }) {
  const { t, number, date } = useI18n();
  const L = useL();
  const can = useCan();
  const today = useToday();
  const { orderId } = useParams();
  const nav = useOrderNav();
  const workerNames = useWorkerNames();
  const showMoney = can('money.view');
  const rows = useAllRows(query.text).filter((r) => r.progress.unfinished + r.progress.ready > 0);
  const scroller = useRef<HTMLDivElement>(null);

  const garmentsDue = (r: OrderRow) => r.order.items.filter((i) => !i.cancelled && itemSummaryGroup(i) !== 'delivered').length;
  const last = addDays(today, DAYS_AHEAD - 1);
  type Group = { key: string; title: string; when?: string; rows: OrderRow[]; warn?: boolean };
  const groups: Group[] = [
    { key: 'late', title: t('orders.chip.overdue'), rows: [], warn: true },
    { key: 'pickup', title: L('রেডি, নিতে আসেনি', 'Ready, Not Picked Up'), rows: [] },
  ];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = addDays(today, i);
    groups.push({ key: d, title: date(d), when: d, rows: [] });
  }
  groups.push({ key: 'later', title: L('পরে', 'Later'), rows: [] });
  groups.push({ key: 'none', title: L('তারিখ নেই', 'No Date'), rows: [] });
  const find = (k: string) => groups.find((g) => g.key === k)!;
  for (const row of rows) {
    const d = row.nextDelivery;
    if (row.progress.unfinished === 0) find('pickup').rows.push(row);
    else if (!d) find('none').rows.push(row);
    else if (d < today) find('late').rows.push(row);
    else if (d > last) find('later').rows.push(row);
    else find(d).rows.push(row);
  }
  const load = (g: Group) => g.rows.reduce((s, r) => s + garmentsDue(r), 0);
  const maxLoad = Math.max(1, ...groups.filter((g) => g.when).map(load));
  const jump = (key: string) => scroller.current?.querySelector(`[data-day="${key}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  return (
    <div className={PAGE}>
      <nav aria-label={L('দিন অনুযায়ী', 'By Day')} className={`${CARD} w-60 shrink-0`}>
        <div className="flex flex-col gap-2 border-b border-line p-3">
          <h1 className="font-display text-xl font-bold">{t('nav.orders')}</h1>
          <input
            type="search"
            aria-label={t('orders.search')}
            placeholder={t('orders.searchPlaceholder')}
            value={query.text}
            onChange={(e) => change({ text: e.target.value })}
            className="min-h-10 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-focus"
          />
        </div>
        <ul className="relative m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-auto p-2">
          {groups.map((g) => {
            const n = load(g);
            if (!g.when && g.rows.length === 0) return null;
            return (
              <li key={g.key}>
                <button
                  type="button"
                  onClick={() => jump(g.key)}
                  className={`flex w-full flex-col gap-1 rounded-lg px-2.5 py-1.5 text-start hover:bg-surface ${g.warn ? 'bg-warn-soft text-warn-ink' : ''}`}
                >
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={g.when === today ? 'font-bold' : ''}>{g.when === today ? t('due.today') : g.when === addDays(today, 1) ? t('due.tomorrow') : g.title}</span>
                    <span className="text-xs text-muted">{n > 0 ? L(`${number(n)}টি পোশাক`, `${number(n)} Garments`) : ''}</span>
                  </span>
                  {g.when && (
                    <span className="h-1.5 rounded-full bg-surface">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${(n / maxLoad) * 100}%` }} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line p-3">
          <NewOrderLink />
        </div>
      </nav>

      <div ref={scroller} className={`${CARD} relative min-w-0 flex-1 overflow-auto!`}>
        {groups
          .filter((g) => g.rows.length > 0)
          .map((g) => (
            <section key={g.key} data-day={g.key} aria-label={g.title} className="scroll-mt-0">
              <header className={`sticky top-0 z-10 flex items-baseline gap-3 border-b border-line px-4 py-2 ${g.warn ? 'bg-warn-soft text-warn-ink' : 'bg-surface'}`}>
                <h2 className="font-semibold">{g.title}</h2>
                {g.when && <DueLabel date={g.when} />}
                <span className="flex-1" />
                <span className="text-sm text-muted">{L(`${number(g.rows.length)}টি অর্ডার · ${number(load(g))}টি পোশাক`, `${number(g.rows.length)} Orders · ${number(load(g))} Garments`)}</span>
              </header>
              <ul className="m-0 list-none p-0">
                {g.rows.map((row) => {
                  const on = row.order.id === orderId;
                  return (
                    <li key={row.order.id} className="border-b border-line last:border-0">
                      <button
                        type="button"
                        onClick={() => nav.open(row.order.id)}
                        aria-current={on ? 'true' : undefined}
                        className={`grid w-full grid-cols-[minmax(10rem,14rem)_1fr_auto] items-center gap-4 px-4 py-2.5 text-start ${on ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          {row.customer && <Avatar id={row.customer.id} name={row.customer.name} />}
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-semibold">{row.customer?.name ?? row.order.number}</span>
                            <span className="text-sm text-muted">
                              {row.order.number}
                              {(g.key === 'late' || g.key === 'pickup') && row.nextDelivery && ` · ${date(row.nextDelivery)}`}
                            </span>
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <StageList order={row.order} compact={Boolean(orderId)} />
                          {row.workers.length > 0 && !orderId && <span className="text-xs text-muted">{workerNames(row.workers)}</span>}
                        </span>
                        <span className="text-end">{showMoney && <Balance row={row} />}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        {rows.length === 0 && <p className="p-4 text-muted">{t('orders.empty')}</p>}
      </div>
      {orderId && <OrderSide orderId={orderId} onClose={nav.close} className="w-[min(520px,40%)] shrink-0" />}
    </div>
  );
}
