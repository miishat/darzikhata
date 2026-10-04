import { netPaid, type Order, type Payment } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { PaidBar } from '../../ui/PaidBar';
import { useCan } from '../common/hooks';
import { MoneyTable } from '../print/ReceiptPage';
import { receiptModel } from '../print/receipt';
import { CorrectionDialog, DiscountDialog, PriceAdjustmentDialog, RefundDialog, TakePaymentDialog } from './paymentDialogs';

export type MoneyDialogKind =
  | { kind: 'take' | 'refund' | 'discount' | 'adjust' | 'history' }
  | { kind: 'correct'; payment: Payment };

type Open = (dialog: MoneyDialogKind) => void;

function useModel(order: Order) {
  const { language } = useI18n();
  const { state, config } = useSnapshot();
  return config ? receiptModel(order, state.customers[order.customerId] ?? null, config, language) : null;
}

/** Which money dialog is open. `open` shows one; `element` renders it. Only one is ever open at a time. */
export function useMoneyDialogs(order: Order) {
  const [dialog, setDialog] = useState<MoneyDialogKind | null>(null);
  const close = () => setDialog(null);
  const element: ReactNode = (
    <>
      {dialog?.kind === 'take' && <TakePaymentDialog order={order} onClose={close} />}
      {dialog?.kind === 'refund' && <RefundDialog order={order} onClose={close} />}
      {dialog?.kind === 'discount' && <DiscountDialog order={order} onClose={close} />}
      {dialog?.kind === 'adjust' && <PriceAdjustmentDialog order={order} onClose={close} />}
      {dialog?.kind === 'correct' && <CorrectionDialog order={order} payment={dialog.payment} onClose={close} />}
      {dialog?.kind === 'history' && <MoneyHistorySheet order={order} onClose={close} open={setDialog} />}
    </>
  );
  return { open: setDialog as Open, element };
}

/** Take payment (desktop only), refund, discount and price adjustment, each only for the roles that may do it. */
function MoneyActions({ order, open, take }: { order: Order; open: Open; take: boolean }) {
  const { t } = useI18n();
  const can = useCan();
  return (
    <div className="flex flex-wrap gap-2">
      {take && can('payments.record') && <Button onClick={() => open({ kind: 'take' })}>{t('payments.take')}</Button>}
      {can('payments.refund') && netPaid(order.payments) > 0 && (
        <Button variant="secondary" onClick={() => open({ kind: 'refund' })}>
          {t('payments.refund')}
        </Button>
      )}
      {can('orders.edit') && (
        <>
          <Button variant="secondary" onClick={() => open({ kind: 'discount' })}>
            {t('payments.discount')}
          </Button>
          <Button variant="secondary" onClick={() => open({ kind: 'adjust' })}>
            {t('payments.adjust')}
          </Button>
        </>
      )}
    </div>
  );
}

/** Every payment record of the order, with the correction button where allowed. */
function PaymentTable({ order, open }: { order: Order; open: Open }) {
  const { t, date, money } = useI18n();
  const can = useCan();
  const model = useModel(order);
  if (!model || model.payments.length === 0) return null;
  const head = 'whitespace-nowrap py-1 pr-3 text-start text-sm font-semibold text-muted';
  return (
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
                    <Button variant="secondary" onClick={() => open({ kind: 'correct', payment })}>
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
  );
}

/** Phone: the full history and the refund, discount and price adjustment actions, in a sheet. */
function MoneyHistorySheet({ order, onClose, open }: { order: Order; onClose(): void; open: Open }) {
  const { t, language } = useI18n();
  const model = useModel(order);
  if (!model) return null;
  return (
    <Dialog
      open
      title={t('payments.section')}
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3 text-ink">
        <MoneyTable model={model} language={language} />
        {model.creditDue > 0 && <p className="font-semibold">{t('payments.creditNote')}</p>}
        <MoneyActions order={order} open={open} take={false} />
        <PaymentTable order={order} open={open} />
      </div>
    </Dialog>
  );
}

/** Desktop: the whole money section with its buttons and history. */
export function OrderMoney({ order }: { order: Order }) {
  const { t, language } = useI18n();
  const model = useModel(order);
  const { open, element } = useMoneyDialogs(order);
  if (!model) return null;

  return (
    <section aria-label={t('payments.section')} className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
      <h3 className="text-lg font-semibold">{t('payments.section')}</h3>
      <MoneyTable model={model} language={language} />
      {model.creditDue > 0 && <p className="font-semibold">{t('payments.creditNote')}</p>}
      <MoneyActions order={order} open={open} take />
      <PaymentTable order={order} open={open} />
      {element}
    </section>
  );
}

/** Phone: total with its discount note, how much is paid, and what is owed. The details are behind the Accounts link. */
export function MoneyCard({ order, open }: { order: Order; open: Open }) {
  const { t, money } = useI18n();
  const model = useModel(order);
  if (!model) return null;
  const note = model.discount
    ? model.discount.reason
      ? t('order.moneyDiscount', { amount: money(model.discount.amount), reason: model.discount.reason })
      : t('order.moneyDiscountOnly', { amount: money(model.discount.amount) })
    : '';
  const credit = model.creditDue > 0;
  return (
    <section aria-label={t('payments.section')} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted">
          {t('order.moneyTotal', { amount: money(model.total) })} {note && <span className="text-xs">{note}</span>}
        </p>
        <button
          type="button"
          onClick={() => open({ kind: 'history' })}
          className="min-h-11 min-w-11 shrink-0 px-2 text-sm font-semibold text-brand-strong focus-visible:outline-2 focus-visible:outline-focus"
        >
          {t('order.accounts')}
        </button>
      </div>
      <PaidBar paid={model.paid} total={model.total} />
      <div className="flex items-baseline justify-between">
        <p className="flex flex-col">
          <span className="text-xs text-muted">{t('money.paid')}</span>
          <span className="font-display text-xl font-bold text-ok">{money(model.paid)}</span>
        </p>
        <p className="flex flex-col items-end">
          <span className="text-xs text-muted">{credit ? t('money.creditDue') : t('money.balance')}</span>
          <span className={`font-display text-xl font-bold ${credit ? 'text-ok' : 'text-warn'}`}>
            {money(credit ? model.creditDue : model.balance)}
          </span>
        </p>
      </div>
    </section>
  );
}
