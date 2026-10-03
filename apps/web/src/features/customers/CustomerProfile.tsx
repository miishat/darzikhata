import { balanceDue, orderProgress, type Order } from '@darzikhata/domain';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { buttonClasses } from '../../ui/Button';
import { useCan } from '../common/hooks';
import { progressText } from '../common/orderText';
import { MeasurementSection } from './MeasurementSection';

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

/** Who the customer is, their household and their orders. */
export function CustomerProfile({ customerId }: { customerId: string }) {
  const { t, language, money, date } = useI18n();
  const can = useCan();
  const { state } = useSnapshot();
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
  const orders: Order[] = Object.values(state.orders)
    .filter((o) => o.customerId === customer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{customer.name}</h1>
        {customer.nameAlt && <p className="text-muted">{customer.nameAlt}</p>}
        <p>{customer.phone ?? t('customer.noPhone')}</p>
        {customer.notes && <p className="whitespace-pre-line text-muted">{customer.notes}</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        {can('orders.create') && (
          <Link to={`/app/orders/new?customer=${customer.id}`} className={buttonClasses('primary')}>
            {t('customer.newOrder')}
          </Link>
        )}
        {can('customers.edit') && (
          <Link to={`/app/customers/${customer.id}/edit`} className={buttonClasses('secondary')}>
            {t('customer.edit')}
          </Link>
        )}
      </div>

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
          <ul className="flex flex-col gap-2">
            {orders.map((order) => {
              const due = balanceDue(order);
              return (
                <li key={order.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
                  <Link
                    to={`/app/orders/${order.id}`}
                    className="flex min-w-0 flex-1 flex-col focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <span className="font-semibold">{order.number}</span>
                    <span className="text-sm text-muted">{date(order.createdAt)}</span>
                    <span className="text-sm">{progressText(orderProgress(order), language)}</span>
                    {can('money.view') && due > 0 && (
                      <span className="text-sm font-semibold text-accent">{t('customer.balance', { amount: money(due) })}</span>
                    )}
                  </Link>
                  {can('orders.create') && (
                    <Link to={`/app/orders/new?repeat=${order.id}`} className={buttonClasses('secondary')}>
                      {t('customer.orderAgain')}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Region>
    </div>
  );
}
