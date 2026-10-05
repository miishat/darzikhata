import { useMemo } from 'react';
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
import { ORDER_VARIANTS, VariantB, VariantC, VariantD } from './OrdersDesktopPrototype';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { DEFAULT_LIST_QUERY, PAGE_SIZE, queryOrders, readListQuery, statusCounts, writeListQuery, type OrderListQuery } from './orderList';
import { ORDER_VIEWS, countViews, viewOfQuery, viewQuery, type OrderView } from './orderViews';

/**
 * The orders list. One route serves it with and without an open order, so the list,
 * its filters and the table's scroll position stay put when an order opens or closes.
 */
export function OrdersPage() {
  const { t, number } = useI18n();
  const { kind } = useShell();
  const can = useCan();
  const state = useScopedState();
  const today = useToday();
  const { orderId } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const variant = useVariant(Object.keys(ORDER_VARIANTS));

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
  const update = (next: OrderListQuery) => {
    const p = writeListQuery(next);
    if (params.get('variant')) p.set('variant', params.get('variant')!);
    setParams(p, { replace: true });
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

  if (!(orderId && full) && variant !== 'A') {
    return (
      <>
        {variant === 'B' && <VariantB query={query} update={update} change={change} />}
        {variant === 'C' && <VariantC query={query} change={change} />}
        {variant === 'D' && <VariantD query={query} change={change} />}
        <PrototypeSwitcher variants={ORDER_VARIANTS} />
      </>
    );
  }

  const nav = (
    <nav className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted">
        {result.total > 0 ? t('orders.range', { from: number(from1), to: number(from1 + result.rows.length - 1), total: number(result.total) }) : ''}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={result.page <= 1} onClick={() => change({ page: result.page - 1 })}>
          {t('orders.prev')}
        </Button>
        <Button variant="secondary" disabled={result.page >= result.pages} onClick={() => change({ page: result.page + 1 })}>
          {t('orders.next')}
        </Button>
      </div>
    </nav>
  );

  if (orderId && full) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">{t('nav.orders')}</h1>
        <section aria-label={t('orders.detail')} className="max-w-4xl rounded-xl border border-line bg-panel p-4">
          <OrderDetail orderId={orderId} onClose={closeOrder} full />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">{t('nav.orders')}</h1>
      <div className="flex items-start gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ViewTabs
            label={t('orders.tabs')}
            views={tabViews.map((v: OrderView) => ({ value: v, label: t(`orders.chip.${v === 'late' ? 'overdue' : v}`), count: viewCounts[v] }))}
            value={view}
            onChange={(next) => change(viewQuery(next as OrderView))}
            panelId={panelId}
          />
          <OrderFilters query={query} onChange={change} onClear={() => update(DEFAULT_LIST_QUERY)} counts={counts} />
          <div role="tabpanel" id={panelId} {...(view ? { 'aria-labelledby': viewTabId(panelId, view) } : { 'aria-label': t('orders.list') })} className="flex flex-col gap-2">
            {result.rows.length === 0 ? (
              <p className="text-muted">{t('orders.empty')}</p>
            ) : (
              <OrderTable
                rows={result.rows}
                activeId={orderId}
                onOpenFull={(order) => navigate(fullPageTo(order.id, search))}
                onCloseDetail={closeOrder}
              />
            )}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>{t('orders.hint.move')}</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>Enter</Kbd>{t('orders.hint.open')}</span>
              <span className="inline-flex items-center gap-1.5"><Kbd>Esc</Kbd>{t('orders.hint.close')}</span>
            </p>
          </div>
          {nav}
        </div>
        {orderId && (
          <section
            aria-label={t('orders.detail')}
            className="sticky top-0 flex max-h-[calc(100dvh-7.5rem)] w-[400px] max-w-[45%] shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-panel"
          >
            <OrderDetail orderId={orderId} onClose={closeOrder} />
          </section>
        )}
      </div>
      <PrototypeSwitcher variants={ORDER_VARIANTS} />
    </div>
  );
}
