import { correctedAmount, moneySummary, netPaid, type Order, type Payment, type PaymentMethod } from '@darzikhata/domain';
import { useRef, useState } from 'react';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { NumberField } from '../../ui/NumberField';
import { TextAreaField } from '../../ui/TextAreaField';
import { TextField } from '../../ui/TextField';
import { Shell, useSave } from '../orders/itemDialogs';

interface Props {
  order: Order;
  onClose(): void;
}

const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];

function useMethods() {
  const { t } = useI18n();
  return METHODS.map((value) => ({ value, label: t(`method.${value}`) }));
}

/*
 * Every dialog here is a plain frame with a save button, never a form, so pressing Enter
 * in a field records nothing. Money is recorded only by clicking the button.
 */

/** Takes money for the order. An order with no payments yet gets an advance. */
export function TakePaymentDialog({ order, onClose }: Props) {
  const { t } = useI18n();
  const store = useStore();
  const { problem, working, save } = useSave(onClose);
  const methods = useMethods();
  const [id] = useState(() => store.createId());
  const balance = moneySummary(order).balance;
  const [amount, setAmount] = useState<number | null>(balance > 0 ? balance : null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (amount === null || amount <= 0) return;
    void save({
      type: 'payment.recorded',
      orderId: order.id,
      payment: {
        id: id,
        amount,
        method,
        reference: reference.trim(),
        kind: order.payments.length === 0 ? 'advance' : 'payment',
        corrects: null,
        reason: '',
      },
    });
  };

  return (
    <Shell title={t('payments.takeTitle')} onClose={onClose} onSave={submit} working={working} problem={problem} saveLabel={t('payments.record')}>
      <NumberField
        label={t('payments.amount')}
        kind="money"
        initialValue={balance > 0 ? balance : null}
        onValueChange={setAmount}
        error={tried && (amount === null || amount <= 0) ? t('payments.error.amount') : undefined}
      />
      <ChoiceGroup legend={t('payment.method')} value={method} options={methods} onChange={setMethod} />
      <TextField label={t('payment.reference')} value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
    </Shell>
  );
}

/** Gives money back. Needs a reason and never more than is held. */
export function RefundDialog({ order, onClose }: Props) {
  const { t } = useI18n();
  const store = useStore();
  const { problem, working, save } = useSave(onClose);
  const methods = useMethods();
  const [id] = useState(() => store.createId());
  const held = netPaid(order.payments);
  const credit = moneySummary(order).creditDue;
  const [amount, setAmount] = useState<number | null>(credit > 0 ? credit : null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  const amountError = (): string | undefined => {
    if (!tried) return undefined;
    if (amount === null || amount <= 0) return t('payments.error.amount');
    if (amount > held) return t('payments.error.refundTooMuch');
    return undefined;
  };

  const submit = () => {
    setTried(true);
    if (amount === null || amount <= 0 || amount > held || !reason.trim()) return;
    void save({
      type: 'payment.recorded',
      orderId: order.id,
      payment: { id: id, amount, method, reference: '', kind: 'refund', corrects: null, reason: reason.trim() },
    });
  };

  return (
    <Shell title={t('payments.refundTitle')} onClose={onClose} onSave={submit} working={working} problem={problem} saveLabel={t('payments.doRefund')}>
      <NumberField
        label={t('payments.amount')}
        kind="money"
        initialValue={credit > 0 ? credit : null}
        onValueChange={setAmount}
        error={amountError()}
      />
      <ChoiceGroup legend={t('payment.method')} value={method} options={methods} onChange={setMethod} />
      <TextAreaField
        label={t('payments.refundReason')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={tried && !reason.trim() ? t('item.reasonRequired') : undefined}
      />
    </Shell>
  );
}

/** Fixes a wrong amount with a new record for the difference. The original stays in the history. */
export function CorrectionDialog({ order, payment, onClose }: Props & { payment: Payment }) {
  const { t, money } = useI18n();
  const store = useStore();
  const { problem, working, save } = useSave(onClose);
  const [id] = useState(() => store.createId());
  const current = correctedAmount(order.payments, payment.id);
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  const amountError = (): string | undefined => {
    if (!tried) return undefined;
    if (amount === null) return t('payments.error.amount');
    if (amount === current) return t('payments.error.noChange');
    return undefined;
  };

  const submit = () => {
    setTried(true);
    if (amount === null || amount === current || !reason.trim()) return;
    void save({
      type: 'payment.recorded',
      orderId: order.id,
      payment: {
        id: id,
        amount: amount - current,
        method: payment.method,
        reference: '',
        kind: 'correction',
        corrects: payment.id,
        reason: reason.trim(),
      },
    });
  };

  return (
    <Shell title={t('payments.correct')} onClose={onClose} onSave={submit} working={working} problem={problem}>
      <p className="font-semibold">{t('payments.nowRecorded', { amount: money(current) })}</p>
      <NumberField label={t('payments.correctAmount')} kind="money" onValueChange={setAmount} error={amountError()} />
      <TextAreaField
        label={t('payments.correctReason')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={tried && !reason.trim() ? t('item.reasonRequired') : undefined}
      />
    </Shell>
  );
}

/** Sets or clears the discount. The edit carries the order version this dialog opened with. */
export function DiscountDialog({ order, onClose }: Props) {
  const { t } = useI18n();
  const { problem, working, save } = useSave(onClose);
  const opened = useRef(order);
  const [amount, setAmount] = useState<number | null>(order.discount?.amount ?? null);
  const [reason, setReason] = useState(order.discount?.reason ?? '');
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (amount === null) return;
    void save({
      type: 'order.discountSet',
      orderId: order.id,
      baseVersion: opened.current.version,
      discount: amount === 0 ? null : { amount, reason: reason.trim() },
    });
  };

  return (
    <Shell title={t('payments.discount')} onClose={onClose} onSave={submit} working={working} problem={problem}>
      <NumberField
        label={t('entry.discount')}
        kind="money"
        initialValue={order.discount?.amount ?? null}
        onValueChange={setAmount}
        error={tried && amount === null ? t('payments.error.amount') : undefined}
      />
      <TextField label={t('entry.discountReason')} value={reason} onChange={(e) => setReason(e.target.value)} autoComplete="off" />
    </Shell>
  );
}

/** Adds a signed line to the price, with the reason. */
export function PriceAdjustmentDialog({ order, onClose }: Props) {
  const { t } = useI18n();
  const store = useStore();
  const { problem, working, save } = useSave(onClose);
  const [id] = useState(() => store.createId());
  const [kind, setKind] = useState<'up' | 'down'>('up');
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (amount === null || amount <= 0 || !reason.trim()) return;
    void save({
      type: 'order.priceAdjusted',
      orderId: order.id,
      adjustment: { id: id, amount: kind === 'up' ? amount : -amount, reason: reason.trim() },
    });
  };

  return (
    <Shell title={t('payments.adjust')} onClose={onClose} onSave={submit} working={working} problem={problem}>
      <ChoiceGroup
        legend={t('payments.adjustKind')}
        value={kind}
        options={[
          { value: 'up', label: t('payments.adjustUp') },
          { value: 'down', label: t('payments.adjustDown') },
        ]}
        onChange={setKind}
      />
      <NumberField
        label={t('payments.amount')}
        kind="money"
        onValueChange={setAmount}
        error={tried && (amount === null || amount <= 0) ? t('payments.error.amount') : undefined}
      />
      <TextAreaField
        label={t('payments.reason')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={tried && !reason.trim() ? t('item.reasonRequired') : undefined}
      />
    </Shell>
  );
}
