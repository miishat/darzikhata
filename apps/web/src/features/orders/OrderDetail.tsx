import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { useBranchScope } from '../branches/BranchScopeProvider';
import { DesktopOrderPage } from './DesktopOrderPage';
import { MobileOrderDetail } from './MobileOrderDetail';
import { OrderPanel } from './OrderPanel';

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
  if (full || !onClose) return <DesktopOrderPage order={order} {...(onClose ? { onClose } : {})} />;
  return <OrderPanel order={order} onClose={onClose} />;
}
