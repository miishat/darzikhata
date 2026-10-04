import { isOrderClosed, orderProgress, type Order } from '@darzikhata/domain';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { Button, buttonClasses } from '../../ui/Button';
import { useBranchScope } from '../branches/BranchScopeProvider';
import { useCan } from '../common/hooks';
import { StatusLinkSection } from '../links/StatusLinkSection';
import { progressText } from '../common/orderText';
import { OrderMoney } from '../payments/OrderMoney';
import { ItemCard } from './ItemCard';
import { MobileOrderDetail } from './MobileOrderDetail';
import { OrderPanel } from './OrderPanel';
import { wearerGroups } from './wearers';

interface Props {
  orderId: string;
  /** Shown as a close button when the order sits beside the list. */
  onClose?: () => void;
  /** Laptop only: the order's own page with every detail, instead of the compact panel. */
  full?: boolean;
}

/** One order: number, customer, when it was taken, whether it is still open, and progress. */
export function OrderDetail({ orderId, onClose, full }: Props) {
  const { t } = useI18n();
  const { kind } = useShell();
  const { state } = useSnapshot();
  const can = useCan();
  const { allowed } = useBranchScope();
  const order = state.orders[orderId];

  if (!order) {
    return (
      <p role="alert" className="text-danger">
        {t('orders.notFound')}
      </p>
    );
  }
  if (!allowed.some((b) => b.id === order.branchId)) {
    return (
      <p role="alert" className="text-danger">
        {t('orders.otherBranch')}
      </p>
    );
  }
  if (kind === 'mobile') return <MobileOrderDetail order={order} />;
  if (full || !onClose) return <FullOrderDetail order={order} {...(onClose ? { onClose } : {})} />;
  return <OrderPanel order={order} onClose={onClose} />;
}

/** The laptop's full order page: everything on one scrolling column, with its buttons inline. */
function FullOrderDetail({ order, onClose }: { order: Order; onClose?: () => void }) {
  const { t, language, date } = useI18n();
  const { state } = useSnapshot();
  const can = useCan();
  const customer = state.customers[order.customerId];
  const groups = wearerGroups(order);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-semibold">{order.number}</h2>
          {onClose && (
            <Button variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
          )}
        </div>
        {customer && (
          <Link to={`/app/customers/${customer.id}`} className="w-fit text-brand-strong underline">
            {customer.name}
          </Link>
        )}
        <p className="text-sm text-muted">{t('order.created', { date: date(order.createdAt.slice(0, 10)) })}</p>
        <p data-tour="order-status" className="font-semibold">{isOrderClosed(order) ? t('order.statusClosed') : t('order.statusOpen')}</p>
        <p className="text-sm">{progressText(orderProgress(order), language)}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {can('money.view') && (
          <Link to={`/print/receipt/${order.id}`} className={buttonClasses('secondary')}>
            {t('order.printReceipt')}
          </Link>
        )}
        <Link to={`/print/job/${order.id}`} className={buttonClasses('secondary')}>
          {t('order.jobSlip')}
        </Link>
        <Link to={`/print/tags/${order.id}`} className={buttonClasses('secondary')}>
          {t('order.tags')}
        </Link>
        {can('orders.create') && (
          <Link to={`/app/orders/new?repeat=${order.id}`} data-tour="order-again" className={buttonClasses('secondary')}>
            {t('order.orderAgain')}
          </Link>
        )}
      </div>

      {can('money.view') && <OrderMoney order={order} />}

      {can('links.manage') && <StatusLinkSection order={order} />}

      {groups.length === 0 &&
        order.items.map((item) => <ItemCard key={item.id} order={order} item={item} />)}

      {groups.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table aria-label={t('wearers.summary')} className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-3 py-2 text-start text-sm font-semibold text-muted">{t('receipt.wearer')}</th>
                <th scope="col" className="px-3 py-2 text-start text-sm font-semibold text-muted">{t('orders.col.progress')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.wearer ?? ''} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-start font-normal">{group.wearer ?? t('wearers.others')}</th>
                  <td className="px-3 py-2 text-sm">{progressText(group.progress, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {groups.map((group) => {
        const name = group.wearer ?? t('wearers.others');
        return (
          <section key={group.wearer ?? ''} aria-label={name} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">{name}</h3>
              <p className="text-sm">{progressText(group.progress, language)}</p>
            </div>
            {group.items.map((item) => (
              <ItemCard key={item.id} order={order} item={item} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
