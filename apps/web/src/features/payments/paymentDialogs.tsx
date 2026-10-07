import type { Payment } from '@darzikhata/domain';
import { useI18n } from '../../i18n/I18nProvider';
import { useShell } from '../../shell/ShellPreference';
import { ChoiceGroup } from '../../ui/ChoiceGroup';
import { NumberField } from '../../ui/NumberField';
import { TextAreaField } from '../../ui/TextAreaField';
import { TextField } from '../../ui/TextField';
import { Shell } from '../orders/itemDialogs';
import { DesktopMoneyDialog } from './DesktopMoneyDialog';
import { METHODS, useMoneyAction, type MoneyAction, type MoneyActionProps } from './useMoneyAction';

type Props = MoneyActionProps;

function useMethods() {
  const { t } = useI18n();
  return METHODS.map((value) => ({ value, label: t(`method.${value}`) }));
}

/*
 * Every dialog here is a plain frame with a save button, never a form, so pressing Enter
 * in a field records nothing. Money is recorded only by clicking the button.
 * On a desktop each one opens as the wider money window instead.
 */

function MoneyDialog({ kind, payment, ...props }: Props & { kind: MoneyAction; payment?: Payment }) {
  const { kind: shell } = useShell();
  if (shell === 'desktop') return <DesktopMoneyDialog kind={kind} payment={payment} {...props} />;
  switch (kind) {
    case 'take':
      return <TakePaymentSheet {...props} />;
    case 'refund':
      return <RefundSheet {...props} />;
    case 'discount':
      return <DiscountSheet {...props} />;
    case 'adjust':
      return <PriceAdjustmentSheet {...props} />;
    case 'correct':
      return payment ? <CorrectionSheet payment={payment} {...props} /> : null;
  }
}

/** Takes money for the order. An order with no payments yet gets an advance. */
export function TakePaymentDialog(props: Props) {
  return <MoneyDialog kind="take" {...props} />;
}

/** Gives money back. Needs a reason and never more than is held. */
export function RefundDialog(props: Props) {
  return <MoneyDialog kind="refund" {...props} />;
}

/** Fixes a wrong amount with a new record for the difference. The original stays in the history. */
export function CorrectionDialog(props: Props & { payment: Payment }) {
  return <MoneyDialog kind="correct" {...props} />;
}

/** Sets or clears the discount. */
export function DiscountDialog(props: Props) {
  return <MoneyDialog kind="discount" {...props} />;
}

/** Adds a signed line to the price, with the reason. */
export function PriceAdjustmentDialog(props: Props) {
  return <MoneyDialog kind="adjust" {...props} />;
}

function TakePaymentSheet({ order, onClose }: Props) {
  const { t } = useI18n();
  const methods = useMethods();
  const m = useMoneyAction('take', order, onClose);
  return (
    <Shell title={t('payments.takeTitle')} onClose={onClose} onSave={m.submit} working={m.working} problem={m.problem} saveLabel={t('payments.record')}>
      <NumberField label={t('payments.amount')} kind="money" initialValue={m.initial} onValueChange={m.setAmount} error={m.amountError} />
      <ChoiceGroup legend={t('payment.method')} value={m.method} options={methods} onChange={m.setMethod} />
      <TextField label={t('payment.reference')} value={m.reference} onChange={(e) => m.setReference(e.target.value)} autoComplete="off" />
    </Shell>
  );
}

function RefundSheet({ order, onClose }: Props) {
  const { t } = useI18n();
  const methods = useMethods();
  const m = useMoneyAction('refund', order, onClose);
  return (
    <Shell title={t('payments.refundTitle')} onClose={onClose} onSave={m.submit} working={m.working} problem={m.problem} saveLabel={t('payments.doRefund')}>
      <NumberField label={t('payments.amount')} kind="money" initialValue={m.initial} onValueChange={m.setAmount} error={m.amountError} />
      <ChoiceGroup legend={t('payment.method')} value={m.method} options={methods} onChange={m.setMethod} />
      <TextAreaField label={t('payments.refundReason')} value={m.reason} onChange={(e) => m.setReason(e.target.value)} error={m.reasonError} />
    </Shell>
  );
}

function CorrectionSheet({ order, payment, onClose }: Props & { payment: Payment }) {
  const { t, money } = useI18n();
  const m = useMoneyAction('correct', order, onClose, payment);
  return (
    <Shell title={t('payments.correct')} onClose={onClose} onSave={m.submit} working={m.working} problem={m.problem}>
      <p className="font-semibold">{t('payments.nowRecorded', { amount: money(m.current) })}</p>
      <NumberField label={t('payments.correctAmount')} kind="money" onValueChange={m.setAmount} error={m.amountError} />
      <TextAreaField label={t('payments.correctReason')} value={m.reason} onChange={(e) => m.setReason(e.target.value)} error={m.reasonError} />
    </Shell>
  );
}

function DiscountSheet({ order, onClose }: Props) {
  const { t } = useI18n();
  const m = useMoneyAction('discount', order, onClose);
  return (
    <Shell title={t('payments.discount')} onClose={onClose} onSave={m.submit} working={m.working} problem={m.problem}>
      <NumberField label={t('entry.discount')} kind="money" initialValue={m.initial} onValueChange={m.setAmount} error={m.amountError} />
      <TextField label={t('entry.discountReason')} value={m.reason} onChange={(e) => m.setReason(e.target.value)} autoComplete="off" />
    </Shell>
  );
}

function PriceAdjustmentSheet({ order, onClose }: Props) {
  const { t } = useI18n();
  const m = useMoneyAction('adjust', order, onClose);
  return (
    <Shell title={t('payments.adjust')} onClose={onClose} onSave={m.submit} working={m.working} problem={m.problem}>
      <ChoiceGroup
        legend={t('payments.adjustKind')}
        value={m.direction}
        options={[
          { value: 'up', label: t('payments.adjustUp') },
          { value: 'down', label: t('payments.adjustDown') },
        ]}
        onChange={m.setDirection}
      />
      <NumberField label={t('payments.amount')} kind="money" onValueChange={m.setAmount} error={m.amountError} />
      <TextAreaField label={t('payments.reason')} value={m.reason} onChange={(e) => m.setReason(e.target.value)} error={m.reasonError} />
    </Shell>
  );
}
