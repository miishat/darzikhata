import { balanceDue } from '@darzikhata/domain';
import { ClipboardList, PackageCheck, Scissors, Shirt, TriangleAlert, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button } from '../../ui/Button';
import { Kbd } from '../../ui/Kbd';
import { ViewTabs, viewTabId } from '../../ui/ViewTabs';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { OrderCards } from './OrderCards';
import { OrderDetail } from './OrderDetail';
import { OrderFilters, SortButton } from './OrderFilters';
import { fullPageTo } from './OrderPanel';
import { OrderTable } from './OrderTable';
import { DEFAULT_LIST_QUERY, orderRow, PAGE_SIZE, queryOrders, readListQuery, statusCounts, writeListQuery, type OrderListQuery } from './orderList';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { NOBODY_SOON, protoText, soonDay, UNASSIGNED_KEYS, UNASSIGNED_VARIANTS } from './unassignedPrototype';
import { UserX } from 'lucide-react';
import { ORDER_VIEWS, countViews, viewOfQuery, viewQuery, type OrderView } from './orderViews';

import { usePanelGrow } from '../../ui/usePanelGrow';

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';

const VIEW_ICONS: Record<OrderView, LucideIcon> = {
  all: ClipboardList,
  open: Scissors,
  trial: Shirt,
  ready: PackageCheck,
  late: TriangleAlert,
  owed: Wallet,
};

/**
 * The orders list. One route serves it with and without an open order, so the list,
 * its filters and the table's scroll position stay put when an order opens or closes.
 */
export function OrdersPage() {
  const { t, number, language, money: formatMoney } = useI18n();
  const { kind } = useShell();
  const can = useCan();
  const state = useScopedState();
  const today = useToday();
  const { orderId } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const money = can('money.view');
  const parsed = readListQuery(params);
  // Without money access, money-based filtering and sorting do not apply.
  const query: OrderListQuery = money
    ? parsed
    : { ...parsed, dueOnly: false, sort: parsed.sort === 'balance' ? DEFAULT_LIST_QUERY.sort : parsed.sort };
  const { text, status, dueOnly, sort, page, worker, from, to } = query;
  const result = useMemo(
    () => queryOrders(state, { text, status, dueOnly, sort, page, worker, from, to }, today),
    [state, text, status, dueOnly, sort, page, worker, from, to, today],
  );

  const counts = useMemo(() => statusCounts(state, today), [state, today]);
  const viewCounts = useMemo(() => countViews(state, today), [state, today]);
  const owedTotal = useMemo(() => Object.values(state.orders).reduce((sum, o) => sum + Math.max(0, balanceDue(o)), 0), [state]);
  // A new page or view starts at the top of the list.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo?.({ top: 0 });
  }, [page, status, dueOnly]);
  // PROTOTYPE: keep ?variant= when the filters are rewritten, and count the orders with a garment nobody is on.
  const variant = useVariant(UNASSIGNED_KEYS);
  const urgentCount = useMemo(() => {
    const last = soonDay(today);
    return Object.values(state.orders)
      .map((o) => orderRow(o, state, today))
      .filter((r) => r.unassigned && (r.overdue || (r.nextDelivery !== null && r.nextDelivery <= last))).length;
  }, [state, today]);
  const update = (next: OrderListQuery) => {
    const written = writeListQuery(next);
    if (params.get('variant')) written.set('variant', params.get('variant')!);
    setParams(written, { replace: true });
  };
  const change = (fields: Partial<OrderListQuery>) => update({ ...query, ...fields, page: fields.page ?? 1 });
  const full = params.get('full') === '1';
  // Closing an order, or leaving its own page, keeps the list's filters in the address.
  const listSearch = () => {
    const next = new URLSearchParams(search);
    next.delete('full');
    const text = next.toString();
    return text ? `?${text}` : '';
  };
  const closeOrder = () => navigate({ pathname: '/app/orders', search: listSearch() });
  const listCard = useRef<HTMLDivElement>(null);
  const panelCard = useRef<HTMLElement>(null);
  usePanelGrow(kind === 'desktop' && Boolean(orderId) && !full, listCard, panelCard, 'panel');
  const view = viewOfQuery(query, money) ?? '';
  const tabViews = ORDER_VIEWS.filter((v) => v !== 'owed' || money);
  const panelId = 'orders-view-panel';
  const from1 = (result.page - 1) * PAGE_SIZE + 1;

  const list = (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <OrderFilters query={query} onChange={change} onClear={() => update(DEFAULT_LIST_QUERY)} counts={counts} />
      {result.rows.length === 0 ? (
        <p className="text-muted">{t('orders.empty')}</p>
      ) : (
        <OrderCards rows={result.rows} />
      )}
      <nav className="flex items-center justify-between gap-2">
        <Button variant="secondary" disabled={result.page <= 1} onClick={() => change({ page: result.page - 1 })}>
          {t('orders.prev')}
        </Button>
        <span className="text-sm">{t('orders.page', { page: number(result.page), pages: number(result.pages) })}</span>
        <Button variant="secondary" disabled={result.page >= result.pages} onClick={() => change({ page: result.page + 1 })}>
          {t('orders.next')}
        </Button>
      </nav>
    </div>
  );

  if (kind === 'mobile') {
    return orderId ? (
      <OrderDetail orderId={orderId} />
    ) : (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-bold">{t('nav.orders')}</h1>
          <SortButton sort={sort} onChange={(next) => change({ sort: next })} />
        </div>
        {list}
      </div>
    );
  }

  if (orderId && full) {
    return (
      <section aria-label={t('orders.detail')}>
        <OrderDetail orderId={orderId} onClose={closeOrder} full />
      </section>
    );
  }

  return (
    // The window less the shell header (3.5rem) and the page padding (2 × 1.5rem).
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4">
      <div ref={listCard} className={`${CARD} min-w-0 flex-1`}>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <h1 className="font-display text-xl font-bold">{t('nav.orders')}</h1>
          <ViewTabs
            tiles
            label={t('orders.tabs')}
            views={tabViews.map((v: OrderView) => ({
              value: v,
              label: t(`orders.chip.${v === 'late' ? 'overdue' : v}`),
              count: viewCounts[v],
              icon: VIEW_ICONS[v],
              warn: v === 'late' || v === 'owed',
              // The amount owed is a lot to fit once the order panel narrows the tiles.
              note: v === 'owed' && !orderId ? formatMoney(owedTotal) : undefined,
            }))}
            value={view}
            onChange={(next) => change(viewQuery(next as OrderView))}
            panelId={panelId}
          />
          <OrderFilters query={query} onChange={change} onClear={() => update(DEFAULT_LIST_QUERY)} counts={counts} />
          {/* PROTOTYPE A: one line counting only the urgent orders nobody is on. */}
          {variant === 'A' && urgentCount > 0 && query.worker !== NOBODY_SOON && (
            <p className="flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink">
              <UserX aria-hidden="true" size={16} />
              {protoText('bannerSoon', language, number(urgentCount))}
              <button type="button" onClick={() => change({ worker: NOBODY_SOON })} className="font-semibold underline">
                {protoText('show', language)}
              </button>
            </p>
          )}
        </div>
        {/* relative: keeps absolutely placed screen-reader text inside this scroll area, so the page itself never scrolls. */}
        <div
          ref={scroller}
          role="tabpanel"
          id={panelId}
          {...(view ? { 'aria-labelledby': viewTabId(panelId, view) } : { 'aria-label': t('orders.list') })}
          className="relative min-h-0 flex-1 overflow-auto"
        >
          {result.rows.length === 0 ? (
            <p className="p-4 text-muted">{t('orders.empty')}</p>
          ) : (
            <OrderTable
              rows={result.rows}
              activeId={orderId}
              onOpenFull={(order) => navigate(fullPageTo(order.id, search))}
              onCloseDetail={closeOrder}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-2">
          <span className="text-sm text-muted">
            {result.total > 0 ? t('orders.range', { from: number(from1), to: number(from1 + result.rows.length - 1), total: number(result.total) }) : ''}
          </span>
          {!orderId && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>{t('orders.hint.move')}</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>Enter</Kbd>{t('orders.hint.open')}</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>Esc</Kbd>{t('orders.hint.close')}</span>
            </p>
          )}
          <div className="ms-auto flex gap-2">
            <Button variant="secondary" className="min-h-9!" disabled={result.page <= 1} onClick={() => change({ page: result.page - 1 })}>
              {t('orders.prev')}
            </Button>
            <Button variant="secondary" className="min-h-9!" disabled={result.page >= result.pages} onClick={() => change({ page: result.page + 1 })}>
              {t('orders.next')}
            </Button>
          </div>
        </div>
      </div>
      <PrototypeSwitcher variants={UNASSIGNED_VARIANTS} />
      {orderId && (
        <section ref={panelCard} aria-label={t('orders.detail')} className={`${CARD} w-[min(560px,44%)] shrink-0`}>
          <OrderDetail orderId={orderId} onClose={closeOrder} />
        </section>
      )}
    </div>
  );
}
