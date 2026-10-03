import { netPaid, type Order, type Payment } from '@darzikhata/domain';
import { useState } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { useCan } from '../common/hooks';
import { MoneyTable } from '../print/ReceiptPage';
import { receiptModel } from '../print/receipt';
import { CorrectionDialog, DiscountDialog, PriceAdjustmentDialog, RefundDialog, TakePaymentDialog } from './paymentDialogs';

type DialogKind = { kind: 'take' | 'refund' | 'discount' | 'adjust' } | { kind: 'correct'; payment: Payment };

/** The money of one order: totals, every payment record, and what the signed-in person may do about them. */
export function OrderMoney({ order }: { order: Order }) {
  const { t, language, date, money } = useI18n();
  const can = useCan();
  const { state, config } = useSnapshot();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => setDialog(null);
  if (!config) return null;

  const model = receiptModel(order, state.customers[order.customerId] ?? null, config, language);
  const head = 'whitespace-nowrap py-1 pr-3 text-start text-sm font-semibold text-muted';

  return (
    <section aria-label={t('payments.section')} className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <h3 className="text-lg font-semibold">{t('payments.section')}</h3>
      <MoneyTable model={model} language={language} />
      {model.creditDue > 0 && <p className="font-semibold">{t('payments.creditNote')}</p>}

      <div className="flex flex-wrap gap-2">
        {can('payments.record') && <Button onClick={() => setDialog({ kind: 'take' })}>{t('payments.take')}</Button>}
        {can('payments.refund') && netPaid(order.payments) > 0 && (
          <Button variant="secondary" onClick={() => setDialog({ kind: 'refund' })}>
            {t('payments.refund')}
          </Button>
        )}
        {can('orders.edit') && (
          <>
            <Button variant="secondary" onClick={() => setDialog({ kind: 'discount' })}>
              {t('payments.discount')}
            </Button>
            <Button variant="secondary" onClick={() => setDialog({ kind: 'adjust' })}>
              {t('payments.adjust')}
            </Button>
          </>
        )}
      </div>

      {model.payments.length > 0 && (
        <div className="overflow-x-auto">
          <table aria-label={t('receipt.payments')} className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className={head}>{t('receipt.date')}</th>
                <th scope="col" className={head}>{t('receipt.kind')}</th>
                <th scope="col" className={head}>{t('receipt.method')}</th>
                <th scope="col" className={head}>{t('receipt.reference')}</th>
                <th scope="col" className={head}>{t('receipt.amount')}</th>
                <th scope="col" className={head}>{t('payments.reason')}</th>
                <th scope="col" className={head}>
                  <span className="sr-only">{t('payments.correct')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {model.payments.map((row, index) => {
                const payment = order.payments[index]!;
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-2 pr-3">{date(row.at.slice(0, 10))}</td>
                    <td className="py-2 pr-3">{t(`receipt.kind.${row.kind}`)}</td>
                    <td className="py-2 pr-3">{t(`method.${row.method}`)}</td>
                    <td className="py-2 pr-3">{row.reference}</td>
                    <td className="py-2 pr-3">{money(row.effect)}</td>
                    <td className="py-2 pr-3">{row.reason}</td>
                    <td className="py-2">
                      {can('payments.correct') && row.kind !== 'correction' && (
                        <Button variant="secondary" onClick={() => setDialog({ kind: 'correct', payment })}>
                          {t('payments.correct')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.kind === 'take' && <TakePaymentDialog order={order} onClose={close} />}
      {dialog?.kind === 'refund' && <RefundDialog order={order} onClose={close} />}
      {dialog?.kind === 'discount' && <DiscountDialog order={order} onClose={close} />}
      {dialog?.kind === 'adjust' && <PriceAdjustmentDialog order={order} onClose={close} />}
      {dialog?.kind === 'correct' && <CorrectionDialog order={order} payment={dialog.payment} onClose={close} />}
    </section>
  );
}
