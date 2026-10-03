import { isOrderClosed, orderProgress } from '@darzikhata/domain';
import { Link } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { progressText } from '../common/orderText';

interface Props {
  orderId: string;
  /** Shown as a close button when the order sits beside the list. */
  onClose?: () => void;
}

/** One order: number, customer, when it was taken, whether it is still open, and progress. */
export function OrderDetail({ orderId, onClose }: Props) {
  const { t, language, date } = useI18n();
  const { state } = useSnapshot();
  const order = state.orders[orderId];

  if (!order) {
    return (
      <p role="alert" className="text-danger">
        {t('orders.notFound')}
      </p>
    );
  }
  const customer = state.customers[order.customerId];

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
        <p className="font-semibold">{isOrderClosed(order) ? t('order.statusClosed') : t('order.statusOpen')}</p>
        <p className="text-sm">{progressText(orderProgress(order), language)}</p>
      </header>
    </div>
  );
}
