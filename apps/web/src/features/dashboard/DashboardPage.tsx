import { balanceDue, itemSummaryGroup, type ItemRef, type Order } from '@darzikhata/domain';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { dashboardModel } from './dashboard';

function OrderLink({ order }: { order: Order }) {
  return (
    <Link to={`/app/orders/${order.id}`} className="font-semibold text-brand-strong underline">
      {order.number}
    </Link>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-line bg-panel p-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
    </li>
  );
}

function Block({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">{children}</ul>
      )}
    </section>
  );
}

/** What is due today, what is late, what waits to be collected, and (with money access) the day's money. */
export function DashboardPage() {
  const { t, language, money, number, date } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const can = useCan();
  const showMoney = can('money.view');
  const model = useMemo(() => dashboardModel(Object.values(state.orders), today), [state, today]);
  const customerName = (order: Order) => state.customers[order.customerId]?.name ?? '';

  const garmentRow = ({ order, item }: ItemRef, withDelivery: boolean) => (
    <li key={`${order.id}:${item.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
      <OrderLink order={order} />
      <span>{itemTitle(order, item, language)}</span>
      <span className="text-muted">{customerName(order)}</span>
      {withDelivery && item.deliveryDate && (
        <span className="text-muted">{t('item.delivery', { date: date(item.deliveryDate) })}</span>
      )}
    </li>
  );

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.dashboard')}</h1>
      <ul aria-label={t('dashboard.summary')} className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card label={t('dashboard.openOrders')} value={number(model.openOrders)} />
        <Card label={t('dashboard.inProgress')} value={number(model.inProgress)} />
        <Card label={t('dashboard.readyGarments')} value={number(model.readyGarments)} />
        <Card label={t('dashboard.overdueGarments')} value={number(model.overdueGarments)} />
        {showMoney && <Card label={t('dashboard.collectedToday')} value={money(model.collectedToday)} />}
        {showMoney && <Card label={t('payments.dueTotal')} value={money(model.dueTotal)} />}
      </ul>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title={t('dashboard.trialsToday')} empty={t('dashboard.none')}>
          {model.trialsToday.map((ref) => garmentRow(ref, false))}
        </Block>
        <Block title={t('dashboard.deliveriesToday')} empty={t('dashboard.none')}>
          {model.deliveriesToday.map((ref) => garmentRow(ref, false))}
        </Block>
        <Block title={t('dashboard.overdue')} empty={t('dashboard.none')}>
          {model.overdue.map((ref) => garmentRow(ref, true))}
        </Block>
        <Block title={t('dashboard.ready')} empty={t('dashboard.none')}>
          {model.ready.map((order) => {
            const readyCount = order.items.filter((i) => itemSummaryGroup(i) === 'ready').length;
            const owed = balanceDue(order);
            return (
              <li key={order.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <OrderLink order={order} />
                <span className="text-muted">{customerName(order)}</span>
                <span>{t('progress.ready', { n: number(readyCount) })}</span>
                {showMoney && owed > 0 && <span className="font-semibold">{t('customer.balance', { amount: money(owed) })}</span>}
              </li>
            );
          })}
        </Block>
      </div>
    </section>
  );
}
