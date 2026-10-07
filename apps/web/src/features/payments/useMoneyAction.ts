import { adjustmentsTotal, correctedAmount, effectSign, netPaid, orderTotal, subtotal, type Order, type Payment, type PaymentMethod } from '@darzikhata/domain';
import { useRef, useState } from 'react';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useSave } from '../orders/itemDialogs';

export type MoneyAction = 'take' | 'refund' | 'discount' | 'adjust' | 'correct';

export const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];

export interface MoneyActionProps {
  order: Order;
  onClose(): void;
}

/**
 * Everything one money action needs: its fields, their checks, the save, and what the order's total and paid
 * amount become if it is saved. Nothing is recorded until `submit` runs, so Enter in a field saves nothing.
 */
export function useMoneyAction(kind: MoneyAction, order: Order, onClose: () => void, payment?: Payment) {
  const { t } = useI18n();
  const store = useStore();
  const { problem, working, save } = useSave(onClose);
  const [id] = useState(() => store.createId());
  // A discount edit carries the order version the dialog opened with.
  const opened = useRef(order);
  const total = orderTotal(order);
  const paid = netPaid(order.payments);
  const balance = Math.max(0, total - paid);
  const credit = Math.max(0, paid - total);
  const current = kind === 'correct' && payment ? correctedAmount(order.payments, payment.id) : 0;
  const [initial] = useState<number | null>(() => {
    if (kind === 'take') return balance > 0 ? balance : null;
    if (kind === 'refund') return credit > 0 ? credit : null;
    if (kind === 'discount') return order.discount?.amount ?? null;
    return null;
  });
  const [amount, setAmount] = useState<number | null>(initial);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState(kind === 'discount' ? (order.discount?.reason ?? '') : '');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [tried, setTried] = useState(false);

  const needsReason = kind === 'refund' || kind === 'adjust' || kind === 'correct';
  const amountProblem = (): string | undefined => {
    if (amount === null) return t('payments.error.amount');
    if ((kind === 'take' || kind === 'refund' || kind === 'adjust') && amount <= 0) return t('payments.error.amount');
    if (kind === 'refund' && amount > paid) return t('payments.error.refundTooMuch');
    if (kind === 'correct' && amount === current) return t('payments.error.noChange');
    return undefined;
  };
  const reasonProblem = needsReason && !reason.trim() ? t('item.reasonRequired') : undefined;

  const typed = amount ?? 0;
  // A correction to a refund moves the money held the other way.
  const sign = kind === 'correct' && payment ? effectSign(payment, order.payments) : 1;
  const after = {
    total:
      kind === 'discount'
        ? Math.max(0, subtotal(order) - typed + adjustmentsTotal(order))
        : kind === 'adjust'
          ? Math.max(0, total + (direction === 'up' ? typed : -typed))
          : total,
    paid: kind === 'take' ? paid + typed : kind === 'refund' ? paid - typed : kind === 'correct' ? paid + sign * (typed - current) : paid,
  };

  const submit = () => {
    setTried(true);
    if (amountProblem() || reasonProblem || amount === null) return;
    const text = reason.trim();
    switch (kind) {
      case 'take':
        void save({
          type: 'payment.recorded',
          orderId: order.id,
          payment: { id, amount, method, reference: reference.trim(), kind: order.payments.length === 0 ? 'advance' : 'payment', corrects: null, reason: '' },
        });
        return;
      case 'refund':
        void save({ type: 'payment.recorded', orderId: order.id, payment: { id, amount, method, reference: '', kind: 'refund', corrects: null, reason: text } });
        return;
      case 'discount':
        void save({ type: 'order.discountSet', orderId: order.id, baseVersion: opened.current.version, discount: amount === 0 ? null : { amount, reason: text } });
        return;
      case 'adjust':
        void save({ type: 'order.priceAdjusted', orderId: order.id, adjustment: { id, amount: direction === 'up' ? amount : -amount, reason: text } });
        return;
      case 'correct':
        if (!payment) return;
        void save({
          type: 'payment.recorded',
          orderId: order.id,
          payment: { id, amount: amount - current, method: payment.method, reference: '', kind: 'correction', corrects: payment.id, reason: text },
        });
    }
  };

  return {
    kind,
    order,
    onClose,
    problem,
    working,
    submit,
    initial,
    amount,
    setAmount,
    method,
    setMethod,
    reference,
    setReference,
    reason,
    setReason,
    direction,
    setDirection,
    amountError: tried ? amountProblem() : undefined,
    reasonError: tried ? reasonProblem : undefined,
    /** For a correction, what the payment stands at now. */
    current,
    balance,
    credit,
    before: { total, paid },
    after,
  };
}

export type MoneyActionState = ReturnType<typeof useMoneyAction>;
