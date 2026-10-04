import type { PaymentMethod } from '@darzikhata/domain';
import { useI18n } from '../../../i18n/I18nProvider';
import { ChoiceGroup } from '../../../ui/ChoiceGroup';
import { NumberField } from '../../../ui/NumberField';
import { SelectField } from '../../../ui/SelectField';
import { TextAreaField } from '../../../ui/TextAreaField';
import { TextField } from '../../../ui/TextField';
import type { DraftErrors, DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

/** One line's price per garment and its delivery and trial dates. */
export function ItemMoney({ entry, item, errors }: { entry: OrderEntry; item: DraftItem; errors: DraftErrors }) {
  const { t } = useI18n();
  const errorText = useErrorText(errors);
  const at = `items.${item.key}`;
  return (
    <div className="flex flex-col gap-3">
      <NumberField
        label={t('entry.price')}
        kind="money"
        initialValue={item.price}
        onValueChange={(price) => entry.updateItem(item.key, { price })}
        error={errorText(`${at}.price`)}
      />
      <TextField
        label={t('entry.deliveryDate')}
        type="date"
        value={item.deliveryDate}
        onChange={(e) => entry.updateItem(item.key, { deliveryDate: e.target.value })}
        error={errorText(`${at}.deliveryDate`)}
      />
      <TextField
        label={t('entry.trialDate')}
        type="date"
        value={item.trialDate}
        onChange={(e) => entry.updateItem(item.key, { trialDate: e.target.value })}
        error={errorText(`${at}.trialDate`)}
      />
    </div>
  );
}

/** Desktop: trial date, delivery date, worker (for roles that may assign) and price in one row. */
export function ItemSchedule({ entry, item, errors }: { entry: OrderEntry; item: DraftItem; errors: DraftErrors }) {
  const { t } = useI18n();
  const errorText = useErrorText(errors);
  const at = `items.${item.key}`;
  return (
    <div className={`grid items-start gap-3 ${entry.canAssign ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
      <TextField
        label={t('entry.trialDate')}
        type="date"
        value={item.trialDate}
        onChange={(e) => entry.updateItem(item.key, { trialDate: e.target.value })}
        error={errorText(`${at}.trialDate`)}
      />
      <TextField
        label={t('entry.deliveryDate')}
        type="date"
        value={item.deliveryDate}
        onChange={(e) => entry.updateItem(item.key, { deliveryDate: e.target.value })}
        error={errorText(`${at}.deliveryDate`)}
      />
      {entry.canAssign && (
        <SelectField
          label={t('work.worker')}
          value={item.assignedTo ?? ''}
          onChange={(id) => entry.updateItem(item.key, { assignedTo: id === '' ? null : id })}
          options={[{ value: '', label: t('work.nobody') }, ...entry.workers.map((w) => ({ value: w.id, label: w.name }))]}
          error={errorText(`${at}.assignedTo`)}
        />
      )}
      <NumberField
        label={t('entry.price')}
        kind="money"
        initialValue={item.price}
        onValueChange={(price) => entry.updateItem(item.key, { price })}
        error={errorText(`${at}.price`)}
      />
    </div>
  );
}

/** The order-wide discount, advance and notes. */
export function MoneyFields({ entry, errors }: { entry: OrderEntry; errors: DraftErrors }) {
  const { t } = useI18n();
  const errorText = useErrorText(errors);
  const { discount, advance, notes } = entry.draft;
  const methods: Array<{ value: PaymentMethod; label: string }> = [
    { value: 'cash', label: t('method.cash') },
    { value: 'bkash', label: t('method.bkash') },
    { value: 'nagad', label: t('method.nagad') },
    { value: 'bank', label: t('method.bank') },
  ];
  return (
    <div className="flex flex-col gap-3">
      <NumberField
        label={t('entry.discount')}
        kind="money"
        initialValue={discount.amount}
        onValueChange={(amount) => entry.update({ discount: { ...entry.draft.discount, amount } })}
        onInvalidChange={(bad) => entry.setUnreadable('discount', bad)}
        error={errorText('discount.amount')}
      />
      <TextField
        label={t('entry.discountReason')}
        value={discount.reason}
        onChange={(e) => entry.update({ discount: { ...entry.draft.discount, reason: e.target.value } })}
        autoComplete="off"
      />
      <div data-tour="advance">
        <NumberField
          label={t('entry.advance')}
          kind="money"
          initialValue={advance.amount}
          onValueChange={(amount) => entry.update({ advance: { ...entry.draft.advance, amount } })}
          onInvalidChange={(bad) => entry.setUnreadable('advance', bad)}
          error={errorText('advance.amount')}
        />
      </div>
      <ChoiceGroup
        legend={t('payment.method')}
        value={advance.method}
        options={methods}
        onChange={(method) => entry.update({ advance: { ...entry.draft.advance, method } })}
      />
      <TextField
        label={t('payment.reference')}
        value={advance.reference}
        onChange={(e) => entry.update({ advance: { ...entry.draft.advance, reference: e.target.value } })}
        autoComplete="off"
      />
      <TextAreaField label={t('entry.notes')} value={notes} onChange={(e) => entry.update({ notes: e.target.value })} />
    </div>
  );
}
