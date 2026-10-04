import { balanceDue, outstandingBalances, type Order } from '@darzikhata/domain';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { TextField } from '../../ui/TextField';
import { useScopedState } from '../branches/BranchScopeProvider';
import { useToday } from '../common/hooks';
import { matchesText, orderRow } from '../orders/orderList';

const head = 'whitespace-nowrap px-3 py-2 text-start text-sm font-semibold text-muted';
const cell = 'whitespace-nowrap px-3 py-2';

/** Who still owes the shop and whom the shop owes. Records nothing itself. */
export function PaymentsPage() {
  const { t, money } = useI18n();
  const state = useScopedState();
  const today = useToday();
  const [text, setText] = useState('');

  const { due, credit } = useMemo(() => {
    const orders = Object.values(state.orders).filter((order: Order) => matchesText(orderRow(order, state, today), text));
    return {
      due: outstandingBalances(orders),
      credit: orders
        .map((order) => ({ order, credit: -balanceDue(order) }))
        .filter((r) => r.credit > 0)
        .sort((a, b) => b.credit - a.credit || a.order.number.localeCompare(b.order.number)),
    };
  }, [state, text, today]);
  const customerName = (customerId: string) => state.customers[customerId]?.name ?? '';
  const orderLink = (id: string, number: string) => (
    <Link to={`/app/orders/${id}`} className="text-brand-strong underline">
      {number}
    </Link>
  );
  const total = due.reduce((sum, r) => sum + r.balance, 0);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('payments.title')}</h1>
      <TextField label={t('orders.search')} type="search" value={text} onChange={(e) => setText(e.target.value)} className="max-w-md" />

      <div className="overflow-x-auto rounded-xl border border-line bg-panel">
        <table aria-label={t('payments.due')} className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={head}>{t('orders.col.order')}</th>
              <th scope="col" className={head}>{t('orders.col.customer')}</th>
              <th scope="col" className={head}>{t('orders.col.total')}</th>
              <th scope="col" className={head}>{t('money.paid')}</th>
              <th scope="col" className={head}>{t('orders.col.balance')}</th>
            </tr>
          </thead>
          <tbody>
            {due.map(({ order, balance }) => {
              const orderTotal = orderRow(order, state, today).total;
              return (
                <tr key={order.id} className="border-b border-line">
                  <td className={`${cell} font-semibold`}>{orderLink(order.id, order.number)}</td>
                  <td className={cell}>{customerName(order.customerId)}</td>
                  <td className={cell}>{money(orderTotal)}</td>
                  <td className={cell}>{money(orderTotal - balance)}</td>
                  <td className={`${cell} font-semibold`}>{money(balance)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4} className={`${head} text-ink`}>
                {t('payments.dueTotal')}
              </th>
              <td className={`${cell} font-semibold`}>{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {credit.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table aria-label={t('payments.credit')} className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={head}>{t('orders.col.order')}</th>
                <th scope="col" className={head}>{t('orders.col.customer')}</th>
                <th scope="col" className={head}>{t('payments.credit')}</th>
              </tr>
            </thead>
            <tbody>
              {credit.map(({ order, credit: amount }) => (
                <tr key={order.id} className="border-b border-line">
                  <td className={`${cell} font-semibold`}>{orderLink(order.id, order.number)}</td>
                  <td className={cell}>{customerName(order.customerId)}</td>
                  <td className={`${cell} font-semibold`}>{money(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
