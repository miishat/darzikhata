import { balanceDue, orderProgress, orderTotal, type Order } from '@darzikhata/domain';
import { Phone, X } from 'lucide-react';
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

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`flex flex-col-reverse rounded-lg px-3 py-1.5 ${tone || 'bg-surface'}`}>
      <dt className="text-xs">{label}</dt>
      <dd className="m-0 font-display text-lg font-bold leading-tight">{value}</dd>
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

/**
 * Desktop: the customer as a panel beside the directory. The header (who, stats, actions) stays put
 * while the household, measurements and orders scroll beneath it.
 */
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

  const name = customer.name;
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
    <>
      <header className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-wrap items-start gap-3">
          <Avatar id={customer.id} name={name} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="font-display text-xl font-bold">{name}</h1>
            {customer.nameAlt && <p className="text-muted">{customer.nameAlt}</p>}
            <p className="text-sm text-muted">
              {customer.phone ?? t('customer.noPhone')}
              {household && ` · ${t('customer.householdOf', { label: household.label, n: number(members.length + 1) })}`}
              {` · ${t('customer.since', { date: date(customer.createdAt, { year: true }) })}`}
            </p>
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
          <Link
            to="/app/customers"
            aria-label={t('common.close')}
            title={t('common.close')}
            className="rounded-lg p-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
          >
            <X size={18} aria-hidden="true" />
          </Link>
        </div>
        <dl className="m-0 flex flex-wrap gap-2">
          <Stat label={t('customer.stat.orders')} value={number(orders.length)} />
          {showMoney && <Stat label={t('customer.stat.orderValue')} value={money(orderValue)} />}
          {showMoney && <Stat label={t('customer.stat.owed')} value={money(owed)} tone={owed > 0 ? 'ring-1 ring-inset ring-warn-line bg-warn-soft text-warn-ink' : ''} />}
          <Stat label={t('customer.stat.last')} value={latest ? date(latest.createdAt, { year: Number(latest.createdAt.slice(0, 4)) !== new Date().getFullYear() }) : t('customer.stat.none')} />
        </dl>
        {customer.notes && <p className="whitespace-pre-line text-sm text-muted">{customer.notes}</p>}
      </header>

      {/* relative: keeps absolutely placed screen-reader text inside this scroll area, so the page itself never scrolls. */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
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

        <MeasurementSection customerId={customer.id} />

        <Region id="customer-orders" title={t('customer.orders')}>
          {orders.length === 0 ? (
            <p className="text-muted">{t('customer.noOrders')}</p>
          ) : (
            <>
              <ul className="m-0 flex list-none flex-col p-0">
                {orders.slice(0, RECENT_ORDERS).map((order) => {
                  const due = balanceDue(order);
                  const pill = orderPill(order, t);
                  return (
                    <li key={order.id} className="border-b border-line last:border-0">
                      <Link
                        to={`/app/orders/${order.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        <span className="w-16 shrink-0 font-semibold">{order.number}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-muted">
                          {date(order.createdAt)} · {garmentSummary(order, language)}
                        </span>
                        <StagePill label={pill.label} tone={pill.tone} />
                        {showMoney &&
                          (due > 0 ? (
                            <span className="w-28 shrink-0 text-right text-sm font-semibold text-warn">{t('customer.balance', { amount: money(due) })}</span>
                          ) : (
                            <span className="w-28 shrink-0 text-right text-sm font-semibold">{money(orderTotal(order))}</span>
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
    </>
  );
}

/** Who the customer is, their household and their orders; laid out for the phone or the desktop. */
export function CustomerProfile({ customerId }: { customerId: string }) {
  const { kind } = useShell();
  return kind === 'mobile' ? <MobileCustomerProfile customerId={customerId} /> : <DesktopCustomerProfile customerId={customerId} />;
}
