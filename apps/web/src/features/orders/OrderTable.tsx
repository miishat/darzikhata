import { Link, useLocation } from 'react-router';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useCan } from '../common/hooks';
import { garmentSummary, progressText } from '../common/orderText';
import type { OrderRow } from './orderList';

/** "৳১,৪০০", or "ফেরত পাওনা ৳৩০০" when the shop owes the customer. */
export function useBalanceText(): (balance: number) => string {
  const { t, money } = useI18n();
  return (balance) => (balance < 0 ? `${t('money.creditDue')} ${money(-balance)}` : money(balance));
}

export function useWorkerNames(): (ids: string[]) => string {
  const { config } = useSnapshot();
  return (ids) => ids.map((id) => config?.staff.find((s) => s.id === id)?.name ?? id).join(', ');
}

interface Props {
  rows: OrderRow[];
  activeId: string | undefined;
}

/** Desktop list: scrolls sideways inside its own box when the screen is narrow. */
export function OrderTable({ rows, activeId }: Props) {
  const { t, language, date, money } = useI18n();
  const can = useCan();
  const { search } = useLocation();
  const balanceText = useBalanceText();
  const workerNames = useWorkerNames();
  const showMoney = can('money.view');
  const head = 'whitespace-nowrap px-3 py-2 text-start text-sm font-semibold text-muted';

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel">
      <table aria-label={t('orders.list')} className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={head}>{t('orders.col.order')}</th>
            <th scope="col" className={head}>{t('orders.col.customer')}</th>
            <th scope="col" className={head}>{t('orders.col.garments')}</th>
            <th scope="col" className={head}>{t('orders.col.dates')}</th>
            <th scope="col" className={head}>{t('orders.col.progress')}</th>
            <th scope="col" className={head}>{t('orders.col.workers')}</th>
            {showMoney && <th scope="col" className={head}>{t('orders.col.total')}</th>}
            {showMoney && <th scope="col" className={head}>{t('orders.col.balance')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { order } = row;
            const trial = order.items
              .filter((item) => !item.cancelled && item.trialDate)
              .map((item) => item.trialDate as string)
              .sort()[0];
            return (
              <tr key={order.id} className={`border-b border-line last:border-b-0 ${order.id === activeId ? 'bg-brand-soft' : ''}`}>
                <td className="whitespace-nowrap px-3 py-2 font-semibold">
                  <Link
                    to={{ pathname: `/app/orders/${order.id}`, search }}
                    aria-current={order.id === activeId ? 'page' : undefined}
                    className="text-brand-strong underline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {order.number}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.customer?.name ?? ''}</td>
                <td className="px-3 py-2">{garmentSummary(order, language)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-sm">
                  {trial && <div>{`${t('print.trial')} ${date(trial)}`}</div>}
                  {row.nextDelivery && (
                    <div className={row.overdue ? 'font-semibold text-danger' : ''}>
                      {`${t('receipt.delivery')} ${date(row.nextDelivery)}`}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-sm">{progressText(row.progress, language)}</td>
                <td className="px-3 py-2 text-sm">{workerNames(row.workers)}</td>
                {showMoney && <td className="whitespace-nowrap px-3 py-2">{money(row.total)}</td>}
                {showMoney && (
                  <td className={`whitespace-nowrap px-3 py-2 ${row.balance > 0 ? 'font-semibold' : 'text-muted'}`}>
                    {balanceText(row.balance)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
