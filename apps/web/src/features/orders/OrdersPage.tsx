import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button } from '../../ui/Button';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { OrderCards } from './OrderCards';
import { OrderDetail } from './OrderDetail';
import { OrderFilters, SortButton } from './OrderFilters';
import { OrderTable } from './OrderTable';
import { DEFAULT_LIST_QUERY, queryOrders, readListQuery, statusCounts, writeListQuery, type OrderListQuery } from './orderList';

const EMPTY_COUNTS = { all: 0, open: 0, trial: 0, ready: 0, overdue: 0, closed: 0, owed: 0 };

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

  const money = can('money.view');
  const parsed = readListQuery(params);
  // Without money access, money-based filtering and sorting do not apply.
  const query: OrderListQuery = money
    ? parsed
    : { ...parsed, dueOnly: false, sort: parsed.sort === 'balance' ? DEFAULT_LIST_QUERY.sort : parsed.sort };
  const { text, status, dueOnly, sort, page } = query;
  const result = useMemo(
    () => queryOrders(state, { text, status, dueOnly, sort, page }, today),
    [state, text, status, dueOnly, sort, page, today],
  );

  const counts = useMemo(() => (kind === 'mobile' ? statusCounts(state, today) : null), [kind, state, today]);
  const update = (next: OrderListQuery) => setParams(writeListQuery(next), { replace: true });
  const change = (fields: Partial<OrderListQuery>) => update({ ...query, ...fields, page: fields.page ?? 1 });
  const closeOrder = () => navigate({ pathname: '/app/orders', search });

  const list = (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <OrderFilters query={query} onChange={change} onClear={() => update(DEFAULT_LIST_QUERY)} counts={counts ?? EMPTY_COUNTS} />
      <p className="text-sm text-muted">{t('orders.count', { n: number(result.total) })}</p>
      {result.rows.length === 0 ? (
        <p className="text-muted">{t('orders.empty')}</p>
      ) : kind === 'desktop' ? (
        <OrderTable rows={result.rows} activeId={orderId} />
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
      <div className="flex flex-col gap-3">
        <Link to={{ pathname: '/app/orders', search }} className="w-fit text-brand-strong underline">
          {t('orders.back')}
        </Link>
        <OrderDetail orderId={orderId} />
      </div>
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

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">{t('nav.orders')}</h1>
      <div className="flex items-start gap-6">
        {list}
        {orderId && (
          <section
            aria-label={t('orders.detail')}
            className="sticky top-0 w-96 max-w-[45%] shrink-0 rounded-xl border border-line bg-panel p-4"
          >
            <OrderDetail orderId={orderId} onClose={closeOrder} />
          </section>
        )}
      </div>
    </div>
  );
}
