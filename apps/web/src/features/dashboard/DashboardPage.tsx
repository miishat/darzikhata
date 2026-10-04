import { balanceDue, itemSummaryGroup, labelIn, stageByKey, type ItemRef, type Order } from '@darzikhata/domain';
import { CheckCheck, Scissors, ShoppingBag, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useToday } from '../common/hooks';
import { itemTitle } from '../common/orderText';
import { useShell } from '../../shell/ShellPreference';
import { Avatar } from '../../ui/Avatar';
import { DueLabel } from '../../ui/DueLabel';
import { StagePill } from '../../ui/StagePill';
import { stageTone } from '../../ui/stageTone';
import { dashboardModel, todoRows } from './dashboard';

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

function Block({ title, empty, children, tour }: { title: string; empty: string; children: ReactNode[]; tour?: string }) {
  return (
    <section aria-label={title} data-tour={tour} className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">{children}</ul>
      )}
    </section>
  );
}

function Tile({ to, label, count, icon: Icon, late }: { to: string; label: string; count: string; icon: LucideIcon; late?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex min-h-11 flex-col gap-1.5 rounded-2xl p-3.5 focus-visible:outline-2 focus-visible:outline-brand ${
        late ? 'bg-warn-soft text-warn-ink' : 'bg-navy-raised text-white'
      }`}
    >
      <span className={`flex items-center gap-2 text-sm ${late ? 'font-semibold' : 'text-on-navy-muted'}`}>
        <Icon aria-hidden="true" size={18} />
        {label}
      </span>
      <span className="font-display text-3xl font-bold leading-none">{count}</span>
    </Link>
  );
}

function MoneyCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Link
      to="/app/payments"
      className="flex min-h-11 flex-col gap-0.5 rounded-2xl border border-line bg-panel px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-display text-xl font-bold ${warn ? 'text-warn' : ''}`}>{value}</span>
    </Link>
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

  const { kind } = useShell();
  if (kind === 'mobile') {
    const rows = todoRows(model);
    return (
      <section className="flex flex-col gap-4">
        <h1 className="sr-only">{t('nav.dashboard')}</h1>
        <section aria-label={t('dashboard.title')} className="flex flex-col gap-3.5 rounded-3xl bg-navy p-4 text-white">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{t('dashboard.title')}</h2>
            <span className="text-sm text-on-navy-muted">{date(today, { year: false })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Tile to="/app/orders?status=trial&sort=delivery" label={t('dashboard.tile.trial')} count={number(model.trialsToday.length)} icon={Scissors} />
            <Tile to="/app/orders?status=open&sort=delivery" label={t('dashboard.tile.delivery')} count={number(model.deliveriesToday.length)} icon={ShoppingBag} />
            <Tile to="/app/orders?status=ready" label={t('dashboard.tile.ready')} count={number(model.readyGarments)} icon={CheckCheck} />
            <Tile to="/app/orders?status=overdue" label={t('dashboard.tile.late')} count={number(model.overdueGarments)} icon={TriangleAlert} late />
          </div>
        </section>
        {showMoney && (
          <section aria-label={t('dashboard.money')} className="grid grid-cols-2 gap-2.5">
            <MoneyCard label={t('dashboard.collectedToday')} value={money(model.collectedToday)} />
            <MoneyCard label={t('payments.dueTotal')} value={money(model.dueTotal)} warn />
          </section>
        )}
        <section aria-label={t('dashboard.todo')} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h2 className="font-display text-lg font-semibold">{t('dashboard.todo')}</h2>
            <Link to="/app/orders" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong">
              {t('dashboard.seeAll')}
            </Link>
          </div>
          {rows.length === 0 ? (
            <p className="text-muted">{t('dashboard.none')}</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
              {rows.map(({ kind: rowKind, ref: { order, item } }) => {
                const stage = stageByKey(item.stages, item.stageKey);
                return (
                  <li key={item.id}>
                    <Link
                      to={`/app/orders/${order.id}`}
                      className="flex min-h-11 items-center gap-3 px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <Avatar id={order.customerId} name={customerName(order)} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold">{customerName(order)}</span>
                        <span className="truncate text-sm text-muted">
                          {itemTitle(order, item, language)} · {order.number}
                        </span>
                      </span>
                      {rowKind === 'late' && item.deliveryDate ? (
                        <DueLabel date={item.deliveryDate} />
                      ) : (
                        <StagePill
                          label={labelIn(stage.label, language)}
                          tone={stageTone(stage, itemSummaryGroup(item), item.stages.indexOf(stage))}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    );
  }

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
        <Block title={t('dashboard.ready')} tour="ready-list" empty={t('dashboard.none')}>
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
