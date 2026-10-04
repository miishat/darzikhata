import { balanceDue, orderProgress, orderTotal, type Order } from '@darzikhata/domain';
import { Phone, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/bn';
import { Avatar } from '../../ui/Avatar';
import { buttonClasses } from '../../ui/Button';
import { StagePill } from '../../ui/StagePill';
import type { Tone } from '../../ui/stageTone';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';
import { garmentSummary } from '../common/orderText';
import { useShell } from '../../shell/ShellPreference';
import { MeasurementSection } from './MeasurementSection';
import { MobileCustomerProfile } from './MobileCustomerProfile';

function Region({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-4">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const RECENT_ORDERS = 4;

function Tile({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`flex min-w-32 flex-1 flex-col-reverse justify-end rounded-xl px-4 py-3 ${tone || 'bg-surface'}`}>
      <dt className="text-sm">{label}</dt>
      <dd className="m-0 font-display text-xl font-bold">{value}</dd>
    </div>
  );
}

/** One pill for an order: where most of its garments are right now. */
function orderPill(order: Order, t: (key: MessageKey) => string): { label: string; tone: Tone } {
  const p = orderProgress(order);
  if (p.unfinished > 0) return { label: t('stageGroup.unfinished'), tone: 'working' };
  if (p.ready > 0) return { label: t('stageGroup.ready'), tone: 'ready' };
  if (p.delivered > 0) return { label: t('stageGroup.delivered'), tone: 'done' };
  return { label: t('status.group.cancelled'), tone: 'cancelled' };
}

/** Who the customer is, their household and their orders. */
function DesktopCustomerProfile({ customerId }: { customerId: string }) {
  const { t, language, money, date, number } = useI18n();
  const can = useCan();
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const customer = state.customers[customerId];

  if (!customer) {
    return (
      <p role="alert" className="text-danger">
        {t('customers.notFound')}
      </p>
    );
  }

  const household = customer.householdId ? state.households[customer.householdId] : undefined;
  const members = household
    ? Object.values(state.customers).filter((c) => c.householdId === household.id && c.id !== customer.id)
    : [];
  const orders: Order[] = Object.values(scoped.orders)
    .filter((o) => o.customerId === customer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = orders[0];
  const showMoney = can('money.view');
  const owed = orders.reduce((sum, o) => sum + Math.max(0, balanceDue(o)), 0);
  const orderValue = orders.reduce((sum, o) => sum + orderTotal(o), 0);

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <header className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar id={customer.id} name={customer.name} size="xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="font-display text-2xl font-bold">{customer.name}</h1>
            {customer.nameAlt && <p className="text-muted">{customer.nameAlt}</p>}
            <p className="text-muted">
              {customer.phone ?? t('customer.noPhone')}
              {household && ` · ${t('customer.householdOf', { label: household.label, n: number(members.length + 1) })}`}
              {` · ${t('customer.since', { date: date(customer.createdAt, { year: true }) })}`}
            </p>
            {customer.notes && <p className="whitespace-pre-line text-muted">{customer.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className={buttonClasses('secondary')}>
                <Phone aria-hidden="true" size={16} />
                {t('customer.call')}
              </a>
            )}
            {can('customers.edit') && (
              <Link to={`/app/customers/${customer.id}/edit`} className={buttonClasses('secondary')}>
                {t('customer.edit')}
              </Link>
            )}
            {can('orders.create') && (
              <Link
                to={latest ? `/app/orders/new?repeat=${latest.id}` : `/app/orders/new?customer=${customer.id}`}
                data-tour="order-again"
                className={buttonClasses('primary')}
              >
                {latest ? t('customer.orderAgain') : t('customer.newOrder')}
              </Link>
            )}
          </div>
        </div>
        <dl className="m-0 flex flex-wrap gap-3">
          <Tile label={t('customer.stat.orders')} value={number(orders.length)} />
          {showMoney && <Tile label={t('customer.stat.orderValue')} value={money(orderValue)} />}
          {showMoney && <Tile label={t('customer.stat.owed')} value={money(owed)} tone={owed > 0 ? 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink' : ''} />}
          <Tile label={t('customer.stat.last')} value={latest ? date(latest.createdAt, { year: Number(latest.createdAt.slice(0, 4)) !== new Date().getFullYear() }) : t('customer.stat.none')} />
        </dl>
      </header>

      {household && (
        <Region id="customer-household" title={t('customer.household')}>
          <p>{household.label}</p>
          {members.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {members.map((member) => (
                <li key={member.id}>
                  <Link to={`/app/customers/${member.id}`} className="text-brand-strong underline">
                    {member.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Region>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[1.6_1_28rem]">
          <MeasurementSection customerId={customer.id} />
        </div>
        <div className="min-w-0 flex-[1_1_20rem]">
          <Region id="customer-orders" title={t('customer.orders')}>
            {orders.length === 0 ? (
              <p className="text-muted">{t('customer.noOrders')}</p>
            ) : (
              <>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {orders.slice(0, RECENT_ORDERS).map((order) => {
                    const due = balanceDue(order);
                    const pill = orderPill(order, t);
                    return (
                      <li key={order.id}>
                        <Link
                          to={`/app/orders/${order.id}`}
                          className="flex flex-col gap-1 rounded-lg border border-line p-3 hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold">{order.number}</span>
                            <StagePill label={pill.label} tone={pill.tone} />
                          </span>
                          <span className="text-sm text-muted">
                            {date(order.createdAt)} · {garmentSummary(order, language)}
                          </span>
                          {showMoney &&
                            (due > 0 ? (
                              <span className="inline-flex items-center gap-1 self-start rounded-md ring-1 ring-inset ring-warn-line bg-warn-soft px-2 py-0.5 text-sm font-semibold text-warn-ink">
                                <TriangleAlert aria-hidden="true" size={14} />
                                {t('customer.balance', { amount: money(due) })}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold">{money(orderTotal(order))}</span>
                            ))}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <Link
                  to={`/app/orders?q=${encodeURIComponent(customer.phone ?? customer.name)}`}
                  className="self-start text-sm font-semibold text-brand-strong underline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {t('customer.allOrders', { n: number(orders.length) })}
                </Link>
              </>
            )}
          </Region>
        </div>
      </div>
    </div>
  );
}

/** Who the customer is, their household and their orders; laid out for the phone or the desktop. */
export function CustomerProfile({ customerId }: { customerId: string }) {
  const { kind } = useShell();
  return kind === 'mobile' ? <MobileCustomerProfile customerId={customerId} /> : <DesktopCustomerProfile customerId={customerId} />;
}
