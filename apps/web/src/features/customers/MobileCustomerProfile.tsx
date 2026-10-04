import { balanceDue, orderProgress, type Order } from '@darzikhata/domain';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { BOTTOM_BAR_SPACE, BottomBar } from '../../ui/BottomBar';
import { buttonClasses } from '../../ui/Button';
import { rovingTabsKeyDown } from '../../ui/rovingTabs';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useCan, useMeasurementAccess } from '../common/hooks';
import { progressText } from '../common/orderText';
import { MobileMeasurements, pickTemplate, useMeasurementTemplates } from './MobileMeasurements';

type TabKey = 'measurements' | 'orders' | 'money';

const ROUND =
  'flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const BAR_BUTTON = 'min-h-[54px]! rounded-2xl! text-base';

function Stat({ label, value, tone = '', divided = false, small = false }: { label: string; value: string; tone?: string; divided?: boolean; small?: boolean }) {
  return (
    <div className={`flex flex-col-reverse items-center ${divided ? 'border-x border-line' : ''}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`m-0 font-display font-bold ${small ? 'text-base leading-7' : 'text-xl'} ${tone}`}>{value}</dd>
    </div>
  );
}

/** The phone customer screen: who they are, three numbers, then measurements, orders and money in tabs. */
export function MobileCustomerProfile({ customerId }: { customerId: string }) {
  const { t, language, money, date, number } = useI18n();
  const can = useCan();
  const hasAccess = useMeasurementAccess();
  const { state } = useSnapshot();
  const scoped = useScopedState();
  const [params] = useSearchParams();
  const templates = useMeasurementTemplates();
  const [tab, setTab] = useState<TabKey>('measurements');
  const customer = state.customers[customerId];

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/app/customers" className="inline-flex min-h-11 items-center gap-2 self-start text-brand-strong focus-visible:outline-2 focus-visible:outline-focus">
          <ArrowLeft aria-hidden="true" size={20} />
          {t('customers.back')}
        </Link>
        <p role="alert" className="text-danger">
          {t('customers.notFound')}
        </p>
      </div>
    );
  }

  const household = customer.householdId ? state.households[customer.householdId] : undefined;
  const members = household ? Object.values(state.customers).filter((c) => c.householdId === household.id && c.id !== customer.id) : [];
  const orders: Order[] = Object.values(scoped.orders)
    .filter((o) => o.customerId === customer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const owing = orders.filter((o) => balanceDue(o) > 0);
  const owed = owing.reduce((sum, o) => sum + balanceDue(o), 0);
  const latest = orders[0];
  const showMoney = can('money.view');
  const selected = pickTemplate(templates, params.get('tab'), state.profiles, customerId);
  const canMeasure = can('measurements.edit') && hasAccess(customer) && selected !== undefined;
  const canOrder = can('orders.create');

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'measurements', label: t('customer.tab.measurements') },
    { key: 'orders', label: t('customer.tab.orders') },
    ...(showMoney ? [{ key: 'money' as const, label: t('customer.tab.money') }] : []),
  ];
  const onKeyDown = rovingTabsKeyDown(tabs.map((x) => x.key), tab, setTab, (k) => `customer-tab-${k}`);

  return (
    <div className={`flex flex-col gap-3 ${canMeasure || canOrder ? BOTTOM_BAR_SPACE : ''}`}>
      <div className="-mx-2 flex items-center justify-between">
        <Link
          to="/app/customers"
          aria-label={t('customers.back')}
          className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" size={24} />
        </Link>
        {can('customers.edit') && (
          <Link
            to={`/app/customers/${customer.id}/edit`}
            aria-label={t('customer.edit')}
            className="flex min-h-11 items-center rounded-full px-3.5 text-[15px] font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
          >
            {t('customer.editShort')}
          </Link>
        )}
      </div>

      <header className="flex flex-col items-center gap-1 text-center">
        <Avatar id={customer.id} name={customer.name} size="xl" />
        <h1 className="mt-1.5 font-display text-2xl font-bold">{customer.name}</h1>
        {customer.nameAlt && <p className="text-sm text-muted">{customer.nameAlt}</p>}
        <p className="text-sm text-muted">
          {customer.phone ?? t('customer.noPhone')}
          {household && ` · ${t('customer.householdOf', { label: household.label, n: number(members.length + 1) })}`}
        </p>
        {customer.phone && (
          <div className="mt-2 flex gap-2.5">
            <a href={`tel:${customer.phone}`} aria-label={t('customer.call')} className={`${ROUND} bg-ok-soft text-ok`}>
              <Phone aria-hidden="true" size={20} />
              {t('customer.call')}
            </a>
            <a href={`sms:${customer.phone}`} aria-label={t('customer.message')} className={`${ROUND} bg-brand-soft text-brand-strong`}>
              <MessageCircle aria-hidden="true" size={20} />
              {t('customer.message')}
            </a>
          </div>
        )}
        {members.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 p-0">
            {members.map((member) => (
              <li key={member.id}>
                <Link to={`/app/customers/${member.id}`} className="inline-flex min-h-11 items-center text-sm text-brand-strong underline">
                  {member.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {customer.notes && <p className="whitespace-pre-line text-sm text-muted">{customer.notes}</p>}
      </header>

      <dl className="m-0 grid grid-flow-col auto-cols-fr rounded-2xl border border-line bg-panel py-3">
        <Stat label={t('customer.stat.orders')} value={number(orders.length)} />
        {showMoney && <Stat label={t('customer.stat.owed')} value={money(owed)} tone={owed > 0 ? 'text-accent' : ''} divided />}
        <Stat label={t('customer.stat.last')} value={latest ? date(latest.createdAt, { year: false }) : t('customer.stat.none')} divided={!showMoney} small={!latest} />
      </dl>

      <div role="tablist" aria-label={t('customer.tabs')} className="flex gap-1 border-b border-line">
        {tabs.map((x) => {
          const active = x.key === tab;
          return (
            <button
              key={x.key}
              id={`customer-tab-${x.key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`customer-panel-${x.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(x.key)}
              onKeyDown={onKeyDown}
              className={`min-h-11 flex-1 border-b-[3px] px-3.5 text-[15px] focus-visible:outline-2 focus-visible:outline-focus ${
                active ? 'border-brand font-bold text-brand-strong' : 'border-transparent text-muted'
              }`}
            >
              {x.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`customer-panel-${tab}`} aria-labelledby={`customer-tab-${tab}`} className="flex flex-col gap-3">
        {tab === 'measurements' && <MobileMeasurements customerId={customer.id} />}
        {tab === 'orders' &&
          (orders.length === 0 ? (
            <p className="text-muted">{t('customer.noOrders')}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {orders.map((order) => {
                const due = balanceDue(order);
                return (
                  <li key={order.id}>
                    <Link
                      to={`/app/orders/${order.id}`}
                      className="flex min-h-11 flex-col rounded-2xl border border-line bg-panel p-3 focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <span className="font-semibold">{order.number}</span>
                      <span className="text-sm text-muted">{date(order.createdAt)}</span>
                      <span className="text-sm">{progressText(orderProgress(order), language)}</span>
                      {showMoney && due > 0 && (
                        <span className="text-sm font-semibold text-accent">{t('customer.balance', { amount: money(due) })}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        {tab === 'money' &&
          showMoney &&
          (owing.length === 0 ? (
            <p className="text-muted">{t('customer.moneyEmpty')}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {owing.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/app/orders/${order.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-3 focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold">{order.number}</span>
                      <span className="text-sm text-muted">{date(order.createdAt)}</span>
                    </span>
                    <span className="font-semibold text-accent">{t('customer.balance', { amount: money(balanceDue(order)) })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </div>

      {(canMeasure || canOrder) && (
        <BottomBar>
          {canMeasure && (
            <Link to={`/app/customers/${customer.id}/measure/${selected!.id}`} className={`${buttonClasses('secondary', 'lg')} ${BAR_BUTTON} flex-1`}>
              {t('customer.newMeasure')}
            </Link>
          )}
          {canOrder && (
            <Link
              to={latest ? `/app/orders/new?repeat=${latest.id}` : `/app/orders/new?customer=${customer.id}`}
              data-tour="order-again"
              className={`${buttonClasses('primary', 'lg')} ${BAR_BUTTON} flex-[1.3]`}
            >
              {latest ? t('customer.orderAgain') : t('customer.newOrder')}
            </Link>
          )}
        </BottomBar>
      )}
    </div>
  );
}
