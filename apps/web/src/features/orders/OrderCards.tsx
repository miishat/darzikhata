import { Link, useLocation } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useCan } from '../common/hooks';
import { garmentSummary, progressText } from '../common/orderText';
import type { OrderRow } from './orderList';
import { useBalanceText } from './OrderTable';

/** Mobile list: one card per order, the whole card is the link. */
export function OrderCards({ rows }: { rows: OrderRow[] }) {
  const { t, language, date } = useI18n();
  const can = useCan();
  const { search } = useLocation();
  const balanceText = useBalanceText();

  return (
    <ul aria-label={t('orders.list')} className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.order.id}>
          <Link
            to={{ pathname: `/app/orders/${row.order.id}`, search }}
            className="flex flex-col gap-1 rounded-xl border border-line bg-panel p-3 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-brand-strong">{row.order.number}</span>
              {can('money.view') && (
                <span className={row.balance > 0 ? 'font-semibold' : 'text-muted'}>{balanceText(row.balance)}</span>
              )}
            </span>
            <span>{row.customer?.name ?? ''}</span>
            <span className="text-sm text-muted">{garmentSummary(row.order, language)}</span>
            {row.nextDelivery && (
              <span className={`text-sm ${row.overdue ? 'font-semibold text-danger' : ''}`}>
                {`${t('receipt.delivery')} ${date(row.nextDelivery)}`}
              </span>
            )}
            <span className="text-sm text-muted">{progressText(row.progress, language)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
